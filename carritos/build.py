#!/usr/bin/env python3
"""Genera el workflow de carritos abandonados. Uso: python carritos/build.py"""
import importlib.util
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("common", AQUI.parent / "comun" / "common.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
c.usar(AQUI)
node, sticky, link, js = c.node, c.sticky, c.link, c.js


def carritos():
    nodes = [
        sticky("Nota: cómo usarlo", [-520, -360], (
            "## Carritos abandonados · Denoro\n"
            "1. Edita el bloque **CONFIGURACIÓN**: `fuente`, la secuencia de `pasos` y los textos.\n"
            "2. **Consentimiento**: con `solo_con_consentimiento: true` solo se escribe a quien lo aceptó. "
            "Dejarlo en `false` es una decisión del cliente, y suya es la multa.\n"
            "3. El email lo firma **la tienda**, no Denoro: ajusta `marca_color` y `email_from` "
            "a un remitente del dominio del cliente (si no, acabará en spam).\n"
            "4. El estado (a quién se ha escrito y qué se ha recuperado) vive en el propio workflow: "
            "si lo duplicas o lo reimportas, empieza de cero.\n"
            "5. *Settings → Error workflow*: **Denoro — Avisos de error**."), w=520, h=380, color=5),
        node("Revisar ahora", "n8n-nodes-base.manualTrigger", 1, [0, 0], {}),
        node("Cada 30 minutos", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 200],
             {"rule": {"interval": [{"field": "minutes", "minutesInterval": 30}]}}),
        node("Configuración", "n8n-nodes-base.code", 2, [220, 100], {"jsCode": js("config.js")}),
        node("¿De dónde saco los carritos?", "n8n-nodes-base.switch", 3, [460, 100], {
            "rules": {"values": [c.switch_rule(v) for v in ("demo", "shopify", "http")]}, "options": {}}),
        node("Carritos de ejemplo", "n8n-nodes-base.code", 2, [700, -60], {"jsCode": js("demo-carritos.js")}),
        node("Carritos de Shopify", "n8n-nodes-base.httpRequest", 4.2, [700, 120], {
            "url": "=https://{{ $json.dominio_shopify }}/admin/api/2024-10/checkouts.json?limit=250&status=any",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "shopifyAccessTokenApi",
            "options": {"response": {"response": {"responseFormat": "json"}}, "timeout": 30000,
                        "splitIntoItems": True},
            "sendQuery": False},
            retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar Shopify", "n8n-nodes-base.code", 2, [920, 120], {"jsCode": js("normalizar-shopify.js")}),
        node("Carritos del endpoint", "n8n-nodes-base.httpRequest", 4.2, [700, 300], {
            "url": "={{ $json.carritos_url }}",
            "options": {"response": {"response": {"responseFormat": "json"}}, "timeout": 30000}},
            retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar endpoint", "n8n-nodes-base.code", 2, [920, 300], {"jsCode": js("normalizar-http.js")}),
        node("Decidir a quién escribo", "n8n-nodes-base.code", 2, [1180, 100], {"jsCode": js("decidir.js")}),
        c.gate("¿Hay avisos que mandar?", "hay_envios", [1400, 100]),
        node("Preparar avisos", "n8n-nodes-base.code", 2, [1620, 0], {"jsCode": js("email-cliente.js")}),
        c.email([1840, 0], name="Avisar al comprador", tolerante=True),
        node("Recoger envíos", "n8n-nodes-base.code", 2, [2060, 0], {"jsCode": js("recoger-envios.js")}),
        node("Sin avisos", "n8n-nodes-base.code", 2, [1620, 220], {"jsCode": js("sin-envios.js")}),
        node("Resumen para la tienda", "n8n-nodes-base.code", 2, [2300, 100], {"jsCode": js("resumen.js")}),
        c.gate("¿Email activo?", "enviar_email", [2520, 0]),
        c.gate("¿Telegram activo?", "enviar_telegram", [2520, 220]),
        c.email([2760, 0], name="Enviar resumen"),
        c.telegram_text([2760, 220]),
    ]
    conns = link(
        ("Revisar ahora", "Configuración"), ("Cada 30 minutos", "Configuración"),
        ("Configuración", "¿De dónde saco los carritos?"),
        ("¿De dónde saco los carritos?", "Carritos de ejemplo", 0),
        ("¿De dónde saco los carritos?", "Carritos de Shopify", 1),
        ("¿De dónde saco los carritos?", "Carritos del endpoint", 2),
        ("Carritos de Shopify", "Normalizar Shopify"),
        ("Carritos del endpoint", "Normalizar endpoint"),
        ("Carritos de ejemplo", "Decidir a quién escribo"),
        ("Normalizar Shopify", "Decidir a quién escribo"),
        ("Normalizar endpoint", "Decidir a quién escribo"),
        ("Decidir a quién escribo", "¿Hay avisos que mandar?"),
        ("¿Hay avisos que mandar?", "Preparar avisos", 0),
        ("¿Hay avisos que mandar?", "Sin avisos", 1),
        ("Preparar avisos", "Avisar al comprador"),
        ("Avisar al comprador", "Recoger envíos"),
        ("Recoger envíos", "Resumen para la tienda"), ("Sin avisos", "Resumen para la tienda"),
        ("Resumen para la tienda", "¿Email activo?"), ("Resumen para la tienda", "¿Telegram activo?"),
        ("¿Email activo?", "Enviar resumen", 0), ("¿Telegram activo?", "Enviar a Telegram", 0),
    )
    return c.workflow("Denoro — Carritos abandonados", nodes, conns)


if __name__ == "__main__":
    destino = AQUI / "workflow.json"
    wf = carritos()
    destino.write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{destino.relative_to(AQUI.parent)}: {len(wf['nodes'])} nodos")
