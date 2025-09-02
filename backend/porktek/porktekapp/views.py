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

# ----------------- helpers -----------------

def _date_to_ordinal(d):
    """
    Aceita date, datetime ou string 'YYYY-MM-DD'; retorna ordinal (int) ou None.
    """
    if not d:
        return None
    if isinstance(d, datetime):
        d = d.date()
    if isinstance(d, str):
        try:
            y, m, day = [int(x) for x in d.split('-')]
            d = date(y, m, day)
        except Exception:
            return None
    if isinstance(d, date):
        return d.toordinal()
    return None


def _to_date(v):
    """
    Converte v para date. Aceita datetime, date ou ISO 'YYYY-MM-DD'.
    """
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


def _f(x, digits=None):
    """
    Converte Decimal/None/str para float ou None. Se digits for int, arredonda.
    """
    if x is None:
        return None
    if isinstance(x, Decimal):
        x = float(x)
    try:
        xf = float(x)
        if isinstance(digits, int):
            return round(xf, digits)
        return xf
    except Exception:
        return None


def _safe_div(num, den, digits=None):
    """
    Divide com guarda (retorna None se inválido).
    """
    n = _f(num)
    d = _f(den)
    if n is None or d is None or d == 0:
        return None
    val = n / d
    return round(val, digits) if isinstance(digits, int) else val


# ----------------- Lotes -----------------

class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.all().order_by('-criado_em')
    serializer_class = LoteSerializer

    def _build_resumo_payload(self, lote: Lote):
        # --- básicos ---
        total_chegadas = int(Chegada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0)
        total_mortes = int(Morte.objects.filter(lote=lote).count() or 0)
        total_saidas_qtd = int(Saida.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0)

        suinos_atuais = max(total_chegadas - total_mortes, 0)
        status_txt = 'Em andamento' if lote.ativo else 'Finalizado'

        # --- ração (assumindo kg em RacaoEntrada.quantidade) ---
        consumo_total_racao = _f(
            RacaoEntrada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'],
            3
        ) or 0.0

        # --- pesos de chegada ---
        # Somatório do peso de chegada: usa peso_total quando houver; senão, quantidade * peso_medio
        peso_chegada_total = 0.0
        for c in Chegada.objects.filter(lote=lote).values('quantidade', 'peso_medio', 'peso_total'):
            q = int(c['quantidade'] or 0)
            if c['peso_total'] is not None:
                peso_chegada_total += _f(c['peso_total']) or 0.0
            else:
                peso_chegada_total += q * (_f(c['peso_medio']) or 0.0)

        # --- pesos de saída ---
        peso_saida_total = _f(Saida.objects.filter(lote=lote).aggregate(s=Sum('peso_total'))['s']) or 0.0

        # --- médias de pesos que precisamos expor ---
        peso_medio_chegadas = _safe_div(peso_chegada_total, total_chegadas, 3)
        peso_medio_saidas   = _safe_div(peso_saida_total,   total_saidas_qtd, 3)

        ganho_peso_total = max(peso_saida_total - peso_chegada_total, 0.0)
        ganho_peso_por_cabeca = None
        if (peso_medio_chegadas is not None) and (peso_medio_saidas is not None):
            ganho_peso_por_cabeca = round(peso_medio_saidas - peso_medio_chegadas, 3)

        # --- datas médias ponderadas por quantidade (chegada/saída) ---
        # chegada
        chegadas_dt = Chegada.objects.filter(lote=lote).values('data', 'quantidade')
        soma_w_chegada, soma_q_chegada = 0, 0
        for r in chegadas_dt:
            ordv = _date_to_ordinal(r['data'])
            q = int(r['quantidade'] or 0)
            if ordv and q > 0:
                soma_w_chegada += ordv * q
                soma_q_chegada += q
        data_media_chegada = date.fromordinal(int(round(soma_w_chegada / soma_q_chegada))) if soma_q_chegada > 0 else None

        # saída
        saidas_dt = Saida.objects.filter(lote=lote).values('data', 'quantidade')
        soma_w_saida, soma_q_saida = 0, 0
        for r in saidas_dt:
            ordv = _date_to_ordinal(r['data'])
            q = int(r['quantidade'] or 0)
            if ordv and q > 0:
                soma_w_saida += ordv * q
                soma_q_saida += q
        data_media_saida = date.fromordinal(int(round(soma_w_saida / soma_q_saida))) if soma_q_saida > 0 else None

        # --- dias de alojamento ---
        # Para lote ativo: hoje - data_media_chegada
        # Para lote finalizado: data_media_saida - data_media_chegada (se não houver saída, usa finalizado_em; na falta, hoje)
        hoje = timezone.localdate()
        if data_media_chegada:
            if lote.ativo:
                limite = hoje
            else:
                limite = data_media_saida or (_to_date(lote.finalizado_em) or hoje)
            dias_alojamento = max((limite - data_media_chegada).days, 0)
        else:
            dias_alojamento = 0

        # --- derivados adicionais (usados em várias telas) ---
        conversao_alimentar = _safe_div(consumo_total_racao, ganho_peso_total, 4)
        percentual_mortalidade = round((total_mortes / total_chegadas) * 100.0, 2) if total_chegadas > 0 else 0.0

        # Consumo por dia / por cabeça podem continuar sendo enviados (o frontend decide exibir ou não)
        consumo_por_dia = _safe_div(consumo_total_racao, dias_alojamento, 3)
        cabecas_media = ((total_chegadas + suinos_atuais) / 2) if (total_chegadas + suinos_atuais) > 0 else 0
        consumo_por_dia_por_cabeca = _safe_div(consumo_total_racao, dias_alojamento * cabecas_media, 4)

        # Último peso médio registrado (de chegada) - útil para algumas telas
        ultima = Chegada.objects.filter(lote=lote).order_by('-data', '-id').first()
        peso_ult = _f(ultima.peso_medio) if ultima else None

        return {
            # Identificação/estado
            'lote_id': lote.id,
            'nome': lote.nome,
            'status': status_txt,

            # Quantidades e eventos
            'total_chegadas': total_chegadas,
            'total_mortes': total_mortes,
            'suinos_em_andamento': suinos_atuais,

            # Pesos (chegadas/saídas)
            'peso_medio_ult_chegada': peso_ult,     # opcional/legado
            'peso_medio_chegadas': peso_medio_chegadas,
            'peso_medio_saidas':   peso_medio_saidas,
            'ganho_peso_por_cabeca': ganho_peso_por_cabeca,

            # Datas e alojamento
            'dias_alojamento': dias_alojamento,
            'data_media_chegada': data_media_chegada.isoformat() if data_media_chegada else None,
            'data_media_saida':   data_media_saida.isoformat() if data_media_saida else None,

            # Ração e conversão
            'consumo_total_racao': consumo_total_racao,
            'consumo_por_dia': consumo_por_dia,
            'consumo_por_dia_por_cabeca': consumo_por_dia_por_cabeca,
            'conversao_alimentar': conversao_alimentar,

            # Mortalidade
            'percentual_mortalidade': percentual_mortalidade,
        }

    # ---------- /api/lotes/{id}/resumo/ ----------
    @decorators.action(detail=True, methods=['get'])
    def resumo(self, request, pk=None):
        lote = self.get_object()
        return response.Response(self._build_resumo_payload(lote))

    # ---------- /api/lotes/ativo/resumo/ ----------
    @decorators.action(detail=False, methods=['get'], url_path='ativo/resumo')
    def resumo_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(self._build_resumo_payload(lote))

    # ---------- /api/lotes/ativo/ ----------
    @decorators.action(detail=False, methods=['get'], url_path='ativo')
    def ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(LoteSerializer(lote).data)

    # ---------- /api/lotes/finalizados/ ----------
    @decorators.action(detail=False, methods=['get'], url_path='finalizados')
    def finalizados(self, request):
        qs = Lote.objects.filter(ativo=False).order_by('-finalizado_em', '-criado_em')
        return response.Response(LoteSerializer(qs, many=True).data)

    # ---------- /api/lotes/criar_ativo/ ----------
    @decorators.action(detail=False, methods=['post'], url_path='criar_ativo')
    def criar_ativo(self, request):
        nome = (request.data.get('nome') or '').strip()
        if not nome:
            return response.Response({'detail': 'Informe o nome.'}, status=status.HTTP_400_BAD_REQUEST)
        if Lote.objects.filter(ativo=True).exists():
            return response.Response(
                {'detail': 'Já existe um lote ativo. Finalize-o antes de criar outro.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        lote = Lote.objects.create(nome=nome, ativo=True)
        return response.Response(LoteSerializer(lote).data, status=status.HTTP_201_CREATED)

    # ---------- /api/lotes/finalizar_ativo/ ----------
    @decorators.action(detail=False, methods=['post'], url_path='finalizar_ativo')
    def finalizar_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        lote.ativo = False
        # timezone.now() é aware; evita warnings/erros de naive datetime
        lote.finalizado_em = timezone.now()
        lote.save(update_fields=['ativo', 'finalizado_em'])
        return response.Response(LoteSerializer(lote).data)

    # ---------- DELETE /api/lotes/{id}/ ----------
    def destroy(self, request, *args, **kwargs):
        lote = self.get_object()
        if lote.ativo:
            return response.Response(
                {'detail': 'Não é permitido excluir lote ativo.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


# ----------------- Chegadas -----------------

class ChegadaViewSet(viewsets.ModelViewSet):
    queryset = Chegada.objects.all().order_by('-data', '-id')
    serializer_class = ChegadaSerializer

    # /api/chegadas/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# ----------------- Mortes -----------------

class MorteViewSet(viewsets.ModelViewSet):
    queryset = Morte.objects.all().order_by('-data_morte', '-id')
    serializer_class = MorteSerializer

    # /api/mortes/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# ----------------- Observações -----------------

class ObservacaoViewSet(viewsets.ModelViewSet):
    queryset = Observacao.objects.all().order_by('-criado_em')
    serializer_class = ObservacaoSerializer

    # /api/observacoes/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# ----------------- Ração -----------------

class RacaoEntradaViewSet(viewsets.ModelViewSet):
    queryset = RacaoEntrada.objects.all().order_by('-data', '-id')
    serializer_class = RacaoEntradaSerializer

    # /api/racoes/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# ----------------- Saídas -----------------

class SaidaViewSet(viewsets.ModelViewSet):
    queryset = Saida.objects.all().order_by('-data', '-id')
    serializer_class = SaidaSerializer

    # /api/saidas/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs
