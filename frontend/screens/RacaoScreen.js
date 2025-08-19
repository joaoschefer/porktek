// src/screens/RacaoScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText, Snackbar, Card, Divider, IconButton, SegmentedButtons } from 'react-native-paper';
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
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};
const toBR = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return '';
  const [y, m, d] = String(yyyy_mm_dd).split('-');
  if (!y || !m || !d) return yyyy_mm_dd;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

export default function RacaoScreen({ navigation, route }) {
  const lote = route?.params?.lote;

  // form
  const [tipo, setTipo] = useState('INICIAL'); // INICIAL | FASE1 | FASE2 | FASE3
  const [origem, setOrigem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [data, setData] = useState('');

  // ui
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ visible: false, msg: '' });
  const [loadingHist, setLoadingHist] = useState(false);

  // histórico
  const [historico, setHistorico] = useState([]);

  const qnt = useMemo(() => {
    const n = parseInt(String(quantidade).replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : NaN;
  }, [quantidade]);

  const errors = {
    data: data.length > 0 && !isValidDateBR(data),
    quantidade: quantidade.length > 0 && (!Number.isFinite(qnt) || qnt <= 0),
    origem: origem.length > 0 && origem.trim().length === 0,
  };

  const formOk = useMemo(() => {
    return (
      isValidDateBR(data) &&
      Number.isFinite(qnt) && qnt > 0 &&
      origem.trim().length > 0 &&
      ['INICIAL', 'FASE1', 'FASE2', 'FASE3'].includes(tipo)
    );
  }, [data, qnt, origem, tipo]);

  const limpar = () => {
    setTipo('INICIAL');
    setOrigem('');
    setQuantidade('');
    setData('');
  };

  const carregarHistorico = async () => {
    if (!lote?.id) return;
    try {
      setLoadingHist(true);
      const list = await api.getRacoes(lote.id); // GET /racoes/?lote=ID
      setHistorico(list);
    } catch (e) {
      console.log('Erro ao carregar rações:', e.message);
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
        tipo,
        origem: origem.trim(),
        quantidade: qnt,
        data: toISO(data),
      };
      const created = await api.postRacao(payload); // POST /racoes/
      setHistorico((prev) => [created, ...prev]);
      limpar();
      setSnack({ visible: true, msg: 'Chegada de ração salva!' });
    } catch (e) {
      console.log('Erro ao salvar ração:', e.message);
      setSnack({ visible: true, msg: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const removerRegistro = async (id) => {
    try {
      await api.deleteRacao(id); // DELETE /racoes/{id}/
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
            <Text style={styles.label}>Tipo da ração</Text>
            <SegmentedButtons
              value={tipo}
              onValueChange={setTipo}
              buttons={[
                { value: 'FASE1', label: 'Fase 1' },
                { value: 'FASE2', label: 'Fase 2' },
                { value: 'FASE3', label: 'Fase 3' },
                { value: 'INICIAL', label: 'Inicial' },
              ]}
              style={{ marginBottom: 12 }}
            />

            <TextInput
              label="Origem"
              value={origem}
              onChangeText={setOrigem}
              mode="outlined"
            />
            <HelperText type="error" visible={!!errors.origem}>Informe a origem.</HelperText>

            <TextInput
              label="Quantidade"
              value={quantidade}
              onChangeText={setQuantidade}
              keyboardType="number-pad"
              mode="outlined"
              right={<TextInput.Affix text="unid" />}  // ajuste o sufixo (kg/sacas) se quiser
              style={styles.mt12}
            />
            <HelperText type="error" visible={errors.quantidade}>Informe um inteiro &gt; 0.</HelperText>

            <TextInput
              label="Data de Chegada (DD/MM/AAAA)"
              value={data}
              onChangeText={(v) => setData(maskDate(v))}
              keyboardType="number-pad"
              mode="outlined"
              error={errors.data}
              style={styles.mt12}
            />
            <HelperText type="error" visible={errors.data}>Data inválida.</HelperText>

            <Button mode="contained" onPress={salvar} disabled={!formOk || saving} loading={saving} style={styles.btnSalvar}>
              Salvar Ração
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.histTitle}>Histórico de chegadas de ração</Text>
        <Divider style={{ marginBottom: 10 }} />
        {loadingHist ? (
          <Text style={{ color: '#7f8c8d' }}>Carregando…</Text>
        ) : historico.length === 0 ? (
          <Text style={{ color: '#7f8c8d' }}>Nenhum registro ainda.</Text>
        ) : (
          historico.map((item) => (
            <Card key={item.id} style={styles.histItem} mode="contained" elevation={1}>
              <Card.Title
                title={`${item.tipo === 'INICIAL' ? 'Inicial' : item.tipo.replace('FASE', 'Fase ')}`}
                subtitle={`Data: ${toBR(item.data)} · Qtd: ${item.quantidade}`}
                right={(props) => (
                  <IconButton {...props} icon="delete" onPress={() => removerRegistro(item.id)} accessibilityLabel="Remover registro" />
                )}
              />
              <Card.Content>
                <Text>Origem: <Text style={styles.value}>{item.origem}</Text></Text>
              </Card.Content>
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
  label: { marginBottom: 8, fontWeight: '600', color: '#2C3E50' },
});
