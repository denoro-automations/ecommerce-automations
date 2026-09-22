# Stock del proveedor → tienda

Lee el feed del proveedor (CSV o XML), lo compara con el catálogo de la tienda y ajusta
las existencias. Manda un parte con todo lo que ha cambiado (si no ha cambiado nada, no manda nada)
y **se bloquea solo** si el feed llega mal, que es el accidente caro de esta automatización.

## Qué resuelve

Quien revende no controla su stock: lo controla su proveedor. Cuando esa cifra se copia a mano
(o no se copia), la tienda vende lo que no tiene y deja de vender lo que sí. Esto lo mantiene
al día cada pocas horas.

## Lo que la hace segura

Una sincronización automática puede vaciar una tienda entera si el proveedor publica un feed
truncado. Antes de tocar nada se comprueba que:

| Freno | Qué evita |
|---|---|
| `min_referencias` | Un feed cortado a medias que dejaría media tienda sin stock |
| `max_cambios_pct` | Un feed con otro formato de unidades que cambiaría casi todo el catálogo |
| `max_agotados_pct` | El caso clásico: el proveedor publica ceros por un error de su ERP |
| `margen_stock` | Colchón de unidades: si el proveedor dice 5 y el margen es 2, se publican 3 |

Si salta alguno, **no se aplica nada** y el parte explica el motivo con las cifras exactas.

Además, por diseño:

- Una referencia que **no viene en el feed nunca se toca** (podría ser un fallo del proveedor);
  sale informada en el parte.
- Los **precios no se tocan jamás** de forma automática. Solo se avisa cuando el proveedor mueve
  su precio de coste respecto a la sincronización anterior, con el porcentaje.
- Los productos con el stock sin gestionar en la tienda se saltan.
- `modo_prueba: true` (así viene de fábrica) calcula todo y lo manda, sin escribir en la tienda.

## Formatos de feed que entiende

- **CSV** con `;` o `,`, con o sin comillas. Columnas reconocidas por nombre: `sku`/`referencia`/`ref`/`codigo`/`ean`/`mpn`, `stock`/`existencias`/`cantidad`/`qty`/`availability`, `precio`/`price`/`pvp`, `nombre`/`title`.
- **XML** con bloques `<item>`, `<product>`, `<producto>`, `<entry>` o `<articulo>`, incluido CDATA y el prefijo `g:` de los feeds de Google Shopping.
- Números en formato español (`1.234,50`) e inglés (`1,234.50`).
- `in stock` / `out of stock` / `agotado` como forma de decir la disponibilidad.

Hay ejemplos de los dos en `ejemplos/`.

## Dónde escribe

| `destino` | Cómo ajusta el stock |
|---|---|
| `demo` | No toca nada: simula los cambios (para enseñar el flujo) |
| `shopify` | `POST /admin/api/2024-10/inventory_levels/set.json` sobre el `location_id` indicado |
| `woocommerce` | Actualiza `stock_quantity` del producto |

Si un ajuste falla, los demás siguen y el fallido sale en el parte y en el CSV con su error.

## Cómo se usa

1. Importa `workflow.json` en n8n.
2. Edita el bloque `CONFIG`: `fuente`, `feed_url`, `destino` y (en Shopify) `dominio_shopify` y `location_id`.
3. Déjalo en `modo_prueba: true` unos días. Cuando el parte te cuadre, ponlo a `false`.
4. Elige credenciales en *Enviar email* y *Enviar a Telegram*.
5. *Settings → Error workflow*: **Denoro — Avisos de error**.

Corre cada 4 horas y también a mano con **Sincronizar ahora**.

## Desarrollo

```bash
python3 stock-proveedor/build.py          # regenera el workflow
node stock-proveedor/test/test_stock.js   # 81 comprobaciones
```
