// src/screens/CalendarScreen.js
import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Text, ActivityIndicator, Divider } from 'react-native-paper';
import { api } from '../services/api';

const PRIMARY = '#0A84FF';

export default function CalendarScreen() {
  const [series, setSeries] = useState([]); // [{ id, nome, pct }]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // carrega lotes finalizados + resumo do ativo (se existir)
  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setErr('');

      const finalizados = await api.getFinalizados(); // [{id, nome, ...}]
      // pega resumos de todos os finalizados
      const resumosFinalizados = await Promise.all(
        finalizados.map((l) =>
          api
            .getResumoLote(l.id)
            .then((r) => ({ ok: true, id: l.id, nome: l.nome, resumo: r }))
            .catch(() => ({ ok: false, id: l.id, nome: l.nome, resumo: null }))
        )
      );

      // tenta ativo (se houver)
      let ativoItem = null;
      try {
        const rAtivo = await api.getResumoAtivo(); // pode 404
        ativoItem = { ok: true, id: rAtivo.lote_id, nome: `${rAtivo.nome} (ativo)`, resumo: rAtivo };
      } catch {
        // sem ativo -> ignora
      }

      const all = [...resumosFinalizados, ...(ativoItem ? [ativoItem] : [])];

      // monta série com percentuais
      const arr = all
        .filter((it) => it.ok && it.resumo)
        .map((it) => {
          const totalChegadas = Number(it.resumo.total_chegadas || 0);
          const totalMortes = Number(it.resumo.total_mortes || 0);
          const pct = totalChegadas > 0 ? +(totalMortes / totalChegadas * 100).toFixed(2) : 0;
          return { id: it.id, nome: it.nome, pct };
        })
        // ordenar por maior mortalidade
        .sort((a, b) => b.pct - a.pct);

      setSeries(arr);
    } catch (e) {
      setErr('Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const maxPct = useMemo(() => {
    return series.reduce((m, s) => Math.max(m, s.pct), 0);
  }, [series]);

  // escala de altura (em px)
  const scale = useCallback(
    (pct) => {
      const maxBar = 200; // altura máxima do gráfico
      if (maxPct <= 0) return 0;
      return Math.max(2, (pct / maxPct) * maxBar);
    },
    [maxPct]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Indicadores por Lote</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        % de Mortalidade por lote (quanto menor, melhor).
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8 }}>Carregando…</Text>
            </View>
          ) : err ? (
            <Text style={{ color: '#B00020' }}>{err}</Text>
          ) : series.length === 0 ? (
            <Text style={{ color: '#7f8c8d' }}>Sem dados para exibir.</Text>
          ) : (
            <>
              {/* Eixo Y simples */}
              <View style={styles.axisRow}>
                <View style={styles.axisY}>
                  <Text style={styles.axisYLabel}>{maxPct.toFixed(0)}%</Text>
                  <Text style={styles.axisYLabel}>{(maxPct * 0.5).toFixed(0)}%</Text>
                  <Text style={styles.axisYLabel}>0%</Text>
                </View>

                {/* Área do gráfico com barras horizontais scrolláveis se forem muitas */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chartArea}>
                    {/* linhas guia */}
                    <View style={[styles.gridLine, { bottom: 200 }]} />
                    <View style={[styles.gridLine, { bottom: 100 }]} />
                    <View style={[styles.gridLine, { bottom: 0 }]} />
                    {/* barras */}
                    <View style={styles.barsRow}>
                      {series.map((it) => (
                        <View key={it.id} style={styles.barWrap}>
                          <View style={[styles.bar, { height: scale(it.pct) }]} />
                          <Text numberOfLines={2} style={styles.barLabel}>{it.nome}</Text>
                          <Text style={styles.barValue}>{it.pct}%</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>

              <Divider style={{ marginTop: 12, marginBottom: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#7f8c8d' }}>
                  Lotes: <Text style={{ color: '#2C3E50', fontWeight: '700' }}>{series.length}</Text>
                </Text>
                <Text style={{ color: '#7f8c8d' }}>
                  Máx.: <Text style={{ color: '#2C3E50', fontWeight: '700' }}>{maxPct.toFixed(2)}%</Text>
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F6F9FC' },
  title: { fontWeight: '700', color: '#2C3E50' },
  subtitle: { color: '#3B5568', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14 },

  center: { alignItems: 'center', paddingVertical: 24 },

  axisRow: { flexDirection: 'row', gap: 8 },
  axisY: { width: 40, justifyContent: 'space-between', height: 200, paddingVertical: 2 },
  axisYLabel: { color: '#7f8c8d', fontSize: 12, textAlign: 'right' },

  chartArea: {
    height: 200,
    paddingBottom: 0,
    paddingHorizontal: 8,
    justifyContent: 'flex-end',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E6EEF5',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  barWrap: { width: 80, alignItems: 'center' },
  bar: {
    width: 36,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: PRIMARY,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'center',
    color: '#2C3E50',
  },
  barValue: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
    color: '#2C3E50',
  },
});
