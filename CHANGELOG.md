# Changelog

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
