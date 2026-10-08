from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .audit import ip_de
from .models import (
    MAX_CARACTERES_MENSAJE,
    Auditoria,
    Cliente,
    Rol,
    Control,
    Matafuego,
    MensajeChat,
    TicketSoporte,
)
from .permissions import clientes_ids, rol_de
from .turnstile import verificar_turnstile

User = get_user_model()


# ---------------------------------------------------------------------------
# Usuarios
# ---------------------------------------------------------------------------
class RegistroSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    turnstile_token = serializers.CharField(write_only=True, allow_blank=True, required=False)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ese nombre de usuario ya existe.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ese email ya está registrado.")
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not verificar_turnstile(attrs.pop("turnstile_token", ""), ip_de(request)):
            raise serializers.ValidationError({"turnstile_token": "Verificación anti-bot fallida."})
        return attrs

    def create(self, validated_data):
        # El Perfil se crea por señal post_save SIN rol ("Público registrado")
        return User.objects.create_user(**validated_data)


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["id", "nombre", "contacto"]


class MeSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()
    clientes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "rol", "clientes"]

    def get_rol(self, obj):
        return rol_de(obj)

    def get_clientes(self, obj):
        ids = clientes_ids(obj)
        qs = Cliente.objects.all() if ids is None else Cliente.objects.filter(id__in=ids)
        return ClienteSerializer(qs, many=True).data


class ActualizarPerfilSerializer(serializers.Serializer):
    """Cambiar nombre, email o contraseña SIEMPRE exige la contraseña actual."""

    current_password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    new_password = serializers.CharField(write_only=True, required=False)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return value

    def validate_email(self, value):
        user = self.context["request"].user
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Ese email ya está registrado.")
        return value.lower()

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        data = self.validated_data
        if "first_name" in data:
            user.first_name = data["first_name"]
        if "email" in data:
            user.email = data["email"]
        if "new_password" in data:
            user.set_password(data["new_password"])
        user.save()
        return user


# ---------------------------------------------------------------------------
# Matafuegos y controles
# ---------------------------------------------------------------------------
class MatafuegoSerializer(serializers.ModelSerializer):
    estado_color = serializers.CharField(read_only=True)
    problemas = serializers.SerializerMethodField()
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    ultimo_control = serializers.SerializerMethodField()

    class Meta:
        model = Matafuego
        fields = [
            "id", "cliente", "cliente_nombre", "numero_serie", "clase", "ubicacion",
            "vencimiento_carga", "vencimiento_ph", "token_qr", "activo",
            "estado_color", "problemas", "ultimo_control",
        ]
        read_only_fields = ["token_qr", "activo"]

    def get_problemas(self, obj):
        return obj.problemas()

    def get_ultimo_control(self, obj):
        c = obj.ultimo_control
        return c.fecha if c else None

    def validate_cliente(self, cliente):
        ids = clientes_ids(self.context["request"].user)
        if ids is not None and cliente.id not in ids:
            raise serializers.ValidationError("No tenés acceso a ese cliente.")
        return cliente


class MatafuegoPublicoSerializer(serializers.ModelSerializer):
    """Datos reducidos para el escaneo público de QR (sin IDs internos ni token)."""

    cliente = serializers.CharField(source="cliente.nombre", read_only=True)
    estado_color = serializers.CharField(read_only=True)
    ultimo_control = serializers.SerializerMethodField()

    class Meta:
        model = Matafuego
        fields = [
            "numero_serie", "clase", "ubicacion", "cliente",
            "vencimiento_carga", "vencimiento_ph", "estado_color", "ultimo_control",
        ]

    def get_ultimo_control(self, obj):
        c = obj.ultimo_control
        return c.fecha if c else None


class ImportarMatafuegosSerializer(serializers.Serializer):
    """Entrada de la carga masiva (multipart). El contenido del archivo lo valida importacion.py."""

    archivo = serializers.FileField(max_length=255)
    cliente = serializers.IntegerField()
    dry_run = serializers.BooleanField(required=False, default=False)


class ControlSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="usuario.username", read_only=True)

    class Meta:
        model = Control
        fields = [
            "id", "matafuego", "fecha", "usuario", "usuario_nombre", "presion",
            "senalizacion", "chapa_baliza", "accesible", "observaciones",
            "ubicacion", "vencimiento_carga", "vencimiento_ph",
        ]
        read_only_fields = ["fecha", "usuario"]

    def validate_matafuego(self, matafuego):
        ids = clientes_ids(self.context["request"].user)
        if ids is not None and matafuego.cliente_id not in ids:
            raise serializers.ValidationError("No tenés acceso a ese matafuego.")
        if not matafuego.activo:
            raise serializers.ValidationError("El matafuego está dado de baja.")
        return matafuego

    def create(self, validated_data):
        validated_data["usuario"] = self.context["request"].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Soporte
# ---------------------------------------------------------------------------
class MensajeSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.CharField(source="autor.username", read_only=True)
    texto = serializers.CharField(max_length=MAX_CARACTERES_MENSAJE, trim_whitespace=True)

    class Meta:
        model = MensajeChat
        fields = ["id", "autor", "autor_nombre", "es_soporte", "texto", "fecha"]
        read_only_fields = ["autor", "es_soporte", "fecha"]


class TicketSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    creado_por_nombre = serializers.CharField(source="creado_por.username", read_only=True)
    # Mensaje inicial opcional al crear el ticket
    mensaje = serializers.CharField(
        write_only=True, required=False, max_length=MAX_CARACTERES_MENSAJE
    )

    class Meta:
        model = TicketSoporte
        fields = [
            "id", "titulo", "cliente", "cliente_nombre", "creado_por_nombre",
            "estado", "matafuego", "fecha_creacion", "mensaje",
        ]
        read_only_fields = ["estado", "fecha_creacion"]
        extra_kwargs = {"cliente": {"required": False}}

    def validate(self, attrs):
        user = self.context["request"].user
        ids = clientes_ids(user)
        cliente = attrs.get("cliente")
        if cliente is None:
            if ids is not None and len(ids) == 1:
                cliente = Cliente.objects.get(pk=ids[0])
                attrs["cliente"] = cliente
            else:
                raise serializers.ValidationError({"cliente": "Indicá el cliente del ticket."})
        if ids is not None and cliente.id not in ids:
            raise serializers.ValidationError({"cliente": "No tenés acceso a ese cliente."})
        mata = attrs.get("matafuego")
        if mata and mata.cliente_id != cliente.id:
            raise serializers.ValidationError(
                {"matafuego": "El matafuego no pertenece a ese cliente."}
            )
        return attrs


# ---------------------------------------------------------------------------
# Equipo (solo ADMIN) y auditoría
# ---------------------------------------------------------------------------
class EquipoUsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()
    clientes = serializers.SerializerMethodField()
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "nombre", "email", "rol", "clientes", "is_superuser"]

    def get_rol(self, obj):
        return rol_de(obj)

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.first_name or obj.username

    def get_clientes(self, obj):
        perfil = getattr(obj, "perfil", None)
        if not perfil:
            return []
        return [{"id": c.id, "nombre": c.nombre} for c in perfil.clientes.all()]


class AsignarRolSerializer(serializers.Serializer):
    email = serializers.EmailField()
    rol = serializers.ChoiceField(choices=Rol.choices)
    clientes = serializers.ListField(child=serializers.IntegerField(), required=False)


class RevocarRolSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()


class AsignarClientesSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    clientes = serializers.ListField(child=serializers.IntegerField())


class AuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auditoria
        fields = [
            "id", "fecha", "usuario_nombre", "rol", "ip", "accion",
            "objeto", "objeto_id", "objeto_repr", "cliente_id", "antes", "despues",
        ]
