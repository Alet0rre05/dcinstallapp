# DC Install · mejoras de interfaz

## Implementado
- Drawer global opaco con overlay, cierre Escape, bloqueo de scroll, foco atrapado y enlaces basados en permisos existentes.
- Navbar industrial con contraste y logo original transparente presentado sobre fondo blanco para preservar su legibilidad.
- Tema oscuro por defecto para instalaciones sin preferencia guardada; se conserva la preferencia light existente.
- Componentes JSX reutilizables: Servicios, FAQAccordion, ProjectRequestForm, ProjectStepper y DashboardCharts.
- Estilos de hover, botones táctiles, foco accesible y reducción de movimiento.

## Pendiente de integración funcional
- `ProjectRequestForm` no envía datos por sí solo: requiere `onSubmit` enlazado a un endpoint validado/autorizado. El botón queda deshabilitado mientras no se provea.
- `Servicios` apunta a `/solicitud` por defecto; debe registrarse esa ruta cuando se habilite el flujo de solicitudes.
- `DashboardCharts` acepta datos mediante props, no simula cifras ni modifica consultas Django.
- `ProjectStepper` necesita el estado real de la orden; no se agregó ningún campo o endpoint nuevo.
- Los componentes nuevos no se insertan automáticamente en pantallas operativas para evitar alterar flujos y permisos existentes.

## Verificación
Ejecutar en `frontend`: `npm install` y `npm run build`. Para Android: `npm run cap:sync` después del build.
