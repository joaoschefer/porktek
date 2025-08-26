// src/screens/LoteFinalizadoScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Divider, Chip } from 'react-native-paper';
import { api } from '../services/api';

const fmtBR = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('pt-BR');
};

const toBR = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return '';
  const [y, m, d] = String(yyyy_mm_dd).split('-');
  if (!y || !m || !d) return yyyy_mm_dd;
  return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
};

export default function LoteFinalizadoScreen({ route }) {
  const { lote } = route.params || {};
  const loteId = Number(lote?.id);

  const [resumo, setResumo] = useState(null);
  const [chegadas, setChegadas] = useState([]);
  const [mortes, setMortes] = useState([]);
  const [observacoes, setObservacoes] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    if (!Number.isFinite(loteId)) return;
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        api.getResumoLote(loteId),
        api.getChegadas(loteId),
        api.getMortes(loteId),
        api.getObservacoes(loteId),
      ]);

      const [r, cs, ms, os] = results;

      if (r.status === 'fulfilled') setResumo(r.value); else setResumo(null);
      if (cs.status === 'fulfilled') setChegadas(cs.value); else setChegadas([]);
      if (ms.status === 'fulfilled') setMortes(ms.value); else setMortes([]);
      if (os.status === 'fulfilled') setObservacoes(os.value); else setObservacoes([]);
    } finally {
      setLoading(false);
    }
  }, [loteId]);

  useEffect(() => { carregar(); }, [carregar]);

  const Header = () => (
    <Card style={styles.cardHeader} elevation={2}>
      <Card.Title title={lote?.nome || 'Lote'} subtitle={`ID: ${loteId || '-'}`} />
      <Card.Content style={{ gap: 8 }}>
        <View style={styles.row}>
          <Chip style={styles.chip} icon="flag-checkered" compact>
            Status: {lote?.ativo ? 'Em andamento' : 'Finalizado'}
          </Chip>
          <Chip style={styles.chip} icon="calendar" compact>
            Criado em: {fmtBR(lote?.criado_em)}
          </Chip>
          {!lote?.ativo && (
            <Chip style={styles.chip} icon="calendar-check" compact>
              Finalizado em: {fmtBR(lote?.finalizado_em)}
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const ResumoCard = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Title title="Resumo do Lote" />
      <Card.Content style={{ gap: 6 }}>
        <Text style={styles.line}>
          Chegadas (total de suínos): <Text style={styles.value}>{resumo?.total_chegadas ?? 0}</Text>
        </Text>
        <Text style={styles.line}>
          Mortes: <Text style={[styles.value, { color: '#B00020' }]}>{resumo?.total_mortes ?? 0}</Text>
        </Text>
        <Text style={styles.line}>
          Suínos final: <Text style={styles.value}>{resumo?.suinos_em_andamento ?? '-'}</Text>
        </Text>
        <Text style={styles.line}>
          Peso médio chegada: <Text style={styles.value}>{resumo?.peso_medio_total_chegada ?? '-'}</Text>
        </Text>

        <Divider style={{ marginVertical: 6 }} />

        <Text style={styles.line}>
          Idade média: <Text style={styles.value}>{resumo?.idade_media_dias ?? '-'} dias</Text>
        </Text>
        <Text style={styles.line}>
          Consumo total ração: <Text style={styles.value}>{resumo?.consumo_total_racao ?? 0}</Text> kg
        </Text>
        <Text style={styles.line}>
          Ganho de peso/dia: <Text style={styles.value}>{resumo?.ganho_peso_por_dia ?? '-'}</Text> kg/dia
        </Text>
        <Text style={styles.line}>
          Consumo por dia: <Text style={styles.value}>{resumo?.consumo_por_dia ?? '-'}</Text> kg/dia
        </Text>
        <Text style={styles.line}>
          Consumo por dia/cabeça: <Text style={styles.value}>{resumo?.consumo_por_dia_por_cabeca ?? '-'}</Text> kg/dia/cab
        </Text>
        <Text style={styles.line}>
          Conversão alimentar: <Text style={styles.value}>{resumo?.conversao_alimentar ?? '-'}</Text>
        </Text>
        <Text style={styles.line}>
          % Mortalidade: <Text style={[styles.value, { color: '#B00020' }]}>{resumo?.percentual_mortalidade ?? 0}%</Text>
        </Text>
        <Text style={styles.line}>
          Dias de alojamento: <Text style={styles.value}>{resumo?.dias_alojamento ?? 0}</Text>
        </Text>
        <Text style={styles.line}>
          Data média de chegada: <Text style={styles.value}>{fmtBR(resumo?.data_media_chegada)}</Text>
        </Text>
        <Text style={styles.line}>
          Data média de saída: <Text style={styles.value}>{fmtBR(resumo?.data_media_saida)}</Text>
        </Text>
      </Card.Content>
    </Card>
  );

  const ChegadasCard = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Title title={`Chegadas (${chegadas.length})`} />
      <Card.Content style={{ gap: 8 }}>
        {chegadas.length === 0 ? (
          <Text style={styles.muted}>Nenhuma chegada registrada.</Text>
        ) : (
          chegadas.map((c) => (
            <View key={c.id} style={styles.itemRow}>
              <Text style={styles.itemTitle}>Data: {toBR(c.data)}</Text>
              <Text style={styles.itemLine}>Qtd: {c.quantidade} · Peso médio: {c.peso_medio} kg</Text>
              <Text style={styles.itemLine}>Origem: {c.origem}</Text>
              <Text style={styles.itemLine}>Responsável: {c.responsavel}</Text>
              {c.observacoes ? <Text style={styles.itemLine}>Obs: {c.observacoes}</Text> : null}
              <Divider style={{ marginTop: 6 }} />
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );

  const MortesCard = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Title title={`Mortes (${mortes.length})`} />
      <Card.Content style={{ gap: 8 }}>
        {mortes.length === 0 ? (
          <Text style={styles.muted}>Nenhum registro de morte.</Text>
        ) : (
          mortes.map((m) => (
            <View key={m.id} style={styles.itemRow}>
              <Text style={styles.itemTitle}>Data: {toBR(m.data_morte)}</Text>
              <Text style={styles.itemLine}>Causa: {m.causa}</Text>
              <Text style={styles.itemLine}>Mossa: {m.mossa}</Text>
              <Divider style={{ marginTop: 6 }} />
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );

  const ObservacoesCard = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Title title={`Observações (${observacoes.length})`} />
      <Card.Content style={{ gap: 8 }}>
        {observacoes.length === 0 ? (
          <Text style={styles.muted}>Nenhuma observação registrada.</Text>
        ) : (
          observacoes.map((o) => (
            <View key={o.id} style={styles.itemRow}>
              <Text style={styles.itemLine}>{o.texto}</Text>
              <Divider style={{ marginTop: 6 }} />
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Lote Finalizado</Text>
      <Text style={styles.subtitulo}>{lote?.nome || '-'}</Text>

      <Header />

      {loading && <Text style={{ marginBottom: 8 }}>Carregando…</Text>}

      <ResumoCard />
      <ChegadasCard />
      <MortesCard />
      <ObservacoesCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f2f4f8' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitulo: { fontSize: 18, marginBottom: 12, fontWeight: '600' },

  cardHeader: { backgroundColor: '#E8F4FF', borderRadius: 12, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff' },

  line: { fontSize: 15, color: '#2C3E50' },
  value: { fontWeight: '700' },
  muted: { color: '#7f8c8d' },

  itemRow: { marginBottom: 8 },
  itemTitle: { fontWeight: '700', color: '#2C3E50' },
  itemLine: { color: '#2C3E50' },
});
