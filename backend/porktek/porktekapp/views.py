# porketkapp/views.py
from rest_framework import viewsets, decorators, response, status
from django.db.models import Sum
from .models import Lote, Chegada, Morte, Observacao
from .serializers import (
    LoteSerializer, ChegadaSerializer, MorteSerializer, ObservacaoSerializer, ResumoLoteSerializer
)

class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.all().order_by('-criado_em')
    serializer_class = LoteSerializer

    # /api/lotes/{id}/resumo/
    @decorators.action(detail=True, methods=['get'])
    def resumo(self, request, pk=None):
        lote = self.get_object()
        total_chegadas = Chegada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0
        total_mortes = Morte.objects.filter(lote=lote).count()
        suinos_em_andamento = lote.quantidade_inicial + total_chegadas - total_mortes

        ultima = Chegada.objects.filter(lote=lote).order_by('-data', '-id').first()
        peso_ult = ultima.peso_medio if ultima else None
        status_txt = 'Em andamento' if lote.ativo else 'Finalizado'

        data = {
            'lote_id': lote.id,
            'nome': lote.nome,
            'quantidade_inicial': lote.quantidade_inicial,
            'total_chegadas': total_chegadas,
            'total_mortes': total_mortes,
            'suinos_em_andamento': suinos_em_andamento,
            'peso_medio_ult_chegada': peso_ult,
            'status': status_txt,
        }
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

        total_chegadas = Chegada.objects.filter(lote=lote).aggregate(s=Sum('quantidade'))['s'] or 0
        total_mortes = Morte.objects.filter(lote=lote).count()
        suinos_em_andamento = lote.quantidade_inicial + total_chegadas - total_mortes

        ultima = Chegada.objects.filter(lote=lote).order_by('-data', '-id').first()
        peso_ult = ultima.peso_medio if ultima else None
        status_txt = 'Em andamento' if lote.ativo else 'Finalizado'

        data = {
            'lote_id': lote.id,
            'nome': lote.nome,
            'quantidade_inicial': lote.quantidade_inicial,
            'total_chegadas': total_chegadas,
            'total_mortes': total_mortes,
            'suinos_em_andamento': suinos_em_andamento,
            'peso_medio_ult_chegada': peso_ult,
            'status': status_txt,
        }
        return response.Response(ResumoLoteSerializer(data).data)


class ChegadaViewSet(viewsets.ModelViewSet):
    queryset = Chegada.objects.all().order_by('-data', '-id')
    serializer_class = ChegadaSerializer

    # /api/chegadas/?lote=1
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
