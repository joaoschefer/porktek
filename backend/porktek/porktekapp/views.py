# porktekapp/views.py
from datetime import date, datetime
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, decorators, response, status

from .models import Lote, Chegada, Morte, Observacao, RacaoEntrada, Saida
from .serializers import (
    LoteSerializer, ChegadaSerializer, MorteSerializer,
    ObservacaoSerializer, RacaoEntradaSerializer, SaidaSerializer
)

# -------- helpers --------

def _date_to_ordinal(d):
    """Aceita date, ou string YYYY-MM-DD; retorna ordinal (int) ou None."""
    if not d:
        return None
    if isinstance(d, str):
        try:
            y, m, day = [int(x) for x in d.split('-')]
            d = date(y, m, day)
        except Exception:
            return None
    return d.toordinal()

def _f(x, digits=None):
    """Converte Decimal/None para float ou None. Se digits for int, arredonda."""
    if x is None:
        return None
    if isinstance(x, Decimal):
        x = float(x)
    try:
        xf = float(x)
        if digits is not None:
            return round(xf, digits)
        return xf
    except Exception:
        return None

def _safe_div(num, den, digits=None):
    """Divide com guarda (retorna None se inválido)."""
    n = _f(num)
    d = _f(den)
    if n is None or d is None or d == 0:
        return None
    val = n / d
    return round(val, digits) if isinstance(digits, int) else val

def _to_date(v):
    """Converte v para date. Aceita datetime, date ou ISO 'YYYY-MM-DD'."""
    if v is None:
        return None
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, str):
        try:
            y, m, d = [int(x) for x in v.split('-')]
            return date(y, m, d)
        except Exception:
            return None
    return None


# -------- Lotes --------

class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.all().order_by('-criado_em')
    serializer_class = LoteSerializer

    def _build_resumo_payload(self, lote: Lote):
        # básicos (converte agregados para número seguro)
        total_chegadas = int(Chegada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0)
        total_mortes = int(Morte.objects.filter(lote=lote).count() or 0)
        total_saidas_qtd = int(Saida.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0)

        suinos_atuais = max(total_chegadas - total_mortes - total_saidas_qtd, 0)

        status_txt = 'Em andamento' if lote.ativo else 'Finalizado'

        # ---------------- PESO MÉDIO GERAL DE CHEGADAS ----------------
        chegadas_vals = Chegada.objects.filter(lote=lote).values('quantidade', 'peso_medio', 'peso_total')
        soma_peso, soma_q = 0.0, 0
        for c in chegadas_vals:
            q = int(c['quantidade'] or 0)
            if q <= 0:
                continue
            if c['peso_total'] is not None:
                soma_peso += _f(c['peso_total']) or 0.0
            else:
                soma_peso += q * (_f(c['peso_medio']) or 0.0)
            soma_q += q
        peso_medio_total_chegada = round(soma_peso / soma_q, 3) if soma_q > 0 else None
        # ----------------------------------------------------------------

        # ração (kg)
        consumo_total_racao = _f(
            RacaoEntrada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'], 3
        ) or 0.0

        # pesos de chegada/saída para cálculo de ganho/conversão
        peso_chegada_total = soma_peso  # já calculado acima com prioridade para peso_total
        peso_saida_total = _f(Saida.objects.filter(lote=lote).aggregate(s=Sum('peso_total'))['s']) or 0.0
        ganho_peso_total = max(peso_saida_total - peso_chegada_total, 0.0)

        # datas médias ponderadas por quantidade
        # chegada
        chegadas_dt = Chegada.objects.filter(lote=lote).values('data', 'quantidade')
        soma_w_chegada, soma_q_chegada = 0, 0
        for r in chegadas_dt:
            ordv = _date_to_ordinal(r['data'])
            q = int(r['quantidade'] or 0)
            if ordv and q > 0:
                soma_w_chegada += ordv * q
                soma_q_chegada += q
        data_media_chegada = (
            date.fromordinal(int(round(soma_w_chegada / soma_q_chegada)))
            if soma_q_chegada > 0 else None
        )

        # saída
        saidas_dt = Saida.objects.filter(lote=lote).values('data', 'quantidade')
        soma_w_saida, soma_q_saida = 0, 0
        for r in saidas_dt:
            ordv = _date_to_ordinal(r['data'])
            q = int(r['quantidade'] or 0)
            if ordv and q > 0:
                soma_w_saida += ordv * q
                soma_q_saida += q
        data_media_saida = (
            date.fromordinal(int(round(soma_w_saida / soma_q_saida)))
            if soma_q_saida > 0 else None
        )

        # dias de alojamento
        hoje = timezone.localdate()
        if data_media_chegada:
            # se finalizado, use a data média de saída (ou finalizado_em) como limite superior; senão, hoje
            limite = (data_media_saida or _to_date(lote.finalizado_em) or hoje) if not lote.ativo else hoje
            dias_alojamento = max((limite - data_media_chegada).days, 0)
        else:
            dias_alojamento = 0

        # idade média (para ativo) — opcional manter como diferença até hoje
        idade_media_dias = max((hoje - data_media_chegada).days, 0) if data_media_chegada else 0

        # derivados
        consumo_por_dia = _safe_div(consumo_total_racao, dias_alojamento, 3)
        cabecas_inicial = total_chegadas
        cabecas_final = suinos_atuais
        cabecas_media = (cabecas_inicial + cabecas_final) / 2 if (cabecas_inicial + cabecas_final) > 0 else 0
        consumo_por_dia_por_cabeca = _safe_div(consumo_total_racao, dias_alojamento * cabecas_media, 4)

        ganho_peso_por_dia = _safe_div(ganho_peso_total, dias_alojamento, 3)
        conversao_alimentar = _safe_div(consumo_total_racao, ganho_peso_total, 4)
        percentual_mortalidade = round((total_mortes / total_chegadas) * 100.0, 2) if total_chegadas > 0 else 0.0

        return {
            'lote_id': lote.id,
            'nome': lote.nome,
            'total_chegadas': total_chegadas,
            'total_mortes': total_mortes,
            'suinos_em_andamento': suinos_atuais,
            'status': status_txt,

            # novo campo exposto ao frontend
            'peso_medio_total_chegada': peso_medio_total_chegada,

            # métricas novas (sempre números ou None)
            'idade_media_dias': idade_media_dias,
            'consumo_total_racao': round(consumo_total_racao, 3) if consumo_total_racao is not None else None,
            'ganho_peso_por_dia': ganho_peso_por_dia,
            'consumo_por_dia': consumo_por_dia,
            'consumo_por_dia_por_cabeca': consumo_por_dia_por_cabeca,
            'conversao_alimentar': conversao_alimentar,
            'percentual_mortalidade': percentual_mortalidade,
            'dias_alojamento': dias_alojamento,
            'data_media_chegada': data_media_chegada.isoformat() if data_media_chegada else None,
            'data_media_saida': data_media_saida.isoformat() if data_media_saida else None,
        }

    @decorators.action(detail=True, methods=['get'])
    def resumo(self, request, pk=None):
        lote = self.get_object()
        return response.Response(self._build_resumo_payload(lote))

    @decorators.action(detail=False, methods=['get'], url_path='ativo/resumo')
    def resumo_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(self._build_resumo_payload(lote))

    @decorators.action(detail=False, methods=['get'], url_path='ativo')
    def ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(LoteSerializer(lote).data)

    @decorators.action(detail=False, methods=['get'], url_path='finalizados')
    def finalizados(self, request):
        qs = Lote.objects.filter(ativo=False).order_by('-finalizado_em', '-criado_em')
        return response.Response(LoteSerializer(qs, many=True).data)

    @decorators.action(detail=False, methods=['post'], url_path='criar_ativo')
    def criar_ativo(self, request):
        nome = (request.data.get('nome') or '').strip()
        if not nome:
            return response.Response({'detail': 'Informe o nome.'}, status=status.HTTP_400_BAD_REQUEST)
        if Lote.objects.filter(ativo=True).exists():
            return response.Response({'detail': 'Já existe um lote ativo. Finalize-o antes de criar outro.'},
                                     status=status.HTTP_400_BAD_REQUEST)
        lote = Lote.objects.create(nome=nome, ativo=True)
        return response.Response(LoteSerializer(lote).data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=False, methods=['post'], url_path='finalizar_ativo')
    def finalizar_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        lote.ativo = False
        lote.finalizado_em = timezone.now()
        lote.save(update_fields=['ativo', 'finalizado_em'])
        return response.Response(LoteSerializer(lote).data)

    def destroy(self, request, *args, **kwargs):
        lote = self.get_object()
        if lote.ativo:
            return response.Response({'detail': 'Não é permitido excluir lote ativo.'},
                                     status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


# -------- Chegadas --------

class ChegadaViewSet(viewsets.ModelViewSet):
    queryset = Chegada.objects.all().order_by('-data', '-id')
    serializer_class = ChegadaSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs

# -------- Mortes --------

class MorteViewSet(viewsets.ModelViewSet):
    queryset = Morte.objects.all().order_by('-data_morte', '-id')
    serializer_class = MorteSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs

# -------- Observações --------

class ObservacaoViewSet(viewsets.ModelViewSet):
    queryset = Observacao.objects.all().order_by('-criado_em')
    serializer_class = ObservacaoSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs

# -------- Ração --------

class RacaoEntradaViewSet(viewsets.ModelViewSet):
    queryset = RacaoEntrada.objects.all().order_by('-data', '-id')
    serializer_class = RacaoEntradaSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs

# -------- Saídas --------

class SaidaViewSet(viewsets.ModelViewSet):
    queryset = Saida.objects.all().order_by('-data', '-id')
    serializer_class = SaidaSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs
