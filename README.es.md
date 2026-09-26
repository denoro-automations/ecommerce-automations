# Automatizaciones de e-commerce · Denoro

Cinco automatizaciones de n8n listas para poner en marcha en una tienda online.
Cada una trae su workflow, su modo de prueba sin conectar nada, sus tests y su documentación.
Las otras dos del catálogo tienen su propio repositorio:
[price-monitor](https://github.com/denoro-automations/price-monitor) y
[weekly-report](https://github.com/denoro-automations/weekly-report).

| Automatización | Qué hace | Cada |
|---|---|---|
| [Fichas de producto en bloque](fichas-producto/) | Convierte un catálogo sin descripciones en títulos SEO, metas y fichas en HTML, listas para importar. Motor de plantilla gratis, u OpenAI con tu propia clave | A mano o los lunes |
| [Stock del proveedor](stock-proveedor/) | Sincroniza las existencias del feed CSV o XML del proveedor con Shopify o WooCommerce, y se para sola si el feed llega roto | 4 horas |
| [Carritos abandonados](carritos/) | Secuencia de avisos a quien dio su consentimiento, firmada por la tienda, y cuenta de lo recuperado | 30 minutos |
| [Vigilancia de reseñas](resenas/) | Avisa el mismo día de cada reseña negativa nueva (reseñas de WooCommerce, o páginas públicas cuyo robots.txt lo permita) y resume la semana | 2 horas / lunes |
| [Facturas y albaranes](facturas/) | Numera, calcula el IVA por tipos, genera el PDF, lo manda al cliente y deja el libro en CSV. No es software certificado Verifactu | 1 hora |

## Cómo están hechas

Todas siguen el mismo patrón, que es lo que hace que se puedan mantener:

- **Un bloque de configuración y nada más.** Todo lo que un cliente necesita tocar está en el nodo
  *Configuración*, arriba del todo, comentado. El resto del workflow no se toca.
- **La configuración se valida antes de correr.** Un destino con valor de ejemplo, un selector que
  falta o un tipo de IVA imposible paran la ejecución con un mensaje que dice qué arreglar, en vez
  de fallar tres nodos más adelante.
- **Modo demo en todas.** Con `fuente: 'demo'` funcionan de principio a fin sin conectar ninguna
  tienda: sirve para enseñarlas en una llamada y para probar cambios.
- **Los canales se apagan dejándolos vacíos.** Sin `email_to` no se manda email; sin
  `telegram_chat_id` no se manda Telegram.
- **Emails con la misma marca**: papel `#fcfcfa`, verde `#235b54`, titulares en serif. Los que ve el
  comprador (carritos, facturas) los firma **la tienda**; los resúmenes internos, Denoro.
- **Los errores avisan.** Todas se asignan al workflow *Denoro — Avisos de error*, que manda el fallo
  por email y Telegram con el nodo y el mensaje.

## El código, y por qué no se edita el JSON

Los `workflow.json` **se generan**: el código de cada nodo Code vive en `<automatización>/src/*.js`
y el montaje del workflow en `<automatización>/build.py`. Así el código se puede leer en diffs,
probar fuera de n8n y corregir en un sitio.

```bash
python3 construir.py     # regenera los 5 workflows + el de avisos de error
node probar.js           # valida los workflows y pasa los tests de los 5
```

Los tests ejecutan el código de los nodos fuera de n8n con un arnés mínimo
(`comun/test/harness.js`) que imita `$input`, `$()` y `$getWorkflowStaticData`.

## Instalación

1. En n8n: **Workflows → Import from File** y elige el `workflow.json` de la que quieras.
2. Importa también `comun/avisos-de-error.workflow.json` y asígnalo en
   *Settings → Error workflow* de cada una.
3. Edita el bloque `CONFIG` del nodo *Configuración*.
4. Elige las credenciales en los nodos de email, Telegram y tienda.
5. Pruébala con `fuente: 'demo'` antes de apuntar a datos reales.

Para el PDF de las facturas hace falta Gotenberg (si no está, la factura sale en HTML):

```bash
docker run -d -p 3000:3000 --name gotenberg gotenberg/gotenberg:8
```

## Licencia y aviso

Código de ejemplo y portfolio de [Denoro Automations](https://denoroautomations.com/).
Las automatizaciones que tocan datos de clientes (carritos, facturas) llevan avisos sobre
consentimiento y obligaciones fiscales en su propio README: conviene leerlos antes de ponerlas
en producción.
