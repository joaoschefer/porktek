// src/screens/HomeScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, Alert } from 'react-native';
import { Appbar, Card, Button, Divider, TextInput, Snackbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';

export default function HomeScreen() {
  const navigation = useNavigation();

  const [resumoAtivo, setResumoAtivo] = useState(null);
  const [finalizados, setFinalizados] = useState([]);
  const [loading, setLoading] = useState(false);

  const [novoNome, setNovoNome] = useState('');
  const [snack, setSnack] = useState({ visible: false, msg: '' });

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      try {
        const resumo = await api.getResumoAtivo();
        setResumoAtivo(resumo);
      } catch {
        setResumoAtivo(null);
      }
      const fins = await api.getFinalizados();
      setFinalizados(fins);
    } catch (e) {
      console.log('Erro carregar home:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  useEffect(() => { carregar(); }, [carregar]);

  const finalizarAtual = async () => {
    try {
      await api.finalizarAtivo();
      setSnack({ visible: true, msg: 'Lote finalizado.' });
      await carregar();
    } catch (e) {
      console.log('Erro finalizar ativo:', e.message);
      setSnack({ visible: true, msg: 'Falha ao finalizar.' });
    }
  };

  const criarNovo = async () => {
    const nome = novoNome.trim();
    if (!nome) {
      setSnack({ visible: true, msg: 'Informe o nome do novo lote.' });
      return;
    }
    try {
      await api.criarNovoAtivo(nome);
      setNovoNome('');
      setSnack({ visible: true, msg: 'Novo lote ativo criado.' });
      await carregar();
    } catch (e) {
      console.log('Erro criar ativo:', e.message);
      setSnack({ visible: true, msg: 'Falha ao criar novo lote.' });
    }
  };

  const confirmarExcluir = (item) => {
    Alert.alert(
      'Excluir lote',
      `Tem certeza que deseja excluir “${item.nome}”? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluirFinalizado(item.id),
        },
      ]
    );
  };

  const excluirFinalizado = async (id) => {
    try {
      await api.deleteLote(id); // DELETE /lotes/{id}/
      setFinalizados((prev) => prev.filter((x) => x.id !== id));
      setSnack({ visible: true, msg: 'Lote excluído.' });
    } catch (e) {
      console.log('Erro excluir lote:', e.message);
      setSnack({ visible: true, msg: 'Falha ao excluir.' });
    }
  };

  // (Opcional) Excluir todos os finalizados visíveis
  const excluirTodosFinalizados = async () => {
    if (finalizados.length === 0) return;
    Alert.alert(
      'Excluir todos',
      'Tem certeza que deseja excluir TODOS os lotes finalizados listados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir todos',
          style: 'destructive',
          onPress: async () => {
            try {
              const ids = finalizados.map((f) => f.id);
              await api.deleteLotesFinalizados(ids);
              setFinalizados([]);
              setSnack({ visible: true, msg: 'Todos os lotes finalizados foram excluídos.' });
            } catch (e) {
              setSnack({ visible: true, msg: 'Falha ao excluir em lote.' });
            }
          },
        },
      ]
    );
  };

  const renderLoteFinalizado = ({ item }) => (
    <Card
      style={styles.card}
      elevation={0}
      onPress={() => navigation.navigate('Lote Finalizado', { lote: item })}
    >
      <Card.Title
        title={`${item.nome}${item.finalizado_em ? ` — Finalizado em ${new Date(item.finalizado_em).toLocaleDateString('pt-BR')}` : ''}`}
        subtitle={`Criado em ${new Date(item.criado_em).toLocaleDateString('pt-BR')}`}
        titleStyle={styles.cardTitle}
        subtitleStyle={styles.cardSubtitle}
      />
      <Card.Actions style={{ justifyContent: 'flex-end', paddingRight: 12, paddingBottom: 8 }}>
        <Button mode="text" onPress={() => confirmarExcluir(item)} textColor="#B00020">
          Excluir
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appBar}>
        <Appbar.Content title="Início" titleStyle={styles.appBarTitle} />
        {/* (Opcional) Botão para excluir todos */}
        {finalizados.length > 0 ? (
          <Appbar.Action icon="delete-sweep" onPress={excluirTodosFinalizados} />
        ) : null}
      </Appbar.Header>

      <View style={styles.content}>
        {/* Lote Atual */}
        <Card style={styles.cardAtual} elevation={3}>
          <Card.Title
            title={resumoAtivo ? resumoAtivo.nome : 'Sem lote ativo'}
            subtitle={
              resumoAtivo
                ? `Suínos: ${resumoAtivo.suinos_em_andamento} · Mortes: ${resumoAtivo.total_mortes}`
                : 'Crie um novo lote ativo para começar'
            }
            titleStyle={styles.cardTitleAtual}
            subtitleStyle={styles.cardSubtitleAtual}
          />
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              buttonColor="#0075C4"
              textColor="#fff"
              onPress={() => navigation.navigate('Lote Atual')}
              style={styles.botaoDetalhes}
              disabled={!resumoAtivo}
            >
              Ver detalhes
            </Button>
            <Button
              mode="outlined"
              onPress={finalizarAtual}
              style={[styles.botaoDetalhes, { marginLeft: 8 }]}
              disabled={!resumoAtivo || loading}
            >
              Finalizar lote atual
            </Button>
          </Card.Actions>
        </Card>

        {/* Criar novo lote ativo */}
        <Card style={styles.cardNovo} elevation={0}>
          <Card.Title title="Criar novo lote ativo" />
          <Card.Content>
            <TextInput
              mode="outlined"
              label="Nome do novo lote"
              placeholder="Ex.: Lote 09/2025"
              value={novoNome}
              onChangeText={setNovoNome}
            />
            <Button mode="contained" onPress={criarNovo} style={{ marginTop: 12 }} disabled={loading}>
              Criar
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.titulo}>Lotes Finalizados</Text>
        <Divider style={{ marginBottom: 12 }} />

        <FlatList
          data={finalizados}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLoteFinalizado}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={{ color: '#7f8c8d' }}>
              {loading ? 'Carregando…' : 'Nenhum lote finalizado.'}
            </Text>
          }
        />
      </View>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, msg: '' })}
        duration={2000}
      >
        {snack.msg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f6f9fc', flex: 1 },
  appBar: { backgroundColor: '#0075C4', elevation: 4 },
  appBarTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 20 },
  content: { flex: 1, padding: 16 },

  // Lote atual
  cardAtual: { marginBottom: 20, backgroundColor: '#E8F4FF', borderRadius: 12 },
  cardTitleAtual: { color: '#005A99', fontWeight: 'bold', fontSize: 16 },
  cardSubtitleAtual: { color: '#004166' },
  botaoDetalhes: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  cardActions: { justifyContent: 'flex-end', paddingRight: 12, paddingBottom: 8 },

  // Criar novo ativo
  cardNovo: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, paddingBottom: 8 },

  // Lista finalizados
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  cardTitle: { color: '#2C3E50', fontWeight: '600', fontSize: 15 },
  cardSubtitle: { color: '#7f8c8d', fontSize: 13 },
  titulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#2C3E50' },
  lista: { paddingBottom: 16 },
});
