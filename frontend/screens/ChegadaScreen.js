// src/screens/ChegadaScreen.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText, Snackbar, Card, Divider, IconButton } from 'react-native-paper';
import { api } from '../services/api';

const PRIMARY = '#0A84FF';

export default function ChegadaScreen({ navigation, route }) {
  const lote = route?.params?.lote;

  // ---- Form states ----
  const [data, setData] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [pesoMedio, setPesoMedio] = useState('');
  const [pesoTotal, setPesoTotal] = useState('');        // 👈 NOVO
  const [origem, setOrigem] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ visible: false, msg: '' });

  // ---- Histórico vindo do backend ----
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // ---- Helpers ----
  const maskDate = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const p1 = digits.slice(0, 2);
    const p2 = digits.slice(2, 4);
    const p3 = digits.slice(4, 8);
    if (digits.length <= 2) return p1;
    if (digits.length <= 4) return `${p1}/${p2}`;
    return `${p1}/${p2}/${p3}`;
  };
  const onChangeData = (v) => setData(maskDate(v));

  const toInt = (v) => {
    const n = parseInt(String(v).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : NaN;
  };
  const toFloat = (v) => {
    const normalized = String(v).replace(',', '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : NaN;
  };

  const isValidDate = (ddmmyyyy) => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(ddmmyyyy)) return false;
    const [d, m, y] = ddmmyyyy.split('/').map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  };

  const toISO = (ddmmyyyy) => {
    const [d, m, y] = ddmmyyyy.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  };
  const toBR = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return '';
    const [y, m, d] = String(yyyy_mm_dd).split('-');
    if (!y || !m || !d) return yyyy_mm_dd;
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  };

  // ---- Validações ----
  const qnt = toInt(quantidade);
  const pMed = toFloat(pesoMedio);
  const pTot = toFloat(pesoTotal);

  // Auto-sugerir peso médio se der pra calcular (peso_total / quantidade)
  useEffect(() => {
    if ((!pesoMedio || !Number.isFinite(pMed)) && Number.isFinite(qnt) && qnt > 0 && Number.isFinite(pTot) && pTot > 0) {
      const calc = (pTot / qnt).toFixed(3);
      setPesoMedio(String(calc));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantidade, pesoTotal]); // recalcula quando mudar qnt ou total

  const errors = {
    data: data.length > 0 && !isValidDate(data),
    quantidade: quantidade.length > 0 && (!Number.isFinite(qnt) || qnt <= 0),
    pesoMedio: pesoMedio.length > 0 && (!Number.isFinite(pMed) || pMed <= 0),
    // pesoTotal é opcional; se quiser tornar obrigatório, adicione regra:
    // pesoTotal: pesoTotal.length > 0 && (!Number.isFinite(pTot) || pTot <= 0),
  };

  const formOk = useMemo(() => {
    return (
      isValidDate(data) &&
      Number.isFinite(qnt) && qnt > 0 &&
      Number.isFinite(pMed) && pMed > 0 &&
      origem.trim().length > 0 &&
      responsavel.trim().length > 0
      // Se quiser tornar o total obrigatório, acrescente:
      // && Number.isFinite(pTot) && pTot > 0
    );
  }, [data, qnt, pMed, origem, responsavel]);

  // ---- Carregar histórico do backend ----
  useEffect(() => {
    const load = async () => {
      if (!lote?.id) return;
      try {
        setLoadingHist(true);
        const list = await api.getChegadas(lote.id); // GET /chegadas/?lote={id}
        setHistorico(list);
      } catch (e) {
        console.log('Erro ao carregar chegadas:', e.message);
      } finally {
        setLoadingHist(false);
      }
    };
    load();
  }, [lote?.id]);

  // ---- Ações ----
  const limpar = () => {
    setData('');
    setQuantidade('');
    setPesoMedio('');
    setPesoTotal('');   // 👈 limpa
    setOrigem('');
    setResponsavel('');
    setObservacoes('');
  };

  const salvarDados = async () => {
    try {
      if (!formOk) {
        setSnack({ visible: true, msg: 'Preencha o formulário corretamente.' });
        return;
      }
      setSaving(true);

      const payload = {
        lote: lote.id,
        data: toISO(data),
        quantidade: qnt,
        peso_medio: pMed,
        peso_total: Number.isFinite(pTot) ? pTot : null,   // 👈 envia se numérico
        origem: origem.trim(),
        responsavel: responsavel.trim(),
        observacoes: observacoes.trim(),
      };
      const created = await api.postChegada(payload);

      setHistorico((prev) => [created, ...prev]);
      setSnack({ visible: true, msg: 'Chegada salva!' });
      limpar();
    } catch (e) {
      console.log(e);
      setSnack({ visible: true, msg: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const removerRegistro = async (id) => {
    try {
      await api.deleteChegada(id); // DELETE /chegadas/{id}/
      setHistorico((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao remover. Tente novamente.');
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {lote?.nome ? <Text style={styles.loteNome}>Lote: {lote.nome}</Text> : null}

          {/* Formulário */}
          <Card style={styles.card} mode="contained">
            <Card.Content>
              <TextInput
                label="Data da Chegada (DD/MM/AAAA)"
                value={data}
                onChangeText={onChangeData}
                keyboardType="number-pad"
                mode="outlined"
                error={errors.data}
              />
              <HelperText type="error" visible={errors.data}>Data inválida.</HelperText>

              <TextInput
                label="Quantidade de Suínos"
                value={quantidade}
                onChangeText={setQuantidade}
                keyboardType="number-pad"
                mode="outlined"
                error={errors.quantidade}
                right={<TextInput.Affix text="unid" />}
                style={styles.mt12}
              />
              <HelperText type="error" visible={errors.quantidade}>Informe um número inteiro &gt; 0.</HelperText>

              <TextInput
                label="Peso total da carga (kg)"
                value={pesoTotal}
                onChangeText={setPesoTotal}
                keyboardType="decimal-pad"
                mode="outlined"
                right={<TextInput.Affix text="kg" />}
                style={styles.mt12}
              />
              {/* Se quiser validar, adicione HelperText aqui */}

              <TextInput
                label="Peso Médio (kg)"
                value={pesoMedio}
                onChangeText={setPesoMedio}
                keyboardType="decimal-pad"
                mode="outlined"
                error={errors.pesoMedio}
                right={<TextInput.Affix text="kg" />}
                style={styles.mt12}
              />
              <HelperText type="error" visible={errors.pesoMedio}>Informe um valor numérico &gt; 0. (Ex: 22.5)</HelperText>

              <TextInput label="Origem" value={origem} onChangeText={setOrigem} mode="outlined" style={styles.mt12} />
              <TextInput label="Responsável pela Entrega" value={responsavel} onChangeText={setResponsavel} mode="outlined" style={styles.mt12} />
              <TextInput
                label="Observações"
                value={observacoes}
                onChangeText={setObservacoes}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.mt12}
              />

              <Button mode="contained" style={styles.btnSalvar} onPress={salvarDados} disabled={!formOk || saving} loading={saving}>
                Salvar Chegada
              </Button>
            </Card.Content>
          </Card>

          {/* Histórico (backend) */}
          <Text style={styles.histTitle}>Histórico de chegadas</Text>
          <Divider style={{ marginBottom: 10 }} />
          {loadingHist ? (
            <Text style={{ color: '#7f8c8d' }}>Carregando…</Text>
          ) : historico.length === 0 ? (
            <Text style={{ color: '#7f8c8d' }}>Nenhum registro ainda.</Text>
          ) : (
            historico.map((item) => (
              <Card key={item.id} style={styles.histItem} mode="contained" elevation={1}>
                <Card.Title
                  title={`Data: ${toBR(item.data)}`}
                  subtitle={`Qtd: ${item.quantidade} · Peso médio: ${item.peso_medio} kg${item.peso_total ? ` · Peso total: ${item.peso_total} kg` : ''}`}
                  right={(props) => (
                    <IconButton {...props} icon="delete" onPress={() => removerRegistro(item.id)} accessibilityLabel="Remover registro" />
                  )}
                />
                <Card.Content>
                  <Text>Origem: <Text style={styles.value}>{item.origem}</Text></Text>
                  <Text>Responsável: <Text style={styles.value}>{item.responsavel}</Text></Text>
                  {item.observacoes ? <Text>Obs: <Text style={styles.value}>{item.observacoes}</Text></Text> : null}
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, msg: '' })} duration={2000}>
        {snack.msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F9FC' },
  container: { padding: 16, gap: 12 },
  loteNome: { fontWeight: '700', color: '#2C3E50', marginBottom: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14 },
  mt12: { marginTop: 12 },
  btnSalvar: { marginTop: 16, borderRadius: 10 },
  histTitle: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#2C3E50' },
  value: { fontWeight: '700', color: '#2C3E50' },
  histItem: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 10 },
});
