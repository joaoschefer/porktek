// src/screens/LoteAtualScreen.js
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Button, Divider, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';

const PRIMARY = '#0A84FF';
const PRIMARY_DARK = '#085DB8';

const fmtBR = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('pt-BR');
};
const nOrDash = (v, dec = 3) => (v === null || v === undefined ? '-' : Number(v).toFixed(dec));
const intOrDash = (v) => (v === null || v === undefined ? '-' : String(v));

export default function LoteAtualScreen({ navigation }) {
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(false);

  const carregarResumo = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getResumoAtivo(); // GET /lotes/ativo/resumo/
      setResumo(data);
    } catch (e) {
      console.log('Erro ao buscar resumo ativo:', e.message);
      setResumo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregarResumo(); }, [carregarResumo]));

  const noLote = !resumo;

  // --------- Derivados "por cabeça" (calculados no front) ---------
  const {
    total_chegadas = 0,
    dias_alojamento = 0,
    ganho_peso_por_dia = null,
    consumo_total_racao = null,
  } = resumo || {};

  const ganhoPorCabeca = useMemo(() => {
    if (!ganho_peso_por_dia || !dias_alojamento || !total_chegadas) return null;
    const ganhoTotal = Number(ganho_peso_por_dia) * Number(dias_alojamento);
    return ganhoTotal / Number(total_chegadas);
  }, [ganho_peso_por_dia, dias_alojamento, total_chegadas]);

  const ganhoDiaPorCabeca = useMemo(() => {
    if (!ganho_peso_por_dia || !total_chegadas) return null;
    return Number(ganho_peso_por_dia) / Number(total_chegadas);
  }, [ganho_peso_por_dia, total_chegadas]);

  const consumoPorCabeca = useMemo(() => {
    if (consumo_total_racao == null || !total_chegadas) return null;
    return Number(consumo_total_racao) / Number(total_chegadas);
  }, [consumo_total_racao, total_chegadas]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.cardResumo} elevation={2}>
          <Card.Title
            title={resumo?.nome || 'Sem lote ativo'}
            titleVariant="titleMedium"
            titleStyle={styles.cardTitle}
            subtitle={resumo ? `Status: ${resumo.status}` : 'Crie um lote ativo para começar'}
            subtitleStyle={styles.cardSubtitle}
          />

          {resumo ? (
            <View style={{ gap: 10 }}>
              {/* Linha principal padronizada */}
              <Card.Content style={styles.chipsRow}>
                <Chip style={styles.chip} icon="pig">Suínos: {intOrDash(resumo.suinos_em_andamento)}</Chip>
                <Chip style={styles.chip} icon="calendar">{resumo.status}</Chip>
                <Chip style={styles.chip} icon="scale-bathroom">
                  Peso méd. chegadas: {nOrDash(resumo.peso_medio_chegadas, 3)}
                </Chip>
                <Chip style={styles.chip} icon="skull">Mortes: {intOrDash(resumo.total_mortes)}</Chip>
              </Card.Content>

              <Divider style={{ marginVertical: 6 }} />

              {/* Datas + dias de alojamento */}
              <Card.Content style={styles.chipsRow}>
                <Chip style={styles.chip} icon="calendar">
                  Data méd. chegada: {fmtBR(resumo.data_media_chegada)}
                </Chip>
                <Chip style={styles.chip} icon="calendar-month">
                  Data méd. saída: {fmtBR(resumo.data_media_saida)}
                </Chip>
                <Chip style={styles.chip} icon="timeline-clock">
                  Dias de aloj.: {intOrDash(resumo.dias_alojamento)}
                </Chip>
              </Card.Content>

              <Divider style={{ marginVertical: 6 }} />

              {/* Métricas por cabeça e afins */}
              <Card.Content style={styles.chipsRow}>
                <Chip style={styles.chip} icon="weight-kilogram">
                  Ganho/cab.: {nOrDash(ganhoPorCabeca, 3)} kg
                </Chip>
                <Chip style={styles.chip} icon="weight">
                  Ganho/dia/cab.: {nOrDash(ganhoDiaPorCabeca, 4)} kg/dia/cab
                </Chip>
                <Chip style={styles.chip} icon="percent">
                  % Mortalidade: {resumo.percentual_mortalidade == null ? '-' : `${Number(resumo.percentual_mortalidade).toFixed(2)}%`}
                </Chip>
              </Card.Content>

              <Card.Content style={styles.chipsRow}>
                <Chip style={styles.chip} icon="food-apple">
                  Consumo ração: {nOrDash(resumo.consumo_total_racao, 3)} kg
                </Chip>
                <Chip style={styles.chip} icon="account">
                  Consumo/cab.: {nOrDash(consumoPorCabeca, 4)} kg/cab
                </Chip>
                <Chip style={styles.chip} icon="swap-vertical">
                  Conv. alimentar: {resumo.conversao_alimentar == null ? '-' : Number(resumo.conversao_alimentar).toFixed(4)}
                </Chip>
              </Card.Content>
            </View>
          ) : null}

          {loading ? <Text style={{ margin: 8 }}>Atualizando…</Text> : null}
        </Card>

        <Text style={styles.sessaoTitulo}>Ações rápidas</Text>
        <Divider style={{ marginBottom: 12 }} />

        <View style={styles.grid}>
          <Button
            mode="contained"
            icon="truck-delivery"
            onPress={() => navigation.navigate('Chegada', { lote: resumo ? { id: resumo.lote_id, nome: resumo.nome } : null })}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            disabled={noLote}
          >
            Chegada
          </Button>

          <Button
            mode="contained"
            icon="skull"
            onPress={() => navigation.navigate('Mortes', { lote: resumo ? { id: resumo.lote_id, nome: resumo.nome } : null })}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            disabled={noLote}
          >
            Mortes
          </Button>

          <Button
            mode="contained"
            icon="note-text"
            onPress={() => navigation.navigate('Observacoes Gerais', { lote: resumo ? { id: resumo.lote_id, nome: resumo.nome } : null })}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            disabled={noLote}
          >
            Observações
          </Button>

          <Button
            mode="contained"
            icon="food-apple"
            onPress={() => navigation.navigate('Racao', { lote: resumo ? { id: resumo.lote_id, nome: resumo.nome } : null })}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            disabled={!resumo}
          >
            Ração
          </Button>

          <Button
            mode="contained"
            icon="exit-run"
            onPress={() => navigation.navigate('Saida', { lote: resumo ? { id: resumo.lote_id, nome: resumo.nome } : null })}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            disabled={!resumo}
          >
            Saída
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC' },
  content: { flex: 1, padding: 16 },
  cardResumo: { backgroundColor: '#E8F2FF', borderRadius: 14, marginBottom: 20 },
  cardTitle: { color: PRIMARY_DARK, fontWeight: '700' },
  cardSubtitle: { color: '#3B5568' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#fff' },
  sessaoTitulo: { fontSize: 16, fontWeight: '700', color: '#2C3E50', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  btn: { flexBasis: '48%', borderRadius: 12, backgroundColor: PRIMARY },
  btnContent: { height: 56 },
  btnLabel: { fontWeight: '700', color: '#fff' },

  metric: { color: '#2C3E50' },
  value: { fontWeight: '700', color: '#2C3E50' },
});
