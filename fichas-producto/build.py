#!/usr/bin/env python3
"""Genera el workflow de n8n de las fichas de producto. Uso: python fichas-producto/build.py"""
import importlib.util
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("common", AQUI.parent / "comun" / "common.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
c.usar(AQUI)
node, sticky, link, js = c.node, c.sticky, c.link, c.js

CUERPO_IA = ("={{ JSON.stringify({ model: $json.modelo, temperature: 0.4, "
             "response_format: { type: 'json_object' }, messages: ["
             "{ role: 'system', content: $json.prompt_sistema }, "
             "{ role: 'user', content: $json.prompt_usuario }] }) }}")


def fichas():
    nodes = [
        sticky("Nota: cómo usarlo", [-520, -340], (
            "## Fichas de producto · Denoro\n"
            "1. Edita el bloque **CONFIGURACIÓN**: `fuente` (demo, csv, shopify, woocommerce), "
            "`idioma`, `tono` y `motor`.\n"
            "2. `motor: 'plantilla'` escribe las fichas sin llamar a ninguna API y **no cuesta nada**. "
            "`motor: 'openai'` necesita la credencial *OpenAi account* en el nodo *Pedir la ficha a la IA*.\n"
            "3. Elige credenciales en **Enviar email** (SMTP) y **Enviar a Telegram**.\n"
            "4. `max_productos` limita cada ejecución: empieza bajo y sube cuando veas el resultado.\n"
            "5. *Settings → Error workflow*: **Denoro — Avisos de error**.\n\n"
            "El CSV que llega por email se importa tal cual en la tienda."), w=520, h=360, color=5),
        node("Generar fichas ahora", "n8n-nodes-base.manualTrigger", 1, [0, 0], {}),
        node("Cada lunes a las 9:00", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 200],
             {"rule": {"interval": [{"field": "weeks", "weeksInterval": 1, "triggerAtDay": [1],
                                     "triggerAtHour": 9, "triggerAtMinute": 0}]}}),
        node("Configuración", "n8n-nodes-base.code", 2, [220, 100], {"jsCode": js("config.js")}),
        node("¿De dónde saco el catálogo?", "n8n-nodes-base.switch", 3, [440, 100], {
            "rules": {"values": [c.switch_rule(v) for v in ("demo", "csv", "shopify", "woocommerce")]},
            "options": {}}),
        # demo
        node("Catálogo de ejemplo", "n8n-nodes-base.code", 2, [700, -180], {"jsCode": js("demo-data.js")}),
        # csv
        node("Descargar CSV", "n8n-nodes-base.httpRequest", 4.2, [700, 20], {
            "url": "={{ $json.csv_url }}",
            "options": {"response": {"response": {"responseFormat": "text", "outputPropertyName": "data"}},
                        "timeout": 30000}},
            retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Leer CSV", "n8n-nodes-base.code", 2, [920, 20], {"jsCode": js("cargar-csv.js")}),
        # Shopify
        node("Productos Shopify", "n8n-nodes-base.shopify", 1, [700, 220], {
            "authentication": "accessToken", "resource": "product", "operation": "getAll",
            "returnAll": True, "additionalFields": {}},
            alwaysOutputData=True, retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar Shopify", "n8n-nodes-base.code", 2, [920, 220], {"jsCode": js("normalize-shopify.js")}),
        # WooCommerce
        node("Productos WooCommerce", "n8n-nodes-base.wooCommerce", 1, [700, 420], {
            "resource": "product", "operation": "getAll", "returnAll": True, "options": {}},
            alwaysOutputData=True, retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar WooCommerce", "n8n-nodes-base.code", 2, [920, 420],
             {"jsCode": js("normalize-woocommerce.js")}),
        # preparación
        node("Preparar productos", "n8n-nodes-base.code", 2, [1160, 100], {"jsCode": js("preparar.js")}),
        c.gate("¿Hay productos pendientes?", "sin_trabajo !== true", [1380, 100]),
        node("¿Con qué motor escribo?", "n8n-nodes-base.switch", 3, [1600, 0], {
            "rules": {"values": [c.switch_rule(v, "motor") for v in ("plantilla", "openai")]},
            "options": {}}),
        node("Escribir fichas (plantilla)", "n8n-nodes-base.code", 2, [1840, -100],
             {"jsCode": js("generar-plantilla.js")}),
        node("Pedir la ficha a la IA", "n8n-nodes-base.httpRequest", 4.2, [1840, 120], {
            "method": "POST",
            "url": "https://api.openai.com/v1/chat/completions",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "openAiApi",
            "sendBody": True,
            "specifyBody": "json",
            "jsonBody": CUERPO_IA,
            "options": {"timeout": 120000}},
            onError="continueRegularOutput", alwaysOutputData=True,
            retryOnFail=True, maxTries=2, waitBetweenTries=5000),
        node("Leer respuesta de la IA", "n8n-nodes-base.code", 2, [2060, 120], {"jsCode": js("parsear-ia.js")}),
        node("Revisar y montar CSV", "n8n-nodes-base.code", 2, [2300, 100], {"jsCode": js("salida.js")}),
        c.gate("¿Email activo?", "enviar_email", [2520, 0]),
        c.gate("¿Telegram activo?", "enviar_telegram", [2520, 220]),
        c.email([2760, 0], attachments="fichas"),
        c.telegram_text([2760, 220]),
    ]
    conns = link(
        ("Generar fichas ahora", "Configuración"), ("Cada lunes a las 9:00", "Configuración"),
        ("Configuración", "¿De dónde saco el catálogo?"),
        ("¿De dónde saco el catálogo?", "Catálogo de ejemplo", 0),
        ("¿De dónde saco el catálogo?", "Descargar CSV", 1),
        ("¿De dónde saco el catálogo?", "Productos Shopify", 2),
        ("¿De dónde saco el catálogo?", "Productos WooCommerce", 3),
        ("Descargar CSV", "Leer CSV"),
        ("Productos Shopify", "Normalizar Shopify"),
        ("Productos WooCommerce", "Normalizar WooCommerce"),
        ("Catálogo de ejemplo", "Preparar productos"), ("Leer CSV", "Preparar productos"),
        ("Normalizar Shopify", "Preparar productos"), ("Normalizar WooCommerce", "Preparar productos"),
        ("Preparar productos", "¿Hay productos pendientes?"),
        ("¿Hay productos pendientes?", "¿Con qué motor escribo?", 0),
        ("¿Hay productos pendientes?", "Revisar y montar CSV", 1),
        ("¿Con qué motor escribo?", "Escribir fichas (plantilla)", 0),
        ("¿Con qué motor escribo?", "Pedir la ficha a la IA", 1),
        ("Pedir la ficha a la IA", "Leer respuesta de la IA"),
        ("Escribir fichas (plantilla)", "Revisar y montar CSV"),
        ("Leer respuesta de la IA", "Revisar y montar CSV"),
        ("Revisar y montar CSV", "¿Email activo?"), ("Revisar y montar CSV", "¿Telegram activo?"),
        ("¿Email activo?", "Enviar email", 0), ("¿Telegram activo?", "Enviar a Telegram", 0),
    )
    return c.workflow("Denoro — Fichas de producto con IA", nodes, conns)


if __name__ == "__main__":
    destino = AQUI / "workflow.json"
    wf = fichas()
    destino.write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{destino.relative_to(AQUI.parent)}: {len(wf['nodes'])} nodos")
