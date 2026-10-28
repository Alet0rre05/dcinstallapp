"""Prepara `planilla_extintores.xlsx` a partir de la planilla de referencia REAL (V3.2).

Parte del archivo original (TASA_CASA_CENTRAL-_DETALLE_EXTINTORES-_OCTUBRE_2026.xlsx) y NO
reconstruye nada celda por celda: se conservan logo, combinadas, anchos, altos, fuentes, bordes,
rotaciones, orientación y márgenes. Solo se hace lo mínimo para dejarla como plantilla en blanco:

  * se borran los datos de ejemplo (A4:N13) y las celdas auxiliares de las listas (AB:AF);
  * el cuerpo con bordes llega hasta la fila 22 (la 23 queda sin bordes), con el mismo estilo de la fila 4;
  * se descartan las listas desplegables viejas (apuntaban a celdas vacías): las listas nuevas
    las arma `planilla.py` al generar cada archivo.

Uso:
    python plantillas/generar_plantilla_base.py ruta/a/la_referencia.xlsx
"""
import sys
from copy import copy
from pathlib import Path

from openpyxl import load_workbook

AQUI = Path(__file__).resolve().parent
PRIMERA_FILA = 4
ULTIMA_FILA_CON_BORDES = 22
ALTO_FILA = 24.75
COLUMNAS_CUERPO = range(1, 16)  # A..O (la P no lleva bordes)


def preparar(origen, destino=None):
    wb = load_workbook(origen)
    ws = wb.worksheets[0]
    ws.title = "EXTINTORES TASA-CASA CENTRAL"

    # Datos de ejemplo y celdas auxiliares fuera
    for fila in range(PRIMERA_FILA, 14):
        for col in range(1, 15):
            ws.cell(row=fila, column=col).value = None
    for fila in range(1, 101):
        for col in range(28, 34):  # AB..AG
            ws.cell(row=fila, column=col).value = None

    # Cuerpo con bordes hasta la fila 22: se clona el estilo de la última fila que ya lo tiene
    ultima_con_borde = max(
        f for f in range(PRIMERA_FILA, 30) if ws.cell(row=f, column=1).border.left.style
    )
    for fila in range(ultima_con_borde + 1, ULTIMA_FILA_CON_BORDES + 1):
        for col in COLUMNAS_CUERPO:
            ws.cell(row=fila, column=col)._style = copy(ws.cell(row=ultima_con_borde, column=col)._style)
    for fila in range(PRIMERA_FILA, 24):
        ws.row_dimensions[fila].height = ALTO_FILA

    ws.data_validations.dataValidation = []
    ws.auto_filter.ref = "A3:N23"
    destino = Path(destino) if destino else AQUI / "planilla_extintores.xlsx"
    wb.save(destino)
    return destino


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    print("Plantilla generada:", preparar(sys.argv[1]))
