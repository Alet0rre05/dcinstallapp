# Changelog

## 2.5.0

### Agregado
- **Dashboard de vencimientos** (`/dashboard`, todos los roles con rol): indicadores (equipos activos, vencidos, por vencer, sin revisar), gráfico de cargas y PH por mes (3, 6 o 12 meses, con tabla equivalente para lectores de pantalla), reparto por estado y tabla de próximos vencimientos con encabezado fijo. Filtro por cliente (también por `?cliente=`). Usa `GET /api/dashboard/vencimientos/`.
- **Remito en PDF** al cerrar un ticket: botón "Descargar remito (PDF)" en los tickets cerrados (`GET /api/tickets/<id>/remito/`). El PDF se genera sin librerías externas.
- **Campana de avisos** en la barra superior: contador de no leídos (se actualiza cada minuto y al volver a la pestaña, conserva el último valor si no hay red), panel con lista, "Marcar todos como leídos" y aviso con vibración cuando llega uno nuevo. Avisos de mensajes de tickets, cierres/reaperturas y resumen semanal de vencimientos. Modelo `Notificacion` (migración `0002_notificacion`).
- **Modo oscuro**: botón luna/sol en la barra superior; se recuerda en el navegador y, si nunca se eligió, sigue la preferencia del sistema. Fondos `slate-900`/`slate-800` (nunca negro puro). Las etiquetas QR siempre se imprimen en claro.
- **Color de acento** `acento` (azul índigo) para las funciones nuevas y la Tutoría, distinto de los celestes que ya usan los botones existentes. Clases `.btn-acento` y `.btn-acento-sec` (alto táctil de 44 px).
- Vibración de confirmación (`lib/haptico.js`) al cerrar un ticket, descargar un remito, guardar un control y completar una guía.
- Tutoría: 4 guías nuevas (dashboard, remito, avisos, modo oscuro) y rediseño con el acento, insignias con ícono y modo oscuro.

### Cambiado
- `tailwind.config.js`: `darkMode: "class"` y paleta `acento`. `index.css`: capa de compatibilidad para el modo oscuro que re-pinta las utilidades existentes (solo en pantalla); no se modificó ninguna otra pantalla salvo `Tickets.jsx` (botón de remito) y `FormControl.jsx` (vibración).
- `App.jsx`: rutas y enlaces nuevos. Nada de lo anterior cambió de lugar.

### Notas de actualización
- **Hay una migración nueva** (`0002_notificacion`): correr `python manage.py migrate`.
- Sin dependencias nuevas (ni `pip` ni `npm`).
- Los tests del backend de esta versión están en `apps/core/tests_v24.py` (`DEBUG=1 python manage.py test`).

## 2.4.0

### Agregado
- **Tutoría** (`/tutoria`): 16 guías paso a paso de todo lo que se puede hacer en la app, filtradas por rol (público, Operario, Oficina, Administrador). Cada guía tiene barra de progreso, navegación Anterior/Siguiente, pasos marcables y un botón para ir a la pantalla correspondiente. Casilla "Ver también las guías de otros roles".
- Enlace "Tutoría" en la barra superior (visible también sin sesión y para cuentas sin rol) y en la pantalla "Cuenta sin rol asignado".
- El contenido vive en `frontend/src/lib/tutoriaContenido.js`: para agregar o corregir una guía solo se edita ese archivo.

### Notas de actualización
- Solo frontend: sin migraciones, sin cambios en la API y sin dependencias nuevas.
- El progreso de cada guía se guarda en el navegador de cada persona (localStorage, por usuario).

## 2.3.0

### Agregado
- **Estado REVISADO / NO REVISADO** a la izquierda de cada equipo en la lista del cliente y en la ficha (`lib/RevisionBadge.jsx`, siempre ícono + texto, independiente del semáforo). Un equipo pasa a REVISADO cuando se guarda un control y vuelve a NO REVISADO el día 1 de cada mes.
- Campo `revisado_mes` (booleano, solo lectura) en `MatafuegoSerializer`. **No** se expone en la vista pública del QR.
- `sin_revisar` en `GET /api/clientes/resumen/` y aviso "N sin revisar este mes" / "Todo revisado este mes" en cada tarjeta de cliente (misma cantidad fija de consultas).
- Logo de DC INSTALL en la barra superior, en Ingresar y en Crear cuenta; favicon con el pez (32, 192 y 512 px) y `theme-color` celeste.
- Skeletons de carga (`lib/Skeleton.jsx`) y estados vacíos con mensaje claro (`lib/EstadoVacio.jsx`).
- Tests de la regla mensual en `RevisionMensualTests` (cambio de mes, borde horario UTC-3, API, QR público, cantidad de consultas).

### Cambiado
- Paleta **celeste `#64DCF4`**: barra superior y Panel de Control (con sus pestañas). Tokens `brand` (base, `dark`, `darker`, `light`), `ink` y `page` en `tailwind.config.js`; `.btn`, `.btn-sec`, `.input`, `.card` y los links migraron a esa paleta. Texto azul marino sobre celeste y blanco solo sobre el celeste oscuro (contraste AA).
- Barra superior responsive: menú colapsable en celular, link activo resaltado y objetivos táctiles de 44 px; queda fija arriba al hacer scroll.
- Campos y botones a 16 px (evita el zoom de iOS al enfocar); foco visible en toda la app.
- El semáforo (`estado_color`, `EstadoBadge`), los avisos de error/advertencia y la impresión de etiquetas no cambian.

### Notas de actualización
- **No hay migraciones nuevas**: `revisado_mes` se calcula a partir de la fecha de los controles (hora de Buenos Aires), no se guarda; el reinicio del día 1 ocurre solo, sin cron ni tareas programadas.
- No hay dependencias nuevas.
- Los archivos nuevos de `frontend/public/` (logo y favicons) se publican con el build del frontend.

## 2.2.0

### Agregado
- **Matafuegos por cliente**: lista de clientes con aviso de vencidos/críticos, buscador de equipos (combobox accesible, ordenado por urgencia) y ficha completa. Componentes reutilizables `FichaMatafuego`, `FormControl`, `Combobox` y `QRMatafuego` en `frontend/src/lib/`.
- `GET /api/clientes/resumen/`: equipos activos y conteo por estado por cliente (cantidad fija de consultas).
- **Carga masiva desde Excel/CSV** (ADMIN y OFICINA): plantilla descargable, vista previa con errores por fila, todo o nada, inserción en bloque con historial, una entrada de auditoría `IMPORTACION` por archivo. Dependencia nueva: `openpyxl`.
- **Etiquetas QR imprimibles** en hoja A4 adhesiva: presets 3×7 y 2×4, formato personalizado, bordes de prueba, desplazamiento X/Y y CSS de impresión.
- Variable de build `VITE_PUBLIC_BASE_URL` (dominio de los QR) con aviso en pantalla cuando falta.
- Permiso `SoloStaff` (ADMIN/OFICINA para todos los métodos).
- Aviso en el escaneo de QR cuando el equipo es de un cliente no asignado al usuario.

### Cambiado
- Los equipos se listan de a 100 por página (`page_size` hasta 500); antes el límite global de 20 ocultaba los equipos 21 en adelante.
- El QR se genera con corrección de errores **H** (antes el valor por defecto de la librería, L).
- `FormControl` se movió a `frontend/src/lib/FormControl.jsx` (se sigue re-exportando desde `pages/Matafuegos.jsx`); sus campos y botones miden al menos 44 px.
- La URL del QR sale de `VITE_PUBLIC_BASE_URL` (o del dominio actual si no está definida).
- El filtro `?cliente=` con un valor no numérico responde 400 en lugar de 500.

### Notas de actualización
- No hay migraciones nuevas.
- Configurar `VITE_PUBLIC_BASE_URL` en Render **antes de imprimir etiquetas definitivas** y volver a desplegar el frontend.
