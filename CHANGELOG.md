# Changelog

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
