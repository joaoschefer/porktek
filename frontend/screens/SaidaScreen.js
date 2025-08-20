// src/screens/SaidaScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText, Snackbar, Card, Divider, IconButton } from 'react-native-paper';
import { api } from '../services/api';

const PRIMARY = '#0A84FF';

const maskDate = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 4);
  const p3 = digits.slice(4, 8);
  if (digits.length <= 2) return p1;
  if (digits.length <= 4) return `${p1}/${p2}`;
  return `${p1}/${p2}/${p3}`;
};
const isValidDateBR = (ddmmyyyy) => {
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

export default function SaidaScreen({ navigation, route }) {
  const lote = route?.params?.lote;

  // Form
  const [quantidade, setQuantidade] = useState('');
  const [pesoTotal, setPesoTotal] = useState('');
  const [pesoMedio, setPesoMedio] = useState(''); // calculado automaticamente
  const [data, setData] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // UI
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ visible: false, msg: '' });
  const [loadingHist, setLoadingHist] = useState(false);

  // Histórico
  const [historico, setHistorico] = useState([]);

  // Converters
  const toInt = (v) => {
    const n = parseInt(String(v).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : NaN;
  };
  const toFloat = (v) => {
    // aceita "1.234,56" e "1234.56"
    const normalized = String(v)
      .replace(/\./g, '')        // remove separador de milhar
      .replace(',', '.')         // troca vírgula por ponto
      .replace(/[^0-9.]/g, '');  // mantém apenas dígitos e ponto
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : NaN;
  };

  const qnt = useMemo(() => toInt(quantidade), [quantidade]);
  const pTot = useMemo(() => toFloat(pesoTotal), [pesoTotal]);
  const pMed = useMemo(() => toFloat(pesoMedio), [pesoMedio]);

  // Peso médio sempre calculado a partir de peso total / quantidade
  useEffect(() => {
    if (Number.isFinite(qnt) && qnt > 0 && Number.isFinite(pTot) && pTot > 0) {
      setPesoMedio((pTot / qnt).toFixed(3));
    } else {
      setPesoMedio('');
    }
  }, [qnt, pTot]);

  const errors = {
    data: data.length > 0 && !isValidDateBR(data),
    quantidade: quantidade.length > 0 && (!Number.isFinite(qnt) || qnt <= 0),
    pesoTotal: pesoTotal.length > 0 && (!Number.isFinite(pTot) || pTot <= 0),
    pesoMedio: pesoMedio.length > 0 && (!Number.isFinite(pMed) || pMed <= 0), // deve ficar ok pelo cálculo automático
  };

  const formOk = useMemo(() => {
    return (
      isValidDateBR(data) &&
      Number.isFinite(qnt) && qnt > 0 &&
      Number.isFinite(pTot) && pTot > 0 &&
      Number.isFinite(pMed) && pMed > 0
    );
  }, [data, qnt, pTot, pMed]);

  const limpar = () => {
    setQuantidade(''); setPesoTotal(''); setPesoMedio(''); setData(''); setObservacoes('');
  };

  const carregarHistorico = async () => {
    if (!lote?.id) return;
    try {
      setLoadingHist(true);
      const list = await api.getSaidas(lote.id); // GET /saidas/?lote=ID
      setHistorico(list);
    } catch (e) {
      console.log('Erro ao carregar saídas:', e.message);
    } finally {
      setLoadingHist(false);
    }
  };

  useEffect(() => { carregarHistorico(); }, [lote?.id]);

  const salvar = async () => {
    if (!formOk) {
      setSnack({ visible: true, msg: 'Preencha o formulário corretamente.' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        lote: lote.id,
        quantidade: qnt,
        peso_total: pTot,
        peso_medio: pMed,              // já calculado
        data: toISO(data),
        observacoes: observacoes.trim(),
      };
      const created = await api.postSaida(payload); // POST /saidas/
      setHistorico((prev) => [created, ...prev]);
      limpar();
      setSnack({ visible: true, msg: 'Saída registrada!' });
    } catch (e) {
      console.log('Erro ao salvar saída:', e.message);
      setSnack({ visible: true, msg: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const removerRegistro = async (id) => {
    try {
      await api.deleteSaida(id); // DELETE /saidas/{id}/
      setHistorico((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao remover. Tente novamente.');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        {lote?.nome ? <Text style={styles.loteNome}>Lote: {lote.nome}</Text> : null}

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Quantidade (unid)"
              value={quantidade}
              onChangeText={setQuantidade}
              keyboardType="number-pad"
              mode="outlined"
            />
            <HelperText type="error" visible={errors.quantidade}>Informe um inteiro &gt; 0.</HelperText>

            <TextInput
              label="Peso total (kg)"
              value={pesoTotal}
              onChangeText={setPesoTotal}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.mt12}
            />
            <HelperText type="error" visible={errors.pesoTotal}>Informe um valor &gt; 0 (ex.: 1.234,5).</HelperText>

            <TextInput
              label="Peso médio (kg)"
              value={pesoMedio}
              editable={false}               // calculado automaticamente
              mode="outlined"
              right={<TextInput.Affix text="kg" />}
              style={[styles.mt12, { backgroundColor: '#f3f6fa' }]}
            />
            <HelperText type="error" visible={errors.pesoMedio}>Peso médio inválido.</HelperText>

            <TextInput
              label="Data (DD/MM/AAAA)"
              value={data}
              onChangeText={(v) => setData(maskDate(v))}
              keyboardType="number-pad"
              mode="outlined"
              error={errors.data}
              style={styles.mt12}
            />
            <HelperText type="error" visible={errors.data}>Data inválida.</HelperText>

            <TextInput
              label="Observações"
              value={observacoes}
              onChangeText={setObservacoes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.mt12}
            />

            <Button mode="contained" onPress={salvar} disabled={!formOk || saving} loading={saving} style={styles.btnSalvar}>
              Salvar Saída
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.histTitle}>Histórico de saídas</Text>
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
                subtitle={`Qtd: ${item.quantidade} · Peso total: ${item.peso_total} kg · Peso médio: ${item.peso_medio} kg`}
                right={(props) => (
                  <IconButton {...props} icon="delete" onPress={() => removerRegistro(item.id)} accessibilityLabel="Remover registro" />
                )}
              />
              {item.observacoes ? (
                <Card.Content>
                  <Text>Obs: <Text style={styles.value}>{item.observacoes}</Text></Text>
                </Card.Content>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>

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
