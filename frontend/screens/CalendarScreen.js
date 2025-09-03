// src/screens/CalendarScreen.js
import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appbar,
  Card,
  Text,
  ActivityIndicator,
  Divider,
  SegmentedButtons,
  TextInput,
} from 'react-native-paper';
import { api } from '../services/api';

const PRIMARY = '#0A84FF';

function niceCeil(max) {
  if (max <= 0) return 0;
  if (max <= 10) return Math.ceil(max / 2) * 2;
  if (max <= 20) return Math.ceil(max / 5) * 5;
  return Math.ceil(max / 10) * 10;
}
function barColor(pct) {
  if (pct <= 2) return '#2ECC71';
  if (pct <= 5) return '#F1C40F';
  return '#E74C3C';
}

export default function CalendarScreen() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('pct_desc'); // 'pct_desc' | 'pct_asc' | 'name_asc'

  const montarSerie = useCallback(async () => {
    try {
      setErr('');
      setLoading(true);

      const finalizados = await api.getFinalizados();
      const resumosFinalizados = await Promise.all(
        finalizados.map((l) =>
          api
            .getResumoLote(l.id)
            .then((r) => ({ ok: true, id: l.id, nome: l.nome, resumo: r, isAtivo: false }))
            .catch(() => ({ ok: false, id: l.id, nome: l.nome, resumo: null, isAtivo: false }))
        )
      );

      let ativoItem = null;
      try {
        const rAtivo = await api.getResumoAtivo();
        ativoItem = { ok: true, id: rAtivo.lote_id, nome: `${rAtivo.nome} (ativo)`, resumo: rAtivo, isAtivo: true };
      } catch {}

      const all = [...resumosFinalizados, ...(ativoItem ? [ativoItem] : [])];

      const arr = all
        .filter((it) => it.ok && it.resumo)
        .map((it) => {
          const totalChegadas = Number(it.resumo.total_chegadas || 0);
          const totalMortes = Number(it.resumo.total_mortes || 0);
          const pct = totalChegadas > 0 ? +((totalMortes / totalChegadas) * 100).toFixed(2) : 0;
          return { id: it.id, nome: it.nome, pct, isAtivo: it.isAtivo };
        });

      setSeries(arr);
    } catch (e) {
      setErr('Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { montarSerie(); }, [montarSerie]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await montarSerie();
    setRefreshing(false);
  }, [montarSerie]);

  const seriesFiltrada = useMemo(() => {
    let arr = [...series];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter((s) => s.nome.toLowerCase().includes(q));
    }
    if (order === 'pct_desc') arr.sort((a, b) => b.pct - a.pct);
    else if (order === 'pct_asc') arr.sort((a, b) => a.pct - b.pct);
    else if (order === 'name_asc') arr.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return arr;
  }, [series, query, order]);

  const maxPctReal = useMemo(
    () => seriesFiltrada.reduce((m, s) => Math.max(m, s.pct), 0),
    [seriesFiltrada]
  );
  const maxPct = useMemo(() => niceCeil(maxPctReal), [maxPctReal]);

  const avgPct = useMemo(() => {
    if (seriesFiltrada.length === 0) return 0;
    const soma = seriesFiltrada.reduce((acc, s) => acc + s.pct, 0);
    return +(soma / seriesFiltrada.length).toFixed(2);
  }, [seriesFiltrada]);

  const scale = useCallback(
    (pct) => {
      const maxBar = 220;
      if (maxPct <= 0) return 0;
      return Math.max(2, (pct / maxPct) * maxBar);
    },
    [maxPct]
  );
  const pctToY = useCallback(
    (pct) => {
      const maxBar = 220;
      if (maxPct <= 0) return maxBar;
      const h = (pct / maxPct) * maxBar;
      return maxBar - h;
    },
    [maxPct]
  );

  return (
    <View style={styles.screen}>
      {/* Appbar igual à Home */}
      <Appbar.Header style={styles.appBar}>
        <Appbar.Content title="Indicadores por Lote" titleStyle={styles.appBarTitle} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Subtítulo em “chip” azul claro (opcional) */}
        <View style={styles.headerHint}>
          <Text style={styles.headerHintText}>
            % de Mortalidade por lote (quanto menor, melhor).
          </Text>
        </View>

        {/* Controles */}
        <Card style={[styles.card, { marginBottom: 12 }]}>
          <Card.Content style={{ gap: 12 }}>
            <TextInput
              mode="outlined"
              placeholder="Buscar por nome do lote…"
              value={query}
              onChangeText={setQuery}
              left={<TextInput.Icon icon="magnify" />}
            />
            <SegmentedButtons
              value={order}
              onValueChange={setOrder}
              buttons={[
                { value: 'pct_desc', label: 'Maior→Menor', icon: 'arrow-down' },
                { value: 'pct_asc', label: 'Menor→Maior', icon: 'arrow-up' },
                { value: 'name_asc', label: 'A–Z', icon: 'sort-alphabetical-variant' },
              ]}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8 }}>Carregando…</Text>
              </View>
            ) : err ? (
              <Text style={{ color: '#B00020' }}>{err}</Text>
            ) : seriesFiltrada.length === 0 ? (
              <Text style={{ color: '#7f8c8d' }}>Sem dados para exibir.</Text>
            ) : (
              <>
                <View style={styles.axisRow}>
                  <View style={styles.axisY}>
                    <Text style={styles.axisYLabel}>{maxPct.toFixed(0)}%</Text>
                    <Text style={styles.axisYLabel}>{(maxPct * 0.5).toFixed(0)}%</Text>
                    <Text style={styles.axisYLabel}>0%</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chartArea}>
                      <View style={[styles.gridLine, { bottom: 220 }]} />
                      <View style={[styles.gridLine, { bottom: 110 }]} />
                      <View style={[styles.gridLine, { bottom: 0 }]} />

                      {avgPct > 0 && (
                        <View pointerEvents="none" style={[styles.avgLine, { bottom: pctToY(avgPct) }]}>
                          <Text style={styles.avgBadge}>Média {avgPct}%</Text>
                        </View>
                      )}

                      <View style={styles.barsRow}>
                        {seriesFiltrada.map((it) => (
                          <View key={it.id} style={styles.barWrap}>
                            <View
                              style={[
                                styles.bar,
                                { height: scale(it.pct), backgroundColor: barColor(it.pct) },
                              ]}
                            />
                            <Text numberOfLines={2} style={styles.barLabel}>{it.nome}</Text>
                            <Text style={styles.barValue}>{it.pct}%</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </ScrollView>
                </View>

                <Divider style={{ marginTop: 12, marginBottom: 8 }} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: 12 }}>
                  <Text style={{ color: '#7f8c8d' }}>
                    Lotes: <Text style={{ color: '#2C3E50', fontWeight: '700' }}>{seriesFiltrada.length}</Text>
                  </Text>
                  <Text style={{ color: '#7f8c8d' }}>
                    Máx.: <Text style={{ color: '#2C3E50', fontWeight: '700' }}>{maxPctReal.toFixed(2)}%</Text>
                  </Text>
                  <Text style={{ color: '#7f8c8d' }}>
                    Média: <Text style={{ color: '#2C3E50', fontWeight: '700' }}>{avgPct.toFixed(2)}%</Text>
                  </Text>
                </View>
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f9fc' },

  // Appbar igual à Home
  appBar: { backgroundColor: '#0075C4', elevation: 4 },
  appBarTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 20 },

  container: { padding: 16 },

  // “chip” descritivo logo abaixo do título
  headerHint: {
    backgroundColor: '#E8F4FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerHintText: { color: '#004166' },

  // cards e gráfico
  card: { backgroundColor: '#fff', borderRadius: 14 },
  center: { alignItems: 'center', paddingVertical: 24 },

  axisRow: { flexDirection: 'row', gap: 8 },
  axisY: { width: 44, justifyContent: 'space-between', height: 220, paddingVertical: 2 },
  axisYLabel: { color: '#7f8c8d', fontSize: 12, textAlign: 'right' },

  chartArea: { height: 220, paddingHorizontal: 8, justifyContent: 'flex-end', minWidth: 320 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#E6EEF5' },
  avgLine: {
    position: 'absolute',
    left: 0, right: 0, height: 0,
    borderTopWidth: 2, borderTopColor: PRIMARY,
    justifyContent: 'flex-start', alignItems: 'flex-end',
  },
  avgBadge: {
    position: 'absolute', top: -14, right: 6,
    backgroundColor: PRIMARY, color: 'white', fontSize: 10,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },

  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  barWrap: { width: 90, alignItems: 'center' },
  bar: { width: 40, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  barLabel: { marginTop: 6, fontSize: 12, textAlign: 'center', color: '#2C3E50' },
  barValue: { fontSize: 12, marginTop: 2, fontWeight: '700', color: '#2C3E50' },
});
