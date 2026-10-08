"""Carga masiva de matafuegos desde Excel (.xlsx) o CSV (V2.2).

Este módulo solo LEE y VALIDA: no toca la base de datos más que para consultar
duplicados. Guardar (bulk_create, historial, auditoría) es responsabilidad de la vista.

Seguridad:
- La extensión no alcanza: se verifica el contenido real (firma ZIP + estructura de
  un .xlsx; texto sin bytes nulos en el .csv).
- Se acota el tamaño descomprimido (zip bombs) y se rechazan XML con DOCTYPE/ENTITY.
- openpyxl se usa en modo read_only y NUNCA se evalúan fórmulas: una celda con
  fórmula se informa como error de fila, no se calcula.
"""
import csv
import io
import os
import re
import unicodedata
import zipfile
from dataclasses import dataclass, field
from datetime import date, datetime

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill

from .models import Matafuego

MAX_BYTES = 5 * 1024 * 1024
MAX_FILAS = 5000
MAX_FILAS_FISICAS = 100_000  # filas vacías con formato que Excel suele arrastrar
MAX_DESCOMPRIMIDO = 50 * 1024 * 1024
MAX_ERRORES_VISIBLES = 200
LOTE_CONSULTA = 500

COLUMNAS = ("numero_serie", "clase", "ubicacion", "vencimiento_carga", "vencimiento_ph")

# Encabezados aceptados (ya normalizados: minúsculas, sin tildes, con "_").
ALIAS = {
    "numero_serie": {"numero_serie", "n_serie", "nro_serie", "serie", "numero_de_serie"},
    "clase": {"clase"},
    "ubicacion": {"ubicacion"},
    "vencimiento_carga": {"vencimiento_carga", "venc_carga"},
    "vencimiento_ph": {"vencimiento_ph", "venc_ph"},
}
ETIQUETA_FECHA = {"vencimiento_carga": "fecha de carga", "vencimiento_ph": "fecha de PH"}
FORMATOS_FECHA = ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d")


class ErrorArchivo(Exception):
    """Problema del archivo en sí (no de una fila). `status` es el HTTP a devolver."""

    def __init__(self, mensaje, status=400):
        super().__init__(mensaje)
        self.status = status


@dataclass
class Resultado:
    archivo: str = ""
    total_filas: int = 0
    filas: list = field(default_factory=list)  # filas válidas: dict listo para Matafuego(...)
    errores: list = field(default_factory=list)  # {"fila", "campo", "mensaje", "texto"}

    @property
    def con_error(self):
        return len({e["fila"] for e in self.errores})

    @property
    def validas(self):
        return len(self.filas)


# ---------------------------------------------------------------------------
# Lectura segura del archivo
# ---------------------------------------------------------------------------
def nombre_seguro(archivo):
    nombre = os.path.basename(archivo.name or "archivo")
    nombre = re.sub(r"[\x00-\x1f\x7f]", "", nombre).strip()
    return nombre[:200] or "archivo"


def _normalizar_encabezado(valor):
    t = unicodedata.normalize("NFD", str(valor or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", t.lower()).strip("_")


def _verificar_xlsx(archivo):
    archivo.seek(0)
    if archivo.read(4) != b"PK\x03\x04":
        raise ErrorArchivo("El archivo no es un Excel (.xlsx) válido. Si es un .xls viejo, guardalo como .xlsx.")
    archivo.seek(0)
    if not zipfile.is_zipfile(archivo):
        raise ErrorArchivo("El archivo no es un Excel (.xlsx) válido.")
    archivo.seek(0)
    try:
        with zipfile.ZipFile(archivo) as z:
            infos = z.infolist()
            nombres = {i.filename for i in infos}
            if "xl/workbook.xml" not in nombres or "[Content_Types].xml" not in nombres:
                raise ErrorArchivo("El archivo no tiene la estructura de un Excel (.xlsx).")
            if sum(i.file_size for i in infos) > MAX_DESCOMPRIMIDO:
                raise ErrorArchivo("El archivo es demasiado grande una vez descomprimido.")
            for i in infos:
                if i.filename.endswith((".xml", ".rels")):
                    with z.open(i) as f:
                        inicio = f.read(4096).lower()
                    if b"<!doctype" in inicio or b"<!entity" in inicio:
                        raise ErrorArchivo("El archivo contiene contenido no permitido.")
    except zipfile.BadZipFile:
        raise ErrorArchivo("El archivo está dañado o no es un Excel (.xlsx) válido.")
    archivo.seek(0)


def _filas_xlsx(archivo):
    _verificar_xlsx(archivo)
    try:
        wb = load_workbook(archivo, read_only=True, data_only=False)
    except Exception:
        raise ErrorArchivo("No se pudo leer el Excel. Verificá que no esté dañado ni protegido con contraseña.")
    try:
        ws = wb["Equipos"] if "Equipos" in wb.sheetnames else wb.worksheets[0]
        for n, fila in enumerate(ws.iter_rows(values_only=True), start=1):
            if n > MAX_FILAS_FISICAS:
                raise ErrorArchivo(f"El archivo tiene demasiadas filas (máximo {MAX_FILAS:,}).".replace(",", "."))
            yield n, list(fila)
    finally:
        wb.close()


def _filas_csv(archivo):
    archivo.seek(0)
    crudo = archivo.read()
    if crudo.startswith(b"PK\x03\x04"):
        raise ErrorArchivo("El archivo parece un Excel. Subilo con extensión .xlsx o guardalo como CSV.")
    if b"\x00" in crudo:
        raise ErrorArchivo("El archivo no es un CSV de texto válido.")
    for codificacion in ("utf-8-sig", "cp1252"):  # Excel en español exporta en cp1252
        try:
            texto = crudo.decode(codificacion)
            break
        except UnicodeDecodeError:
            continue
    else:
        texto = crudo.decode("latin-1")
    primera = texto.split("\n", 1)[0]
    delimitador = max(";,\t", key=primera.count) if any(d in primera for d in ";,\t") else ","
    try:
        for n, fila in enumerate(csv.reader(io.StringIO(texto), delimiter=delimitador), start=1):
            if n > MAX_FILAS_FISICAS:
                raise ErrorArchivo(f"El archivo tiene demasiadas filas (máximo {MAX_FILAS:,}).".replace(",", "."))
            yield n, fila
    except csv.Error:
        raise ErrorArchivo("No se pudo leer el CSV. Verificá el formato.")


def leer_filas(archivo):
    """Devuelve (nro_fila, [valores]) de las filas con contenido; el nro es el que ve la persona en Excel."""
    nombre = nombre_seguro(archivo)
    ext = nombre.lower().rsplit(".", 1)[-1] if "." in nombre else ""
    if ext not in ("xlsx", "csv"):
        raise ErrorArchivo("Solo se aceptan archivos .xlsx o .csv.")
    if archivo.size > MAX_BYTES:
        raise ErrorArchivo("El archivo supera el máximo de 5 MB.", status=413)
    if archivo.size == 0:
        raise ErrorArchivo("El archivo está vacío.")
    origen = _filas_xlsx(archivo) if ext == "xlsx" else _filas_csv(archivo)
    for n, fila in origen:
        if any(c is not None and str(c).strip() != "" for c in fila):
            yield n, fila


# ---------------------------------------------------------------------------
# Conversión de celdas (todo es dato, nada se evalúa)
# ---------------------------------------------------------------------------
def _largo_max(campo):
    return Matafuego._meta.get_field(campo).max_length


def _texto(valor):
    """Celda -> str limpio. Devuelve (texto, error)."""
    if valor is None:
        return "", None
    if isinstance(valor, (datetime, date)):
        return "", "tiene formato de fecha; formateá la columna como Texto"
    if isinstance(valor, bool):
        valor = str(valor)
    elif isinstance(valor, float) and valor.is_integer():
        valor = str(int(valor))  # 123.0 -> "123"
    else:
        valor = str(valor)
    valor = re.sub(r"\s+", " ", valor).strip()
    if valor.startswith("="):
        return "", "contiene una fórmula (no se evalúan); pegá solo el valor"
    return valor, None


def _fecha(valor):
    """Celda -> date | None. Devuelve (fecha, error)."""
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None, None
    if isinstance(valor, datetime):
        f = valor.date()
    elif isinstance(valor, date):
        f = valor
    elif isinstance(valor, str):
        s = valor.strip()
        if s.startswith("="):
            return None, "contiene una fórmula (no se evalúan)"
        f = None
        for formato in FORMATOS_FECHA:
            try:
                f = datetime.strptime(s, formato).date()
                break
            except ValueError:
                continue
        if f is None:
            return None, "inválida"
    else:
        return None, "inválida"
    if not 2000 <= f.year <= 2100:
        return None, "fuera de rango"
    return f, None


# ---------------------------------------------------------------------------
# Validación de TODO el archivo
# ---------------------------------------------------------------------------
def _error(res, fila, campo, mensaje):
    res.errores.append({"fila": fila, "campo": campo, "mensaje": mensaje, "texto": f"Fila {fila}: {mensaje}"})


def validar(archivo, cliente):
    """Lee y valida el archivo completo. No guarda nada."""
    res = Resultado(archivo=nombre_seguro(archivo))
    filas = leer_filas(archivo)

    encabezado = next(filas, None)
    if encabezado is None:
        raise ErrorArchivo("El archivo no tiene filas para importar.")
    pos = {}
    for i, titulo in enumerate(encabezado[1]):
        clave = _normalizar_encabezado(titulo)
        for campo, alias in ALIAS.items():
            if clave in alias and campo not in pos:
                pos[campo] = i
    if "numero_serie" not in pos:
        raise ErrorArchivo("Falta la columna «numero_serie» en la primera fila. Descargá la plantilla y usala como base.")

    series_vistas = {}  # numero_serie -> primera fila donde aparece
    candidatas = []  # (fila, datos) sin errores propios todavía
    for n, celdas in filas:
        res.total_filas += 1
        if res.total_filas > MAX_FILAS:
            raise ErrorArchivo(f"El archivo supera el máximo de {MAX_FILAS:,} filas.".replace(",", "."))

        def celda(campo, celdas=celdas):
            i = pos.get(campo)
            return celdas[i] if i is not None and i < len(celdas) else None

        datos, hubo_error, errores_antes = {}, False, len(res.errores)
        for campo, etiqueta in (("numero_serie", "n° de serie"), ("clase", "clase"), ("ubicacion", "ubicación")):
            valor, err = _texto(celda(campo))
            if err:
                _error(res, n, campo, f"{etiqueta} {err}")
                hubo_error = True
            elif len(valor) > _largo_max(campo):
                _error(res, n, campo, f"{etiqueta} demasiado largo (máximo {_largo_max(campo)} caracteres)")
                hubo_error = True
            datos[campo] = valor
        if not datos["numero_serie"] and len(res.errores) == errores_antes:
            _error(res, n, "numero_serie", "falta el n° de serie")
            hubo_error = True
        for campo in ("vencimiento_carga", "vencimiento_ph"):
            valor, err = _fecha(celda(campo))
            if err:
                _error(res, n, campo, f"{ETIQUETA_FECHA[campo]} {err} (usá dd/mm/aaaa)")
                hubo_error = True
            datos[campo] = valor

        serie = datos["numero_serie"]
        if serie:
            if serie in series_vistas:
                _error(res, n, "numero_serie", f"n° de serie «{serie}» repetido en el archivo (ya estaba en la fila {series_vistas[serie]})")
                hubo_error = True
            else:
                series_vistas[serie] = n
        if not hubo_error:
            candidatas.append((n, datos))

    if res.total_filas == 0:
        raise ErrorArchivo("El archivo no tiene filas para importar.")

    # Duplicados contra la base: la serie es única por cliente (incluye equipos dados de baja).
    existentes = {}
    todas = list(series_vistas)
    for i in range(0, len(todas), LOTE_CONSULTA):
        lote = todas[i : i + LOTE_CONSULTA]
        existentes.update(
            Matafuego.objects.filter(cliente=cliente, numero_serie__in=lote).values_list("numero_serie", "activo")
        )
    for n, datos in candidatas:
        activo = existentes.get(datos["numero_serie"])
        if activo is None:
            res.filas.append(datos)
        else:
            extra = "" if activo else " (está dado de baja: restauralo en lugar de importarlo)"
            _error(res, n, "numero_serie", f"n° de serie «{datos['numero_serie']}» ya existe para este cliente{extra}")
    # Los errores de la base se agregaron al final: se ordenan por fila para leerlos de arriba hacia abajo.
    res.errores.sort(key=lambda e: e["fila"])
    return res


# ---------------------------------------------------------------------------
# Plantilla descargable
# ---------------------------------------------------------------------------
def generar_plantilla():
    wb = Workbook()
    ws = wb.active
    ws.title = "Equipos"
    ws.append(list(COLUMNAS))
    ws.append(["EJEMPLO-001", "ABC", "Planta baja, hall de entrada", date(2027, 3, 15), date(2030, 3, 15)])
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="B91C1C")
        c.alignment = Alignment(horizontal="center")
    for c in ws[2]:
        c.font = Font(italic=True, color="64748B")
    for celda in (ws["D2"], ws["E2"]):
        celda.number_format = "DD/MM/YYYY"  # la celda pisa el formato de columna
    # Texto para serie/clase/ubicación (evita que Excel convierta "1/2" en fecha o pierda ceros)
    for letra in ("A", "B", "C"):
        ws.column_dimensions[letra].number_format = "@"
    for letra in ("D", "E"):
        ws.column_dimensions[letra].number_format = "DD/MM/YYYY"
    for letra, ancho in zip("ABCDE", (22, 12, 38, 20, 18)):
        ws.column_dimensions[letra].width = ancho
    ws.freeze_panes = "A2"

    ins = wb.create_sheet("Instrucciones")
    lineas = [
        ("Cómo cargar matafuegos desde Excel", True),
        ("", False),
        ("1. Completá la hoja «Equipos»: una fila por matafuego.", False),
        ("2. BORRÁ la fila de ejemplo (EJEMPLO-001) antes de subir el archivo.", False),
        ("3. En el sistema elegí el cliente, subí el archivo y revisá la vista previa. Recién ahí confirmás.", False),
        ("", False),
        ("Columnas", True),
        ("numero_serie (obligatoria): hasta 60 caracteres. No puede repetirse dentro del archivo ni existir ya para el cliente.", False),
        ("clase (opcional): hasta 30 caracteres. Ej.: ABC, BC, K.", False),
        ("ubicacion (opcional): hasta 200 caracteres.", False),
        ("vencimiento_carga y vencimiento_ph (opcionales): fecha con formato dd/mm/aaaa. Ej.: 15/03/2027.", False),
        ("", False),
        ("Reglas", True),
        ("Máximo 5.000 filas y 5 MB por archivo. Se aceptan .xlsx y .csv.", False),
        ("Si una sola fila tiene un error, NO se guarda ninguna: corregí lo que indica la vista previa y volvé a subir.", False),
        ("Las fórmulas no se calculan: si una celda tiene una fórmula, copiá y pegá solo el valor.", False),
        ("Para n° de serie con ceros adelante (ej.: 00123) dejá la columna en formato Texto, como viene en esta plantilla.", False),
    ]
    for texto, titulo in lineas:
        ins.append([texto])
        if titulo:
            ins.cell(row=ins.max_row, column=1).font = Font(bold=True, size=13)
    ins.column_dimensions["A"].width = 110

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
