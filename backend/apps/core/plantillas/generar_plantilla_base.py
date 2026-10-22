"""Genera una planilla BASE PROVISORIA con la estructura descrita para la V3.0.

Solo sirve hasta que se copie la planilla de referencia real
(TASA_CASA_CENTRAL-_DETALLE_EXTINTORES-_OCTUBRE_2026.xlsx) como
`planilla_extintores.xlsx` en esta carpeta: con eso se conserva el formato original
(logo, combinadas, anchos, bordes, fuentes). Uso:

    python plantillas/generar_plantilla_base.py [ruta_logo.png]
"""
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

AQUI = Path(__file__).resolve().parent
TITULOS = [
    "Puesto Nro.", "Ubicación", "Nro de Serie", "Marca", "Año Fabric.", "Clase",
    "Agente Extintor", "Capacidad", "Prescinto", "Acceso", "Señalización",
    "Vto. PH", "Vto. Carga", "Observaciones",
]
ANCHOS = [9, 34, 16, 14, 9, 8, 14, 11, 11, 9, 13, 11, 11, 40]


def generar(destino, logo=None):
    wb = Workbook()
    ws = wb.active
    ws.title = "EXTINTORES TASA-CASA CENTRAL"
    fino = Side(style="thin", color="000000")
    borde = Border(left=fino, right=fino, top=fino, bottom=fino)
    centro = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for rango in ("B1:B2", "C1:C2", "D1:E1", "D2:E2", "F1:G1", "F2:G2", "H1:N2"):
        ws.merge_cells(rango)
    ws["C1"] = "PLANTA"
    ws["D1"] = "Relevado por:"
    ws["D2"] = "DCINSTALL SRL"
    ws["F1"] = 2026
    ws["F2"] = "OCTUBRE"
    ws["H1"] = "CONTROL PERIODICO DE EXTINTORES PORTÁTILES"
    for fila in (1, 2):
        for col in range(1, 15):
            c = ws.cell(row=fila, column=col)
            c.border = borde
            c.alignment = centro
            c.font = Font(bold=True, size=11)
    ws["H1"].font = Font(bold=True, size=14)

    for i, (titulo, ancho) in enumerate(zip(TITULOS, ANCHOS), start=1):
        c = ws.cell(row=3, column=i, value=titulo)
        c.font = Font(bold=True)
        c.fill = PatternFill("solid", fgColor="D9D9D9")
        c.border = borde
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True, text_rotation=90 if i in (1, 5, 9, 10, 11, 12, 13) else 0)
        ws.column_dimensions[c.column_letter].width = ancho
    ws.row_dimensions[3].height = 87

    # Fila 4: formato de ejemplo que se clona hacia abajo (las filas 4 a 13 se limpian al exportar)
    for fila in range(4, 14):
        ws.row_dimensions[fila].height = 24.75
        for col in range(1, 15):
            c = ws.cell(row=fila, column=col)
            c.border = borde
            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=col in (2, 14))
            if col in (12, 13):
                c.number_format = "mmm-yy"
        ws.cell(row=fila, column=1, value=fila - 3)
        ws.cell(row=fila, column=2, value="EJEMPLO")

    ws["P3"] = "NUMERO"
    ws["O4"] = "RETIRO:"
    ws["O5"] = "ENTREGA:"
    ws.auto_filter.ref = "A3:N13"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True

    if logo and Path(logo).exists():
        img = Image(str(logo))
        img.width, img.height = 110, 42
        ws.add_image(img, "A1")
    wb.save(destino)


if __name__ == "__main__":
    logo = sys.argv[1] if len(sys.argv) > 1 else None
    generar(AQUI / "planilla_extintores.xlsx", logo)
    print("Planilla base provisoria generada:", AQUI / "planilla_extintores.xlsx")
