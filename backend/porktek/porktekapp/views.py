# porktekapp/views.py
from datetime import date
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, decorators, response, status

from .models import (
    Lote,
    Chegada,
    Morte,
    Observacao,
    RacaoEntrada,
    Saida,
)
from .serializers import (
    LoteSerializer,
    ChegadaSerializer,
    MorteSerializer,
    ObservacaoSerializer,
    RacaoEntradaSerializer,
    SaidaSerializer,
    # ResumoLoteSerializer  # se você tiver um serializer específico, pode usar; aqui retornamos dict
)


# --------------- helpers ---------------

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


# --------------- Lotes ---------------

class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.all().order_by('-criado_em')
    serializer_class = LoteSerializer

    # ---------- payload de resumo com métricas ----------
    def _build_resumo_payload(self, lote: Lote):
        # básicos
        total_chegadas = Chegada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0
        total_mortes = Morte.objects.filter(lote=lote).count()
        total_saidas_qtd = Saida.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0
        suinos_atuais = max(total_chegadas - total_mortes - total_saidas_qtd, 0)

        # último peso médio de chegada
        ultima = Chegada.objects.filter(lote=lote).order_by('-data', '-id').first()
        peso_ult = ultima.peso_medio if ultima else None

        status_txt = 'Em andamento' if lote.ativo else 'Finalizado'

        # ração (assuma kg para quantidade)
        consumo_total_racao = float(
            RacaoEntrada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0
        )

        # pesos para ganho/conversão
        # peso de chegada: usa peso_total quando houver; senão, quantidade * peso_medio
        chegadas = Chegada.objects.filter(lote=lote).values('quantidade', 'peso_medio', 'peso_total')
        peso_chegada_total = 0.0
        for c in chegadas:
            if c['peso_total'] is not None:
                peso_chegada_total += float(c['peso_total'])
            else:
                q = int(c['quantidade'] or 0)
                pm = float(c['peso_medio'] or 0)
                peso_chegada_total += q * pm

        # peso de saída: soma de Saida.peso_total
        peso_saida_total = float(Saida.objects.filter(lote=lote).aggregate(s=Sum('peso_total'))['s'] or 0.0)

        ganho_peso_total = max(peso_saida_total - peso_chegada_total, 0.0)

        # datas médias (ponderadas por quantidade)
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

        # dias de alojamento
        hoje = timezone.localdate()
        if data_media_chegada:
            if lote.ativo:
                dias_alojamento = max((hoje - data_media_chegada).days, 0)
            else:
                dias_alojamento = max(((data_media_saida or hoje) - data_media_chegada).days, 0)
        else:
            dias_alojamento = 0

        # idade média (dias) — para ativo
        idade_media_dias = max((hoje - data_media_chegada).days, 0) if data_media_chegada else 0

        # derivados de consumo
        consumo_por_dia = round(consumo_total_racao / dias_alojamento, 3) if dias_alojamento > 0 else None
        cabecas_inicial = total_chegadas
        cabecas_final = suinos_atuais
        cabecas_media = (cabecas_inicial + cabecas_final) / 2 if (cabecas_inicial + cabecas_final) > 0 else 0
        consumo_por_dia_por_cabeca = round(consumo_total_racao / (dias_alojamento * cabecas_media), 4) \
            if (dias_alojamento > 0 and cabecas_media > 0) else None

        ganho_peso_por_dia = round(ganho_peso_total / dias_alojamento, 3) if dias_alojamento > 0 else None

        conversao_alimentar = round(consumo_total_racao / ganho_peso_total, 4) if ganho_peso_total > 0 else None

        percentual_mortalidade = round((total_mortes / total_chegadas) * 100.0, 2) if total_chegadas > 0 else 0.0

        return {
            'lote_id': lote.id,
            'nome': lote.nome,
            'total_chegadas': total_chegadas,
            'total_mortes': total_mortes,
            'suinos_em_andamento': suinos_atuais,
            'peso_medio_ult_chegada': peso_ult,
            'status': status_txt,

            # métricas novas
            'idade_media_dias': idade_media_dias,
            'consumo_total_racao': consumo_total_racao,
            'ganho_peso_por_dia': ganho_peso_por_dia,
            'consumo_por_dia': consumo_por_dia,
            'consumo_por_dia_por_cabeca': consumo_por_dia_por_cabeca,
            'conversao_alimentar': conversao_alimentar,
            'percentual_mortalidade': percentual_mortalidade,
            'dias_alojamento': dias_alojamento,
            'data_media_chegada': data_media_chegada.isoformat() if data_media_chegada else None,
            'data_media_saida': data_media_saida.isoformat() if data_media_saida else None,
        }

    # ---------- /api/lotes/{id}/resumo/ ----------
    @decorators.action(detail=True, methods=['get'])
    def resumo(self, request, pk=None):
        lote = self.get_object()
        data = self._build_resumo_payload(lote)
        return response.Response(data)

    # ---------- /api/lotes/ativo/resumo/ ----------
    @decorators.action(detail=False, methods=['get'], url_path='ativo/resumo')
    def resumo_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        data = self._build_resumo_payload(lote)
        return response.Response(data)

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

        # se já existe ativo, retorna erro (ou desative, se preferir)
        if Lote.objects.filter(ativo=True).exists():
            return response.Response({'detail': 'Já existe um lote ativo. Finalize-o antes de criar outro.'},
                                     status=status.HTTP_400_BAD_REQUEST)

        lote = Lote.objects.create(nome=nome, ativo=True)
        return response.Response(LoteSerializer(lote).data, status=status.HTTP_201_CREATED)

    # ---------- /api/lotes/finalizar_ativo/ ----------
    @decorators.action(detail=False, methods=['post'], url_path='finalizar_ativo')
    def finalizar_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        lote.ativo = False
        lote.finalizado_em = timezone.localdate()
        lote.save(update_fields=['ativo', 'finalizado_em'])
        return response.Response(LoteSerializer(lote).data)

    # ---------- DELETE /api/lotes/{id}/ ----------
    def destroy(self, request, *args, **kwargs):
        lote = self.get_object()
        if lote.ativo:
            return response.Response({'detail': 'Não é permitido excluir lote ativo.'},
                                     status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    # ---------- /api/lotes/finalizados/excluir/ (opcional) ----------
    @decorators.action(detail=False, methods=['post'], url_path='finalizados/excluir')
    def excluir_finalizados(self, request):
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not ids:
            return response.Response({'detail': 'Envie "ids": [..].'}, status=status.HTTP_400_BAD_REQUEST)
        qs = Lote.objects.filter(id__in=ids, ativo=False)
        deleted, _ = qs.delete()
        return response.Response({'deleted': deleted}, status=status.HTTP_200_OK)


# --------------- Chegadas ---------------

class ChegadaViewSet(viewsets.ModelViewSet):
    queryset = Chegada.objects.all().order_by('-data', '-id')
    serializer_class = ChegadaSerializer

    # /api/chegadas/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# --------------- Mortes ---------------

class MorteViewSet(viewsets.ModelViewSet):
    queryset = Morte.objects.all().order_by('-data_morte', '-id')
    serializer_class = MorteSerializer

    # /api/mortes/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# --------------- Observações ---------------

class ObservacaoViewSet(viewsets.ModelViewSet):
    queryset = Observacao.objects.all().order_by('-criado_em')
    serializer_class = ObservacaoSerializer

    # /api/observacoes/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# --------------- Ração ---------------

class RacaoEntradaViewSet(viewsets.ModelViewSet):
    queryset = RacaoEntrada.objects.all().order_by('-data', '-id')
    serializer_class = RacaoEntradaSerializer

    # /api/racoes/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


# --------------- Saídas ---------------

class SaidaViewSet(viewsets.ModelViewSet):
    queryset = Saida.objects.all().order_by('-data', '-id')
    serializer_class = SaidaSerializer

    # /api/saidas/?lote=ID
    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs
