# Fichas de producto en bloque

Convierte un catálogo sin descripciones en fichas listas para publicar: título SEO,
meta descripción, lista de características, descripción en HTML, palabras clave y
texto alternativo de imagen. Sale un CSV que se importa tal cual en la tienda.

## Qué resuelve

Una tienda con cientos de referencias suele tener el mismo problema: productos dados de alta
con el nombre del proveedor y poco más. Esto escribe todas las fichas de una pasada a partir de los
datos que ya tiene cada producto y deja marcado lo que conviene repasar.

## De dónde lee el catálogo

| `fuente` | Qué hace |
|---|---|
| `demo` | 24 productos de ejemplo, para probarlo sin conectar nada |
| `csv` | Descarga un CSV por URL (`;` o `,`, con o sin comillas) |
| `shopify` | Todos los productos vía credencial de Shopify |
| `woocommerce` | Todos los productos vía credencial de WooCommerce |

En el CSV basta con una columna de referencia (`sku`, `referencia`, `codigo`…) y otra de nombre
(`nombre`, `titulo`, `name`…). **El resto de columnas se usan como características del producto**,
así que cuantas más traiga el catálogo, mejor queda la ficha. Hay un ejemplo en `ejemplos/catalogo.csv`.

## Dos motores

- **`plantilla`** (por defecto): escribe la ficha a partir de los datos del producto, sin llamar a
  ninguna API. No cuesta nada, tarda milisegundos y **por construcción no puede inventarse nada**.
  Las entradillas y los cierres varían según la referencia, así que un catálogo entero no suena
  a la misma frase repetida.
- **`openai`**: manda cada producto al modelo que elijas con instrucciones estrictas de no inventar
  datos. Necesita la credencial *OpenAi account* en el nodo **Pedir la ficha a la IA**.
  Si una respuesta viene rota o la API devuelve un error, ese producto se marca con el motivo y el resto sigue.
  Usa la clave de OpenAI del cliente, que paga su propio consumo. Los tests cubren este motor con respuestas
  simuladas; con una clave real conviene probar primero con `max_productos` bajo.

## La revisión automática

Antes de dar una ficha por buena se comprueba que:

- el título cabe en `largo_titulo` (60 por defecto) y la meta en `largo_meta` (155);
- hay entre 3 y 5 características, al menos 3 palabras clave y texto alternativo de imagen;
- el HTML solo usa etiquetas permitidas (`p`, `ul`, `li`, `strong`, `em`, `h2`, `h3`, `br`);
- **ningún número aparece en la ficha si no estaba en los datos del producto**. Es la comprobación
  que impide que el texto se invente medidas, garantías o plazos de envío;
- no queda texto de relleno (`lorem`, `TODO`, `[...]`).

Lo que no pasa el corte no se descarta: sale en el email y en la última columna del CSV con el motivo.

## Configuración

Todo está en el bloque `CONFIG` del nodo **Configuración**:

| Campo | Para qué |
|---|---|
| `fuente`, `csv_url` | De dónde sale el catálogo |
| `idioma` | `es` o `en` |
| `tono` | `cercano`, `tecnico` o `premium` |
| `motor`, `modelo` | `plantilla` (gratis) u `openai` |
| `max_productos` | Tope por ejecución: protege la factura de la API |
| `solo_sin_descripcion`, `descripcion_corta` | Trabajar solo sobre lo que falta |
| `palabras_clave_extra` | Términos que colar si encajan |
| `email_to`, `telegram_chat_id` | Dónde llega el resultado (vacío = canal apagado) |

## Cómo se usa

1. Importa `workflow.json` en n8n.
2. Edita el bloque `CONFIG`.
3. Elige credenciales en *Enviar email* y *Enviar a Telegram* (y en *Pedir la ficha a la IA* si usas `openai`).
4. En *Settings → Error workflow*, elige **Denoro — Avisos de error**.
5. Pulsa **Generar fichas ahora**. También corre solo los lunes a las 9:00 para las altas nuevas.

## Desarrollo

El código de los nodos Code vive en `src/`; `workflow.json` se genera, no se edita a mano:

```bash
python3 fichas-producto/build.py     # regenera el workflow
node fichas-producto/test/test_fichas.js   # 203 comprobaciones
```
