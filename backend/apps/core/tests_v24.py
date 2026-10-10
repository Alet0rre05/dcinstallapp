"""Tests de la v2.4: dashboard de vencimientos, remito PDF y notificaciones."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from . import remito_pdf
from .models import Cliente, Control, Matafuego, MensajeChat, Notificacion, Rol, TicketSoporte

User = get_user_model()
HOY = timezone.localdate()


def usuario(nombre, rol, *clientes):
    u = User.objects.create_user(nombre, password="Clave-Segura-123")
    u.perfil.rol = rol
    u.perfil.save()
    u.perfil.clientes.add(*clientes)
    return u


def equipo(cliente, serie, carga_dias=200, ph_dias=200, **kw):
    return Matafuego.objects.create(
        cliente=cliente,
        numero_serie=serie,
        vencimiento_carga=HOY + timedelta(days=carga_dias),
        vencimiento_ph=HOY + timedelta(days=ph_dias),
        **kw,
    )


class DashboardTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.a = Cliente.objects.create(nombre="A")
        self.b = Cliente.objects.create(nombre="B")
        self.op = usuario("op", Rol.OPERARIO, self.a)

    def get(self, qs=""):
        self.api.force_authenticate(self.op)
        return self.api.get(f"/api/dashboard/vencimientos/{qs}")

    def test_requiere_rol(self):
        sin_rol = User.objects.create_user("pub", password="x")
        self.api.force_authenticate(sin_rol)
        self.assertEqual(self.api.get("/api/dashboard/vencimientos/").status_code, 403)
        self.api.force_authenticate(None)
        self.assertIn(self.api.get("/api/dashboard/vencimientos/").status_code, (401, 403))

    def test_solo_clientes_asignados_y_activos(self):
        equipo(self.a, "1")
        equipo(self.b, "2")
        equipo(self.a, "3", activo=False)
        data = self.get().json()
        self.assertEqual(data["totales"]["equipos"], 1)

    def test_vencidos_por_vencer_y_meses(self):
        equipo(self.a, "venc", carga_dias=-5)          # carga vencida
        equipo(self.a, "pronto", ph_dias=10)           # PH en 10 días
        equipo(self.a, "lejos")                        # sin problemas
        data = self.get("?meses=12").json()
        self.assertEqual(data["totales"]["vencidos"], 1)
        self.assertEqual(data["totales"]["por_vencer"], 1)
        self.assertEqual(data["vencidos_por_tipo"], {"carga": 1, "ph": 0})
        self.assertEqual(len(data["por_mes"]), 12)
        self.assertEqual(data["por_mes"][0]["mes"], f"{HOY.year:04d}-{HOY.month:02d}")
        series = [f["numero_serie"] for f in data["proximos"]]
        self.assertEqual(series, ["venc", "pronto"])  # ordenados por fecha; "lejos" queda afuera
        self.assertLess(data["proximos"][0]["dias"], 0)

    def test_filtro_cliente_invalido(self):
        self.assertEqual(self.get("?cliente=abc").status_code, 400)
        self.assertEqual(self.get("?meses=x").status_code, 400)

    def test_cantidad_fija_de_consultas(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        def consultas():
            with CaptureQueriesContext(connection) as ctx:
                self.assertEqual(self.get().status_code, 200)
            return len(ctx)

        for i in range(3):
            Control.objects.create(matafuego=equipo(self.a, f"e{i}"), usuario=self.op)
        con_3 = consultas()
        for i in range(3, 20):
            Control.objects.create(matafuego=equipo(self.a, f"e{i}"), usuario=self.op)
        self.assertEqual(consultas(), con_3)


class RemitoTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.a = Cliente.objects.create(nombre="ACME")
        self.b = Cliente.objects.create(nombre="Otro")
        self.op = usuario("op", Rol.OPERARIO, self.a)
        self.of = usuario("of", Rol.OFICINA, self.a)
        self.ticket = TicketSoporte.objects.create(titulo="Recarga", cliente=self.a, creado_por=self.op)
        MensajeChat.objects.create(ticket=self.ticket, autor=self.op, texto="Presión baja (ñandú)")

    def test_pdf_generico_es_valido(self):
        pdf = remito_pdf._ejemplo()
        self.assertTrue(pdf.startswith(b"%PDF-1.4"))
        self.assertTrue(pdf.rstrip().endswith(b"%%EOF"))

    def test_ticket_abierto_no_tiene_remito(self):
        self.api.force_authenticate(self.of)
        r = self.api.get(f"/api/tickets/{self.ticket.pk}/remito/")
        self.assertEqual(r.status_code, 400)
        self.assertIn("cerrado", r.json()["detail"])

    def test_ticket_cerrado_devuelve_pdf(self):
        self.api.force_authenticate(self.of)
        self.assertEqual(self.api.post(f"/api/tickets/{self.ticket.pk}/cerrar/").status_code, 200)
        r = self.api.get(f"/api/tickets/{self.ticket.pk}/remito/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "application/pdf")
        self.assertIn(f"remito-R-{self.ticket.pk:06d}.pdf", r["Content-Disposition"])
        self.assertTrue(r.content.startswith(b"%PDF-1.4"))

    def test_operario_solo_su_ticket_y_otro_cliente_no(self):
        self.ticket.estado = TicketSoporte.Estado.CERRADO
        self.ticket.save()
        ajeno = TicketSoporte.objects.create(titulo="X", cliente=self.a, creado_por=self.of,
                                             estado=TicketSoporte.Estado.CERRADO)
        self.api.force_authenticate(self.op)
        self.assertEqual(self.api.get(f"/api/tickets/{self.ticket.pk}/remito/").status_code, 200)
        self.assertEqual(self.api.get(f"/api/tickets/{ajeno.pk}/remito/").status_code, 404)
        otro = TicketSoporte.objects.create(titulo="Y", cliente=self.b, creado_por=self.of,
                                            estado=TicketSoporte.Estado.CERRADO)
        self.api.force_authenticate(self.of)
        self.assertEqual(self.api.get(f"/api/tickets/{otro.pk}/remito/").status_code, 404)


class NotificacionesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.a = Cliente.objects.create(nombre="ACME")
        self.op = usuario("op", Rol.OPERARIO, self.a)
        self.of = usuario("of", Rol.OFICINA, self.a)
        self.admin = usuario("adm", Rol.ADMIN)
        self.ajena = usuario("ajena", Rol.OFICINA)  # oficina sin ese cliente
        self.ticket = TicketSoporte.objects.create(titulo="Recarga", cliente=self.a, creado_por=self.op)

    def tipos(self, user):
        return list(Notificacion.objects.filter(usuario=user).values_list("tipo", flat=True))

    def test_mensaje_del_operario_avisa_al_soporte_del_cliente(self):
        self.api.force_authenticate(self.op)
        r = self.api.post(f"/api/tickets/{self.ticket.pk}/mensajes/", {"texto": "Hola"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.tipos(self.of), ["TICKET_MENSAJE"])
        self.assertEqual(self.tipos(self.admin), ["TICKET_MENSAJE"])
        self.assertEqual(self.tipos(self.ajena), [])  # no tiene ese cliente
        self.assertEqual(self.tipos(self.op), [])      # no se avisa a quien escribe

    def test_respuesta_de_soporte_avisa_al_operario(self):
        self.api.force_authenticate(self.of)
        self.api.post(f"/api/tickets/{self.ticket.pk}/mensajes/", {"texto": "Listo"}, format="json")
        self.assertEqual(self.tipos(self.op), ["TICKET_MENSAJE"])
        self.assertEqual(self.tipos(self.admin), [])

    def test_cierre_y_reapertura(self):
        self.api.force_authenticate(self.of)
        self.api.post(f"/api/tickets/{self.ticket.pk}/cerrar/")
        self.api.post(f"/api/tickets/{self.ticket.pk}/reabrir/")
        self.assertEqual(self.tipos(self.op), ["TICKET_REABIERTO", "TICKET_CERRADO"])  # más nueva primero

    def test_listar_contar_y_marcar_leidas(self):
        Notificacion.objects.create(usuario=self.op, tipo="TICKET_MENSAJE", titulo="a")
        Notificacion.objects.create(usuario=self.op, tipo="TICKET_MENSAJE", titulo="b")
        Notificacion.objects.create(usuario=self.of, tipo="TICKET_MENSAJE", titulo="ajena")
        self.api.force_authenticate(self.op)
        self.assertEqual(self.api.get("/api/notificaciones/contador/").json(), {"no_leidas": 2})
        data = self.api.get("/api/notificaciones/").json()
        self.assertEqual(len(data["results"]), 2)
        primera = data["results"][0]["id"]
        r = self.api.post("/api/notificaciones/leer/", {"ids": [primera]}, format="json")
        self.assertEqual(r.json(), {"no_leidas": 1})
        r = self.api.post("/api/notificaciones/leer/", {"todas": True}, format="json")
        self.assertEqual(r.json(), {"no_leidas": 0})
        self.assertEqual(self.api.post("/api/notificaciones/leer/", {}, format="json").status_code, 400)
        # no puede marcar las de otro usuario
        ajena = Notificacion.objects.get(titulo="ajena")
        self.api.post("/api/notificaciones/leer/", {"ids": [ajena.pk]}, format="json")
        ajena.refresh_from_db()
        self.assertFalse(ajena.leida)

    def test_vencimientos_semanales_sin_duplicados(self):
        equipo(self.a, "venc", carga_dias=-3)
        equipo(self.a, "pronto", ph_dias=5)
        equipo(self.a, "ok")
        self.api.force_authenticate(self.op)
        self.api.get("/api/notificaciones/")
        cache.clear()  # fuerza otra sincronización: la clave semanal evita el duplicado
        self.api.get("/api/notificaciones/")
        notifs = Notificacion.objects.filter(usuario=self.op, tipo="VENCIMIENTOS")
        self.assertEqual(notifs.count(), 1)
        n = notifs.get()
        self.assertIn("1 vencido", n.mensaje)
        self.assertIn("1 por vencer", n.mensaje)
        self.assertEqual(n.enlace, f"/dashboard?cliente={self.a.pk}")

    def test_sin_rol_no_accede(self):
        pub = User.objects.create_user("pub", password="x")
        self.api.force_authenticate(pub)
        self.assertEqual(self.api.get("/api/notificaciones/contador/").status_code, 403)
