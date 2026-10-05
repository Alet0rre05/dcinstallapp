from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .audit import MATAFUEGO_CAMPOS, auditar, snapshot
from .models import (
    Auditoria,
    Cliente,
    Control,
    LimiteMensajesExcedido,
    Matafuego,
    MensajeChat,
    Rol,
    TicketSoporte,
)
from .permissions import (
    EscrituraAdmin,
    EscrituraCampo,
    EscrituraStaff,
    SoloAdmin,
    TieneRol,
    clientes_ids,
    filtrar_por_cliente,
    rol_de,
)
from .serializers import (
    ActualizarPerfilSerializer,
    AsignarClientesSerializer,
    AsignarRolSerializer,
    AuditoriaSerializer,
    ClienteSerializer,
    ControlSerializer,
    EquipoUsuarioSerializer,
    MatafuegoPublicoSerializer,
    MatafuegoSerializer,
    MensajeSerializer,
    MeSerializer,
    RegistroSerializer,
    RevocarRolSerializer,
    TicketSerializer,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Autenticación y perfil
# ---------------------------------------------------------------------------
class RegistroView(APIView):
    """Registro público: protegido con Turnstile + throttling (60/min por IP).
    La cuenta nueva NO tiene rol (público registrado)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegistroSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        auditar(request, "REGISTRO", "Usuario", user.pk, user.username, usuario=user,
                despues={"username": user.username, "email": user.email})
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": MeSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Login JWT que además deja registro en la auditoría."""

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0])
        auditar(request, "LOGIN", "Usuario", serializer.user.pk, serializer.user.username,
                usuario=serializer.user)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class MeView(APIView):
    """GET: cualquier usuario autenticado (el front necesita saber si tiene rol).
    PATCH: solo usuarios con rol (el público registrado no edita su perfil)."""

    def get_permissions(self):
        return [TieneRol()] if self.request.method == "PATCH" else [IsAuthenticated()]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        antes = {"first_name": user.first_name, "email": user.email}
        serializer = ActualizarPerfilSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        cambio_pass = "new_password" in serializer.validated_data
        user = serializer.save()
        despues = {"first_name": user.first_name, "email": user.email}
        if cambio_pass:
            despues["contraseña"] = "cambiada"
        auditar(request, "CAMBIO_PERFIL", "Usuario", user.pk, user.username,
                antes=antes, despues=despues)
        return Response(MeSerializer(user).data)


# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------
class ListaGrandePagination(PageNumberPagination):
    """Para listados chicos que el front necesita completos (clientes, equipo)."""

    page_size = 200


class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [EscrituraAdmin]
    pagination_class = ListaGrandePagination

    def get_queryset(self):
        return filtrar_por_cliente(Cliente.objects.all(), self.request.user, campo="id")

    def perform_create(self, serializer):
        c = serializer.save()
        auditar(self.request, "CREACION", "Cliente", c.pk, c.nombre, cliente_id=c.pk,
                despues={"nombre": c.nombre, "contacto": c.contacto})

    def perform_update(self, serializer):
        antes = {"nombre": serializer.instance.nombre, "contacto": serializer.instance.contacto}
        c = serializer.save()
        auditar(self.request, "MODIFICACION", "Cliente", c.pk, c.nombre, cliente_id=c.pk,
                antes=antes, despues={"nombre": c.nombre, "contacto": c.contacto})


# ---------------------------------------------------------------------------
# Matafuegos
# ---------------------------------------------------------------------------
class MatafuegoViewSet(viewsets.ModelViewSet):
    serializer_class = MatafuegoSerializer
    permission_classes = [EscrituraStaff]

    def get_queryset(self):
        qs = Matafuego.objects.select_related("cliente").prefetch_related("controles")
        qs = filtrar_por_cliente(qs, self.request.user)
        params = self.request.query_params
        if params.get("cliente"):
            qs = qs.filter(cliente_id=params["cliente"])
        if self.action == "list" and params.get("incluir_inactivos") != "1":
            qs = qs.filter(activo=True)
        return qs

    def perform_create(self, serializer):
        m = serializer.save()
        auditar(self.request, "CREACION", "Matafuego", m.pk, str(m), cliente_id=m.cliente_id,
                despues=snapshot(m, MATAFUEGO_CAMPOS))

    def perform_update(self, serializer):
        antes = snapshot(serializer.instance, MATAFUEGO_CAMPOS)
        m = serializer.save()
        despues = snapshot(m, MATAFUEGO_CAMPOS)
        if antes != despues:
            auditar(self.request, "MODIFICACION", "Matafuego", m.pk, str(m),
                    cliente_id=m.cliente_id, antes=antes, despues=despues)

    def perform_destroy(self, instance):
        # Baja lógica: nunca se borra el registro
        antes = snapshot(instance, MATAFUEGO_CAMPOS)
        instance.activo = False
        instance.save(update_fields=["activo"])
        auditar(self.request, "BAJA", "Matafuego", instance.pk, str(instance),
                cliente_id=instance.cliente_id, antes=antes,
                despues=snapshot(instance, MATAFUEGO_CAMPOS))

    @action(detail=True, methods=["post"])
    def restaurar(self, request, pk=None):
        m = self.get_object()
        if m.activo:
            raise ValidationError({"detail": "El matafuego ya está activo."})
        antes = snapshot(m, MATAFUEGO_CAMPOS)
        m.activo = True
        m.save(update_fields=["activo"])
        auditar(request, "RESTAURACION", "Matafuego", m.pk, str(m), cliente_id=m.cliente_id,
                antes=antes, despues=snapshot(m, MATAFUEGO_CAMPOS))
        return Response(self.get_serializer(m).data)

    @action(detail=True, methods=["get"])
    def controles(self, request, pk=None):
        matafuego = self.get_object()
        qs = matafuego.controles.select_related("usuario")
        return Response(ControlSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path=r"qr/(?P<token>[0-9a-fA-F-]{36})")
    def por_qr(self, request, token=None):
        """Planilla completa a partir del QR, para usuarios con rol y cliente asignado.
        Si no tiene permiso el front sigue mostrando la vista pública."""
        m = get_object_or_404(self.get_queryset().filter(activo=True), token_qr=token)
        return Response(self.get_serializer(m).data)


class ControlViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Los controles son inmutables: solo alta, listado y detalle."""

    serializer_class = ControlSerializer
    permission_classes = [EscrituraCampo]

    def get_queryset(self):
        qs = Control.objects.select_related("usuario", "matafuego")
        qs = filtrar_por_cliente(qs, self.request.user, campo="matafuego__cliente_id")
        if self.request.query_params.get("matafuego"):
            qs = qs.filter(matafuego_id=self.request.query_params["matafuego"])
        return qs

    def perform_create(self, serializer):
        c = serializer.save()
        m = c.matafuego
        auditar(self.request, "CREACION", "Control", c.pk, f"Control {m.numero_serie}",
                cliente_id=m.cliente_id,
                despues={
                    "matafuego": m.numero_serie, "presion": c.presion,
                    "senalizacion": c.senalizacion, "chapa_baliza": c.chapa_baliza,
                    "accesible": c.accesible,
                })


class QRPublicoView(APIView):
    """Escaneo público de QR: solo datos reducidos, sin autenticación."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "qr_public"

    def get(self, request, token):
        matafuego = get_object_or_404(
            Matafuego.objects.select_related("cliente").prefetch_related("controles"),
            token_qr=token,
            activo=True,
        )
        return Response(MatafuegoPublicoSerializer(matafuego).data)


# ---------------------------------------------------------------------------
# Tickets y chat (solo usuarios con rol)
# ---------------------------------------------------------------------------
class TicketPagination(PageNumberPagination):
    page_size = 5


class MensajePagination(PageNumberPagination):
    page_size = 50


class LimiteMensajes(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_code = "limite_mensajes"


def _es_soporte(user):
    return rol_de(user) in (Rol.ADMIN, Rol.OFICINA)


class TicketViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = TicketSerializer
    permission_classes = [TieneRol]
    pagination_class = TicketPagination

    def get_queryset(self):
        user = self.request.user
        qs = TicketSoporte.objects.select_related("cliente", "creado_por")
        qs = filtrar_por_cliente(qs, user)
        # El operario solo ve sus propios tickets; oficina/admin ven los de sus clientes
        if rol_de(user) == Rol.OPERARIO:
            qs = qs.filter(creado_por=user)
        estado = self.request.query_params.get("estado")
        if estado in (TicketSoporte.Estado.ABIERTO, TicketSoporte.Estado.CERRADO):
            qs = qs.filter(estado=estado)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        texto = serializer.validated_data.pop("mensaje", None)
        ticket = serializer.save(creado_por=user)
        auditar(self.request, "CREACION", "Ticket", ticket.pk, ticket.titulo,
                cliente_id=ticket.cliente_id, despues={"titulo": ticket.titulo})
        if texto:
            MensajeChat.objects.create(
                ticket=ticket, autor=user, texto=texto, es_soporte=_es_soporte(user)
            )

    def _cambiar_estado(self, request, nuevo, accion):
        ticket = self.get_object()
        antes = ticket.estado
        ticket.estado = nuevo
        ticket.save(update_fields=["estado"])
        auditar(request, accion, "Ticket", ticket.pk, ticket.titulo, cliente_id=ticket.cliente_id,
                antes={"estado": antes}, despues={"estado": nuevo})
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        return self._cambiar_estado(request, TicketSoporte.Estado.CERRADO, "CIERRE")

    @action(detail=True, methods=["post"])
    def reabrir(self, request, pk=None):
        return self._cambiar_estado(request, TicketSoporte.Estado.ABIERTO, "REAPERTURA")

    @action(detail=True, methods=["get", "post"])
    def mensajes(self, request, pk=None):
        ticket = self.get_object()

        if request.method == "GET":
            qs = ticket.mensajes.select_related("autor")
            paginator = MensajePagination()
            page = paginator.paginate_queryset(qs, request, view=self)
            return paginator.get_paginated_response(MensajeSerializer(page, many=True).data)

        serializer = MensajeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        es_soporte = _es_soporte(request.user)

        with transaction.atomic():
            # Bloqueo de fila para evitar que dos envíos simultáneos superen el límite
            ticket = TicketSoporte.objects.select_for_update().get(pk=ticket.pk)
            if ticket.estado == TicketSoporte.Estado.CERRADO:
                raise LimiteMensajes(detail="El ticket está cerrado.")
            try:
                MensajeChat.validar_limite(ticket, es_soporte)
            except LimiteMensajesExcedido as exc:
                raise LimiteMensajes(detail=str(exc))
            mensaje = MensajeChat.objects.create(
                ticket=ticket,
                autor=request.user,
                es_soporte=es_soporte,
                texto=serializer.validated_data["texto"],
            )
            auditar(request, "MENSAJE", "Ticket", ticket.pk, ticket.titulo,
                    cliente_id=ticket.cliente_id, despues={"mensaje_id": mensaje.pk})
        return Response(MensajeSerializer(mensaje).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Equipo: asignar / revocar roles (solo ADMIN)
# ---------------------------------------------------------------------------
def _estado_usuario(user):
    perfil = user.perfil
    return {
        "rol": rol_de(user),
        "clientes": sorted(perfil.clientes.values_list("nombre", flat=True)),
    }


class EquipoListView(generics.ListAPIView):
    """Todos los usuarios registrados (con y sin rol)."""

    serializer_class = EquipoUsuarioSerializer
    permission_classes = [SoloAdmin]
    pagination_class = ListaGrandePagination

    def get_queryset(self):
        qs = User.objects.select_related("perfil").prefetch_related("perfil__clientes")
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(email__icontains=q) | Q(username__icontains=q) | Q(first_name__icontains=q)
            )
        return qs.order_by("username")


class AsignarRolView(APIView):
    """Asigna un rol por email. Si el email NO está registrado no se crea la cuenta:
    se informa que la persona debe registrarse primero (decisión 1A)."""

    permission_classes = [SoloAdmin]

    @transaction.atomic
    def post(self, request):
        s = AsignarRolSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=s.validated_data["email"]).first()
        if not user:
            raise NotFound("No existe una cuenta con ese email. La persona debe registrarse primero.")
        if user.is_superuser:
            raise ValidationError({"detail": "El rol de un superusuario no puede modificarse."})
        if user.pk == request.user.pk:
            raise ValidationError({"detail": "No podés cambiar tu propio rol."})
        antes = _estado_usuario(user)
        user.perfil.rol = s.validated_data["rol"]
        user.perfil.save()
        if "clientes" in s.validated_data:
            user.perfil.clientes.set(Cliente.objects.filter(id__in=s.validated_data["clientes"]))
        despues = _estado_usuario(user)
        auditar(request, "ASIGNACION_ROL", "Usuario", user.pk, user.username,
                antes=antes, despues=despues)
        return Response(EquipoUsuarioSerializer(user).data)


class RevocarRolView(APIView):
    """La 'X': el usuario pasa a PÚBLICO. La cuenta no se elimina (decisión 2A)."""

    permission_classes = [SoloAdmin]

    @transaction.atomic
    def post(self, request):
        s = RevocarRolSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = get_object_or_404(User, pk=s.validated_data["user_id"])
        if user.is_superuser:
            raise ValidationError({"detail": "El rol de un superusuario no puede revocarse."})
        if user.pk == request.user.pk:
            raise ValidationError({"detail": "No podés revocar tu propio rol."})
        if rol_de(user) is None:
            raise ValidationError({"detail": "El usuario ya no tiene rol."})
        antes = _estado_usuario(user)
        user.perfil.rol = None
        user.perfil.save()
        auditar(request, "REVOCACION_ROL", "Usuario", user.pk, user.username,
                antes=antes, despues=_estado_usuario(user))
        return Response(EquipoUsuarioSerializer(user).data)


class AsignarClientesView(APIView):
    permission_classes = [SoloAdmin]

    @transaction.atomic
    def post(self, request):
        s = AsignarClientesSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = get_object_or_404(User, pk=s.validated_data["user_id"])
        antes = _estado_usuario(user)
        user.perfil.clientes.set(Cliente.objects.filter(id__in=s.validated_data["clientes"]))
        auditar(request, "ASIGNACION_CLIENTES", "Usuario", user.pk, user.username,
                antes=antes, despues=_estado_usuario(user))
        return Response(EquipoUsuarioSerializer(user).data)


# ---------------------------------------------------------------------------
# Auditoría (lectura)
# ---------------------------------------------------------------------------
class AuditoriaPagination(PageNumberPagination):
    page_size = 50


class AuditoriaListView(generics.ListAPIView):
    """ADMIN: todo · OFICINA: eventos de sus clientes · OPERARIO: solo los propios."""

    serializer_class = AuditoriaSerializer
    permission_classes = [TieneRol]
    pagination_class = AuditoriaPagination

    def get_queryset(self):
        user = self.request.user
        rol = rol_de(user)
        qs = Auditoria.objects.all()
        if rol == Rol.OFICINA:
            qs = qs.filter(cliente_id__in=clientes_ids(user))
        elif rol == Rol.OPERARIO:
            qs = qs.filter(usuario=user)
        p = self.request.query_params
        if p.get("accion"):
            qs = qs.filter(accion=p["accion"])
        if p.get("objeto"):
            qs = qs.filter(objeto=p["objeto"])
        if p.get("usuario"):
            qs = qs.filter(usuario_nombre__icontains=p["usuario"])
        tz = timezone.get_current_timezone()
        for clave, lookup, hora in (("desde", "fecha__gte", time.min), ("hasta", "fecha__lte", time.max)):
            if p.get(clave):
                try:
                    d = datetime.strptime(p[clave], "%Y-%m-%d").date()
                except ValueError:
                    raise ValidationError({clave: "Formato de fecha inválido (AAAA-MM-DD)."})
                qs = qs.filter(**{lookup: timezone.make_aware(datetime.combine(d, hora), tz)})
        return qs
