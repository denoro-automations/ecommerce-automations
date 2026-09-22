# Facturas y albaranes automáticos

Coge los pedidos pagados, les pone número correlativo, calcula el IVA por tipos, genera el PDF
con la marca de la tienda y se lo manda al cliente. Al dueño le llega el resumen con el libro
de facturas en CSV.

## Qué resuelve

Facturar a mano es la tarea que todo el mundo deja para el último día del trimestre. Automatizarla
quita ese trabajo pedido a pedido y, sobre todo, los errores de numeración, que son los que dan
problemas después.

## La numeración, que es lo delicado

- El correlativo vive en el propio workflow: `F2026-0001`, `F2026-0002`…
- **Un pedido ya facturado nunca se vuelve a numerar.** El número queda guardado contra el ID del
  pedido, así que reintentar un envío no crea una factura nueva.
- Las facturas se emiten **en orden de fecha de pedido**, para que el número siga al tiempo.
- Con `reiniciar_cada_anio` el contador vuelve a 1 en enero; sin él, la serie sigue.
- Si el envío por email falla, **la factura ya está emitida**: aparece en el resumen como
  "no salió" y está en el CSV para reenviarla a mano, con el mismo número (saltarse números es justo
  lo que no se debe hacer). No se reintenta sola.

> No dupliques ni reimportes el workflow con facturas ya emitidas: el contador empezaría de cero
> y saldrían números repetidos.

## Las cuentas

- `precios_con_iva: true` (lo normal en e-commerce español) significa que el precio de la tienda ya
  lleva el IVA dentro: la base se calcula hacia atrás y el total de la factura coincide **al céntimo**
  con lo que pagó el cliente.
- Cada línea puede llevar su propio tipo; el desglose sale agrupado por tipo (21 %, 10 %, 4 %).
- El descuento se reparte entre las líneas según su peso, para que el IVA de cada tipo salga bien.
- Los gastos de envío entran como una línea más.

## El documento

PDF A4 con la estética de la web: papel, verde de marca, titulares en serif. Lleva lo que una factura
necesita en España —número, fecha, emisor con NIF y domicilio, destinatario (con NIF si es empresa),
conceptos, base, tipo y cuota de IVA, y total—. Con `documento: 'ambos'` el mismo PDF trae una segunda
página de albarán, igual pero sin importes.

El PDF lo genera **Gotenberg** (`docker run -d -p 3000:3000 gotenberg/gotenberg:8`). Si no responde,
la factura se envía en HTML y el resumen lo avisa, antes que no mandar nada.

## Cómo se usa

1. Importa `workflow.json` en n8n.
2. Rellena `emisor` con los datos fiscales reales y ajusta `serie`, `iva` y `precios_con_iva`.
3. Arranca Gotenberg.
4. Elige credenciales en *Enviar factura al cliente*, *Enviar resumen* y *Enviar a Telegram*.
5. *Settings → Error workflow*: **Denoro — Avisos de error**.
6. Pruébalo con `fuente: 'demo'` y mira el PDF antes de apuntar a la tienda.

Corre cada hora y también a mano con **Facturar ahora**.

## Aviso: Verifactu y asesoría

No es un software certificado Verifactu: no genera el registro de facturación, la huella encadenada
ni el QR, ni envía nada a la AEAT. El sistema Verifactu será obligatorio desde el 1 de enero de 2027
para quienes tributan por el Impuesto sobre Sociedades y desde el 1 de julio de 2027 para el resto;
hasta entonces esto numera y documenta bien, y a partir de ahí hace falta encajarlo con un programa
de facturación certificado o con la asesoría. Tampoco sustituye a una asesoría: el cliente es
responsable de sus obligaciones fiscales, de los tipos que aplica y de conservar sus facturas.

## Desarrollo

```bash
python3 facturas/build.py                  # regenera el workflow
node facturas/test/test_facturas.js        # 481 comprobaciones
```
