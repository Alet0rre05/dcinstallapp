from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

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

User = get_user_model()
HOY = timezone.localdate()


def mata(cliente, serie="A1", carga=None, ph=None):
    return Matafuego.objects.create(
        cliente=cliente,
        numero_serie=serie,
        vencimiento_carga=carga or HOY + timedelta(days=200),
        vencimiento_ph=ph or HOY + timedelta(days=200),
    )


class EstadoColorTests(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(nombre="ACME")
        self.user = User.objects.create_user("op", password="x")

    def control(self, m, **kw):
        return Control.objects.create(matafuego=m, usuario=self.user, **kw)

    def color(self, m):
        return Matafuego.objects.prefetch_related("controles").get(pk=m.pk).estado_color

    def test_gris_sin_controles(self):
        self.assertEqual(self.color(mata(self.cliente)), "GRIS")

    def test_gris_sin_vencimientos(self):
        m = Matafuego.objects.create(cliente=self.cliente, numero_serie="X")
        self.control(m)
        self.assertEqual(self.color(m), "GRIS")

    def test_verde(self):
        m = mata(self.cliente)
        self.control(m)
        self.assertEqual(self.color(m), "VERDE")

    def test_amarillo(self):
        m = mata(self.cliente, carga=HOY + timedelta(days=30))
        self.control(m)
        self.assertEqual(self.color(m), "AMARILLO")

    def test_rojo_un_problema(self):
        m = mata(self.cliente, carga=HOY - timedelta(days=1))
        self.control(m)
        self.assertEqual(self.color(m), "ROJO")

    def test_bordo_dos_problemas(self):
        m = mata(self.cliente, carga=HOY - timedelta(days=1))
        self.control(m, presion=Control.Presion.BAJA)
        self.assertEqual(self.color(m), "BORDO")

    def test_bordo_inaccesible_y_chapa(self):
        m = mata(self.cliente)
        self.control(m, accesible=False, chapa_baliza=False)
        self.assertEqual(self.color(m), "BORDO")

    def test_control_actualiza_padre_y_es_inmutable(self):
        m = mata(self.cliente)
        nueva = HOY + timedelta(days=400)
        c = self.control(m, ubicacion="Hall", vencimiento_carga=nueva)
        m.refresh_from_db()
        self.assertEqual(m.ubicacion, "Hall")
        self.assertEqual(m.vencimiento_carga, nueva)
        with self.assertRaises(PermissionError):
            c.save()
        with self.assertRaises(PermissionError):
            c.delete()

    def test_token_qr_inmutable(self):
        m = mata(self.cliente)
        original = m.token_qr
        import uuid

        m.token_qr = uuid.uuid4()
        m.save()
        m.refresh_from_db()
        self.assertEqual(m.token_qr, original)


class ChatTests(TestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(nombre="ACME")
        self.u = User.objects.create_user("cli", password="x")
        self.s = User.objects.create_user("sup", password="x")
        self.t = TicketSoporte.objects.create(titulo="Ayuda", cliente=self.cliente, creado_por=self.u)

    def enviar(self, user, soporte):
        MensajeChat.validar_limite(self.t, soporte)
        MensajeChat.objects.create(ticket=self.t, autor=user, es_soporte=soporte, texto="hola")

    def test_cliente_max_3_seguidos(self):
        for _ in range(3):
            self.enviar(self.u, False)
        with self.assertRaises(LimiteMensajesExcedido):
            self.enviar(self.u, False)
        self.enviar(self.s, True)  # soporte responde
        self.enviar(self.u, False)  # el cliente puede volver a escribir

    def test_soporte_max_10_seguidos(self):
        for _ in range(10):
            self.enviar(self.s, True)
        with self.assertRaises(LimiteMensajesExcedido):
            self.enviar(self.s, True)


@override_settings(AXES_ENABLED=False, SECURE_SSL_REDIRECT=False)
class ApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.a = Cliente.objects.create(nombre="A")
        self.b = Cliente.objects.create(nombre="B")
        self.u = User.objects.create_user("u", password="Clave-Segura-123")
        self.u.perfil.rol = Rol.OFICINA
        self.u.perfil.save()
        self.u.perfil.clientes.add(self.a)

    @override_settings(DEBUG=True)
    def test_registro_crea_publico_sin_rol(self):
        r = self.api.post(
            "/api/auth/registro/",
            {"username": "nuevo", "email": "n@x.com", "first_name": "N", "password": "Clave-Segura-123"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertIsNone(r.json()["user"]["rol"])
        self.assertTrue(Auditoria.objects.filter(accion="REGISTRO", usuario_nombre="nuevo").exists())

    @override_settings(DEBUG=False, TURNSTILE_SECRET_KEY="")
    def test_registro_sin_turnstile_falla_en_produccion(self):
        r = self.api.post(
            "/api/auth/registro/",
            {"username": "nuevo", "email": "n@x.com", "first_name": "N", "password": "Clave-Segura-123"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_multitenancy_matafuegos(self):
        ma, mb = mata(self.a, "1"), mata(self.b, "2")
        self.api.force_authenticate(self.u)
        ids = [x["id"] for x in self.api.get("/api/matafuegos/").json()["results"]]
        self.assertIn(ma.id, ids)
        self.assertNotIn(mb.id, ids)

    def test_qr_publico_datos_reducidos(self):
        m = mata(self.a)
        r = self.api.get(f"/api/public/qr/{m.token_qr}/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("id", r.json())
        self.assertNotIn("token_qr", r.json())
        self.assertEqual(r.json()["cliente"], "A")

    def test_baja_logica(self):
        m = mata(self.a)
        self.api.force_authenticate(self.u)
        self.assertEqual(self.api.delete(f"/api/matafuegos/{m.id}/").status_code, 204)
        m.refresh_from_db()
        self.assertFalse(m.activo)
        self.assertEqual(self.api.get(f"/api/public/qr/{m.token_qr}/").status_code, 404)

    def test_cambio_de_datos_exige_password_actual(self):
        self.api.force_authenticate(self.u)
        r = self.api.patch("/api/auth/me/", {"first_name": "Z", "current_password": "mala"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api.patch(
            "/api/auth/me/", {"first_name": "Z", "current_password": "Clave-Segura-123"}, format="json"
        )
        self.assertEqual(r.status_code, 200)

    def test_chat_api_limite_y_paginacion(self):
        self.api.force_authenticate(self.u)
        for i in range(7):
            self.api.post("/api/tickets/", {"titulo": f"T{i}", "cliente": self.a.id}, format="json")
        r = self.api.get("/api/tickets/").json()
        self.assertEqual(len(r["results"]), 5)
        self.assertEqual(r["count"], 7)
        tid = r["results"][0]["id"]
        for _ in range(10):
            self.assertEqual(
                self.api.post(f"/api/tickets/{tid}/mensajes/", {"texto": "hola"}, format="json").status_code,
                201,
            )
        self.assertEqual(
            self.api.post(f"/api/tickets/{tid}/mensajes/", {"texto": "hola"}, format="json").status_code,
            429,
        )


@override_settings(AXES_ENABLED=False, SECURE_SSL_REDIRECT=False)
class RolesYEquipoTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.a = Cliente.objects.create(nombre="A")
        self.b = Cliente.objects.create(nombre="B")
        self.admin = User.objects.create_superuser("admin", "admin@x.com", "Clave-Segura-123")
        self.oficina = self._user("ofi", "ofi@x.com", Rol.OFICINA, [self.a])
        self.operario = self._user("ope", "ope@x.com", Rol.OPERARIO, [self.a])
        self.publico = self._user("pub", "pub@x.com", None, [])

    def _user(self, username, email, rol, clientes):
        u = User.objects.create_user(username, email, "Clave-Segura-123")
        u.perfil.rol = rol
        u.perfil.save()
        u.perfil.clientes.set(clientes)
        return u

    # -- Público registrado -------------------------------------------------
    def test_publico_sin_acceso_a_nada_interno(self):
        self.api.force_authenticate(self.publico)
        self.assertEqual(self.api.get("/api/matafuegos/").status_code, 403)
        self.assertEqual(self.api.get("/api/tickets/").status_code, 403)
        self.assertEqual(self.api.get("/api/auditoria/").status_code, 403)
        self.assertEqual(self.api.get("/api/equipo/usuarios/").status_code, 403)
        r = self.api.patch("/api/auth/me/", {"first_name": "Z", "current_password": "Clave-Segura-123"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_publico_puede_ver_me_y_qr_publico(self):
        m = mata(self.a)
        self.api.force_authenticate(self.publico)
        r = self.api.get("/api/auth/me/")
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["rol"])
        self.assertEqual(self.api.get(f"/api/public/qr/{m.token_qr}/").status_code, 200)

    def test_login_deja_auditoria(self):
        r = self.api.post("/api/auth/login/", {"username": "ofi", "password": "Clave-Segura-123"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(Auditoria.objects.filter(accion="LOGIN", usuario_nombre="ofi").exists())

    # -- Equipo ---------------------------------------------------------------
    def test_solo_admin_gestiona_equipo(self):
        for u in (self.oficina, self.operario, self.publico):
            self.api.force_authenticate(u)
            r = self.api.post("/api/equipo/asignar-rol/", {"email": "pub@x.com", "rol": "OPERARIO"}, format="json")
            self.assertEqual(r.status_code, 403)

    def test_asignar_rol_email_inexistente_no_crea_cuenta(self):
        self.api.force_authenticate(self.admin)
        antes = User.objects.count()
        r = self.api.post("/api/equipo/asignar-rol/", {"email": "nadie@x.com", "rol": "OPERARIO"}, format="json")
        self.assertEqual(r.status_code, 404)
        self.assertIn("registrarse", r.json()["detail"])
        self.assertEqual(User.objects.count(), antes)

    def test_asignar_y_revocar_rol_con_auditoria(self):
        self.api.force_authenticate(self.admin)
        r = self.api.post(
            "/api/equipo/asignar-rol/",
            {"email": "PUB@x.com", "rol": "OPERARIO", "clientes": [self.a.id]},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.publico.perfil.refresh_from_db()
        self.assertEqual(self.publico.perfil.rol, Rol.OPERARIO)
        ev = Auditoria.objects.get(accion="ASIGNACION_ROL")
        self.assertEqual(ev.usuario_nombre, "admin")
        self.assertIsNone(ev.antes["rol"])
        self.assertEqual(ev.despues["rol"], "OPERARIO")

        r = self.api.post("/api/equipo/revocar-rol/", {"user_id": self.publico.id}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.publico.perfil.refresh_from_db()
        self.assertIsNone(self.publico.perfil.rol)
        self.assertTrue(User.objects.filter(pk=self.publico.pk).exists())  # la cuenta NO se elimina
        ev = Auditoria.objects.get(accion="REVOCACION_ROL")
        self.assertEqual(ev.antes["rol"], "OPERARIO")
        self.assertIsNone(ev.despues["rol"])

        # pierde acceso de inmediato
        self.api.force_authenticate(self.publico)
        self.assertEqual(self.api.get("/api/matafuegos/").status_code, 403)

    def test_admin_no_puede_revocarse_a_si_mismo(self):
        self.api.force_authenticate(self.admin)
        r = self.api.post("/api/equipo/revocar-rol/", {"user_id": self.admin.id}, format="json")
        self.assertEqual(r.status_code, 400)

    # -- QR con edición según rol ---------------------------------------------
    def test_qr_privado_respeta_cliente_asignado(self):
        propia, ajena = mata(self.a, "P"), mata(self.b, "X")
        self.api.force_authenticate(self.operario)
        self.assertEqual(self.api.get(f"/api/matafuegos/qr/{propia.token_qr}/").status_code, 200)
        self.assertEqual(self.api.get(f"/api/matafuegos/qr/{ajena.token_qr}/").status_code, 404)
        self.api.force_authenticate(self.publico)
        self.assertEqual(self.api.get(f"/api/matafuegos/qr/{propia.token_qr}/").status_code, 403)
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get(f"/api/matafuegos/qr/{propia.token_qr}/").status_code, 401)

    def test_operario_crea_control_pero_no_edita_matafuego(self):
        m = mata(self.a)
        self.api.force_authenticate(self.operario)
        r = self.api.post("/api/controles/", {"matafuego": m.id, "presion": "NORMAL"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        r = self.api.patch(f"/api/matafuegos/{m.id}/", {"ubicacion": "X"}, format="json")
        self.assertEqual(r.status_code, 403)

    # -- Auditoría --------------------------------------------------------------
    def test_auditoria_de_matafuego_y_visibilidad_por_rol(self):
        self.api.force_authenticate(self.oficina)
        r = self.api.post(
            "/api/matafuegos/", {"cliente": self.a.id, "numero_serie": "Z1", "clase": "ABC"}, format="json"
        )
        self.assertEqual(r.status_code, 201, r.content)
        mid = r.json()["id"]
        self.api.patch(f"/api/matafuegos/{mid}/", {"ubicacion": "Hall"}, format="json")
        self.api.delete(f"/api/matafuegos/{mid}/")
        self.api.post(f"/api/matafuegos/{mid}/restaurar/")
        acciones = list(Auditoria.objects.filter(objeto="Matafuego").values_list("accion", flat=True))
        for esperado in ("CREACION", "MODIFICACION", "BAJA", "RESTAURACION"):
            self.assertIn(esperado, acciones)
        mod = Auditoria.objects.get(accion="MODIFICACION", objeto="Matafuego")
        self.assertEqual(mod.antes["ubicacion"], "")
        self.assertEqual(mod.despues["ubicacion"], "Hall")

        # evento de otro cliente: la oficina (cliente A) no lo ve; el admin sí
        Auditoria.objects.create(accion="CREACION", objeto="Matafuego", cliente_id=self.b.id, usuario_nombre="otro")
        ids_ofi = {e["cliente_id"] for e in self.api.get("/api/auditoria/").json()["results"]}
        self.assertEqual(ids_ofi, {self.a.id})
        self.api.force_authenticate(self.admin)
        ids_admin = {e["cliente_id"] for e in self.api.get("/api/auditoria/").json()["results"]}
        self.assertIn(self.b.id, ids_admin)

    def test_operario_solo_ve_su_auditoria(self):
        m = mata(self.a)
        self.api.force_authenticate(self.operario)
        self.api.post("/api/controles/", {"matafuego": m.id}, format="json")
        Auditoria.objects.create(accion="CREACION", objeto="Matafuego", cliente_id=self.a.id, usuario_nombre="otro")
        res = self.api.get("/api/auditoria/").json()["results"]
        self.assertTrue(res)
        self.assertTrue(all(e["usuario_nombre"] == "ope" for e in res))

    def test_auditoria_es_inmutable(self):
        ev = Auditoria.objects.create(accion="X", objeto="Y")
        with self.assertRaises(PermissionError):
            ev.save()
        with self.assertRaises(PermissionError):
            ev.delete()
