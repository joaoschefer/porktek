// src/screens/LoteFinalizadoScreen.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Divider, Chip, ProgressBar } from 'react-native-paper';
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
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

const fmtNum = (v, d = 3) =>
  (v === null || v === undefined || Number.isNaN(v)) ? '-' : Number(v).toFixed(d);

export default function LoteFinalizadoScreen({ route }) {
  const { lote } = route.params || {}; // veio da Home via finalizados
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
      const [resumoRes, chegadasRes, mortesRes, obsRes] = await Promise.all([
        api.getResumoLote(loteId),
        api.getChegadas(loteId),
        api.getMortes(loteId),
        api.getObservacoes(loteId),
      ]);
      setResumo(resumoRes || null);
      setChegadas(Array.isArray(chegadasRes) ? chegadasRes : []);
      setMortes(Array.isArray(mortesRes) ? mortesRes : []);
      setObservacoes(Array.isArray(obsRes) ? obsRes : []);
    } catch (e) {
      console.log('Erro ao carregar tela Lote Finalizado:', e.message);
      setResumo(null);
      setChegadas([]);
      setMortes([]);
      setObservacoes([]);
    } finally {
      setLoading(false);
    }
  }, [loteId]);

  useEffect(() => { carregar(); }, [carregar]);

  const pesoMedioSaida = useMemo(() => {
    const inAvg = Number(resumo?.peso_medio_chegadas);
    const gainPerHead = Number(resumo?.ganho_peso_por_cabeca);
    if (Number.isFinite(inAvg) && Number.isFinite(gainPerHead)) {
      return inAvg + gainPerHead;
    }
    return null;
  }, [resumo]);

  // --------- Agregações para % por causa e por mossa ----------
  const totalMortes = mortes.length;

  const agruparPercentual = useCallback((lista, campo, vazioLabel = '—') => {
    if (!Array.isArray(lista) || lista.length === 0) return [];
    const map = new Map();
    for (const item of lista) {
      const chave = (item?.[campo] ?? '').toString().trim() || vazioLabel;
      map.set(chave, (map.get(chave) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: totalMortes ? (count / totalMortes) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [totalMortes]);

  const distPorCausa = useMemo(() => agruparPercentual(mortes, 'causa', 'Sem causa'), [mortes, agruparPercentual]);
  const distPorMossa = useMemo(() => agruparPercentual(mortes, 'mossa', 'Sem mossa'), [mortes, agruparPercentual]);

  // ------- UI blocks -------
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
          Saldo suínos: <Text style={styles.value}>{resumo?.suinos_em_andamento ?? '-'}</Text>
        </Text>

        <Divider style={{ marginVertical: 6 }} />

        <Text style={styles.line}>
          Peso méd. chegada: <Text style={styles.value}>{fmtNum(resumo?.peso_medio_chegadas, 3)}</Text> kg
        </Text>
        <Text style={styles.line}>
          Peso méd. saída: <Text style={styles.value}>{fmtNum(pesoMedioSaida, 3)}</Text> kg
        </Text>
        <Text style={styles.line}>
          Ganho de peso/cabeça: <Text style={styles.value}>{fmtNum(resumo?.ganho_peso_por_cabeca, 3)}</Text> kg
        </Text>
        <Text style={styles.line}>
          % Mortalidade: <Text style={[styles.value, { color: '#B00020' }]}>{fmtNum(resumo?.percentual_mortalidade, 2)}</Text>%
        </Text>

        <Divider style={{ marginVertical: 6 }} />

        <Text style={styles.line}>
          Consumo total de ração: <Text style={styles.value}>{fmtNum(resumo?.consumo_total_racao, 3)}</Text> kg
        </Text>
        <Text style={styles.line}>
          Conversão alimentar: <Text style={styles.value}>{fmtNum(resumo?.conversao_alimentar, 4)}</Text>
        </Text>

        <Divider style={{ marginVertical: 6 }} />

        <Text style={styles.line}>
          Dias de alojamento: <Text style={styles.value}>{resumo?.dias_alojamento ?? '-'}</Text>
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
              <Text style={styles.itemLine}>
                Qtd: {c.quantidade} · Peso médio: {fmtNum(c.peso_medio, 3)} kg
                {c.peso_total ? ` · Peso total: ${fmtNum(c.peso_total, 3)} kg` : ''}
              </Text>
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

  const MortesCarousel = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Title title={`Mortes (${mortes.length})`} />
      <Card.Content>
        {mortes.length === 0 ? (
          <Text style={styles.muted}>Nenhum registro de morte.</Text>
        ) : (
          <>
            {/* Cards individuais (carrossel) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 6, paddingRight: 6, gap: 10 }}
            >
              {mortes.map((m) => (
                <View key={m.id} style={styles.morteCard}>
                  <Text style={styles.morteTitle}>{toBR(m.data_morte)}</Text>
                  <Text style={styles.morteLine}>Causa: <Text style={styles.value}>{m.causa || '—'}</Text></Text>
                  <Text style={styles.morteLine}>Mossa: <Text style={styles.value}>{m.mossa || '—'}</Text></Text>
                  {m.sexo ? <Text style={styles.morteLine}>Sexo: <Text style={styles.value}>{m.sexo}</Text></Text> : null}
                </View>
              ))}
            </ScrollView>

            {/* Distribuição percentual */}
            <Divider style={{ marginVertical: 10 }} />
            <Text style={[styles.itemTitle, { marginBottom: 6 }]}>Distribuição (%)</Text>

            {/* Por causa */}
            <Text style={styles.smallHeader}>Por causa</Text>
            {distPorCausa.map((it) => (
              <View key={`causa-${it.label}`} style={styles.distRow}>
                <View style={styles.distHeader}>
                  <Text style={styles.distLabel} numberOfLines={1}>
                    {it.label}
                  </Text>
                  <Text style={styles.distValue}>{fmtNum(it.percent, 1)}% · {it.count}</Text>
                </View>
                <ProgressBar progress={it.percent / 100} style={styles.progress} />
              </View>
            ))}

            <Divider style={{ marginVertical: 8 }} />

            {/* Por mossa */}
            <Text style={styles.smallHeader}>Por mossa</Text>
            {distPorMossa.map((it) => (
              <View key={`mossa-${it.label}`} style={styles.distRow}>
                <View style={styles.distHeader}>
                  <Text style={styles.distLabel} numberOfLines={1}>
                    {it.label}
                  </Text>
                  <Text style={styles.distValue}>{fmtNum(it.percent, 1)}% · {it.count}</Text>
                </View>
                <ProgressBar progress={it.percent / 100} style={styles.progress} />
              </View>
            ))}
          </>
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
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>Lote Finalizado</Text>
      <Text style={styles.subtitulo}>{lote?.nome || '-'}</Text>

      <Header />
      {loading && <Text style={{ marginBottom: 8 }}>Carregando…</Text>}

      <ResumoCard />
      <ChegadasCard />
      <MortesCarousel />
      <ObservacoesCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f2f4f8' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#2C3E50' },
  subtitulo: { fontSize: 18, marginBottom: 12, fontWeight: '600', color: '#2C3E50' },

  cardHeader: { backgroundColor: '#E8F4FF', borderRadius: 12, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16 },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff' },

  line: { fontSize: 15, color: '#2C3E50' },
  value: { fontWeight: '700', color: '#2C3E50' },
  muted: { color: '#7f8c8d' },

  itemRow: { marginBottom: 8 },
  itemTitle: { fontWeight: '700', color: '#2C3E50' },
  itemLine: { color: '#2C3E50' },

  morteCard: {
    width: 220,
    backgroundColor: '#F7F8FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECECFF',
  },
  morteTitle: { fontWeight: '700', marginBottom: 4, color: '#2C3E50' },
  morteLine: { color: '#2C3E50', marginTop: 2 },

  // Distribuição
  smallHeader: { fontWeight: '700', color: '#2C3E50', marginBottom: 6, marginTop: 2 },
  distRow: { marginBottom: 10 },
  distHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distLabel: { color: '#2C3E50', maxWidth: '70%' },
  distValue: { color: '#2C3E50', fontWeight: '700' },
  progress: { height: 8, borderRadius: 8, backgroundColor: '#ECECFF' },
});
