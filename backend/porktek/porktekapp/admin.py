from django.contrib import admin
from .models import Lote, Chegada, Morte, Observacao

@admin.register(Lote)
class LoteAdmin(admin.ModelAdmin):
    list_display = ('id','nome','ativo','criado_em')
    list_filter = ('ativo',)
    search_fields = ('nome',)

@admin.register(Chegada)
class ChegadaAdmin(admin.ModelAdmin):
    list_display = ('id','lote','data','quantidade','peso_medio','origem','responsavel','criado_em')
    list_filter = ('lote','data')

@admin.register(Morte)
class MorteAdmin(admin.ModelAdmin):
    list_display = ('id','lote','data_morte','causa','mossa','criado_em')
    list_filter = ('lote','data_morte')

@admin.register(Observacao)
class ObservacaoAdmin(admin.ModelAdmin):
    list_display = ('id','lote','criado_em')
    list_filter = ('lote',)
