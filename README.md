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

## V2.5

Dashboard de vencimientos, remito en PDF de tickets cerrados, campana de avisos y modo oscuro, con un color de acento propio (`acento`, azul índigo) para no repetir los de los botones existentes. Detalle y notas de actualización (hay una migración nueva) en [CHANGELOG.md](CHANGELOG.md).

## V2.4

### Tutoría
Pantalla `/tutoria` con guías paso a paso por rol. Para editar o sumar guías, modificá `frontend/src/lib/tutoriaContenido.js` (cada guía lleva `id`, `titulo`, `resumen`, `roles`, `ruta` opcional y la lista de `pasos`). Detalle en [CHANGELOG.md](CHANGELOG.md).

## V2.3

Novedades de la versión 2.3.0 (detalle en [CHANGELOG.md](CHANGELOG.md)).

### Estado REVISADO / NO REVISADO
En la lista de equipos de cada cliente (a la izquierda) y en la ficha se muestra un estado de **revisión mensual**, independiente del semáforo de colores:

- **REVISADO**: el equipo tiene al menos un control hecho **en el mes calendario actual** (hora de Buenos Aires). Cuenta cualquier control, aunque detecte problemas: significa que un operario fue y lo inspeccionó; cómo está el equipo lo sigue diciendo el semáforo.
- **NO REVISADO**: todavía no tiene controles este mes.
- **Se reinicia solo el día 1 de cada mes**: no se guarda ningún dato ni hay tareas programadas; `Matafuego.revisado_mes` se calcula en cada consulta comparando la fecha de los controles con el mes actual. Por eso no hay migraciones y no depende de que el servidor esté despierto a medianoche.
- La fecha del control la pone el servidor (`ControlSerializer` la tiene de solo lectura), así que no se puede falsear una revisión.
- Los equipos dados de baja no entran en los conteos. `GET /api/clientes/resumen/` suma `sin_revisar` por cliente.
- La vista pública del QR no muestra este estado.

### Diseño
Paleta celeste `#64DCF4` (barra superior y Panel de Control), logo de DC INSTALL, favicon con el pez y menú responsive. Los archivos están en `frontend/public/`.

## V2.2

Novedades de la versión 2.2.0 (detalle en [CHANGELOG.md](CHANGELOG.md)).

### Matafuegos por cliente
La pantalla **Matafuegos** ahora va en pasos: lista de clientes (con aviso si tienen equipos vencidos o críticos) → buscador de equipos del cliente, ordenado por urgencia → ficha completa con **Controlar**. Cliente y equipo quedan en la URL (`?cliente=&equipo=`), así el botón *atrás* vuelve a la lista. Se cargan **todos** los equipos del cliente (antes se cortaba en 20).

API: `GET /api/matafuegos/?cliente=<id>&page_size=<n>` (100 por página, máx. 500) y `GET /api/clientes/resumen/` (equipos activos y conteo por estado de cada cliente accesible).

### Importar desde Excel (ADMIN y OFICINA)
Menú **Importar**:
1. Elegí el cliente (un cliente por importación; solo los asignados a tu cuenta).
2. **Descargar plantilla** (`.xlsx`, hoja *Equipos* con encabezados y una fila de ejemplo, hoja *Instrucciones*). Borrá la fila de ejemplo.
3. Subí el archivo (`.xlsx` o `.csv`, hasta 5 MB y 5.000 filas) y revisá la **vista previa**: filas válidas, filas con error (*"Fila 14: fecha de carga inválida"*) y las primeras filas.
4. **Confirmar**. Es todo o nada: si una sola fila tiene error no se guarda ninguna.
5. Al terminar, **Imprimir etiquetas de estos equipos** abre la pantalla de etiquetas con esos equipos ya seleccionados.

Columnas: `numero_serie` (obligatoria, hasta 60 caracteres, única por cliente), `clase` (hasta 30), `ubicacion` (hasta 200), `vencimiento_carga` y `vencimiento_ph` (celda de fecha o texto `dd/mm/aaaa`). Las fórmulas **no se calculan** (se informan como error). Se valida el contenido real del archivo, no solo la extensión. Queda **una** entrada de auditoría (`IMPORTACION`) por importación y el historial de cada equipo (simple-history).

API: `GET /api/matafuegos/plantilla-importacion/` y `POST /api/matafuegos/importar/` (multipart: `archivo`, `cliente`, `dry_run`). El operario recibe 403.

### Etiquetas QR
Menú **Etiquetas** (ADMIN y OFICINA): elegí cliente, tildá equipos (o *Seleccionar todos*), elegí el formato y tocá **Imprimir**.
- Hoja **A4 adhesiva**. Formatos incluidos: **3 × 7** (63,5 × 38,1 mm, por defecto), **2 × 4** (99,1 × 67,7 mm) y **Personalizado** (columnas, filas, tamaño, márgenes y separación en mm). Toda la geometría está en `frontend/src/lib/etiquetas.js` (`PRESETS`): para sumar un formato fijo, agregá una entrada ahí.
- **Mostrar bordes** sirve para probar en papel común. El **desplazamiento X/Y** (en mm, admite negativos, con botones −/+) corrige la desalineación de la impresora y se recuerda en ese navegador.
- Cada etiqueta lleva el QR (nivel de corrección **H**, sin logo, mínimo ~30 mm), el n° de serie en grande y *"Escaneá para ver el estado"*. No lleva cliente, teléfono ni vencimientos.
- Al imprimir elegí **A4, escala 100 %** (sin "ajustar a la página") y **márgenes: ninguno**.
- Hacé siempre una prueba en papel común antes de gastar hojas adhesivas.

### Variable `VITE_PUBLIC_BASE_URL` (importante antes de imprimir)
Es el dominio que queda codificado **dentro de los QR**. Se define al compilar el frontend (en Render: *Environment* del Static Site `dcinstall-web`; localmente en `frontend/.env`):

```
VITE_PUBLIC_BASE_URL=https://app.tudominio.com   # sin barra final
```

Si no está definida, los QR usan el dominio desde el que abrís la app y la pantalla de etiquetas muestra el aviso rojo **"Dominio definitivo sin configurar: no imprimas etiquetas finales"**. Una etiqueta impresa con un dominio provisorio deja de servir si el dominio cambia. Como la variable se lee al compilar, hay que **volver a desplegar** el frontend después de cambiarla.

### Escaneo de QR con cliente no asignado
Si un usuario con rol escanea un equipo de un cliente que no tiene asignado, ve la ficha pública y el aviso *"Este equipo pertenece a un cliente que no tenés asignado. Pedile a la oficina que te lo asigne."* (el backend responde 404 en `/matafuegos/qr/<token>/`). Ante fallas de red o errores del servidor se muestra un mensaje de reintento, no el de asignación.

## Auditoría

Tabla `Auditoria` inmutable (no se edita ni se borra): fecha/hora (se muestra en 24 h, hora Argentina), usuario, rol, IP, acción, objeto, ID, datos anteriores y nuevos. Registra: registro, login, importaciones masivas (una entrada por archivo), cambio de perfil, asignación/revocación de rol y de clientes, alta/modificación/baja/restauración de matafuegos, controles, tickets (creación, mensaje, cierre, reapertura) y clientes. Además, `django-simple-history` guarda el historial completo de cada modelo (visible en `/admin/`).

## Despliegue en Render

`render.yaml` define ambos servicios. Variables a cargar a mano: `DATABASE_URL` (Neon), `TURNSTILE_SECRET_KEY`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `VITE_API_URL` y `VITE_PUBLIC_BASE_URL` (dominio definitivo que va dentro de los QR impresos, sin barra final; se lee al compilar el frontend, así que hay que volver a desplegar si cambia).

## Seguridad

- **La clave secreta de Turnstile no está en el código**: va solo en `TURNSTILE_SECRET_KEY`. Como se compartió en un documento de texto, conviene regenerarla en el panel de Cloudflare.
- django-axes no soporta una ventana de 3 minutos para contar los intentos; aplica 5 fallos → bloqueo de IP por 30 min.
- El throttle de DRF usa la caché local de cada proceso; con varios workers el límite se aplica por worker.
