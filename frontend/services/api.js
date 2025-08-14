// src/services/api.js
import { Platform } from 'react-native';

const ANDROID_EMULATOR = 'http://10.0.2.2:8000';   // Emulador Android
const LOCALHOST        = 'http://127.0.0.1:8000';  // iOS simulador / mesma máquina
// Se for DISPOSITIVO FÍSICO, troque pelo IP da sua máquina na rede:
const MACHINE_IP       = 'http://192.168.0.10:8000';

const BASE_URL =
  __DEV__
    ? (Platform.OS === 'android' ? ANDROID_EMULATOR : LOCALHOST)
    : MACHINE_IP;

const API = `${BASE_URL}/api`;

// Helper genérico de requisições
async function req(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!r.ok) {
    // tenta devolver o corpo de erro para facilitar debug
    const text = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} - ${text || r.statusText}`);
  }
  // DELETE geralmente não retorna JSON
  if (opts.method === 'DELETE' || r.status === 204) return true;
  return r.json();
}

export const api = {
  // ---- Lote ativo / resumo (para o dashboard) ----
  getLoteAtivo:   () => req(`/lotes/ativo/`),
  getResumoAtivo: () => req(`/lotes/ativo/resumo/`),

  // ---- Chegadas ----
  getChegadas:   (loteId) => req(`/chegadas/?lote=${encodeURIComponent(loteId)}`),
  postChegada:   (payload) => req(`/chegadas/`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteChegada: (id) => req(`/chegadas/${id}/`, { method: 'DELETE' }),

  // ---- Mortes ----
  getMortes:   (loteId) => req(`/mortes/?lote=${encodeURIComponent(loteId)}`),
  postMorte:   (payload) => req(`/mortes/`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteMorte: (id) => req(`/mortes/${id}/`, { method: 'DELETE' }),

  // ---- Observações ----
  getObservacoes:   (loteId) => req(`/observacoes/?lote=${encodeURIComponent(loteId)}`),
  postObservacao:   (payload) => req(`/observacoes/`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteObservacao: (id) => req(`/observacoes/${id}/`, { method: 'DELETE' }),
};
