"""Tests de la v3.1 (Parte B: alta/edición en /admin/ · Parte C: OFICINA asigna clientes a operarios)."""
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Auditoria, Cliente, Control, Matafuego, Rol

User = get_user_model()
HOY = timezone.localdate()
MODEL_BACKEND = "django.contrib.auth.backends.ModelBackend"


def usuario(nombre, rol=None, clientes=(), **kw):
    u = User.objects.create_user(nombre, f"{nombre}@x.com", "Clave-Segura-123", **kw)
    u.perfil.rol = rol
    u.perfil.save()
    u.perfil.clientes.set(clientes)
    return u


def equipo(cliente, serie, **kw):
    return Matafuego.objects.create(cliente=cliente, numero_serie=serie, **kw)


# ---------------------------------------------------------------------------
# PARTE B · alta y edición en /admin/ para Staff
# ---------------------------------------------------------------------------
@override_settings(AXES_ENABLED=False, SECURE_SSL_REDIRECT=False)
class AltaEdicionAdminTests(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(nombre="ACME", planta="Planta 1")
        # Staff SIN permisos de modelo y SIN rol en la app
        self.staff = usuario("staff", None, is_staff=True)
        # ADMIN de la app pero SIN Staff status
        self.admin_app = usuario("adminapp", Rol.ADMIN, [self.cliente])
        self.web = self.client
        self.web.force_login(self.staff, backend=MODEL_BACKEND)

    def test_staff_ve_y_agrega_cliente(self):
        self.assertEqual(self.web.get(reverse("admin:core_cliente_add")).status_code, 200)
        r = self.web.post(reverse("admin:core_cliente_add"), {"nombre": "Nuevo SA", "contacto": "", "planta": ""})
        self.assertEqual(r.status_code, 302)
        self.assertTrue(Cliente.objects.filter(nombre="Nuevo SA").exists())
        a = Auditoria.objects.get(accion="CREACION", objeto="Cliente", objeto_repr="Nuevo SA")
        self.assertEqual(a.usuario_nombre, "staff")
        self.assertEqual(a.despues["nombre"], "Nuevo SA")

    def test_staff_agrega_matafuego_y_queda_auditado(self):
        r = self.web.post(reverse("admin:core_matafuego_add"), {
            "cliente": self.cliente.pk, "numero_serie": "M-1", "ubicacion": "Hall", "marca": "",
            "anio_fabricacion": "2020", "clase": "ABC", "agente": " polvo ", "capacidad": "5 KG",
            "vencimiento_ph": "", "vencimiento_carga": "", "activo": "on",
        })
        self.assertEqual(r.status_code, 302)
        m = Matafuego.objects.get(numero_serie="M-1")
        self.assertEqual(m.agente, "POLVO")  # el modelo lo normaliza igual que en la API
        a = Auditoria.objects.get(accion="CREACION", objeto="Matafuego", objeto_id=str(m.pk))
        self.assertEqual(a.cliente_id, self.cliente.pk)
        self.assertIsNone(a.antes)
        self.assertEqual(a.despues["numero_serie"], "M-1")

    def test_staff_edita_matafuego_y_queda_modificacion_con_antes(self):
        m = equipo(self.cliente, "M-2", ubicacion="Depósito", clase="ABC")
        r = self.web.post(reverse("admin:core_matafuego_change", args=[m.pk]), {
            "cliente": self.cliente.pk, "numero_serie": "M-2", "ubicacion": "Pasillo", "marca": "",
            "anio_fabricacion": "", "clase": "ABC", "agente": "", "capacidad": "",
            "vencimiento_ph": "", "vencimiento_carga": "", "activo": "on",
        })
        self.assertEqual(r.status_code, 302)
        m.refresh_from_db()
        self.assertEqual(m.ubicacion, "Pasillo")
        a = Auditoria.objects.get(accion="MODIFICACION", objeto="Matafuego", objeto_id=str(m.pk))
        self.assertEqual(a.antes["ubicacion"], "Depósito")  # leído de la base, no del formulario
        self.assertEqual(a.despues["ubicacion"], "Pasillo")

    def test_staff_edita_cliente_y_queda_modificacion(self):
        r = self.web.post(reverse("admin:core_cliente_change", args=[self.cliente.pk]), {
            "nombre": "ACME", "contacto": "Juan", "planta": "Planta 2",
        })
        self.assertEqual(r.status_code, 302)
        a = Auditoria.objects.get(accion="MODIFICACION", objeto="Cliente", objeto_id=str(self.cliente.pk))
        self.assertEqual(a.antes["planta"], "Planta 1")
        self.assertEqual(a.despues["planta"], "Planta 2")

    def test_no_puede_agregar_ni_editar_controles(self):
        c = Control.objects.create(matafuego=equipo(self.cliente, "C-1"), usuario=self.staff)
        self.assertEqual(self.web.get(reverse("admin:core_control_add")).status_code, 403)
        self.assertEqual(self.web.get(reverse("admin:core_control_change", args=[c.pk])).status_code, 403)

    def test_no_puede_agregar_perfil_ni_usuarios(self):
        self.assertEqual(self.web.get(reverse("admin:core_perfil_add")).status_code, 403)
        self.assertEqual(self.web.get(reverse("admin:auth_user_add")).status_code, 403)

    def test_serie_duplicada_en_el_mismo_cliente_es_error_de_formulario(self):
        equipo(self.cliente, "DUP")
        r = self.web.post(reverse("admin:core_matafuego_add"), {
            "cliente": self.cliente.pk, "numero_serie": "DUP", "ubicacion": "", "marca": "",
            "anio_fabricacion": "", "clase": "", "agente": "", "capacidad": "",
            "vencimiento_ph": "", "vencimiento_carga": "", "activo": "on",
        })
        self.assertEqual(r.status_code, 200)  # formulario con error, no 500
        self.assertEqual(Matafuego.objects.filter(numero_serie="DUP").count(), 1)

    def test_anio_fuera_de_rango_es_error_de_formulario(self):
        r = self.web.post(reverse("admin:core_matafuego_add"), {
            "cliente": self.cliente.pk, "numero_serie": "VIEJO", "ubicacion": "", "marca": "",
            "anio_fabricacion": "1800", "clase": "", "agente": "", "capacidad": "",
            "vencimiento_ph": "", "vencimiento_carga": "", "activo": "on",
        })
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Matafuego.objects.filter(numero_serie="VIEJO").exists())

    def test_admin_de_la_app_sin_staff_no_entra_al_admin(self):
        self.web.force_login(self.admin_app, backend=MODEL_BACKEND)
        r = self.web.get(reverse("admin:core_cliente_add"))
        self.assertIn(r.status_code, (302, 403))
        self.assertFalse(Auditoria.objects.filter(accion="CREACION", objeto="Cliente").exists())


# ---------------------------------------------------------------------------
# PARTE C · OFICINA asigna clientes a OPERARIOS
# ---------------------------------------------------------------------------
class OperariosTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.x = Cliente.objects.create(nombre="X")  # fuera de la cartera de la oficina 1
        self.y = Cliente.objects.create(nombre="Y")  # dentro de la cartera de la oficina 1
        self.z = Cliente.objects.create(nombre="Z")  # cartera de la oficina 2
        self.of1 = usuario("of1", Rol.OFICINA, [self.y])
        self.of2 = usuario("of2", Rol.OFICINA, [self.z])
        self.admin = usuario("admin", Rol.ADMIN, [self.x, self.y, self.z])
        self.op = usuario("op", Rol.OPERARIO, [self.x, self.y])
        self.op_b = usuario("opb", Rol.OPERARIO, [self.z])
        self.operario_sin_rol = usuario("sinrol", None, [self.y])
        self.oficina_ajena = usuario("ofajena", Rol.OFICINA, [self.y])

    def test_lista_operarios_solo_con_su_alcance(self):
        self.api.force_authenticate(self.of1)
        data = self.api.get("/api/equipo/operarios/").json()
        nombres = {o["username"]: o for o in data["results"]}
        self.assertIn("op", nombres)
        self.assertIn("opb", nombres)  # la oficina ve todos los operarios
        self.assertEqual([c["nombre"] for c in nombres["op"]["clientes"]], ["Y"])  # no ve X
        self.assertEqual(nombres["opb"]["clientes"], [])  # no ve la cartera de of2
        self.assertNotIn("admin", nombres)
        self.assertNotIn("sinrol", nombres)

    def test_operario_y_publico_reciben_403(self):
        self.api.force_authenticate(self.op)
        self.assertEqual(self.api.get("/api/equipo/operarios/").status_code, 403)
        self.api.force_authenticate(None)
        self.assertIn(self.api.get("/api/equipo/operarios/").status_code, (401, 403))

    def test_oficina_asigna_clientes_propios_y_audita(self):
        self.api.force_authenticate(self.of1)
        r = self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": self.op_b.pk, "clientes": [self.y.pk]}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual({c.nombre for c in self.op_b.perfil.clientes.all()}, {"Z", "Y"})
        self.assertTrue(Auditoria.objects.filter(accion="ASIGNACION_CLIENTES", objeto="Usuario", objeto_id=str(self.op_b.pk)).exists())

    def test_oficina_no_asigna_cliente_ajeno_400(self):
        self.api.force_authenticate(self.of1)
        r = self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": self.op_b.pk, "clientes": [self.z.pk]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_cliente_inexistente_400(self):
        self.api.force_authenticate(self.of1)
        r = self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": self.op_b.pk, "clientes": [99999]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_solo_sobre_operarios_403(self):
        self.api.force_authenticate(self.of1)
        for objetivo in (self.of2, self.admin, self.operario_sin_rol):
            r = self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": objetivo.pk, "clientes": [self.y.pk]}, format="json")
            self.assertEqual(r.status_code, 403, objetivo.username)
        self.assertEqual(self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": 99999, "clientes": []}, format="json").status_code, 404)

    def test_no_pisa_clientes_fuera_de_la_cartera(self):
        # op tiene X (fuera de of1) e Y (dentro); of1 guarda [] -> conserva X, pierde Y
        self.api.force_authenticate(self.of1)
        r = self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": self.op.pk, "clientes": []}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual({c.nombre for c in self.op.perfil.clientes.all()}, {"X"})

    def test_dos_oficinas_no_se_pisan(self):
        self.op.perfil.clientes.set([self.x, self.y, self.z])
        self.api.force_authenticate(self.of1)
        self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": self.op.pk, "clientes": []}, format="json")
        self.assertEqual({c.nombre for c in self.op.perfil.clientes.all()}, {"X", "Z"})

    def test_admin_asignacion_exacta_y_endpoints_viejos_siguen_solo_admin(self):
        self.api.force_authenticate(self.admin)
        self.api.post("/api/equipo/operarios/asignar-clientes/", {"user_id": self.op.pk, "clientes": [self.z.pk]}, format="json")
        self.assertEqual({c.nombre for c in self.op.perfil.clientes.all()}, {"Z"})
        self.api.force_authenticate(self.of1)
        self.assertEqual(self.api.get("/api/equipo/usuarios/").status_code, 403)
        r = self.api.post("/api/equipo/asignar-clientes/", {"user_id": self.op.pk, "clientes": []}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_operario_con_clientes_nuevos_ve_equipos_y_crea_controles(self):
        m = equipo(self.y, "E-1")
        self.api.force_authenticate(self.op)
        self.assertIn(self.y.pk, [c["id"] for c in self.api.get("/api/clientes/").json()["results"]])
        r = self.api.post("/api/controles/", {"matafuego": m.pk, "presion": "NORMAL"}, format="json")
        self.assertEqual(r.status_code, 201)
