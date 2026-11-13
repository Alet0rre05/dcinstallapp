"""Confirmación por el canal de correo transaccional configurado."""
import logging
from smtplib import SMTPException

import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def enviar_constancia(item):
    asunto = f"DC INSTALL · Constancia {item.codigo}"
    texto = f"Recibimos tu solicitud de arrepentimiento. Conservá el código {item.codigo} para el seguimiento."
    try:
        if settings.SENDGRID_API_KEY:
            response = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
                json={"from": {"email": settings.DEFAULT_FROM_EMAIL}, "subject": asunto,
                      "personalizations": [{"to": [{"email": item.email}]}],
                      "content": [{"type": "text/plain", "value": texto}]},
                timeout=8,
            )
            response.raise_for_status()
        elif settings.EMAIL_HOST:
            send_mail(asunto, texto, settings.DEFAULT_FROM_EMAIL, [item.email])
    except (requests.RequestException, OSError, SMTPException):
        logger.warning("Falló el envío de la constancia %s", item.codigo)
