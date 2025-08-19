from rest_framework import serializers
from .models import Lote, Chegada, Morte, Observacao, RacaoEntrada, Saida

class LoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lote
        fields = ['id', 'nome', 'ativo', 'criado_em', 'finalizado_em']

class ChegadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chegada
        fields = ['id', 'lote', 'data', 'quantidade', 'peso_medio', 'peso_total', 'origem', 'responsavel', 'observacoes', 'criado_em']

class MorteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Morte
        fields = ['id', 'lote', 'data_morte', 'causa', 'mossa', 'sexo', 'criado_em']

class ObservacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Observacao
        fields = ['id', 'lote', 'texto', 'criado_em']

class RacaoEntradaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RacaoEntrada
        fields = ['id', 'lote', 'tipo', 'origem', 'quantidade', 'data']

class SaidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Saida
        fields = ['id', 'lote', 'quantidade', 'peso_total', 'peso_medio', 'data', 'observacoes']

    def validate(self, attrs):
        q = attrs.get('quantidade')
        pt = attrs.get('peso_total')
        pm = attrs.get('peso_medio')
        if (pm is None or pm == 0) and q and q > 0 and pt and pt > 0:
            attrs['peso_medio'] = round(pt / q, 3)
        return attrs


# Resumo do Lote
class ResumoLoteSerializer(serializers.Serializer):
    lote_id = serializers.IntegerField()
    nome = serializers.CharField()
    total_chegadas = serializers.IntegerField()
    total_mortes = serializers.IntegerField()
    suinos_em_andamento = serializers.IntegerField()
    peso_medio_ult_chegada = serializers.FloatField(allow_null=True)
    status = serializers.CharField()
