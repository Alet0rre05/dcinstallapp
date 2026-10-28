# DCINSTALL – HUBBLE

Sistema de gestión y seguimiento de matafuegos/extintores con identificación por QR. El proyecto incluye una API Django REST Framework, una interfaz web React y una aplicación Android empaquetada con Capacitor.

> **Rama de trabajo:** `dcinstallapp-v1.6-pandora`  
> **Identidad de interfaz:** Premium Dark Tech, con cyan/azul, superficies oscuras y glassmorphism controlado.  
> **Fuente de verdad:** el código fuente de `frontend/src`; los archivos generados de Android no se editan como sustituto del código fuente.

## Contenido

- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Rutas del frontend](#rutas-del-frontend)
- [Roles y permisos](#roles-y-permisos)
- [Frontend Pandora: cambios visuales](#frontend-pandora-cambios-visuales)
- [Ejecución local](#ejecución-local)
- [Variables de entorno](#variables-de-entorno)
- [QR y etiquetas](#qr-y-etiquetas)
- [Pruebas y validaciones](#pruebas-y-validaciones)
- [Despliegue](#despliegue)
- [Android](#android)
- [Documentación del historial](#documentación-del-historial)
- [Seguridad y datos](#seguridad-y-datos)

## Arquitectura

| Parte | Tecnología | Ubicación |
|---|---|---|
| Frontend web | React 18, JavaScript/JSX, Vite 5, Tailwind CSS 3 | `frontend/` |
| Navegación | React Router DOM 6 | `frontend/src/App.jsx` |
| Animaciones | `motion` y CSS; respeta movimiento reducido | `frontend/src/lib/animado.jsx`, `frontend/src/lib/motionConfig.js`, estilos globales |
| Tema | CSS y clase `dark` en el elemento `html`, con preferencia persistida en el navegador | `frontend/src/lib/tema.jsx`, `frontend/index.html` |
| API | Django y Django REST Framework | `backend/` |
| Base de datos | PostgreSQL; el despliegue de referencia utiliza Neon | Configuración del backend y `render.yaml` |
| Hosting de referencia | Render (servicio web de API, sitio estático y tarea programada) | `render.yaml` |
| Android | Capacitor | `frontend/android/`, `frontend/capacitor.config.json` |

Las dependencias del frontend están declaradas en `frontend/package.json`. El manifiesto incluye `npm run dev`, `npm run build`, `npm run preview`, `npm run cap:sync` y `npm run android:apk`. No se necesita agregar una biblioteca de iconos ni una biblioteca de animación para el rediseño actual.

## Funcionalidades

- Gestión de clientes y matafuegos, con consulta de fichas y datos de vencimiento.
- Controles de inspección, con estados y observaciones derivados de los datos del equipo y de su último control.
- Fichas QR con vistas y acciones condicionadas por la sesión, el rol y la asignación del cliente.
- Dashboard de vencimientos, reportes, planillas e impresión de etiquetas QR.
- Importación de matafuegos desde Excel o CSV, con vista previa y validación antes de confirmar.
- Tickets y soporte, avisos y auditoría.
- Panel de control con funciones de equipo, operarios y auditoría condicionadas por rol.
- Tutoría con guías paso a paso.
- Acciones offline para equipos compatibles: preparación de datos, captura sin conexión y sincronización posterior.
- Protección anti-bot mediante Cloudflare Turnstile cuando está configurado.

El alcance exacto de cada acción depende del rol del usuario y de los permisos validados por el backend. Las funciones de negocio y los contratos de la API no se cambian como parte de un rediseño visual.

## Rutas del frontend

La tabla refleja las rutas declaradas en `frontend/src/App.jsx`. Las rutas sin una barrera de autenticación explícita en ese archivo se indican como públicas o de acceso directo; esto no significa que se deba eludir la validación que realiza la API.

| Ruta | Pantalla | Acceso configurado en el frontend |
|---|---|---|
| `/login` | Inicio de sesión | Pública |
| `/registro` | Registro | Pública |
| `/tutoria` | Guías de uso | Acceso directo; el contenido puede variar por rol |
| `/qr/:token` | Ficha a partir de token QR | Acceso directo; el backend determina los datos y acciones permitidos |
| `/` | Matafuegos | Requiere sesión y rol |
| `/dashboard` | Dashboard | Requiere sesión y rol |
| `/reportes` | Reportes | Requiere sesión y rol |
| `/escanear` | Escáner de QR | Requiere sesión y rol |
| `/tickets` | Tickets / soporte | Requiere sesión y rol |
| `/panel` | Panel de control | Requiere sesión y rol; las secciones se condicionan por rol |
| `/perfil` | Perfil de usuario | Requiere sesión y rol |
| `/importar` | Importación masiva | Requiere sesión y rol ADMIN/OFICINA (`SoloStaff`) |
| `/etiquetas` | Impresión de etiquetas QR | Requiere sesión y rol ADMIN/OFICINA (`SoloStaff`) |
| `/planillas` | Planillas de extintores | Requiere sesión y rol ADMIN/OFICINA (`SoloStaff`) |

Las rutas desconocidas redirigen a `/`. El login, el registro, las rutas QR y Tutoría tienen layouts o necesidades visuales propias; el rediseño debe respetarlos.

## Roles y permisos

| Función | Público sin cuenta | Público registrado (sin rol) | OPERARIO | OFICINA | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Consultar vista reducida de QR | Sí | Sí | Sí | Sí | Sí |
| Registrarse / iniciar sesión | Sí | Sí | Sí | Sí | Sí |
| Panel, perfil, tickets y soporte | No | No | Sí | Sí | Sí |
| Crear controles | No | No | Sí, clientes asignados | Sí, clientes asignados | Sí |
| Crear/editar/baja/restaurar matafuegos | No | No | No | Sí, según asignación | Sí |
| Auditoría | No | No | Solo lo propio | Sus clientes | Todo |
| Equipo, asignación y revocación de roles | No | No | No | No | Sí |
| Asignación de clientes a operarios | No | No | No | Sí, dentro de su cartera | Sí |
| Importar, planillas y etiquetas | No | No | No | Sí | Sí |

- Una cuenta recién registrada puede iniciar sesión, pero permanece sin permisos operativos hasta que se le asigne un rol.
- El superusuario de Django recibe el rol ADMIN automáticamente.
- Los roles se asignan desde Panel de Control → Equipo, por email. La cuenta debe haberse registrado previamente.
- Revocar un rol no elimina la cuenta: vuelve a quedar sin rol. No se puede revocar el propio rol ni el de un superusuario.
- La OFICINA asigna clientes a los operarios únicamente desde su propia cartera; no puede quitar asignaciones que estén fuera de ella.
- En `/admin/`, el permiso de Staff de Django es independiente del rol de la aplicación. Los usuarios con Staff status pueden administrar los objetos autorizados por la configuración del backend. Las operaciones relevantes quedan registradas en Auditoría.
- El frontend oculta opciones que no corresponden a cada rol, pero la seguridad real depende de los permisos del backend.

## Frontend Pandora: cambios visuales

Esta edición de Pandora mejora el sistema visual compartido sin reescribir la lógica de negocio.

### Identidad y superficies

- Se mantiene el logotipo original `frontend/public/logo-dcinstall-navbar.png`; el contenedor del header usa una superficie oscura y translúcida para evitar el recuadro blanco añadido alrededor del PNG transparente.
- La marca visible es **DCINSTALL - PANDORA**, con punto cyan informativo. No representa una conexión real ni un indicador de salud del servidor.
- El header usa una superficie oscura de efecto vidrio moderado, bordes sutiles y acciones de cabecera más consistentes.
- El fondo incorpora gradientes ambientales discretos. Las tablas y formularios conservan superficies sólidas suficientemente opacas para favorecer la lectura.
- El tema oscuro es la identidad visual principal. Si se selecciona el tema claro, se mantiene disponible y el fondo global se adapta a esa preferencia.

### Navegación, perfil y tema

- Se conserva el drawer global para todos los tamaños de pantalla, con navegación por las rutas existentes, ruta activa distinguible, iconos SVG locales, cierre al navegar, cierre con Escape, backdrop y bloqueo del scroll del fondo mientras está abierto.
- El drawer mantiene las opciones condicionadas por rol y los mecanismos existentes de foco por teclado.
- El encabezado muestra la marca Pandora en escritorio y móvil.
- Se conecta el control de tema existente a la cabecera. La preferencia continúa usando la clave local `dci_tema` y el módulo compartido `frontend/src/lib/tema.jsx`.
- El perfil de cabecera utiliza datos disponibles en la sesión (nombre o usuario y rol), muestra un fallback de iniciales y ofrece los destinos que existen: **Perfil** y **Cerrar sesión**. No se agrega un enlace a Configuración porque no se encontró una ruta real para esa función.
- La campana conserva la API, el contador real, la lista de avisos, marcado como leído y los enlaces existentes; el cambio es visual.

### Accesibilidad y movimiento

- Los controles de cabecera tienen nombres accesibles, foco visible y áreas táctiles de tamaño adecuado.
- El menú de usuario se cierra con Escape o al hacer clic/tocar afuera.
- Drawer y microinteracciones usan transiciones CSS y respetan `prefers-reduced-motion`.
- Se preservan los componentes y las convenciones existentes para formularios, estados, QR, acciones offline y notificaciones; se prioriza mejorar el estilo sin alterar campos, validaciones ni payloads.

### Archivos principales del rediseño

| Archivo | Responsabilidad del cambio |
|---|---|
| `frontend/src/lib/Layout.jsx` | Header de Pandora, drawer, iconos de navegación, selector de tema y menú de usuario |
| `frontend/src/lib/tema.jsx` | Control visual del tema y nombre accesible dinámico |
| `frontend/src/lib/Notificaciones.jsx` | Apariencia del botón y contador; se conserva el flujo de avisos |
| `frontend/src/index.css` | Superficies globales, drawer, foco y estados visuales del shell |
| `frontend/index.html` | Título de la aplicación actualizado a la identidad Pandora |
| `README.md` | Documentación consolidada del proyecto y del rediseño Pandora |

No se añadieron dependencias ni se alteraron endpoints, reglas de negocio, permisos, autenticación o esquemas de datos como parte de estos cambios. Los cambios no se desplegaron ni se publicaron en Git.

## Ejecución local

### Frontend

Requisitos: Node.js y npm compatibles con Vite 5.

```bash
cd frontend
npm install
npm run dev
```

Vite indica en la terminal la URL local del servidor de desarrollo. Para crear una compilación de producción:

```bash
npm run build
npm run preview
```

La salida del build se genera en `frontend/dist/`. Si el backend no corre en la URL predeterminada, configurá `VITE_API_URL` antes de iniciar o compilar el frontend.

### Backend

Requisitos: Python compatible con la versión configurada en Render y PostgreSQL. En el despliegue de referencia, Render usa Python 3.12.7.

```bash
cd backend
python -m venv venv
```

Activá el entorno virtual (Windows PowerShell: `venv\\Scripts\\Activate.ps1`; Linux/macOS: `source venv/bin/activate`) e instalá las dependencias:

```bash
pip install -r requirements.txt
```

Configurá las variables de entorno requeridas, incluyendo `SECRET_KEY`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` y `TURNSTILE_SECRET_KEY` cuando se utilice Turnstile. No subas credenciales ni archivos `.env` al repositorio. Para inicializar o actualizar una base de datos existente:

```bash
python manage.py migrate
python manage.py createsuperuser
```

Para pruebas del backend, el proyecto documenta:

```bash
DEBUG=1 python manage.py test
```

En Windows puede ser necesario establecer `DEBUG=1` con la sintaxis del shell utilizado. No ejecutes migraciones contra producción sin revisar previamente el estado y contar con autorización.

## Variables de entorno

### Frontend

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base del API, normalmente terminada en `/api`; se consulta al compilar el frontend. |
| `VITE_PUBLIC_BASE_URL` | Dominio definitivo codificado dentro de los QR impresos, sin barra al final. |
| `VITE_TURNSTILE_SITE_KEY` | Clave pública del sitio de Cloudflare Turnstile, si se usa protección anti-bot. |

Ejemplo de archivo local `frontend/.env` (reemplazá los dominios por los de tu entorno):

```dotenv
VITE_API_URL=https://tu-api.example.com/api
VITE_PUBLIC_BASE_URL=https://tu-app.example.com
VITE_TURNSTILE_SITE_KEY=tu_clave_publica_de_sitio
```

`VITE_PUBLIC_BASE_URL` es especialmente importante antes de imprimir etiquetas finales. Si se omite, la aplicación puede usar el dominio desde el que se abre y mostrar una advertencia. Si cambia, hay que volver a compilar y desplegar el frontend para que los QR generados apunten al dominio correcto.

### Backend y tarea programada

Las variables de servicio y de tarea programada se describen en `render.yaml`. Entre ellas se encuentran `SECRET_KEY`, `DATABASE_URL`, `TURNSTILE_SECRET_KEY`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `EMPRESA_RELEVADORA`, `CONTROL_BLOQUEO_MESES` y `ESCALADA_CONTROL_DIAS`. El cron también admite las variables SMTP para envío de email (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` y `DEFAULT_FROM_EMAIL`).

No copies valores secretos al README ni a archivos versionados. Cargá los secretos directamente en el gestor de variables del entorno correspondiente.

## QR y etiquetas

Cada matafuego tiene un `token_qr` UUID inmutable. Su código QR lleva a `/qr/<token>`.

- Sin sesión, sin rol o sin acceso al cliente, la ficha se limita a la vista pública de solo lectura.
- Con rol y acceso al cliente, se muestran las acciones habilitadas para ese usuario; la creación de controles y la edición de ficha respetan los permisos actuales.
- El token no debe modificarse manualmente ni sustituirse por datos inventados.
- Las etiquetas se imprimen en papel A4. Los formatos y la geometría están definidos en `frontend/src/lib/etiquetas.js`.
- Antes de imprimir etiquetas adhesivas, probá sobre papel común. Elegí A4 y escala 100 % sin “ajustar a la página”; configurá los márgenes según las instrucciones de la pantalla.
- Verificá `VITE_PUBLIC_BASE_URL` antes de hacer tiradas definitivas para evitar QR con dominios provisionales.

## Pruebas y validaciones

Comandos disponibles declarados por el frontend:

- `npm run build`: compilación de producción con Vite.
- `npm run dev`: servidor local de desarrollo.
- `npm run preview`: servidor local para revisar la compilación.

El `package.json` recibido no declara scripts separados de `lint`, `typecheck` ni pruebas unitarias frontend. Si se incorporan en el futuro, documentá los comandos exactos aquí y no los declares como ejecutados sin correrlos.

Para cambios de UI compartida, revisá al menos login, dashboard, matafuegos, escaneo QR, reportes, tickets, panel, perfil, vistas de staff y Tutoría. Comprobá navegación y teclado, estados de carga/error/sin datos, así como anchos aproximados de 320–375, 390–430, 768, 1024–1280 y 1440 píxeles. Estos tamaños son una lista de validación recomendada, no una afirmación de que todas las vistas ya se probaron en un navegador.

## Despliegue

`render.yaml` describe tres procesos:

1. **`dcinstall-api`**: servicio web Django/Gunicorn.
2. **`dcinstall-web`**: sitio estático generado con Vite; el build definido es `npm install && npm run build` y publica `frontend/dist/`.
3. **`dcinstall-escaladas`**: tarea programada que ejecuta `python manage.py escalar_controles_vencidos` diariamente.

La base PostgreSQL y las variables marcadas `sync: false` deben configurarse en el entorno de Render. Revisá `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `VITE_API_URL` y `VITE_PUBLIC_BASE_URL` para los dominios reales.

Este ZIP es una copia de trabajo local: **no implica que Render esté actualizado**. Después de validar el resultado y aprobarlo, la integración en Git y el despliegue se hacen como pasos separados.

## Android

La app Android y las instrucciones de compilación están en [`ANDROID.md`](ANDROID.md). El frontend usa Capacitor y define scripts de sincronización y generación de APK en `frontend/package.json`.

Como pauta general, primero se debe compilar el frontend y luego sincronizar los assets web con Android. Después de cambios visuales, verificá también el diseño dentro del APK, especialmente el escáner, las áreas táctiles y los flujos offline. No edites manualmente los bundles web generados para intentar corregir el código fuente.

## Documentación del historial

- [`CHANGELOG.md`](CHANGELOG.md): historial técnico de versiones y modificaciones.
- [`MEJORAS_UI_DC_INSTALL.md`](MEJORAS_UI_DC_INSTALL.md): referencia de mejoras de interfaz anteriores.
- [`CAMBIOS_V7.md`](CAMBIOS_V7.md) y [`CAMBIOS_V6.md`](CAMBIOS_V6.md): notas históricas de cambios.
- [`ANDROID.md`](ANDROID.md): preparación y compilación de la app Android.

Para conocer detalles de versiones anteriores, migraciones, reglas de importación, planillas y auditoría, consultá estos documentos y el código correspondiente. La presencia de una descripción histórica no sustituye la comprobación de la configuración vigente del entorno.

## Seguridad y datos

- No versionar archivos `.env`, tokens, contraseñas, claves privadas ni secretos de proveedores.
- `TURNSTILE_SECRET_KEY` es una clave secreta del backend; el frontend usa únicamente la clave pública `VITE_TURNSTILE_SITE_KEY`.
- No probar formularios de escritura, borrados ni operaciones de negocio contra producción durante una auditoría visual.
- La interfaz no sustituye los permisos del backend; cualquier cambio de UI debe seguir respetando las mismas rutas y controles de acceso.
- La tabla de Auditoría registra las acciones de negocio configuradas por el backend. Los controles tienen las restricciones de inmutabilidad definidas en los modelos y la API.
