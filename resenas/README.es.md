# Vigilancia de reseñas

Revisa cada dos horas las páginas donde hablan de la tienda, avisa **al momento** de cada reseña
negativa y los lunes manda un resumen con la nota media, la tendencia y de qué se queja la gente.

## Qué resuelve

Una reseña de una estrella sin respuesta se queda ahí para siempre, y la ve todo el que dude antes
de comprar. El valor no está en saberlo: está en enterarse el mismo día, cuando contestar todavía
cambia la foto.

## Dos ritmos en un solo workflow

| Cuándo | Qué manda |
|---|---|
| Cada 2 horas | Aviso **solo si hay reseñas negativas nuevas**, con el texto entero y el enlace para contestar |
| Lunes a las 9:00 | Resumen de la semana: nota media y tendencia, reparto de estrellas, temas de queja, lo mejor y lo peor |

Las reseñas ya vistas no se vuelven a avisar: el workflow guarda una huella corta de cada una
(no el texto), así que el estado no crece sin control.

## Cómo clasifica

- Si la reseña trae estrellas, **manda la nota**: por debajo de `umbral_negativa` es queja, justo en
  el umbral es neutra, por encima es elogio. Con el umbral en 3, un 3 es "regular" y no dispara aviso.
- Si no trae estrellas (un blog, un foro), se mira el texto con listas de expresiones en español.
- Las quejas se agrupan por tema —plazos de envío, atención al cliente, devoluciones, estado del
  producto, precio— que es lo que convierte doce reseñas sueltas en una conclusión accionable.

## De dónde lee

| `fuente` | Qué hace |
|---|---|
| `demo` | 12 reseñas de ejemplo repartidas en el tiempo |
| `web` | Descarga cada página de `sitios` y extrae las reseñas con los selectores CSS que le des |

Cada sitio se define con su `url`, el selector del `bloque` de cada reseña y los de `texto`,
`puntuacion`, `autor` y `fecha` (con su atributo, si la nota va en un `alt` o la fecha en un
`datetime`). Se sacan con el inspector del navegador. Entiende `Valorado con 2 de 5 estrellas`,
`2,0` y `★★☆☆☆`.

Si la página cambia de maquetación, el workflow **falla con un aviso claro** en vez de quedarse
callado diciendo que no hay reseñas.

## Antes de vigilar un sitio

Conviene mirar el `robots.txt` y las condiciones de uso de cada página, y espaciar las
descargas. El workflow se identifica con su propio `User-Agent` y respeta el ritmo de dos horas.
Cuando el sitio tenga API oficial (Trustpilot, Google Business Profile), es mejor esa vía.

## Cómo se usa

1. Importa `workflow.json` en n8n.
2. Prueba con `fuente: 'demo'` y el botón **Probar ahora**.
3. Rellena `sitios` con los selectores reales y pásalo a `fuente: 'web'`.
4. Elige credenciales en *Enviar email* y *Enviar a Telegram*.
5. *Settings → Error workflow*: **Denoro — Avisos de error**.

## Desarrollo

```bash
python3 resenas/build.py                # regenera el workflow
node resenas/test/test_resenas.js       # ~60 comprobaciones
```
