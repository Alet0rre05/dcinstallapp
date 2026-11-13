from django.conf import settings
from django.core.mail import send_mail
from .models import OTPCode


class OTPService:
    @staticmethod
    def send(*, email, purpose, user=None):
        row, code = OTPCode.issue(email=email, purpose=purpose, user=user)
        send_mail(
            "Código de seguridad DC INSTALL",
            f"Tu código es {code}. Vence en 10 minutos. No lo compartas.",
            settings.DEFAULT_FROM_EMAIL,
            [email], fail_silently=False,
        )
        return row

    @staticmethod
    def verify(*, email, purpose, code, user=None):
        qs = OTPCode.objects.filter(email=email.lower(), purpose=purpose, consumed_at__isnull=True).order_by("-id")
        if user: qs = qs.filter(user=user)
        row = qs.first()
        return bool(row and row.verify(code))
