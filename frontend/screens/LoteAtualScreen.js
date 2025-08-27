// src/screens/LoteAtualScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

export default function LoteAtualScreen({ navigation }) {
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(false);

  const carregarResumo = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getResumoAtivo(); // GET /lotes/ativo/resumo/
      console.log("RESUMO ATUAL:", data); // 👀 debug
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.cardResumo} elevation={2}>
          <Card.Title
            title={resumo?.nome || 'Sem lote ativo'}
            titleVariant="titleMedium"
            titleStyle={styles.cardTitle}
            subtitle={resumo ? `Status: ${resumo.status}` : 'Crie um lote ativo para começar'}
            subtitleStyle={styles.cardSubtitle}
          />

          {resumo ? (
            <View>
              {/* CHIPS DO TOPO */}
              <Card.Content style={styles.chipsRow}>
                <Chip style={styles.chip} icon="pig">
                  Suínos: {resumo.suinos_em_andamento ?? '-'}
                </Chip>
                <Chip style={styles.chip} icon="calendar">
                  {resumo.status}
                </Chip>
                <Chip style={styles.chip} icon="scale-bathroom">
                  Peso méd. chegadas: {resumo.peso_medio_chegadas ?? '-'}
                </Chip>
                <Chip style={styles.chip} icon="skull">
                  Mortes: {resumo.total_mortes ?? '-'}
                </Chip>
              </Card.Content>

              {/* --- NOVO BLOCO DE MÉTRICAS --- */}
              <Divider style={{ marginVertical: 10 }} />
              <Card.Content style={{ gap: 6 }}>
                <Text style={styles.metric}>
                  Dias de alojamento: <Text style={styles.value}>{resumo.dias_alojamento ?? 0}</Text>
                </Text>
                <Text style={styles.metric}>
                  Data média de chegada: <Text style={styles.value}>{fmtBR(resumo.data_media_chegada)}</Text>
                </Text>
                <Text style={styles.metric}>
                  Data média de saída: <Text style={styles.value}>{fmtBR(resumo.data_media_saida)}</Text>
                </Text>
                <Text style={styles.metric}>
                  Consumo total ração: <Text style={styles.value}>{resumo.consumo_total_racao ?? '-'}</Text> kg
                </Text>
                <Text style={styles.metric}>
                  Ganho de peso/dia: <Text style={styles.value}>{resumo.ganho_peso_por_dia ?? '-'}</Text> kg/dia
                </Text>
                <Text style={styles.metric}>
                  Consumo por dia: <Text style={styles.value}>{resumo.consumo_por_dia ?? '-'}</Text> kg/dia
                </Text>
                <Text style={styles.metric}>
                  Consumo por dia/cabeça: <Text style={styles.value}>{resumo.consumo_por_dia_por_cabeca ?? '-'}</Text> kg/dia/cab
                </Text>
                <Text style={styles.metric}>
                  Conversão alimentar: <Text style={styles.value}>{resumo.conversao_alimentar ?? '-'}</Text>
                </Text>
                <Text style={styles.metric}>
                  % Mortalidade: <Text style={[styles.value, { color: '#B00020' }]}>{resumo.percentual_mortalidade ?? 0}%</Text>
                </Text>
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
      </View>
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
