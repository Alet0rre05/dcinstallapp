from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Auditoria, Cliente, Control, Matafuego, Notificacion, Rol, Tenant, TenantMembership, TenantRole
from .notificaciones import staff_del_cliente


@override_settings(SECURE_SSL_REDIRECT=False, AXES_ENABLED=False)
class TenantIsolationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.a = Tenant.objects.create(nombre="Norte", slug="norte")
        cls.b = Tenant.objects.create(nombre="Sur", slug="sur")
        cls.ca = Cliente.objects.create(nombre="Cliente Norte", tenant=cls.a)
        cls.cb = Cliente.objects.create(nombre="Cliente Sur", tenant=cls.b)
        cls.ma = Matafuego.objects.create(cliente=cls.ca, numero_serie="A")
        cls.mb = Matafuego.objects.create(cliente=cls.cb, numero_serie="B")
        cls.user = get_user_model().objects.create_user("admin-norte", is_staff=True)
        cls.user.perfil.rol = Rol.ADMIN
        cls.user.perfil.save()
        cls.user.perfil.clientes.set([cls.ca, cls.cb])
        cls.other = get_user_model().objects.create_user("admin-sur")
        TenantMembership.objects.create(user=cls.user, tenant=cls.a, role=TenantRole.TENANT_ADMIN)
        TenantMembership.objects.create(user=cls.other, tenant=cls.b, role=TenantRole.TENANT_ADMIN)

    def setUp(self):
        self.api = APIClient()
        token = RefreshToken.for_user(self.user).access_token
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_read_write_and_offline_dataset(self):
        response = self.api.get("/api/clientes/")
        self.assertEqual([c["id"] for c in response.data["results"]], [self.ca.pk])
        self.assertEqual(self.api.get(f"/api/matafuegos/{self.mb.pk}/").status_code, 404)
        self.assertEqual(self.api.patch(f"/api/clientes/{self.cb.pk}/", {"contacto": "otro"}).status_code, 404)
        self.assertEqual(self.api.post("/api/matafuegos/", {"cliente": self.cb.pk, "numero_serie": "C"}).status_code, 400)
        dataset = self.api.get("/api/mobile/offline-dataset/").data
        self.assertEqual([m["id"] for m in dataset["equipos"]], [self.ma.pk])
        created = self.api.post("/api/clientes/", {"nombre": "Nuevo"})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(Cliente.objects.get(pk=created.data["id"]).tenant, self.a)
        self.assertEqual(Auditoria.objects.get(accion="CREACION").tenant, self.a)

    def test_selected_membership_controls_role_and_notifications(self):
        for slug in ("sur", "incorrecta"):
            self.assertEqual(self.api.get("/api/auth/me/", HTTP_X_TENANT_SLUG=slug).status_code, 403)
        TenantMembership.objects.create(user=self.user, tenant=self.b, role=TenantRole.TENANT_OPERATOR)
        selected = {"HTTP_X_TENANT_SLUG": "sur"}
        me = self.api.get("/api/auth/me/", **selected).data
        self.assertEqual((me["tenant_slug"], me["rol"]), ("sur", Rol.OPERARIO))
        self.assertEqual([c["id"] for c in me["clientes"]], [self.cb.pk])
        self.assertEqual(self.api.post("/api/clientes/", {"nombre": "Prohibido"}, **selected).status_code, 403)
        self.assertEqual(self.api.get("/api/auth/me/").data["rol"], Rol.ADMIN)
        notices = [Notificacion.objects.create(tenant=t, usuario=self.user, tipo="ESCALADA", titulo=t.nombre)
                   for t in (self.a, self.b)]
        self.api.post("/api/notificaciones/leer/", {"todas": True}, format="json", **selected)
        self.assertEqual(list(Notificacion.objects.filter(leida=True).values_list("pk", flat=True)), [notices[1].pk])
        self.assertNotIn(self.user, staff_del_cliente(self.cb))

    def test_team_and_audit(self):
        Auditoria.objects.create(tenant=self.b, accion="PRIVADO")
        users = self.api.get("/api/equipo/usuarios/").data["results"]
        self.assertEqual([u["id"] for u in users], [self.user.pk])
        self.assertEqual([c["id"] for c in users[0]["clientes"]], [self.ca.pk])
        self.assertEqual(self.api.get("/api/auditoria/").data["count"], 0)
        response = self.api.post("/api/equipo/revocar-rol/", {"user_id": self.other.pk})
        self.assertEqual(response.status_code, 404)
        self.assertTrue(self.other.tenant_memberships.get().activo)

    def test_change_role_only_in_selected_organization(self):
        self.other.email = "sur@example.com"
        self.other.save()
        local = TenantMembership.objects.create(user=self.other, tenant=self.a, role=TenantRole.TENANT_OPERATOR)
        url = "/api/equipo/asignar-rol/"
        data = {"email": self.other.email, "rol": Rol.OFICINA, "clientes": [self.cb.pk]}
        self.assertEqual(self.api.post(url, data, format="json").status_code, 400)
        local.refresh_from_db()
        self.assertEqual(local.role, TenantRole.TENANT_OPERATOR)
        data["clientes"] = [self.ca.pk]
        self.assertEqual(self.api.post(url, data, format="json").status_code, 200)
        self.assertEqual(self.other.tenant_memberships.get(tenant=self.b).role, TenantRole.TENANT_ADMIN)
        self.assertEqual(self.other.tenant_memberships.get(tenant=self.a).role, TenantRole.TENANT_OFFICE)

    def test_disabled_membership_and_admin_panel(self):
        self.client.force_login(self.user, backend="django.contrib.auth.backends.ModelBackend")
        self.assertEqual(self.client.get(reverse("admin:core_cliente_changelist")).status_code, 403)
        self.a.activo = False
        self.a.save()
        self.assertEqual(self.api.get("/api/clientes/").status_code, 403)
        self.a.activo = True
        self.a.save()
        self.user.tenant_memberships.update(activo=False)
        self.assertEqual(self.api.get("/api/clientes/").status_code, 403)

    def test_legacy_admin_and_control_retry_stay_in_scope(self):
        legacy = get_user_model().objects.create_user("legacy")
        legacy.perfil.rol = Rol.ADMIN
        legacy.perfil.save()
        self.api.force_authenticate(legacy)
        self.assertEqual(self.api.get("/api/clientes/").data["count"], 0)
        self.api.force_authenticate(self.user)
        existing = Control.objects.create(usuario=self.other, matafuego=self.mb)
        response = self.api.post("/api/controles/", {"matafuego": self.ma.pk,
                                 "idempotency_key": str(existing.idempotency_key)}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Control.objects.count(), 1)
