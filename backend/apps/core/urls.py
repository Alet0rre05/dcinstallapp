from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()
router.register("clientes", views.ClienteViewSet, basename="cliente")
router.register("matafuegos", views.MatafuegoViewSet, basename="matafuego")
router.register("controles", views.ControlViewSet, basename="control")
router.register("tickets", views.TicketViewSet, basename="ticket")

urlpatterns = [
    path("auth/registro/", views.RegistroView.as_view(), name="registro"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("equipo/usuarios/", views.EquipoListView.as_view(), name="equipo-usuarios"),
    path("equipo/asignar-rol/", views.AsignarRolView.as_view(), name="equipo-asignar"),
    path("equipo/revocar-rol/", views.RevocarRolView.as_view(), name="equipo-revocar"),
    path("equipo/asignar-clientes/", views.AsignarClientesView.as_view(), name="equipo-clientes"),
    path("auditoria/", views.AuditoriaListView.as_view(), name="auditoria"),
    path("public/qr/<uuid:token>/", views.QRPublicoView.as_view(), name="qr-publico"),
] + router.urls
