# porktekapp/views.py
from rest_framework import viewsets, decorators, response, status
from django.db.models import Sum
from django.utils import timezone
from .models import Lote, Chegada, Morte, Observacao
from .serializers import (
    LoteSerializer, ChegadaSerializer, MorteSerializer, ObservacaoSerializer, ResumoLoteSerializer
)

class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.all().order_by('-criado_em')
    serializer_class = LoteSerializer

    # -------- helper interno para montar o resumo --------
    def _build_resumo_payload(self, lote: Lote):
        total_chegadas = Chegada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0
        total_mortes = Morte.objects.filter(lote=lote).count()
        suinos_em_andamento = lote.quantidade_inicial + total_chegadas - total_mortes
        ultima = Chegada.objects.filter(lote=lote).order_by('-data', '-id').first()
        peso_ult = ultima.peso_medio if ultima else None
        status_txt = 'Em andamento' if lote.ativo else 'Finalizado'
        return {
            'lote_id': lote.id,
            'nome': lote.nome,
            'quantidade_inicial': lote.quantidade_inicial,
            'total_chegadas': total_chegadas,
            'total_mortes': total_mortes,
            'suinos_em_andamento': suinos_em_andamento,
            'peso_medio_ult_chegada': peso_ult,
            'status': status_txt,
        }

    # /api/lotes/{id}/resumo/  (detail=True)
    @decorators.action(detail=True, methods=['get'])
    def resumo(self, request, pk=None):
        lote = self.get_object()
        data = self._build_resumo_payload(lote)
        return response.Response(ResumoLoteSerializer(data).data)

    # /api/lotes/ativo/
    @decorators.action(detail=False, methods=['get'])
    def ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        return response.Response(LoteSerializer(lote).data)

    # /api/lotes/ativo/resumo/
    @decorators.action(detail=False, methods=['get'], url_path='ativo/resumo')
    def resumo_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo.'}, status=status.HTTP_404_NOT_FOUND)
        data = self._build_resumo_payload(lote)     # <-- usa helper em vez de chamar self.resumo
        return response.Response(ResumoLoteSerializer(data).data)

    # /api/lotes/finalizados/
    @decorators.action(detail=False, methods=['get'])
    def finalizados(self, request):
        qs = Lote.objects.filter(ativo=False).order_by('-finalizado_em', '-criado_em')
        return response.Response(LoteSerializer(qs, many=True).data)

    # /api/lotes/finalizar_ativo/  (POST)
    @decorators.action(detail=False, methods=['post'])
    def finalizar_ativo(self, request):
        lote = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if not lote:
            return response.Response({'detail': 'Nenhum lote ativo para finalizar.'}, status=status.HTTP_404_NOT_FOUND)
        lote.ativo = False
        lote.finalizado_em = timezone.now()
        lote.save(update_fields=['ativo', 'finalizado_em'])
        return response.Response(LoteSerializer(lote).data, status=status.HTTP_200_OK)

    # /api/lotes/criar_ativo/  (POST) body: { "nome": "Lote 09/2025" }
    @decorators.action(detail=False, methods=['post'])
    def criar_ativo(self, request):
        nome = (request.data or {}).get('nome', '').strip()
        if not nome:
            return response.Response({'detail': 'Informe o nome.'}, status=status.HTTP_400_BAD_REQUEST)

        atual = Lote.objects.filter(ativo=True).order_by('-criado_em').first()
        if atual:
            atual.ativo = False
            atual.finalizado_em = timezone.now()
            atual.save(update_fields=['ativo', 'finalizado_em'])

        novo = Lote.objects.create(nome=nome, quantidade_inicial=0, ativo=True)
        return response.Response(LoteSerializer(novo).data, status=status.HTTP_201_CREATED)


class ChegadaViewSet(viewsets.ModelViewSet):
    queryset = Chegada.objects.all().order_by('-data', '-id')
    serializer_class = ChegadaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


class MorteViewSet(viewsets.ModelViewSet):
    queryset = Morte.objects.all().order_by('-data_morte', '-id')
    serializer_class = MorteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs


class ObservacaoViewSet(viewsets.ModelViewSet):
    queryset = Observacao.objects.all().order_by('-criado_em')
    serializer_class = ObservacaoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        lote_id = self.request.query_params.get('lote')
        return qs.filter(lote_id=lote_id) if lote_id else qs
