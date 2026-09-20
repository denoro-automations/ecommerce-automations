#!/usr/bin/env python3
"""Genera el workflow del sincronizador de stock. Uso: python stock-proveedor/build.py"""
import importlib.util
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("common", AQUI.parent / "comun" / "common.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
c.usar(AQUI)
node, sticky, link, js = c.node, c.sticky, c.link, c.js

CUERPO_SHOPIFY = ("={{ JSON.stringify({ location_id: Number($json.location_id), "
                  "inventory_item_id: $json.inventory_item_id, available: $json.despues }) }}")


def stock():
    nodes = [
        sticky("Nota: cómo usarlo", [-520, -380], (
            "## Stock del proveedor · Denoro\n"
            "1. Edita el bloque **CONFIGURACIÓN**: `fuente` (demo o url), `feed_url` y `destino`.\n"
            "2. **Empieza con `modo_prueba: true`**: calcula todos los cambios y te los manda, "
            "pero no toca la tienda. Cuando el parte te cuadre, ponlo a `false`.\n"
            "3. Shopify necesita además `dominio_shopify` y `location_id` (el almacén).\n"
            "4. Los frenos (`min_referencias`, `max_cambios_pct`, `max_agotados_pct`) "
            "paran la sincronización si el feed llega roto. Son la red de seguridad: no los quites.\n"
            "5. Los precios **solo se informan**; el precio de venta no se toca nunca solo.\n"
            "6. *Settings → Error workflow*: **Denoro — Avisos de error**."), w=520, h=400, color=5),
        node("Sincronizar ahora", "n8n-nodes-base.manualTrigger", 1, [0, 0], {}),
        node("Cada 4 horas", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 200],
             {"rule": {"interval": [{"field": "hours", "hoursInterval": 4}]}}),
        node("Configuración", "n8n-nodes-base.code", 2, [220, 100], {"jsCode": js("config.js")}),
        # --- rama 1: el feed del proveedor ---
        node("¿De dónde viene el feed?", "n8n-nodes-base.switch", 3, [460, -80], {
            "rules": {"values": [c.switch_rule(v) for v in ("demo", "url")]}, "options": {}}),
        node("Feed de ejemplo", "n8n-nodes-base.code", 2, [700, -180], {"jsCode": js("demo-feed.js")}),
        node("Descargar feed", "n8n-nodes-base.httpRequest", 4.2, [700, -20], {
            "url": "={{ $json.feed_url }}",
            "options": {"response": {"response": {"responseFormat": "text", "outputPropertyName": "data"}},
                        "timeout": 60000}},
            retryOnFail=True, maxTries=3, waitBetweenTries=10000),
        node("Leer feed", "n8n-nodes-base.code", 2, [920, -20], {"jsCode": js("leer-feed.js")}),
        # --- rama 2: la foto de la tienda ---
        node("¿Dónde está la tienda?", "n8n-nodes-base.switch", 3, [460, 280], {
            "rules": {"values": [c.switch_rule(v, "destino") for v in ("demo", "shopify", "woocommerce")]},
            "options": {}}),
        node("Catálogo de ejemplo", "n8n-nodes-base.code", 2, [700, 180], {"jsCode": js("demo-tienda.js")}),
        node("Productos Shopify", "n8n-nodes-base.shopify", 1, [700, 340], {
            "authentication": "accessToken", "resource": "product", "operation": "getAll",
            "returnAll": True, "additionalFields": {}},
            alwaysOutputData=True, retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar tienda (Shopify)", "n8n-nodes-base.code", 2, [920, 340],
             {"jsCode": js("normalizar-tienda-shopify.js")}),
        node("Productos WooCommerce", "n8n-nodes-base.wooCommerce", 1, [700, 500], {
            "resource": "product", "operation": "getAll", "returnAll": True, "options": {}},
            alwaysOutputData=True, retryOnFail=True, maxTries=3, waitBetweenTries=5000),
        node("Normalizar tienda (Woo)", "n8n-nodes-base.code", 2, [920, 500],
             {"jsCode": js("normalizar-tienda-woo.js")}),
        # --- comparación ---
        c.merge("Juntar feed y tienda", [1180, 140]),
        node("Comparar con la tienda", "n8n-nodes-base.code", 2, [1400, 140], {"jsCode": js("comparar.js")}),
        c.gate("¿Aplico los cambios?", "aplicar", [1620, 140]),
        node("Preparar actualizaciones", "n8n-nodes-base.code", 2, [1840, 20],
             {"jsCode": js("preparar-actualizacion.js")}),
        node("¿Qué tienda actualizo?", "n8n-nodes-base.switch", 3, [2060, 20], {
            "rules": {"values": [c.switch_rule(v, "destino") for v in ("demo", "shopify", "woocommerce")]},
            "options": {}}),
        node("Simular cambios", "n8n-nodes-base.code", 2, [2300, -120], {"jsCode": js("simular.js")}),
        node("Ajustar stock en Shopify", "n8n-nodes-base.httpRequest", 4.2, [2300, 20], {
            "method": "POST",
            "url": "=https://{{ $json.dominio_shopify }}/admin/api/2024-10/inventory_levels/set.json",
            "authentication": "predefinedCredentialType",
            "nodeCredentialType": "shopifyAccessTokenApi",
            "sendBody": True, "specifyBody": "json", "jsonBody": CUERPO_SHOPIFY,
            "options": {"timeout": 30000}},
            onError="continueRegularOutput", alwaysOutputData=True,
            retryOnFail=True, maxTries=2, waitBetweenTries=3000),
        node("Ajustar stock en WooCommerce", "n8n-nodes-base.wooCommerce", 1, [2300, 180], {
            "resource": "product", "operation": "update",
            "productId": "={{ $json.id_tienda }}",
            "updateFields": {"stockQuantity": "={{ $json.despues }}"}},
            onError="continueRegularOutput", alwaysOutputData=True,
            retryOnFail=True, maxTries=2, waitBetweenTries=3000),
        node("Recoger resultados", "n8n-nodes-base.code", 2, [2540, 20], {"jsCode": js("recoger.js")}),
        node("Sin cambios", "n8n-nodes-base.code", 2, [1840, 280], {"jsCode": js("sin-cambios.js")}),
        node("Montar informe", "n8n-nodes-base.code", 2, [2780, 140], {"jsCode": js("informe.js")}),
        c.gate("¿Email activo?", "enviar_email", [3000, 40]),
        c.gate("¿Telegram activo?", "enviar_telegram", [3000, 260]),
        c.email([3240, 40], attachments="cambios"),
        c.telegram_text([3240, 260]),
    ]
    conns = link(
        ("Sincronizar ahora", "Configuración"), ("Cada 4 horas", "Configuración"),
        ("Configuración", "¿De dónde viene el feed?"), ("Configuración", "¿Dónde está la tienda?"),
        ("¿De dónde viene el feed?", "Feed de ejemplo", 0),
        ("¿De dónde viene el feed?", "Descargar feed", 1),
        ("Descargar feed", "Leer feed"),
        ("Feed de ejemplo", "Juntar feed y tienda", 0, 0),
        ("Leer feed", "Juntar feed y tienda", 0, 0),
        ("¿Dónde está la tienda?", "Catálogo de ejemplo", 0),
        ("¿Dónde está la tienda?", "Productos Shopify", 1),
        ("¿Dónde está la tienda?", "Productos WooCommerce", 2),
        ("Productos Shopify", "Normalizar tienda (Shopify)"),
        ("Productos WooCommerce", "Normalizar tienda (Woo)"),
        ("Catálogo de ejemplo", "Juntar feed y tienda", 0, 1),
        ("Normalizar tienda (Shopify)", "Juntar feed y tienda", 0, 1),
        ("Normalizar tienda (Woo)", "Juntar feed y tienda", 0, 1),
        ("Juntar feed y tienda", "Comparar con la tienda"),
        ("Comparar con la tienda", "¿Aplico los cambios?"),
        ("¿Aplico los cambios?", "Preparar actualizaciones", 0),
        ("¿Aplico los cambios?", "Sin cambios", 1),
        ("Preparar actualizaciones", "¿Qué tienda actualizo?"),
        ("¿Qué tienda actualizo?", "Simular cambios", 0),
        ("¿Qué tienda actualizo?", "Ajustar stock en Shopify", 1),
        ("¿Qué tienda actualizo?", "Ajustar stock en WooCommerce", 2),
        ("Simular cambios", "Recoger resultados"),
        ("Ajustar stock en Shopify", "Recoger resultados"),
        ("Ajustar stock en WooCommerce", "Recoger resultados"),
        ("Recoger resultados", "Montar informe"), ("Sin cambios", "Montar informe"),
        ("Montar informe", "¿Email activo?"), ("Montar informe", "¿Telegram activo?"),
        ("¿Email activo?", "Enviar email", 0), ("¿Telegram activo?", "Enviar a Telegram", 0),
    )
    return c.workflow("Denoro — Stock del proveedor", nodes, conns)


if __name__ == "__main__":
    destino = AQUI / "workflow.json"
    wf = stock()
    destino.write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{destino.relative_to(AQUI.parent)}: {len(wf['nodes'])} nodos")
