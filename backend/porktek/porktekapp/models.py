from django.db import models

class Lote(models.Model):
    nome = models.CharField(max_length=100)
    quantidade_inicial = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

class Chegada(models.Model):
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='chegadas')
    data = models.DateField()
    quantidade = models.PositiveIntegerField()
    peso_medio = models.FloatField()
    origem = models.CharField(max_length=120)
    responsavel = models.CharField(max_length=120)
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

class Morte(models.Model):
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='mortes')
    data_morte = models.DateField()
    causa = models.CharField(max_length=120)
    mossa = models.CharField(max_length=30)  # número do suíno
    criado_em = models.DateTimeField(auto_now_add=True)

class Observacao(models.Model):
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='observacoes')
    texto = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)
