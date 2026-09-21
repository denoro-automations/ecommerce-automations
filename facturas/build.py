#!/usr/bin/env python3
"""Genera el workflow de facturas y albaranes. Uso: python facturas/build.py"""
import importlib.util
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("common", AQUI.parent / "comun" / "common.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
c.usar(AQUI)
node, sticky, link, js = c.node, c.sticky, c.link, c.js


def facturas():
    form = lambda name, value: {"parameterType": "formData", "name": name, "value": value}  # noqa: E731
    nodes = [
        sticky("Nota: cómo usarlo", [-540, -360], (
            "## Facturas y albaranes · Denoro\n"
            "1. Rellena **emisor** con el nombre fiscal, el NIF y el domicilio reales: "
            "sin eso la factura no es válida.\n"
            "2. `serie` y `digitos` forman el número (F2026-0001). El correlativo vive en el "
            "workflow: **no lo reinicies a mano** ni dupliques el workflow, o saldrán números repetidos.\n"
            "3. `precios_con_iva: true` si los precios de la tienda ya llevan el IVA dentro "
            "(lo normal en e-commerce español).\n"
            "4. PDF: arranca Gotenberg (`docker run -d -p 3000:3000 gotenberg/gotenberg:8`). "
            "Si no responde, la factura se manda en HTML y el resumen lo avisa.\n"
            "5. Un pedido ya facturado nunca se vuelve a numerar.\n"
            "6. *Settings → Error workflow*: **Denoro — Avisos de error**."), w=540, h=400, color=5),
        node("Facturar ahora", "n8n-nodes-base.manualTrigger", 1, [0, 0], {}),
        node("Cada hora", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 200],
             {"rule": {"interval": [{"field": "hours", "hoursInterval": 1}]}}),
        node("Configuración", "n8n-nodes-base.code", 2, [220, 100], {"jsCode": js("config.js")}),
        node("¿De dónde saco los pedidos?", "n8n-nodes-base.switch", 3, [460, 100], {
            "rules": {"values": [c.switch_rule(v) for v in ("demo", "shopify", "woocommerce")]}, "options": {}}),
        node("Pedidos de ejemplo", "n8n-nodes-base.code", 2, [700, -60], {"jsCode": js("demo-pedidos.js")}),
        node("Pedidos Shopify", "n8n-nodes-base.shopify", 1, [700, 120], {
            "authentication": "accessToken", "resource": "order", "operation": "getAll", "returnAll": True,
            "options": {"status": "any", "financialStatus": "paid"}},
            alwaysOutputData=True, retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar Shopify", "n8n-nodes-base.code", 2, [920, 120], {"jsCode": js("normalizar-shopify.js")}),
        node("Pedidos WooCommerce", "n8n-nodes-base.wooCommerce", 1, [700, 300], {
            "resource": "order", "operation": "getAll", "returnAll": True, "options": {}},
            alwaysOutputData=True, retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar WooCommerce", "n8n-nodes-base.code", 2, [920, 300], {"jsCode": js("normalizar-woo.js")}),
        node("Numerar facturas", "n8n-nodes-base.code", 2, [1180, 100], {"jsCode": js("numerar.js")}),
        c.gate("¿Hay algo que facturar?", "hay_facturas", [1400, 100]),
        node("Preparar documentos", "n8n-nodes-base.code", 2, [1620, 0], {"jsCode": js("documento.js")}),
        node("Crear PDF (Gotenberg)", "n8n-nodes-base.httpRequest", 4.2, [1840, 0], {
            "method": "POST",
            "url": "={{ $json.gotenberg_url }}/forms/chromium/convert/html",
            "sendBody": True,
            "contentType": "multipart-form-data",
            "bodyParameters": {"parameters": [
                {"parameterType": "formBinaryData", "name": "files", "inputDataFieldName": "index_html"},
                form("printBackground", "true"), form("paperWidth", "8.27"), form("paperHeight", "11.7"),
                form("marginTop", "0.4"), form("marginBottom", "0.4"), form("marginLeft", "0.4"),
                form("marginRight", "0.4"), form("preferCssPageSize", "true"),
            ]},
            "options": {"response": {"response": {"responseFormat": "file", "outputPropertyName": "factura_pdf"}},
                        "timeout": 60000}},
            onError="continueRegularOutput", alwaysOutputData=True),
        node("Preparar envío", "n8n-nodes-base.code", 2, [2060, 0], {"jsCode": js("preparar-envio.js")}),
        c.email([2280, 0], attachments="factura", name="Enviar factura al cliente", tolerante=True),
        node("Recoger facturas", "n8n-nodes-base.code", 2, [2500, 0], {"jsCode": js("recoger-facturas.js")}),
        node("Sin facturas", "n8n-nodes-base.code", 2, [1620, 240], {"jsCode": js("sin-facturas.js")}),
        node("Registro y resumen", "n8n-nodes-base.code", 2, [2740, 120], {"jsCode": js("registro.js")}),
        c.gate("¿Email activo?", "enviar_email", [2960, 20]),
        c.gate("¿Telegram activo?", "enviar_telegram", [2960, 240]),
        c.email([3200, 20], attachments="libro", name="Enviar resumen"),
        c.telegram_text([3200, 240]),
    ]
    conns = link(
        ("Facturar ahora", "Configuración"), ("Cada hora", "Configuración"),
        ("Configuración", "¿De dónde saco los pedidos?"),
        ("¿De dónde saco los pedidos?", "Pedidos de ejemplo", 0),
        ("¿De dónde saco los pedidos?", "Pedidos Shopify", 1),
        ("¿De dónde saco los pedidos?", "Pedidos WooCommerce", 2),
        ("Pedidos Shopify", "Normalizar Shopify"), ("Pedidos WooCommerce", "Normalizar WooCommerce"),
        ("Pedidos de ejemplo", "Numerar facturas"), ("Normalizar Shopify", "Numerar facturas"),
        ("Normalizar WooCommerce", "Numerar facturas"),
        ("Numerar facturas", "¿Hay algo que facturar?"),
        ("¿Hay algo que facturar?", "Preparar documentos", 0),
        ("¿Hay algo que facturar?", "Sin facturas", 1),
        ("Preparar documentos", "Crear PDF (Gotenberg)"),
        ("Crear PDF (Gotenberg)", "Preparar envío"),
        ("Preparar envío", "Enviar factura al cliente"),
        ("Enviar factura al cliente", "Recoger facturas"),
        ("Recoger facturas", "Registro y resumen"), ("Sin facturas", "Registro y resumen"),
        ("Registro y resumen", "¿Email activo?"), ("Registro y resumen", "¿Telegram activo?"),
        ("¿Email activo?", "Enviar resumen", 0), ("¿Telegram activo?", "Enviar a Telegram", 0),
    )
    return c.workflow("Denoro — Facturas y albaranes", nodes, conns)


if __name__ == "__main__":
    destino = AQUI / "workflow.json"
    wf = facturas()
    destino.write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{destino.relative_to(AQUI.parent)}: {len(wf['nodes'])} nodos")
