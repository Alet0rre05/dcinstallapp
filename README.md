# DC INSTALL – Control de matafuegos con QR

Backend **Django + DRF** (PostgreSQL en Neon, Render Web Service) y frontend **React + Vite + Tailwind** (Render Static Site).

## Primeros pasos (backend)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # y cargá las variables (export $(cat .env | xargs) o usá tu editor)

# 1) Generar las migraciones iniciales (OBLIGATORIO, UNA vez, y commitearlas:
#    build.sh en Render falla si no existen)
python manage.py makemigrations core
python manage.py migrate
python manage.py createsuperuser   # el superusuario recibe rol ADMIN automáticamente

# 2) Tests
DEBUG=1 python manage.py test

# 3) Servidor
DEBUG=1 python manage.py runserver
```

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Roles y permisos

| | Público (sin cuenta) | Público registrado | OPERARIO | OFICINA | ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver QR (vista pública reducida) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Registrarse / iniciar sesión | ✅ | ✅ | ✅ | ✅ | ✅ |
| Panel, perfil, tickets/chat | ❌ | ❌ | ✅ | ✅ | ✅ |
| Nuevo control | ❌ | ❌ | ✅ (clientes asignados) | ✅ (asignados) | ✅ |
| Crear/editar/baja/restaurar matafuegos | ❌ | ❌ | ❌ | ✅ (asignados) | ✅ |
| Auditoría | ❌ | ❌ | solo lo propio | sus clientes | todo |
| Equipo: asignar / revocar roles, clientes | ❌ | ❌ | ❌ | ❌ | ✅ |

- Quien se registra queda **sin rol** ("Público registrado"): inicia sesión pero solo ve una pantalla de "cuenta sin rol".
- El superusuario (`createsuperuser`) es ADMIN automáticamente.
- **Asignar rol** (Panel de Control → Equipo): por email. Si el email no está registrado **no se crea la cuenta**; se informa que debe registrarse primero.
- **Revocar** (la ✕): la cuenta no se elimina, vuelve a PÚBLICO y pierde los permisos al instante. No se puede revocar el propio rol ni el de un superusuario.
- Los clientes se crean en `/admin/` (Django). Cada usuario con rol ve solo los clientes que tiene asignados.

## QR

Cada matafuego tiene un `token_qr` (UUID inmutable). El QR apunta a `/qr/<token>`:

- Sin sesión (o sin rol / cliente no asignado): ficha pública reducida, solo lectura.
- Con rol y cliente asignado: la misma ficha con **Nuevo control** (todos los roles) y **Editar ficha** (OFICINA/ADMIN).
- Los controles son inmutables y actualizan ubicación/vencimientos del matafuego.

## Auditoría

Tabla `Auditoria` inmutable (no se edita ni se borra): fecha/hora (se muestra en 24 h, hora Argentina), usuario, rol, IP, acción, objeto, ID, datos anteriores y nuevos. Registra: registro, login, cambio de perfil, asignación/revocación de rol y de clientes, alta/modificación/baja/restauración de matafuegos, controles, tickets (creación, mensaje, cierre, reapertura) y clientes. Además, `django-simple-history` guarda el historial completo de cada modelo (visible en `/admin/`).

## Despliegue en Render

`render.yaml` define ambos servicios. Variables a cargar a mano: `DATABASE_URL` (Neon), `TURNSTILE_SECRET_KEY`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` y `VITE_API_URL`.

## Seguridad

- **La clave secreta de Turnstile no está en el código**: va solo en `TURNSTILE_SECRET_KEY`. Como se compartió en un documento de texto, conviene regenerarla en el panel de Cloudflare.
- django-axes no soporta una ventana de 3 minutos para contar los intentos; aplica 5 fallos → bloqueo de IP por 30 min.
- El throttle de DRF usa la caché local de cada proceso; con varios workers el límite se aplica por worker.
