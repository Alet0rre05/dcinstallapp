"""
Generador de remitos en PDF **sin dependencias externas** (PDF 1.4 escrito a mano).

Usa las fuentes estándar Helvetica / Helvetica-Bold (no hace falta embeberlas) con
codificación WinAnsi, así que se ven bien los acentos y la ñ del español.

Uso: `generar_remito_pdf(datos) -> bytes`, donde `datos` es un dict simple (ver `_ejemplo` al
final del módulo). Esta capa no toca la base de datos: `remito.py` arma el dict.
"""

# Anchos de Helvetica (unidades de 1/1000 de em) para ASCII 32..126
_ANCHOS = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

A4_W, A4_H = 595.28, 841.89
MARGEN = 42.0

# Colores de la marca (RGB 0..1)
CELESTE = (0x64 / 255, 0xDC / 255, 0xF4 / 255)
INK = (0x0B / 255, 0x2E / 255, 0x3F / 255)
GRIS = (0.35, 0.40, 0.45)
LINEA = (0.78, 0.84, 0.88)
CLARO = (0.91, 0.98, 1.0)


def ancho_texto(texto, tam, bold=False):
    total = 0
    for ch in texto:
        o = ord(ch)
        total += _ANCHOS[o - 32] if 32 <= o <= 126 else 556
    return total * tam / 1000 * (1.06 if bold else 1.0)


def _pdf_str(texto):
    """Texto -> bytes escapados para un string literal PDF (cp1252)."""
    b = texto.encode("cp1252", "replace")
    return b.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def _num(v):
    return f"{v:.2f}".encode()


class _Pagina:
    def __init__(self):
        self.ops = []

    def color_relleno(self, rgb):
        self.ops.append(b"%.3f %.3f %.3f rg" % rgb)

    def color_trazo(self, rgb):
        self.ops.append(b"%.3f %.3f %.3f RG" % rgb)

    def rect(self, x, y, w, h, relleno=True):
        self.ops.append(b"%s %s %s %s re %s" % (_num(x), _num(y), _num(w), _num(h), b"f" if relleno else b"S"))

    def linea(self, x1, y1, x2, y2, grosor=0.6):
        self.ops.append(b"%s w %s %s m %s %s l S" % (_num(grosor), _num(x1), _num(y1), _num(x2), _num(y2)))

    def texto(self, x, y, texto, tam=10, bold=False):
        fuente = b"/F2" if bold else b"/F1"
        self.ops.append(
            b"BT %s %s Tf %s %s Td (%s) Tj ET" % (fuente, _num(tam), _num(x), _num(y), _pdf_str(texto))
        )

    def contenido(self):
        return b"\n".join(self.ops)


def envolver(texto, tam, ancho_max, bold=False):
    """Parte `texto` en líneas que entran en `ancho_max` puntos (respeta saltos de línea)."""
    lineas = []
    for parrafo in str(texto).replace("\r", "").split("\n"):
        actual = ""
        for palabra in parrafo.split(" "):
            candidata = palabra if not actual else f"{actual} {palabra}"
            if ancho_texto(candidata, tam, bold) <= ancho_max:
                actual = candidata
                continue
            if actual:
                lineas.append(actual)
            # palabra más larga que la línea: se corta por caracteres
            while ancho_texto(palabra, tam, bold) > ancho_max and len(palabra) > 1:
                corte = len(palabra) - 1
                while corte > 1 and ancho_texto(palabra[:corte], tam, bold) > ancho_max:
                    corte -= 1
                lineas.append(palabra[:corte])
                palabra = palabra[corte:]
            actual = palabra
        lineas.append(actual)
    return lineas or [""]


class _Documento:
    def __init__(self, pie):
        self.pie = pie
        self.paginas = []
        self.p = None
        self.y = 0
        self.nueva_pagina()

    def nueva_pagina(self):
        self.p = _Pagina()
        self.paginas.append(self.p)
        self.y = A4_H - MARGEN

    def asegurar(self, alto):
        """Si no entra `alto` puntos, salta de página."""
        if self.y - alto < MARGEN + 24:
            self.nueva_pagina()

    def serializar(self):
        total = len(self.paginas)
        for i, pag in enumerate(self.paginas, 1):
            pag.linea(MARGEN, MARGEN + 12, A4_W - MARGEN, MARGEN + 12, 0.5)
            pag.color_relleno(GRIS)
            pag.texto(MARGEN, MARGEN, self.pie, 8)
            etiqueta = f"Página {i} de {total}"
            pag.texto(A4_W - MARGEN - ancho_texto(etiqueta, 8), MARGEN, etiqueta, 8)

        objs = []  # cada objeto es bytes (sin "n 0 obj")
        # 1 catálogo, 2 páginas, 3 y 4 fuentes, luego (página, contenido) por página
        kids = b" ".join(b"%d 0 R" % (5 + 2 * i) for i in range(total))
        objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
        objs.append(b"<< /Type /Pages /Kids [%s] /Count %d >>" % (kids, total))
        objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
        for i, pag in enumerate(self.paginas):
            cont = pag.contenido()
            objs.append(
                b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %s %s] "
                b"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents %d 0 R >>"
                % (_num(A4_W), _num(A4_H), 6 + 2 * i)
            )
            objs.append(b"<< /Length %d >>\nstream\n%s\nendstream" % (len(cont), cont))

        salida = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for n, cuerpo in enumerate(objs, 1):
            offsets.append(len(salida))
            salida += b"%d 0 obj\n%s\nendobj\n" % (n, cuerpo)
        xref = len(salida)
        salida += b"xref\n0 %d\n" % (len(objs) + 1)
        salida += b"0000000000 65535 f \n"
        for off in offsets:
            salida += b"%010d 00000 n \n" % off
        salida += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
        return bytes(salida)


def generar_remito_pdf(d):
    """
    d = {
      "numero": "R-000123", "emitido": "10/10/2026 05:00",
      "cliente": str, "titulo": str,
      "equipo": {"serie": str, "clase": str, "ubicacion": str} | None,
      "creado_por": str, "fecha_creacion": str, "fecha_cierre": str, "cerrado_por": str,
      "mensajes": [{"autor": str, "soporte": bool, "fecha": str, "texto": str}, ...],
      "mensajes_omitidos": int,
    }
    """
    doc = _Documento(f"DC INSTALL · Remito {d['numero']} · Documento generado por el sistema")
    ancho_util = A4_W - 2 * MARGEN

    # --- Encabezado -------------------------------------------------------
    p = doc.p
    p.color_relleno(CELESTE)
    p.rect(0, A4_H - 92, A4_W, 92)
    p.color_relleno(INK)
    p.texto(MARGEN, A4_H - 50, "DC INSTALL", 22, bold=True)
    p.texto(MARGEN, A4_H - 68, "Control de matafuegos", 10)
    titulo = "REMITO DE SERVICIO"
    p.texto(A4_W - MARGEN - ancho_texto(titulo, 15, True), A4_H - 48, titulo, 15, bold=True)
    numero = f"N° {d['numero']}"
    p.texto(A4_W - MARGEN - ancho_texto(numero, 12, True), A4_H - 67, numero, 12, bold=True)
    doc.y = A4_H - 92 - 26

    # --- Datos ------------------------------------------------------------
    def campo(x, y, etiqueta, valor, ancho):
        doc.p.color_relleno(GRIS)
        doc.p.texto(x, y, etiqueta.upper(), 7.5, bold=True)
        doc.p.color_relleno(INK)
        lineas = envolver(valor or "—", 10.5, ancho)
        for i, ln in enumerate(lineas[:3]):
            doc.p.texto(x, y - 13 - i * 12.5, ln, 10.5)
        return 13 + min(len(lineas), 3) * 12.5

    mitad = ancho_util / 2
    filas = [
        (("Cliente", d["cliente"]), ("Emitido", d["emitido"])),
        (("Asunto del ticket", d["titulo"]), ("Ticket", d["numero"])),
        (("Abierto por", d["creado_por"]), ("Fecha de apertura", d["fecha_creacion"])),
        (("Cerrado por", d["cerrado_por"]), ("Fecha de cierre", d["fecha_cierre"])),
    ]
    for izq, der in filas:
        doc.asegurar(50)
        y = doc.y
        a = campo(MARGEN, y, izq[0], izq[1], mitad - 12)
        b = campo(MARGEN + mitad, y, der[0], der[1], mitad - 12)
        doc.y -= max(a, b) + 10

    equipo = d.get("equipo")
    doc.asegurar(70)
    doc.p.color_relleno(CLARO)
    doc.p.rect(MARGEN, doc.y - 52, ancho_util, 58)
    doc.p.color_relleno(INK)
    doc.p.texto(MARGEN + 10, doc.y - 8, "EQUIPO", 7.5, bold=True)
    if equipo:
        doc.p.texto(MARGEN + 10, doc.y - 24, f"N° de serie: {equipo['serie']}   ·   Clase: {equipo.get('clase') or '—'}", 10.5)
        ubic = envolver(f"Ubicación: {equipo.get('ubicacion') or '—'}", 10.5, ancho_util - 20)[0]
        doc.p.texto(MARGEN + 10, doc.y - 39, ubic, 10.5)
    else:
        doc.p.texto(MARGEN + 10, doc.y - 24, "Ticket sin un equipo específico asociado.", 10.5)
    doc.y -= 74

    # --- Detalle ----------------------------------------------------------
    doc.asegurar(40)
    doc.p.color_relleno(INK)
    doc.p.texto(MARGEN, doc.y, "DETALLE DEL SERVICIO (conversación del ticket)", 9.5, bold=True)
    doc.p.color_trazo(LINEA)
    doc.p.linea(MARGEN, doc.y - 5, A4_W - MARGEN, doc.y - 5)
    doc.y -= 22

    mensajes = d.get("mensajes") or []
    if not mensajes:
        doc.p.color_relleno(GRIS)
        doc.p.texto(MARGEN, doc.y, "El ticket se cerró sin mensajes.", 10)
        doc.y -= 18
    for m in mensajes:
        cuerpo = envolver(m["texto"], 10, ancho_util - 16)
        doc.asegurar(26 + 12.5)
        rol = " (soporte)" if m.get("soporte") else ""
        doc.p.color_relleno(INK)
        doc.p.texto(MARGEN, doc.y, f"{m['autor']}{rol}", 9.5, bold=True)
        doc.p.color_relleno(GRIS)
        fecha = m["fecha"]
        doc.p.texto(A4_W - MARGEN - ancho_texto(fecha, 8.5), doc.y, fecha, 8.5)
        doc.y -= 13
        for ln in cuerpo:
            if doc.y - 12.5 < MARGEN + 24:  # el mensaje continúa en la página siguiente
                doc.nueva_pagina()
            doc.p.color_relleno(INK)
            doc.p.texto(MARGEN + 12, doc.y, ln, 10)
            doc.y -= 12.5
        doc.y -= 8
    if d.get("mensajes_omitidos"):
        doc.asegurar(20)
        doc.p.color_relleno(GRIS)
        doc.p.texto(MARGEN, doc.y, f"… y {d['mensajes_omitidos']} mensajes anteriores no incluidos en este remito.", 9)
        doc.y -= 18

    # --- Firmas -----------------------------------------------------------
    doc.asegurar(110)
    doc.y -= 40
    ancho_firma = (ancho_util - 40) / 2
    doc.p.color_trazo(INK)
    for i, rotulo in enumerate(("Firma y aclaración del técnico", "Conformidad del cliente")):
        x = MARGEN + i * (ancho_firma + 40)
        doc.p.linea(x, doc.y, x + ancho_firma, doc.y, 0.8)
        doc.p.color_relleno(GRIS)
        doc.p.texto(x, doc.y - 13, rotulo, 9)

    return doc.serializar()


def _ejemplo():  # pragma: no cover - ayuda para probar a mano
    return generar_remito_pdf({
        "numero": "R-000123", "emitido": "10/10/2026 05:00", "cliente": "ACME S.A.",
        "titulo": "Recarga sucursal Norte", "equipo": {"serie": "AB-123", "clase": "ABC", "ubicacion": "Planta baja, pasillo 2"},
        "creado_por": "operario1", "fecha_creacion": "09/10/2026 09:12", "fecha_cierre": "10/10/2026 04:55",
        "cerrado_por": "oficina1",
        "mensajes": [{"autor": "operario1", "soporte": False, "fecha": "09/10/2026 09:12", "texto": "Matafuego con presión baja (ñandú)."}],
        "mensajes_omitidos": 0,
    })
