from django.db import models

class Lote(models.Model):
    nome = models.CharField(max_length=100)
    ativo = models.BooleanField(default=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

class Chegada(models.Model):
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='chegadas')
    data = models.DateField()
    quantidade = models.PositiveIntegerField()
    peso_medio = models.FloatField()
    peso_total = models.FloatField(null=True, blank=True)
    origem = models.CharField(max_length=120)
    responsavel = models.CharField(max_length=120)
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

class Morte(models.Model):
    SEXO_CHOICES = [
        ('M', 'Macho'),
        ('F', 'Fêmea'),
        ('ND', 'Não definido'),
    ]
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='mortes')
    data_morte = models.DateField()
    causa = models.CharField(max_length=120)
    mossa = models.CharField(max_length=30)  # número do suíno
    sexo = models.CharField(max_length=2, choices=SEXO_CHOICES, default='ND')
    criado_em = models.DateTimeField(auto_now_add=True)

class Observacao(models.Model):
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='observacoes')
    texto = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True)

class RacaoEntrada(models.Model):
    TIPO_CHOICES = [
        ('FASE1', 'Fase 1'),
        ('FASE2', 'Fase 2'),
        ('FASE3', 'Fase 3'),
        ('INICIAL', 'Inicial'),
    ]
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='racoes')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    origem = models.CharField(max_length=120)
    quantidade = models.PositiveIntegerField(help_text='Quantidade')
    data = models.DateField()

    def __str__(self):
        return f'{self.get_tipo_display()} - {self.quantidade}'
    

class Saida(models.Model):
    lote = models.ForeignKey(Lote, on_delete=models.CASCADE, related_name='saidas')
    quantidade = models.PositiveIntegerField()
    peso_total = models.FloatField(help_text='Peso total (kg)')
    peso_medio = models.FloatField(help_text='Peso médio (kg)')
    data = models.DateField()
    observacoes = models.TextField(blank=True)

    def __str__(self):
        return f'Saída {self.quantidade} suínos - {self.data}'
