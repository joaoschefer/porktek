// src/screens/MortesScreen.js
import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { api } from '../services/api';

export default function MortesScreen({ navigation, route }) {
  const lote = route?.params?.lote;

  const [dataMorte, setDataMorte] = useState('');
  const [causa, setCausa] = useState('');
  const [mossa, setMossa] = useState('');
  const [sexo, setSexo] = useState('ND'); // 'M' | 'F' | 'ND'

  const [historico, setHistorico] = useState([]);

  const isDateISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  // Carregar mortes do backend
  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        const data = await api.getMortes(lote.id); // GET /api/mortes/?lote={id}
        setHistorico(data);
      } catch (e) {
        console.log('Erro ao carregar mortes:', e.message);
      }
    };
    carregarHistorico();
  }, [lote.id]);

  const registrarMorte = async () => {
    if (!dataMorte || !causa || !mossa) {
      Alert.alert('Erro', 'Preencha todos os campos!');
      return;
    }
    if (!isDateISO(dataMorte)) {
      Alert.alert('Erro', 'Data deve estar no formato YYYY-MM-DD.');
      return;
    }
    try {
      const payload = {
        lote: lote.id,
        data_morte: dataMorte.trim(),
        causa: causa.trim(),
        mossa: String(mossa).trim(),
        sexo, // 👈 enviar sexo
      };
      const novaMorte = await api.postMorte(payload);

      setHistorico((prev) => [novaMorte, ...prev]);
      setDataMorte(''); setCausa(''); setMossa(''); setSexo('ND');
      Alert.alert('Sucesso', 'Morte registrada com sucesso.');
    } catch (e) {
      console.log('Erro salvar morte:', e.message);
      Alert.alert('Erro', 'Falha ao salvar no servidor.');
    }
  };

  const removerRegistro = async (id) => {
    try {
      await api.deleteMorte(id); // DELETE /api/mortes/{id}/
      setHistorico((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível remover o registro.');
    }
  };

  const labelSexo = (s) => (s === 'M' ? 'Macho' : s === 'F' ? 'Fêmea' : 'ND');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registrar Morte</Text>

      <Text style={styles.label}>Data da Morte</Text>
      <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={dataMorte} onChangeText={setDataMorte} />

      <Text style={styles.label}>Causa da Morte</Text>
      <TextInput style={styles.input} placeholder="Ex: infecção, acidente..." value={causa} onChangeText={setCausa} />

      <Text style={styles.label}>Mossa (número do suíno)</Text>
      <TextInput style={styles.input} placeholder="Ex: 123" value={mossa} onChangeText={setMossa} keyboardType="numeric" />

      <Text style={styles.label}>Sexo</Text>
      <SegmentedButtons
        value={sexo}
        onValueChange={setSexo}
        buttons={[
          { value: 'M', label: 'Macho' },
          { value: 'F', label: 'Fêmea' },
          { value: 'ND', label: 'ND' },
        ]}
        style={{ marginBottom: 12 }}
      />

      <TouchableOpacity style={styles.btn} onPress={registrarMorte}>
        <Text style={styles.btnText}>Registrar Morte</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { marginTop: 28, fontSize: 20 }]}>Histórico de Mortes</Text>

      {historico.length === 0 ? (
        <Text style={{ color: '#777' }}>Nenhum registro ainda.</Text>
      ) : (
        historico.map((item) => (
          <View key={item.id} style={styles.histItem}>
            <Text style={styles.histTitle}>Mossa #{item.mossa}</Text>
            <Text style={styles.histLine}>Data: {item.data_morte}</Text>
            <Text style={styles.histLine}>Causa: {item.causa}</Text>
            <Text style={styles.histLine}>Sexo: {labelSexo(item.sexo)}</Text>

            <TouchableOpacity style={styles.btnSmall} onPress={() => removerRegistro(item.id)}>
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
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 4, marginBottom: 12 },
  histItem: { marginTop: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#fafafa' },
  histTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  histLine: { fontSize: 14, marginTop: 2 },
  btn: { backgroundColor: '#0A84FF', paddingVertical: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnSmall: { backgroundColor: '#d32f2f', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  btnSmallText: { color: '#fff', fontWeight: 'bold' },
});
