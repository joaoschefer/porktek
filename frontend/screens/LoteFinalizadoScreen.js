// src/screens/LoteFinalizadoScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function LoteFinalizadoScreen({ route }) {
  const { lote } = route.params;

  const renderCampo = (label, valor) => (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valor}>{valor || 'Não informado'}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Lote Finalizado</Text>
      <Text style={styles.subtitulo}>{lote.nome}</Text>
      <Text style={styles.info}>Quantidade total: {lote.quantidade}</Text>

      {renderCampo('Quantidade de mortes', lote.mortes)}
      {renderCampo('Dias na ração - Fase 1', lote.fase1)}
      {renderCampo('Dias na ração - Fase 2', lote.fase2)}
      {renderCampo('Dias na ração - Fase 3', lote.fase3)}
      {renderCampo('Observações gerais', lote.observacoes)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f2f4f8',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 18,
    marginBottom: 4,
    fontWeight: '600',
  },
  info: {
    marginBottom: 16,
    color: '#333',
  },
  campo: {
    marginBottom: 12,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2C3E50',
  },
  valor: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
});
