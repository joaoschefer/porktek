// src/screens/HomeScreen.js
import React from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { Appbar, Card, Button, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const loteAtual = {
  id: 'lote123',
  nome: 'Lote Atual - 24/07/2025',
  quantidade: 230,
};

const lotesFinalizados = [
  {
    id: '1',
    nome: 'Lote 01 - Finalizado em 12/06/2025',
    quantidade: 1865,
    mortes: '45',
    fase1: '7',
    fase2: '10',
    fase3: '15',
    observacoes: 'Rendimento excelente, baixa taxa de mortalidade.',
  },
  {
    id: '2',
    nome: 'Lote 02 - Finalizado em 15/06/2025',
    quantidade: 1855,
    mortes: '52',
    fase1: '6',
    fase2: '11',
    fase3: '16',
    observacoes: 'Média de crescimento boa, com leve atraso na fase 2.',
  },
  {
    id: '3',
    nome: 'Lote 03 - Finalizado em 18/06/2025',
    quantidade: 1954,
    mortes: '30',
    fase1: '5',
    fase2: '12',
    fase3: '17',
    observacoes: 'Desempenho ótimo, atingiu peso padrão antes do tempo.',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();

  const renderLoteFinalizado = ({ item }) => (
    <Card
      style={styles.card}
      elevation={0} // sem sombra
      onPress={() => navigation.navigate('Lote Finalizado', { lote: item })}
    >
      <Card.Title
        title={item.nome}
        subtitle={`Total de suínos: ${item.quantidade}`}
        titleStyle={styles.cardTitle}
        subtitleStyle={styles.cardSubtitle}
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appBar}>
        <Appbar.Content title="Início" titleStyle={styles.appBarTitle} />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Card do lote atual (mantém destaque) */}
        <Card style={styles.cardAtual} elevation={3}>
          <Card.Title
            title={loteAtual.nome}
            subtitle={`Quantidade atual: ${loteAtual.quantidade}`}
            titleStyle={styles.cardTitleAtual}
            subtitleStyle={styles.cardSubtitleAtual}
          />
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              buttonColor="#0075C4"
              textColor="#fff"
              onPress={() => navigation.navigate('Lote Atual', { lote: loteAtual })}
              style={styles.botaoDetalhes}
            >
              Ver detalhes
            </Button>
          </Card.Actions>
        </Card>

        <Text style={styles.titulo}>Lotes Finalizados</Text>
        <Divider style={{ marginBottom: 12 }} />

        <FlatList
          data={lotesFinalizados}
          keyExtractor={(item) => item.id}
          renderItem={renderLoteFinalizado}
          contentContainerStyle={styles.lista}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f6f9fc',
    flex: 1,
  },
  appBar: {
    backgroundColor: '#0075C4',
    elevation: 4,
  },
  appBarTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Lote atual: destaque com leve elevação
  cardAtual: {
    marginBottom: 20,
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
  },
  cardTitleAtual: {
    color: '#005A99',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardSubtitleAtual: {
    color: '#004166',
  },
  botaoDetalhes: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingRight: 12,
    paddingBottom: 8,
  },
  // Lotes finalizados: sem sombra
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    // remover sombras no iOS/Android
    shadowColor: 'transparent', // iOS
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  cardTitle: {
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: 15,
  },
  cardSubtitle: {
    color: '#7f8c8d',
    fontSize: 13,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2C3E50',
  },
  lista: {
    paddingBottom: 16,
  },
});
