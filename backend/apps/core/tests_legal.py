import hashlib
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Auditoria, RepentanceRequest, Tenant, TenantMembership, TenantRole


@override_settings(SECURE_SSL_REDIRECT=False, SENDGRID_API_KEY="", EMAIL_HOST="")
class LegalFlowTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def test_public_documents_have_versions_and_fingerprints(self):
        docs = self.api.get("/api/legal/").json()
        self.assertEqual({d["type"] for d in docs}, {"EULA", "PRIVACIDAD", "TOS"})
        for doc in docs:
            self.assertEqual(doc["version"], "1.0")
            self.assertEqual(doc["sha256"], hashlib.sha256(doc["content"].encode()).hexdigest())

    def test_invalid_email_creates_no_request(self):
        for payload in ({}, {"email": "inválido"}):
            self.assertEqual(self.api.post("/api/repentance/", payload).status_code, 400)
        self.assertFalse(RepentanceRequest.objects.exists())

    def test_public_receipt_and_audit_without_email_service(self):
        codes = set()
        for _ in range(2):
            with self.captureOnCommitCallbacks(execute=True):
                res = self.api.post("/api/repentance/", {"email": "ana@example.com", "nombre": "Ana",
                                    "empresa": "Empresa A", "reason": "Solicitud"}, HTTP_X_TENANT_SLUG="otra")
            self.assertEqual(res.status_code, 201)
            item = RepentanceRequest.objects.get(pk=res.data["id"])
            self.assertIsNone(item.tenant)
            self.assertEqual(item.nombre, "Ana")
            self.assertEqual(item.codigo, res.data["codigo"])
            self.assertRegex(item.codigo, r"^ARP-\d{8}-\d{6,}$")
            self.assertLess(abs(item.scheduled_deletion_at - item.requested_at - timedelta(days=10)), timedelta(seconds=1))
            self.assertTrue(Auditoria.objects.filter(accion="ARREPENTIMIENTO", objeto_id=str(item.pk)).exists())
            codes.add(item.codigo)
        self.assertEqual(len(codes), 2)

    @override_settings(EMAIL_HOST="smtp.example.com", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_authenticated_receipt_uses_tenant_and_emails_code(self):
        user = get_user_model().objects.create_user("ana")
        tenant = Tenant.objects.create(slug="norte", nombre="Norte")
        TenantMembership.objects.create(tenant=tenant, user=user, role=TenantRole.TENANT_OFFICE)
        self.api.force_authenticate(user)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.api.post("/api/repentance/", {"email": "ana@example.com"})
        self.assertEqual(RepentanceRequest.objects.get().tenant, tenant)
        self.assertEqual(Auditoria.objects.get(accion="ARREPENTIMIENTO").usuario, user)
        self.assertIn(res.data["codigo"], mail.outbox[0].body)

    @override_settings(SENDGRID_API_KEY="test")
    @patch("apps.core.repentance.requests.post", side_effect=ConnectionError)
    def test_provider_unavailable_still_returns_receipt(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            res = self.api.post("/api/repentance/", {"email": "ana@example.com"})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["codigo"], RepentanceRequest.objects.get().codigo)
        send.assert_called_once()
