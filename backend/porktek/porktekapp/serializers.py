from rest_framework import serializers
from .models import Lote, Chegada, Morte, Observacao

class LoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lote
        fields = ['id', 'nome', 'ativo', 'criado_em', 'finalizado_em']

class ChegadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chegada
        fields = ['id', 'lote', 'data', 'quantidade', 'peso_medio', 'origem', 'responsavel', 'observacoes', 'criado_em']

class MorteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Morte
        fields = ['id', 'lote', 'data_morte', 'causa', 'mossa', 'criado_em']

class ObservacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Observacao
        fields = ['id', 'lote', 'texto', 'criado_em']


# Resumo do Lote
class ResumoLoteSerializer(serializers.Serializer):
    lote_id = serializers.IntegerField()
    nome = serializers.CharField()
    total_chegadas = serializers.IntegerField()
    total_mortes = serializers.IntegerField()
    suinos_em_andamento = serializers.IntegerField()
    peso_medio_ult_chegada = serializers.FloatField(allow_null=True)
    status = serializers.CharField()
