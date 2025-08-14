from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from porktekapp.views import LoteViewSet, ChegadaViewSet, MorteViewSet, ObservacaoViewSet

router = DefaultRouter()
router.register(r'lotes', LoteViewSet, basename='lote')
router.register(r'chegadas', ChegadaViewSet, basename='chegada')
router.register(r'mortes', MorteViewSet, basename='morte')
router.register(r'observacoes', ObservacaoViewSet, basename='observacao')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
