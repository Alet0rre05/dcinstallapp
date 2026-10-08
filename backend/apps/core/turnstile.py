import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def verificar_turnstile(token, ip=None):
    """
    Valida el token de Cloudflare Turnstile.
    - Sin TURNSTILE_SECRET_KEY: solo se permite en DEBUG (desarrollo local).
    """
    secret = settings.TURNSTILE_SECRET_KEY
    if not secret:
        return settings.DEBUG
    if not token:
        return False
    data = {"secret": secret, "response": token}
    if ip:
        data["remoteip"] = ip
    try:
        resp = requests.post(settings.TURNSTILE_VERIFY_URL, data=data, timeout=5)
        return bool(resp.json().get("success"))
    except (requests.RequestException, ValueError):
        logger.exception("Error verificando Turnstile")
        return False
