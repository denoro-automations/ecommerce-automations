#!/usr/bin/env python3
"""Genera el workflow de vigilancia de reseñas. Uso: python resenas/build.py"""
import importlib.util
import json
import uuid
from pathlib import Path

AQUI = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("common", AQUI.parent / "comun" / "common.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
c.usar(AQUI)
node, sticky, link, js, NS = c.node, c.sticky, c.link, c.js, c.NS


def modo(nombre, valor, pos):
    return node(nombre, "n8n-nodes-base.set", 3.4, pos, {
        "assignments": {"assignments": [
            {"id": str(uuid.uuid5(NS, nombre)), "name": "modo", "value": valor, "type": "string"}]},
        "options": {}})


def campo(clave, sel, attr=""):
    """Extrae un dato de cada reseña con el selector CSS que haya configurado el cliente.
    El nodo HTTP sustituye el item por la página descargada, así que los selectores se leen
    del item emparejado del nodo anterior."""
    origen = "$('Comprobar robots.txt').item.json.sel"
    base = {"key": clave, "cssSelector": f"={{{{ {origen}.{sel} }}}}", "returnArray": True}
    if attr:
        return {**base, "returnValue": "attribute", "attribute": f"={{{{ {origen}.{attr} || 'href' }}}}"}
    return {**base, "returnValue": "text"}


def resenas():
    nodes = [
        sticky("Nota: cómo usarlo", [-540, -340], (
            "## Vigilancia de reseñas · Denoro\n"
            "1. `fuente: 'demo'` para probarlo.\n"
            "2. **Reseñas de tu tienda WooCommerce**: `fuente: 'woocommerce'`, `woo_url` y la credencial "
            "de WooCommerce en el nodo *Reseñas WooCommerce*.\n"
            "3. **Páginas públicas de opiniones**: `fuente: 'web'` y rellena **sitios** con la URL y los "
            "selectores CSS. Antes de leerlas se comprueba su robots.txt: si no lo permiten, el workflow "
            "se para y lo dice (Trustpilot, por ejemplo, no lo permite).\n"
            "4. **Cada 2 horas** busca reseñas nuevas y avisa solo de las negativas. "
            "**Los lunes a las 9:00** manda el resumen de la semana.\n"
            "5. *Settings → Error workflow*: **Denoro — Avisos de error**."), w=560, h=400, color=5),
        node("Cada 2 horas", "n8n-nodes-base.scheduleTrigger", 1.2, [0, -60],
             {"rule": {"interval": [{"field": "hours", "hoursInterval": 2}]}}),
        node("Probar ahora", "n8n-nodes-base.manualTrigger", 1, [0, 100], {}),
        node("Cada lunes a las 9:00", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 280],
             {"rule": {"interval": [{"field": "weeks", "weeksInterval": 1, "triggerAtDay": [1],
                                     "triggerAtHour": 9, "triggerAtMinute": 0}]}}),
        modo("Modo vigilancia", "vigilancia", [240, 20]),
        modo("Modo resumen", "resumen", [240, 280]),
        node("Configuración", "n8n-nodes-base.code", 2, [480, 140], {"jsCode": js("config.js")}),
        node("¿De dónde saco las reseñas?", "n8n-nodes-base.switch", 3, [700, 140], {
            "rules": {"values": [c.switch_rule(v) for v in ("demo", "web", "woocommerce")]}, "options": {}}),
        node("Reseñas de ejemplo", "n8n-nodes-base.code", 2, [940, 20], {"jsCode": js("demo-resenas.js")}),
        node("Preparar sitios", "n8n-nodes-base.code", 2, [940, 240], {"jsCode": js("preparar-sitios.js")}),
        node("Descargar robots.txt", "n8n-nodes-base.httpRequest", 4.2, [1160, 240], {
            "url": "={{ $json.robots_url }}",
            "options": {"response": {"response": {"fullResponse": True, "neverError": True, "responseFormat": "text"}},
                        "timeout": 20000},
            "sendHeaders": True,
            "headerParameters": {"parameters": [
                {"name": "User-Agent", "value": "Mozilla/5.0 (compatible; DenoroBot/1.0; +https://denoroautomations.com/)"}]}},
            onError="continueRegularOutput", alwaysOutputData=True),
        node("Comprobar robots.txt", "n8n-nodes-base.code", 2, [1380, 240], {"jsCode": js("comprobar-robots.js")}),
        node("Descargar página", "n8n-nodes-base.httpRequest", 4.2, [1600, 240], {
            "url": "={{ $json.url }}",
            "options": {"response": {"response": {"responseFormat": "text", "outputPropertyName": "data"}},
                        "timeout": 30000, "redirect": {"redirect": {}}},
            "sendHeaders": True,
            "headerParameters": {"parameters": [
                {"name": "User-Agent", "value": "Mozilla/5.0 (compatible; DenoroBot/1.0; +https://denoroautomations.com/)"},
                {"name": "Accept-Language", "value": "es-ES,es;q=0.9"}]}},
            retryOnFail=True, maxTries=3, waitBetweenTries=10000),
        node("Extraer reseñas", "n8n-nodes-base.html", 1.2, [1820, 240], {
            "operation": "extractHtmlContent",
            "dataPropertyName": "data",
            "extractionValues": {"values": [
                campo("texto", "texto"),
                campo("autor", "autor"),
                campo("puntuacion", "puntuacion", "puntuacion_attr"),
                campo("fecha", "fecha", "fecha_attr"),
            ]},
            "options": {}}),
        node("Normalizar reseñas", "n8n-nodes-base.code", 2, [2040, 240], {"jsCode": js("normalizar-web.js")}),
        node("Reseñas WooCommerce", "n8n-nodes-base.httpRequest", 4.2, [940, 460], {
            "url": "={{ $json.woo_url }}/wp-json/wc/v3/products/reviews?per_page=100&status=approved",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "wooCommerceApi",
            "options": {"response": {"response": {"responseFormat": "json"}}, "timeout": 30000}},
            retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar WooCommerce", "n8n-nodes-base.code", 2, [1160, 460], {"jsCode": js("normalizar-woo.js")}),
        node("Analizar reseñas", "n8n-nodes-base.code", 2, [2280, 140], {"jsCode": js("analizar.js")}),
        node("¿Aviso o resumen?", "n8n-nodes-base.switch", 3, [2500, 140], {
            "rules": {"values": [c.switch_rule(v, "modo") for v in ("vigilancia", "resumen")]}, "options": {}}),
        c.gate("¿Hay reseñas negativas?", "hay_avisos", [2740, 40]),
        node("Montar aviso", "n8n-nodes-base.code", 2, [2980, 40], {"jsCode": js("aviso.js")}),
        node("Montar resumen semanal", "n8n-nodes-base.code", 2, [2740, 280], {"jsCode": js("resumen-semanal.js")}),
        c.gate("¿Email activo?", "enviar_email", [3220, 100]),
        c.gate("¿Telegram activo?", "enviar_telegram", [3220, 320]),
        c.email([3460, 100]),
        c.telegram_text([3460, 320]),
    ]
    conns = link(
        ("Cada 2 horas", "Modo vigilancia"), ("Probar ahora", "Modo vigilancia"),
        ("Cada lunes a las 9:00", "Modo resumen"),
        ("Modo vigilancia", "Configuración"), ("Modo resumen", "Configuración"),
        ("Configuración", "¿De dónde saco las reseñas?"),
        ("¿De dónde saco las reseñas?", "Reseñas de ejemplo", 0),
        ("¿De dónde saco las reseñas?", "Preparar sitios", 1),
        ("¿De dónde saco las reseñas?", "Reseñas WooCommerce", 2),
        ("Reseñas WooCommerce", "Normalizar WooCommerce"), ("Normalizar WooCommerce", "Analizar reseñas"),
        ("Preparar sitios", "Descargar robots.txt"), ("Descargar robots.txt", "Comprobar robots.txt"),
        ("Comprobar robots.txt", "Descargar página"), ("Descargar página", "Extraer reseñas"),
        ("Extraer reseñas", "Normalizar reseñas"),
        ("Reseñas de ejemplo", "Analizar reseñas"), ("Normalizar reseñas", "Analizar reseñas"),
        ("Analizar reseñas", "¿Aviso o resumen?"),
        ("¿Aviso o resumen?", "¿Hay reseñas negativas?", 0),
        ("¿Aviso o resumen?", "Montar resumen semanal", 1),
        ("¿Hay reseñas negativas?", "Montar aviso", 0),
        ("Montar aviso", "¿Email activo?"), ("Montar aviso", "¿Telegram activo?"),
        ("Montar resumen semanal", "¿Email activo?"), ("Montar resumen semanal", "¿Telegram activo?"),
        ("¿Email activo?", "Enviar email", 0), ("¿Telegram activo?", "Enviar a Telegram", 0),
    )
    return c.workflow("Denoro — Vigilancia de reseñas", nodes, conns)


if __name__ == "__main__":
    destino = AQUI / "workflow.json"
    wf = resenas()
    destino.write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{destino.relative_to(AQUI.parent)}: {len(wf['nodes'])} nodos")
