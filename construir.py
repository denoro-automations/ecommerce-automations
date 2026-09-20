#!/usr/bin/env python3
"""Regenera los workflows de las cinco automatizaciones y el de avisos de error.

Uso: python3 construir.py
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
CARPETAS = ["fichas-producto", "stock-proveedor", "carritos", "resenas", "facturas"]

if __name__ == "__main__":
    fallos = 0
    for carpeta in CARPETAS:
        r = subprocess.run([sys.executable, str(RAIZ / carpeta / "build.py")], capture_output=True, text=True)
        print(r.stdout.strip() or r.stderr.strip())
        fallos += r.returncode
    spec = importlib.util.spec_from_file_location("common", RAIZ / "comun" / "common.py")
    c = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(c)
    wf = c.error_handler()
    (RAIZ / "comun" / "avisos-de-error.workflow.json").write_text(
        json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"comun/avisos-de-error.workflow.json: {len(wf['nodes'])} nodos")
    sys.exit(1 if fallos else 0)
