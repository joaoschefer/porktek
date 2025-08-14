// src/screens/ObsGeraisScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { api } from '../services/api';

export default function ObsGeraisScreen({ navigation, route }) {
  const lote = route?.params?.lote;
  const [observacao, setObservacao] = useState('');

  // Histórico de observações vindo do backend
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const salvarObservacao = async () => {
    if (!observacao.trim()) {
      Alert.alert('Erro', 'Digite alguma observação.');
      return;
    }
    try {
      const created = await api.postObservacao({ lote: lote.id, texto: observacao.trim() });
      setHistorico((prev) => [created, ...prev]);
      Alert.alert('Sucesso', 'Observação salva com sucesso.');
      setObservacao('');
      // navigation.goBack(); // se preferir voltar após salvar
    } catch (e) {
      console.log('Erro salvar observação:', e.message);
      Alert.alert('Erro', 'Falha ao salvar no servidor.');
    }
  };

  const removerObservacao = async (id) => {
    try {
      await api.deleteObservacao(id); // DELETE /observacoes/{id}/
      setHistorico((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível remover.');
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!lote?.id) return;
      try {
        setLoadingHist(true);
        const list = await api.getObservacoes(lote.id); // GET /observacoes/?lote={id}
        setHistorico(list);
      } catch (e) {
        console.log('Erro ao carregar observações:', e.message);
      } finally {
        setLoadingHist(false);
      }
    };
    load();
  }, [lote?.id]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Observações do Lote</Text>

      <TextInput
        style={styles.textArea}
        placeholder="Descreva aqui como foi o andamento do lote, pontos positivos, problemas encontrados, etc."
        value={observacao}
        onChangeText={setObservacao}
        multiline
        numberOfLines={6}
      />

      <Button title="Salvar Observação" onPress={salvarObservacao} />

      <Text style={[styles.title, { marginTop: 28, fontSize: 20 }]}>Histórico de Observações</Text>

      {loadingHist ? (
        <Text style={{ color: '#777' }}>Carregando…</Text>
      ) : historico.length === 0 ? (
        <Text style={{ color: '#777' }}>Nenhum registro ainda.</Text>
      ) : (
        historico.map((item) => (
          <View key={item.id} style={styles.histItem}>
            <Text style={styles.histLine}>{item.texto}</Text>
            <TouchableOpacity style={styles.btnSmall} onPress={() => removerObservacao(item.id)}>
              <Text style={styles.btnSmallText}>Remover</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'left' },
  textArea: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, height: 150, textAlignVertical: 'top', marginBottom: 20 },
  histItem: { marginTop: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#fafafa' },
  histLine: { fontSize: 14 },
  btnSmall: { backgroundColor: '#d32f2f', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  btnSmallText: { color: '#fff', fontWeight: 'bold' },
});
