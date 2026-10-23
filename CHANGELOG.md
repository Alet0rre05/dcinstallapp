# Changelog

## Mejora visual global (sin cambios de API ni de base de datos)

### Agregado
- Fondo ambiental global con Canvas 2D: partículas orbitales, trazos curvos y resplandor cian/índigo en todas las rutas del frontend.
- Transición breve al navegar entre rutas e interacciones consistentes para tarjetas, botones, navegación, campos y filas de tablas.
- Adaptación automática al modo claro/oscuro, al tamaño de pantalla y a la preferencia del sistema de movimiento reducido.
- Pausa del ciclo de animación cuando la pestaña queda oculta y ocultación de los efectos en impresión.

### Compatibilidad
- No incorpora dependencias de npm, migraciones, endpoints ni cambios en los flujos de negocio.
- El lienzo decorativo no captura clics y se mantiene detrás de la interfaz, incluida la lectura y operación de controles.


## 3.2.0 (parche)

### Corregido
- **La planilla descargada en «Planillas» no era la pedida.** El repo traía una *base provisoria* (`planilla_extintores.xlsx`) en lugar de la planilla real. Se reemplazó por la réplica exacta de «TASA CASA CENTRAL - DETALLE EXTINTORES»: logo (216×53 px, anclado a 27 px/8 px), celdas combinadas, anchos y altos, fuentes (Arial/Calibri), rotaciones de 90°, bordes finos, sin rellenos, A4 horizontal con márgenes en 0 y filtro A3:N23.
- **«Importar» ahora descarga ese mismo formato.** `GET /api/matafuegos/plantilla-importacion/` devuelve la planilla de extintores en blanco (una sola pestaña, «EXTINTORES TASA-CASA CENTRAL») en lugar de las hojas «Equipos» + «Instrucciones». El importador ya leía ese formato (encabezado en la fila 3), así que no cambia.

### Cambiado
- La generación ya no pisa alineaciones ni el formato de fecha: Ubicación va a la izquierda, Observaciones centrada (Arial 10) y Vto. PH / Vto. Carga conservan el formato en español de la referencia (`mmm-yy`, p. ej. «ago-27»).
- Cuerpo con bordes de la fila 4 a la 22; la fila 23 sin bordes. Más de 19 equipos clonan el estilo de la fila 4.
- Valores de Prescinto / Acceso / Señalización: `OK` / `NO OK` (antes `NO`).
- Listas desplegables en línea: Año, Clase (ABC, BC, A, K), Agente (POLVO, HCFC, CO2, AGUA), Capacidad (5 KG, 10 KG) y OK / NO OK. Avisan pero no bloquean si se escribe otro valor.
- `plantillas/generar_plantilla_base.py` ahora prepara la plantilla a partir de la referencia real.
- Textos de Importar y de la Tutoría: ya no hay fila de ejemplo que borrar.
- Tests: `tests.py` (plantilla de importación), `tests_v30.py` (`NO OK`, formato de fecha, listas) y nuevo `tests_v32.py` (formato celda por celda).

### Notas de actualización
- No hay migraciones ni dependencias nuevas.

## 3.1.0

### Agregado
- **Staff agrega y edita a mano desde `/admin/`**: Clientes y Matafuegos. Con *Staff status* alcanza (sin permisos de modelo ni rol en la app). Controles, perfiles, usuarios, tickets y auditoría **no cambian**: el staff no puede crear usuarios ni tocar roles desde el admin.
- Auditoría de altas y ediciones hechas desde el admin: `CREACION` / `MODIFICACION`, con antes y después (la edición lee el registro de la base antes de guardar). Se registra solo si el formulario cambió algo.
- En `MatafuegoAdmin`: búsqueda de cliente (`autocomplete`), campos en el orden de la planilla y `token_qr` de solo lectura.
- **OFICINA asigna clientes a los OPERARIOS**: pestaña «Operarios» en Panel de Control. Endpoints nuevos `GET /api/equipo/operarios/` y `POST /api/equipo/operarios/asignar-clientes/`.
  - Solo sobre usuarios con rol OPERARIO (si no, 403).
  - La OFICINA solo asigna clientes de su cartera (si no, 400). Nunca quita a un operario los clientes que están fuera de su cartera.
  - Se audita como `ASIGNACION_CLIENTES`.
- Guía nueva en la Tutoría: «Asignar clientes a un operario» (rol OFICINA).
- Tests nuevos en `apps/core/tests_v31.py`.

### Cambiado
- `permissions.py`: `puede_cargar_en_admin(user)`, con la misma regla que `puede_borrar_en_admin`.
- `admin.py`: `AltaEdicionStaffMixin`, aplicado solo a `ClienteAdmin` y `MatafuegoAdmin`.

### Pendiente (no incluido en esta versión)
- **Parte A (planilla de extintores, réplica del formato oficial)**: queda para la próxima versión. El ANEXO A (prompt oficial de la planilla) no llegó completo al parche.

### Notas de actualización
- **No hay migraciones nuevas.**
- Sin dependencias nuevas.
- Los endpoints de `/equipo/*` existentes siguen siendo solo ADMIN.

## 3.0.0

### Agregado
- **Borrar controles desde `/admin/`** (V3.0 · parte A). Pueden hacerlo los usuarios con **Staff status** (`is_staff`) y los superusuarios, uno por uno o con la acción masiva «Eliminar seleccionados», sin asignarles permisos de modelo de Django. Nadie más: **no** depende de `Perfil.rol` (un ADMIN de la app sin Staff status no puede). Regla única en `permissions.puede_borrar_en_admin`.
- `Control.eliminar_definitivo(usuario, request)`: registra una entrada `ELIMINACION` en Auditoría (con todos los datos del control, el n° de serie del equipo y quién lo cargó) y recién después borra, en una sola transacción. `Control.delete()` sigue bloqueado y la API sigue sin DELETE/PUT/PATCH (405). El admin (`delete_model` y `delete_queryset`) pasa siempre por ahí.
- `ControlAdmin` mejorado: columnas cliente / equipo / fecha / usuario / presión / precinto / acceso / señalización, filtros por cliente, fecha y presión, búsqueda por n° de serie y usuario, jerarquía por fecha. Sigue sin poder agregarse ni editarse.
- **Matafuegos y Clientes** también se pueden borrar desde `/admin/` con la misma regla (cada borrado deja `ELIMINACION` en Auditoría). Los `on_delete=PROTECT` no cambian: un equipo con controles, o un cliente con equipos, no se borra hasta eliminar lo que depende de él. Nueva columna **Controles** en el admin de equipos.
- **Planilla de extintores por cliente** (parte B): pantalla `/planillas` (OFICINA/ADMIN) y `GET /api/clientes/<id>/exportar-planilla/?mes=&anio=` que devuelve un `.xlsx` generado sobre la planilla de referencia (`apps/core/plantillas/planilla_extintores.xlsx`), con los equipos activos del cliente. Vista previa con `GET /api/clientes/<id>/exportar-planilla/resumen/` (equipos, datos incompletos, sin control). Auditoría `EXPORTACION`. Las listas desplegables de la referencia (que apuntaban a celdas vacías) se reemplazaron por listas `OK,NO`; los textos que empiezan con `=`, `+`, `-` o `@` se guardan como texto.
- **Campos nuevos**: `Matafuego.marca`, `anio_fabricacion` (1950..año+1), `agente` (siempre en mayúsculas), `capacidad`; `Control.precinto` (`null` = sin dato en controles anteriores; casilla «Precinto OK» marcada por defecto); `Cliente.planta` (encabezado de la planilla; si está vacía se usa el nombre). Alta y edición de equipos, ficha y serializers actualizados. La vista pública del QR **no** expone nada de esto.
- **Importación**: lee la propia planilla de extintores (busca el encabezado en las primeras 10 filas; alias `Nro de Serie`, `Año Fabric.`, `Agente Extintor`/`Agente Extintintor`, `Vto. PH`, `Vto. Carga`; ignora Puesto, Prescinto, Acceso, Señalización, Observaciones y filas sin datos), acepta fechas mes-año (día 1) y marca como error las fechas anteriores a 2000 o a más de 15 años (los «julio de 1931»). La plantilla de importación suma marca, año, agente y capacidad; los archivos de 5 columnas siguen funcionando.
- Guía nueva en la Tutoría («Descargar la planilla de un cliente») y acciones `ELIMINACION`/`EXPORTACION` en el filtro de Auditoría.

### Cambiado
- `lib/api.js`: `api(..., { blob: true, conNombre: true })` devuelve también el nombre de archivo del servidor (sin `conNombre` todo sigue igual).
- `tests.py`: `test_plantilla_para_staff` ahora espera las 9 columnas de la plantilla de importación (es el único test existente modificado).

### Notas de actualización
- **Hay una migración nueva** (`0003_v30_planilla_extintores`): correr `python manage.py migrate`. Solo agrega columnas con valores vacíos; no toca datos.
- **Dependencia nueva: `Pillow`** (openpyxl la necesita para conservar el logo de la planilla): `pip install -r requirements.txt`.
- Variable de entorno opcional `EMPRESA_RELEVADORA` (por defecto `DCINSTALL SRL`).
- Para usar la planilla de referencia original, copiala como `backend/apps/core/plantillas/planilla_extintores.xlsx` (ver README).
- Los tests nuevos están en `apps/core/tests_v30.py`.
- Borrar un control **no revierte** la ubicación ni los vencimientos que ese control haya copiado al equipo; `ultimo_control`, `revisado_mes` y el semáforo se recalculan solos (un equipo sin controles queda en GRIS).

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
