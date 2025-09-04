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
const GREEN = '#2ECC71';
const YELLOW = '#F1C40F';
const RED = '#E74C3C';
const PURPLE = '#9B59B6';
const BLUE = '#3498DB';

function niceCeil(max) {
  if (max <= 0) return 0;
  if (max <= 10) return Math.ceil(max / 2) * 2;
  if (max <= 50) return Math.ceil(max / 5) * 5;
  if (max <= 100) return Math.ceil(max / 10) * 10;
  return Math.ceil(max / 20) * 20;
}
function barColor(pct) {
  if (pct <= 2) return GREEN;
  if (pct <= 5) return YELLOW;
  return RED;
}
const fmt = (v, d = 2) =>
  v === null || v === undefined || Number.isNaN(v) ? '–' : Number(v).toFixed(d);

export default function CalendarScreen() {
  const [series, setSeries] = useState([]); // [{id, nome, pct, isAtivo, dias, consumo, pesoIn, pesoOut}]
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
        const rAtivo = await api.getResumoAtivo(); // pode 404
        ativoItem = {
          ok: true,
          id: rAtivo.lote_id,
          nome: `${rAtivo.nome} (ativo)`,
          resumo: rAtivo,
          isAtivo: true,
        };
      } catch {}

      const all = [...resumosFinalizados, ...(ativoItem ? [ativoItem] : [])];

      const arr = all
        .filter((it) => it.ok && it.resumo)
        .map((it) => {
          const r = it.resumo || {};
          const totalChegadas = Number(r.total_chegadas || 0);
          const totalMortes = Number(r.total_mortes || 0);
          const pct = totalChegadas > 0 ? +((totalMortes / totalChegadas) * 100).toFixed(2) : 0;

          const dias = Number(r.dias_alojamento ?? 0);
          const consumo = Number(r.consumo_total_racao ?? 0);
          const pesoIn = r.peso_medio_chegadas != null ? Number(r.peso_medio_chegadas) : null;

          // Tentativa 1: usar ganho_peso_por_cabeca
          const gpc = r.ganho_peso_por_cabeca != null ? Number(r.ganho_peso_por_cabeca) : null;
          let pesoOut = null;
          if (Number.isFinite(pesoIn) && Number.isFinite(gpc)) {
            pesoOut = +(pesoIn + gpc);
          } else {
            // Tentativa 2: se houver ganho_peso_por_dia e total_chegadas/dias
            const gpd = r.ganho_peso_por_dia != null ? Number(r.ganho_peso_por_dia) : null;
            if (Number.isFinite(pesoIn) && Number.isFinite(gpd) && Number.isFinite(dias) && totalChegadas > 0) {
              const ganhoPorCabeca = (gpd * dias) / totalChegadas;
              if (Number.isFinite(ganhoPorCabeca)) {
                pesoOut = +(pesoIn + ganhoPorCabeca);
              }
            }
          }

          return {
            id: it.id,
            nome: it.nome,
            pct,
            isAtivo: it.isAtivo,
            dias: Number.isFinite(dias) ? dias : 0,
            consumo: Number.isFinite(consumo) ? consumo : 0,
            pesoIn: Number.isFinite(pesoIn) ? +pesoIn : null,
            pesoOut: Number.isFinite(pesoOut) ? +pesoOut : null,
          };
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

  // filtros + ordenação
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

  // ----- métricas dos gráficos -----
  // Mortalidade (já existente)
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

  const scalePct = useCallback(
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

  // Dias de alojamento
  const maxDiasReal = useMemo(
    () => seriesFiltrada.reduce((m, s) => Math.max(m, s.dias || 0), 0),
    [seriesFiltrada]
  );
  const maxDias = useMemo(() => niceCeil(maxDiasReal), [maxDiasReal]);
  const scaleDias = useCallback(
    (v) => {
      const maxBar = 160;
      if (maxDias <= 0) return 0;
      return Math.max(2, (v / maxDias) * maxBar);
    },
    [maxDias]
  );

  // Consumo de ração (kg)
  const maxConsumoReal = useMemo(
    () => seriesFiltrada.reduce((m, s) => Math.max(m, s.consumo || 0), 0),
    [seriesFiltrada]
  );
  const maxConsumo = useMemo(() => niceCeil(maxConsumoReal), [maxConsumoReal]);
  const scaleConsumo = useCallback(
    (v) => {
      const maxBar = 160;
      if (maxConsumo <= 0) return 0;
      return Math.max(2, (v / maxConsumo) * maxBar);
    },
    [maxConsumo]
  );

  // Pesos médios (kg)
  const maxPesoReal = useMemo(
    () =>
      seriesFiltrada.reduce((m, s) => {
        const cand = Math.max(s.pesoIn ?? 0, s.pesoOut ?? 0);
        return Math.max(m, cand);
      }, 0),
    [seriesFiltrada]
  );
  const maxPeso = useMemo(() => niceCeil(maxPesoReal), [maxPesoReal]);
  const scalePeso = useCallback(
    (v) => {
      const maxBar = 160;
      if (maxPeso <= 0) return 0;
      return Math.max(2, (v / maxPeso) * maxBar);
    },
    [maxPeso]
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
        {/* “chip” de ajuda */}
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

        {/* ===== Gráfico 1: Mortalidade (existente) ===== */}
        <Card style={styles.card}>
          <Card.Title title="Mortalidade (%) por lote" />
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
                  <View style={[styles.axisY, { height: 220 }]}>
                    <Text style={styles.axisYLabel}>{maxPct.toFixed(0)}%</Text>
                    <Text style={styles.axisYLabel}>{(maxPct * 0.5).toFixed(0)}%</Text>
                    <Text style={styles.axisYLabel}>0%</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.chartArea, { height: 220 }]}>
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
                                { height: scalePct(it.pct), backgroundColor: barColor(it.pct) },
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

        {/* ===== Gráfico 2: Dias de alojamento ===== */}
        <Card style={styles.card}>
          <Card.Title title="Dias de alojamento por lote" />
          <Card.Content>
            {seriesFiltrada.length === 0 ? (
              <Text style={{ color: '#7f8c8d' }}>Sem dados para exibir.</Text>
            ) : (
              <View style={styles.axisRow}>
                <View style={[styles.axisY, { height: 180 }]}>
                  <Text style={styles.axisYLabel}>{maxDias}</Text>
                  <Text style={styles.axisYLabel}>{Math.round(maxDias * 0.5)}</Text>
                  <Text style={styles.axisYLabel}>0</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.chartArea, { height: 180 }]}>
                    <View style={[styles.gridLine, { bottom: 160 }]} />
                    <View style={[styles.gridLine, { bottom: 80 }]} />
                    <View style={[styles.gridLine, { bottom: 0 }]} />

                    <View style={styles.barsRow}>
                      {seriesFiltrada.map((it) => (
                        <View key={it.id} style={styles.barWrap}>
                          <View
                            style={[
                              styles.bar,
                              { height: scaleDias(it.dias), backgroundColor: BLUE },
                            ]}
                          />
                          <Text numberOfLines={2} style={styles.barLabel}>{it.nome}</Text>
                          <Text style={styles.barValue}>{fmt(it.dias, 0)}d</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* ===== Gráfico 3: Consumo total de ração ===== */}
        <Card style={styles.card}>
          <Card.Title title="Consumo total de ração (kg) por lote" />
          <Card.Content>
            {seriesFiltrada.length === 0 ? (
              <Text style={{ color: '#7f8c8d' }}>Sem dados para exibir.</Text>
            ) : (
              <View style={styles.axisRow}>
                <View style={[styles.axisY, { height: 180 }]}>
                  <Text style={styles.axisYLabel}>{fmt(maxConsumo, 0)}</Text>
                  <Text style={styles.axisYLabel}>{fmt(maxConsumo * 0.5, 0)}</Text>
                  <Text style={styles.axisYLabel}>0</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.chartArea, { height: 180 }]}>
                    <View style={[styles.gridLine, { bottom: 160 }]} />
                    <View style={[styles.gridLine, { bottom: 80 }]} />
                    <View style={[styles.gridLine, { bottom: 0 }]} />

                    <View style={styles.barsRow}>
                      {seriesFiltrada.map((it) => (
                        <View key={it.id} style={styles.barWrap}>
                          <View
                            style={[
                              styles.bar,
                              { height: scaleConsumo(it.consumo), backgroundColor: PRIMARY },
                            ]}
                          />
                          <Text numberOfLines={2} style={styles.barLabel}>{it.nome}</Text>
                          <Text style={styles.barValue}>{fmt(it.consumo, 0)} kg</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* ===== Gráfico 4: Peso médio (chegada × saída) ===== */}
        <Card style={styles.card}>
          <Card.Title title="Peso médio (chegada × saída)" />
          <Card.Content>
            {seriesFiltrada.length === 0 ? (
              <Text style={{ color: '#7f8c8d' }}>Sem dados para exibir.</Text>
            ) : (
              <>
                {/* Legenda */}
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: BLUE }} />
                    <Text style={{ color: '#7f8c8d' }}>Chegada</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: PURPLE }} />
                    <Text style={{ color: '#7f8c8d' }}>Saída</Text>
                  </View>
                </View>

                <View style={styles.axisRow}>
                  <View style={[styles.axisY, { height: 180 }]}>
                    <Text style={styles.axisYLabel}>{fmt(maxPeso, 0)} kg</Text>
                    <Text style={styles.axisYLabel}>{fmt(maxPeso * 0.5, 0)} kg</Text>
                    <Text style={styles.axisYLabel}>0</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.chartArea, { height: 180 }]}>
                      <View style={[styles.gridLine, { bottom: 160 }]} />
                      <View style={[styles.gridLine, { bottom: 80 }]} />
                      <View style={[styles.gridLine, { bottom: 0 }]} />

                      {/* barras agrupadas */}
                      <View style={[styles.barsRow, { gap: 20 }]}>
                        {seriesFiltrada.map((it) => (
                          <View key={it.id} style={[styles.barWrap, { width: 90 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    width: 16,
                                    height: it.pesoIn != null ? scalePeso(it.pesoIn) : 2,
                                    backgroundColor: BLUE,
                                  },
                                ]}
                              />
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    width: 16,
                                    height: it.pesoOut != null ? scalePeso(it.pesoOut) : 2,
                                    backgroundColor: PURPLE,
                                  },
                                ]}
                              />
                            </View>
                            <Text numberOfLines={2} style={styles.barLabel}>{it.nome}</Text>
                            <Text style={styles.barValue}>
                              {fmt(it.pesoIn, 2)} → {fmt(it.pesoOut, 2)} kg
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </ScrollView>
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

  // cards e gráficos
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12 },
  center: { alignItems: 'center', paddingVertical: 24 },

  axisRow: { flexDirection: 'row', gap: 8 },
  axisY: { width: 56, justifyContent: 'space-between', paddingVertical: 2 },
  axisYLabel: { color: '#7f8c8d', fontSize: 12, textAlign: 'right' },

  chartArea: { paddingHorizontal: 8, justifyContent: 'flex-end', minWidth: 320 },
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
