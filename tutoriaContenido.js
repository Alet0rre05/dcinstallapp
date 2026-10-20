/**
 * Contenido de la Tutoría. Para agregar o corregir una guía, solo se edita este archivo.
 *
 * Cada guía:
 *  - id:       identificador estable (se usa para guardar el progreso)
 *  - titulo / resumen
 *  - roles:    quién puede hacerlo. "PUBLICO" = cualquiera (con o sin cuenta, sin rol)
 *  - ruta:     pantalla donde se hace (opcional) y rutaTexto: texto del botón
 *  - pasos:    [{ t: título corto, d: explicación }]
 */

export const ROLES_ORDEN = ["PUBLICO", "OPERARIO", "OFICINA", "ADMIN"];

export const ROL_TEXTO = {
  PUBLICO: "Todos",
  OPERARIO: "Operario",
  OFICINA: "Oficina",
  ADMIN: "Administrador",
};

export const GUIAS = [
  // ------------------------------------------------------------------ PÚBLICO
  {
    id: "consultar-qr",
    titulo: "Consultar un matafuego con su QR",
    resumen: "Ver el estado de un equipo escaneando la etiqueta. No hace falta tener cuenta.",
    roles: ["PUBLICO"],
    pasos: [
      { t: "Abrí la cámara del celular", d: "Apuntá a la etiqueta con el código QR pegada en el matafuego. No necesitás instalar nada." },
      { t: "Tocá el enlace que aparece", d: "Se abre la ficha del equipo en el navegador." },
      { t: "Leé el estado", d: "Arriba ves el semáforo de colores del equipo. Debajo: cliente, clase, ubicación, vencimiento de carga, vencimiento de PH y fecha del último control." },
      { t: "¿Sos del equipo?", d: "Al pie de la ficha hay un enlace “Ingresá”. Si tu cuenta tiene rol y el equipo es de un cliente que tenés asignado, vas a ver además los botones para controlar o editar." },
    ],
  },
  {
    id: "crear-cuenta",
    titulo: "Crear una cuenta e ingresar",
    resumen: "Registrarte y entender por qué al principio no tenés acceso al panel.",
    roles: ["PUBLICO"],
    ruta: "/registro",
    rutaTexto: "Ir a Crear cuenta",
    pasos: [
      { t: "Entrá a Registrarse", d: "En la barra superior tocá “Registrarse” (en el celular, primero abrí el menú ☰)." },
      { t: "Completá tus datos", d: "Nombre, usuario, email y contraseña. Usá el email real: el administrador te va a asignar el rol con ese mismo email." },
      { t: "Resolvé la verificación", d: "Esperá a que se complete la verificación de seguridad (Turnstile). El botón “Registrarme” se habilita recién cuando termina." },
      { t: "Tocá “Registrarme”", d: "Tu cuenta se crea sin rol: vas a ver la pantalla “Cuenta sin rol asignado”. Es lo esperado." },
      { t: "Pedí tu rol", d: "Avisale a un administrador el email con el que te registraste. Cuando te asigne un rol, volvé a ingresar y ya vas a ver el menú completo." },
    ],
  },
  {
    id: "iniciar-sesion",
    titulo: "Ingresar y salir de la app",
    resumen: "Iniciar sesión, qué pasa si te equivocás varias veces y cómo cerrar sesión.",
    roles: ["PUBLICO"],
    ruta: "/login",
    rutaTexto: "Ir a Ingresar",
    pasos: [
      { t: "Entrá a Ingresar", d: "Ingresá tu usuario y contraseña." },
      { t: "Cuidado con los intentos", d: "Después de 5 intentos fallidos la cuenta se bloquea 30 minutos por seguridad. Esperá y probá de nuevo." },
      { t: "Tu sesión dura 30 días", d: "No hace falta ingresar todos los días en el mismo dispositivo." },
      { t: "Salí en equipos compartidos", d: "Usá “Salir” en la barra superior para cerrar la sesión." },
    ],
  },

  // ------------------------------------------------------------- OPERARIO+
  {
    id: "buscar-equipo",
    titulo: "Buscar un matafuego",
    resumen: "Elegir un cliente y encontrar un equipo por número de serie o ubicación.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/",
    rutaTexto: "Ir a Matafuegos",
    pasos: [
      { t: "Entrá a “Matafuegos”", d: "Es la pantalla de inicio. Ves una tarjeta por cada cliente que tenés asignado." },
      { t: "Mirá los avisos de la tarjeta", d: "Cada cliente muestra cuántos equipos tiene, cuántos están vencidos o críticos (⚠), cuántos están por vencer y cuántos quedan sin revisar este mes." },
      { t: "Tocá el cliente", d: "Se abre su lista de equipos. Con el botón “← Clientes” volvés atrás." },
      { t: "Buscá el equipo", d: "Escribí en el buscador el número de serie o la ubicación. La lista está ordenada por urgencia: lo más grave aparece primero." },
      { t: "Abrí la ficha", d: "Tocá el equipo para ver todos sus datos, el estado y el historial de controles." },
    ],
  },
  {
    id: "semaforo",
    titulo: "Entender los colores y el estado REVISADO",
    resumen: "Qué significa cada color del semáforo y la diferencia con REVISADO / NO REVISADO.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/",
    rutaTexto: "Ir a Matafuegos",
    pasos: [
      { t: "El semáforo muestra la condición del equipo", d: "Cada equipo tiene un color según sus vencimientos y su último control. Siempre va acompañado de un texto, no solo del color." },
      { t: "Prioridad en la lista", d: "Los equipos más urgentes (bordó y rojo) van primero; después amarillo, gris (sin datos o nunca controlado) y al final verde." },
      { t: "REVISADO / NO REVISADO es otra cosa", d: "Indica si alguien hizo un control este mes calendario. Un equipo pasa a REVISADO cuando se guarda un control, aunque ese control haya detectado problemas." },
      { t: "Se reinicia solo", d: "El día 1 de cada mes todos los equipos vuelven a NO REVISADO. No hay que hacer nada." },
    ],
  },
  {
    id: "nuevo-control",
    titulo: "Registrar un control",
    resumen: "Cargar la inspección de un matafuego, desde la lista o escaneando su QR.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/",
    rutaTexto: "Ir a Matafuegos",
    pasos: [
      { t: "Abrí el equipo", d: "Escaneá su QR (e ingresá si te lo pide) o buscalo en Matafuegos y abrí su ficha. Solo podés controlar equipos de clientes que tenés asignados." },
      { t: "Tocá “Controlar” o “Nuevo control”", d: "Se despliega el formulario. En la ficha del QR el botón se llama “Nuevo control”." },
      { t: "Marcá la presión", d: "Elegí Presión baja, normal o alta según el manómetro." },
      { t: "Tildá lo que está bien", d: "Señalización OK, Chapa/baliza OK y Accesible. Dejá sin tildar lo que encuentres mal." },
      { t: "Actualizá datos si cambiaron", d: "Si movieron el equipo o lo recargaste, completá la ubicación actual y los nuevos vencimientos de carga y PH. Son opcionales." },
      { t: "Agregá observaciones", d: "Anotá cualquier detalle útil (golpes, precinto roto, falta de soporte…)." },
      { t: "Guardá", d: "Tocá “Guardar control”. Atención: un control guardado NO se puede modificar. La fecha la pone el sistema y el equipo pasa a REVISADO." },
    ],
  },
  {
    id: "soporte",
    titulo: "Pedir ayuda por Soporte",
    resumen: "Abrir un ticket, chatear con soporte y cerrarlo o reabrirlo.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/tickets",
    rutaTexto: "Ir a Soporte",
    pasos: [
      { t: "Entrá a “Soporte”", d: "Está en la barra superior." },
      { t: "Creá un ticket", d: "Escribí un título corto (máximo 32 caracteres) y, si querés, un primer mensaje. Tocá “Crear ticket”." },
      { t: "Abrí la conversación", d: "Tocá el ticket para ver el chat. Los mensajes de soporte aparecen marcados como “(soporte)”." },
      { t: "Respondé", d: "Escribí en el cuadro de abajo y tocá “Enviar”." },
      { t: "Cerrá o reabrí", d: "Cuando se resuelve, tocá “Cerrar ticket”. Si el problema vuelve, usá “Reabrir”." },
    ],
  },
  {
    id: "perfil",
    titulo: "Cambiar mis datos o mi contraseña",
    resumen: "Actualizar nombre, email y contraseña desde tu perfil.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/perfil",
    rutaTexto: "Ir a Mi perfil",
    pasos: [
      { t: "Abrí tu perfil", d: "Tocá tu nombre en la barra superior." },
      { t: "Revisá tu rol y clientes", d: "Arriba de todo ves qué rol tenés y qué clientes tenés asignados." },
      { t: "Editá lo que necesites", d: "Podés cambiar nombre y email, y escribir una nueva contraseña (opcional)." },
      { t: "Confirmá con tu contraseña actual", d: "Es obligatoria para guardar cualquier cambio, como medida de seguridad. Después tocá “Guardar cambios”." },
    ],
  },
  {
    id: "auditoria",
    titulo: "Consultar la auditoría",
    resumen: "Ver quién hizo qué y cuándo. Cada rol ve distinto alcance.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/panel",
    rutaTexto: "Ir al Panel de Control",
    pasos: [
      { t: "Entrá al Panel de Control", d: "Abrí la pestaña “Auditoría”." },
      { t: "Entendé qué ves", d: "El operario ve solo sus propias acciones; Oficina ve las de sus clientes; el administrador ve todo." },
      { t: "Filtrá", d: "Podés filtrar por acción, por usuario y por rango de fechas (Desde / Hasta). La página vuelve a la 1 cada vez que cambiás un filtro." },
      { t: "Mirá el detalle", d: "Tocá un evento para ver, campo por campo, qué valor había antes y cuál quedó después. Las fechas y horas están en hora de Argentina." },
      { t: "Navegá", d: "Usá “Anterior” y “Siguiente” para recorrer los resultados." },
    ],
  },

  // ---------------------------------------------------------------- OFICINA+
  {
    id: "alta-equipo",
    titulo: "Agregar un matafuego",
    resumen: "Dar de alta un equipo nuevo para un cliente.",
    roles: ["OFICINA", "ADMIN"],
    ruta: "/",
    rutaTexto: "Ir a Matafuegos",
    pasos: [
      { t: "Entrá al cliente", d: "En Matafuegos, tocá la tarjeta del cliente al que pertenece el equipo." },
      { t: "Tocá “+ Agregar matafuego”", d: "Se despliega el formulario de alta." },
      { t: "Completá los datos", d: "El cliente ya viene elegido. Cargá el número de serie (obligatorio), la clase (ABC, BC…), la ubicación y los vencimientos de carga y PH." },
      { t: "Guardá", d: "Tocá “Agregar matafuego”. El equipo recibe automáticamente un código QR propio que no cambia nunca." },
    ],
  },
  {
    id: "editar-baja",
    titulo: "Editar, dar de baja o restaurar un equipo",
    resumen: "Corregir datos de la ficha y manejar equipos que ya no están en uso.",
    roles: ["OFICINA", "ADMIN"],
    ruta: "/",
    rutaTexto: "Ir a Matafuegos",
    pasos: [
      { t: "Abrí la ficha del equipo", d: "Buscalo en el cliente, o escaneá su QR estando con sesión iniciada." },
      { t: "Editar", d: "Tocá “Editar ficha” para cambiar clase, ubicación y vencimientos. Los controles ya guardados no se modifican." },
      { t: "Dar de baja", d: "Tocá “Dar de baja” cuando el equipo ya no está en servicio. Deja de contar en los resúmenes, pero su historial se conserva." },
      { t: "Ver las bajas", d: "En la lista del cliente tildá “Ver bajas” para mostrar también los equipos dados de baja." },
      { t: "Restaurar", d: "En un equipo dado de baja, tocá “Restaurar” para reactivarlo." },
    ],
  },
  {
    id: "importar",
    titulo: "Importar equipos desde Excel",
    resumen: "Cargar muchos matafuegos de una sola vez con la plantilla.",
    roles: ["OFICINA", "ADMIN"],
    ruta: "/importar",
    rutaTexto: "Ir a Importar",
    pasos: [
      { t: "Elegí el cliente", d: "Los equipos del archivo se van a cargar para el cliente que elijas." },
      { t: "Descargá la plantilla", d: "Tocá “Descargar plantilla (.xlsx)”." },
      { t: "Completala", d: "Una fila por matafuego. Borrá la fila de ejemplo antes de guardar." },
      { t: "Subí el archivo", d: "Acepta .xlsx o .csv de hasta 5 MB. Tocá “Revisar archivo”." },
      { t: "Mirá la vista previa", d: "Ves cuántas filas son válidas y cuáles tienen error, con el motivo. Revisá que no haya quedado la fila de ejemplo." },
      { t: "Corregí si hace falta", d: "Con un solo error se cancela toda la carga: no se guarda nada. Corregí el archivo y volvé a subirlo." },
      { t: "Confirmá", d: "Si todo está bien, tocá “Confirmar e importar”. Después podés ir directo a imprimir las etiquetas de esos equipos." },
    ],
  },
  {
    id: "etiquetas",
    titulo: "Imprimir etiquetas QR",
    resumen: "Armar e imprimir la hoja A4 adhesiva con los códigos QR.",
    roles: ["OFICINA", "ADMIN"],
    ruta: "/etiquetas",
    rutaTexto: "Ir a Etiquetas",
    pasos: [
      { t: "Elegí el cliente", d: "Aparece la lista de sus equipos." },
      { t: "Seleccioná los equipos", d: "Tildá los que querés imprimir, o usá la casilla de seleccionar todos." },
      { t: "Elegí el formato de la hoja", d: "Hay formatos listos (3×7 y 2×4) o podés personalizar las medidas según tu hoja adhesiva." },
      { t: "Probá en papel común", d: "Activá “Mostrar bordes” e imprimí primero en una hoja normal. Apoyala contra la adhesiva a trasluz para ver si coincide." },
      { t: "Ajustá el desplazamiento", d: "Si las etiquetas salen corridas, mové el desplazamiento X (→) e Y (↓) en milímetros, con los botones − y +." },
      { t: "Imprimí definitivo", d: "Desactivá los bordes y tocá imprimir. Antes de imprimir definitivas, confirmá que el dominio de los QR esté bien configurado; si no, aparece un aviso." },
    ],
  },

  // ------------------------------------------------- DASHBOARD, REMITO, AVISOS, TEMA
  {
    id: "dashboard",
    titulo: "Leer el dashboard de vencimientos",
    resumen: "Ver de un vistazo qué vence, cuándo y qué equipos necesitan atención.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/dashboard",
    rutaTexto: "Ir al Dashboard",
    pasos: [
      { t: "Entrá a “Dashboard”", d: "Está en la barra superior. Muestra solo equipos activos de los clientes que tenés asignados." },
      { t: "Elegí cliente y período", d: "Con “Cliente” filtrás por uno solo; “Período del gráfico” cambia entre 3, 6 y 12 meses." },
      { t: "Mirá los cuatro indicadores", d: "Equipos activos, equipos vencidos, por vencer en 30 días y sin revisar este mes. Cada uno lleva ícono y número, no solo color." },
      { t: "Leé el gráfico por mes", d: "Cada mes tiene dos barras: carga (lisa) y prueba hidráulica o PH (rayada). El número arriba de cada barra es la cantidad que vence ese mes." },
      { t: "Revisá el estado de los equipos", d: "Muestra cuántos hay en cada color del semáforo, de crítico a operativo." },
      { t: "Recorré los próximos vencimientos", d: "La tabla lista lo vencido y lo que vence en 60 días, del más urgente al menos. Tocá el número de serie para abrir la ficha del equipo." },
    ],
  },
  {
    id: "remito",
    titulo: "Descargar el remito de un ticket cerrado",
    resumen: "Obtener el PDF con el resumen y la conversación de un ticket resuelto.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    ruta: "/tickets",
    rutaTexto: "Ir a Soporte",
    pasos: [
      { t: "Cerrá el ticket", d: "En Soporte, abrí el ticket y tocá “Cerrar ticket”. El teléfono vibra un instante para confirmar." },
      { t: "Tocá “Descargar remito (PDF)”", d: "El botón aparece en los tickets cerrados, junto a “Reabrir”." },
      { t: "Revisá el archivo", d: "El remito trae el número, el cliente, el equipo (si el ticket tiene uno), quién lo abrió y lo cerró, las fechas y los últimos mensajes de la conversación." },
      { t: "¿Hay que corregir algo?", d: "Si reabrís el ticket y lo volvés a cerrar, el remito se genera de nuevo con la información actualizada." },
    ],
  },
  {
    id: "avisos",
    titulo: "Usar la campana de avisos",
    resumen: "Enterarte de mensajes en tus tickets, cierres y vencimientos sin salir de lo que hacés.",
    roles: ["OPERARIO", "OFICINA", "ADMIN"],
    pasos: [
      { t: "Mirá la campana", d: "Está en la barra superior. Un círculo con número indica cuántos avisos no leíste." },
      { t: "Abrí el panel", d: "Tocá la campana. Los avisos nuevos tienen la marca “NUEVO”." },
      { t: "Tipos de aviso", d: "Mensajes nuevos en un ticket, tickets cerrados o reabiertos, y un resumen semanal de vencidos y por vencer por cliente." },
      { t: "Tocá un aviso", d: "Se marca como leído y te lleva a la pantalla correspondiente (Soporte o el Dashboard del cliente)." },
      { t: "Marcá todos como leídos", d: "Usá el botón de arriba del panel. Con Esc o tocando afuera se cierra el panel." },
      { t: "Si no hay conexión", d: "La app avisa y conserva el último número. Se actualiza sola cada minuto y al volver a la pestaña. Si el teléfono lo permite, vibra cuando llega un aviso nuevo." },
    ],
  },
  {
    id: "modo-oscuro",
    titulo: "Cambiar a modo oscuro",
    resumen: "Usar la app con fondos oscuros para cuidar la vista o ahorrar batería.",
    roles: ["PUBLICO"],
    pasos: [
      { t: "Buscá el botón", d: "En la barra superior hay un botón con una luna (o un sol si ya estás en modo oscuro)." },
      { t: "Tocalo", d: "La app cambia al instante. Los fondos usan grises azulados, nunca negro puro." },
      { t: "Se recuerda", d: "La elección queda guardada en este navegador. Si nunca la cambiás, la app sigue la preferencia de tu dispositivo." },
      { t: "Al imprimir", d: "Las etiquetas QR siempre se imprimen en claro, aunque estés en modo oscuro." },
    ],
  },

  // ------------------------------------------------------------------ ADMIN
  {
    id: "asignar-rol",
    titulo: "Asignar un rol a una persona",
    resumen: "Darle permisos a alguien que ya se registró.",
    roles: ["ADMIN"],
    ruta: "/panel",
    rutaTexto: "Ir al Panel de Control",
    pasos: [
      { t: "La persona tiene que registrarse primero", d: "Si el email no está registrado, el sistema no crea la cuenta: te avisa que debe registrarse antes." },
      { t: "Abrí Panel de Control → Equipo", d: "Arriba está el formulario “Asignar rol por email”." },
      { t: "Escribí el email y elegí el rol", d: "OPERARIO controla equipos; OFICINA además crea, edita y da de baja; ADMIN además gestiona el equipo y ve toda la auditoría." },
      { t: "Marcá los clientes", d: "Tildá los clientes que va a poder ver. Sin clientes asignados no verá equipos." },
      { t: "Tocá “Asignar rol”", d: "El permiso rige desde ese momento." },
    ],
  },
  {
    id: "clientes-usuario",
    titulo: "Cambiar los clientes de un usuario",
    resumen: "Ajustar a qué clientes tiene acceso cada persona del equipo.",
    roles: ["ADMIN"],
    ruta: "/panel",
    rutaTexto: "Ir al Panel de Control",
    pasos: [
      { t: "Buscá a la persona", d: "En Panel → Equipo usá el buscador por nombre, usuario o email." },
      { t: "Tocá “Clientes”", d: "Se abre la lista de clientes con casillas." },
      { t: "Tildá o destildá", d: "Marcá los clientes que debe ver." },
      { t: "Guardá", d: "Tocá “Guardar clientes”." },
      { t: "¿Falta un cliente en la lista?", d: "Los clientes se crean desde el sitio de administración de Django (/admin/)." },
    ],
  },
  {
    id: "revocar-rol",
    titulo: "Quitar el rol a alguien",
    resumen: "Revocar permisos sin borrar la cuenta.",
    roles: ["ADMIN"],
    ruta: "/panel",
    rutaTexto: "Ir al Panel de Control",
    pasos: [
      { t: "Buscá a la persona", d: "En Panel → Equipo." },
      { t: "Tocá la ✕", d: "Te pide confirmación." },
      { t: "Qué pasa al confirmar", d: "La cuenta NO se elimina: vuelve a ser “público” y pierde todos los permisos al instante." },
      { t: "Límites", d: "No podés revocar tu propio rol ni el de un superusuario." },
    ],
  },
];
