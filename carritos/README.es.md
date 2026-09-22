# Carritos abandonados

Revisa cada media hora los carritos que se quedaron a medias, escribe al comprador
siguiendo una secuencia configurable y lleva la cuenta de cuánto se recupera.

## Qué resuelve

Muchos carritos de una tienda online se quedan a medias. Un aviso a tiempo puede traer de vuelta
una parte, y es de las pocas automatizaciones cuyo resultado se mide en euros: el resumen dice
cuántos carritos volvieron después de recibir el aviso y por cuánto.

## Cómo decide

Por cada carrito se mira cuánto tiempo lleva parado y qué avisos ya recibió:

- Si **se completó** después de haberle escrito, cuenta como **recuperado** (si se compró sin haberle
  escrito nada, es una compra normal y no se apunta el mérito).
- Si lleva más de `horas_limite`, se da por perdido y sale del seguimiento.
- Si toca más de un paso a la vez —un carrito de tres días al que nunca se escribió— se envía
  **el último**, no el primero: nadie quiere leer "¿te ayudamos a terminar?" tres días tarde.
- Los carritos de más importe se atienden primero cuando hay tope de envíos.

El estado (a quién se escribió, qué se recuperó) vive en el propio workflow, así que no hace falta
base de datos. Si duplicas o reimportas el workflow, la cuenta empieza de cero.

## Consentimiento

Con `solo_con_consentimiento: true` —como viene de fábrica— solo se escribe a quien aceptó recibir
comunicaciones. En Shopify ese dato viene en el propio checkout (`buyer_accepts_marketing`).
Todos los emails llevan en el pie la dirección de baja que configures, que es obligatoria.

Ponerlo en `false` es una decisión del cliente y conviene que quede por escrito.

## El email que ve el comprador

Lo firma **la tienda**, no Denoro: nombre, web, color de marca y remitente del dominio del cliente
(importante para no acabar en spam). Lleva las líneas del carrito con su total, el botón de vuelta
al checkout y, si el paso lo define, un código de descuento. El texto cambia según el paso.

El resumen que llega al dueño sí va con la marca Denoro, y solo sale cuando hay algo que contar
(avisos enviados, carritos recuperados o envíos fallidos): no llega un mensaje vacío cada media hora.

## De dónde saca los carritos

| `fuente` | Qué hace |
|---|---|
| `demo` | 8 carritos de ejemplo que cubren todos los casos |
| `shopify` | `GET /admin/api/2024-10/checkouts.json` (abandoned checkouts) |
| `http` | Un endpoint propio que devuelva JSON — un plugin de WooCommerce, un export… |

El lector de `http` admite varias formas de llamar a lo mismo (`cart_id`/`id`/`token`,
`customer_email`/`email`, `last_activity`/`updated_at`, fechas ISO o epoch), para no obligar
al cliente a cambiar lo que ya tiene.

## Cómo se usa

1. Importa `workflow.json` en n8n.
2. Edita el bloque `CONFIG`: tienda, web, `pasos`, `marca_color` y los remitentes.
3. Elige credenciales en *Avisar al comprador*, *Enviar resumen* y *Enviar a Telegram*.
4. *Settings → Error workflow*: **Denoro — Avisos de error**.
5. Prueba con `fuente: 'demo'` antes de apuntar a la tienda de verdad.

## Desarrollo

```bash
python3 carritos/build.py                  # regenera el workflow
node carritos/test/test_carritos.js        # 65 comprobaciones
```
