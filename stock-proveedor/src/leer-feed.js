// Lee el feed del proveedor. Acepta CSV (con ; o ,) y XML, y detecta cuál es por el contenido.
const cfg = $('Configuración').first().json;
const entrada = $input.first();
let texto = entrada.json.data ?? entrada.json.body ?? '';
if (!texto && entrada.binary) {
  const key = Object.keys(entrada.binary)[0];
  texto = Buffer.from(entrada.binary[key].data, 'base64').toString('utf8');
}
texto = String(texto).replace(/^\uFEFF/, '').trim();
if (!texto) throw new Error('El feed del proveedor llegó vacío: revisa feed_url en el nodo Configuración');

const numero = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  // "1.234,56" -> 1234.56 ; "1,234.56" -> 1234.56 ; "12,5" -> 12.5
  const limpio = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = parseFloat(limpio.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const clave = (s) => String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/^g:/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const ALIAS = {
  sku: ['sku', 'referencia', 'ref', 'codigo', 'id', 'mpn', 'ean', 'item_id'],
  stock: ['stock', 'existencias', 'inventario', 'cantidad', 'qty', 'quantity', 'availability', 'disponibilidad'],
  precio: ['precio', 'price', 'pvp', 'sale_price', 'precio_venta'],
  titulo: ['titulo', 'title', 'nombre', 'name', 'descripcion_corta'],
};
const deAlias = (obj) => {
  const out = {};
  for (const [destino, nombres] of Object.entries(ALIAS)) {
    const k = Object.keys(obj).find((h) => nombres.includes(h));
    if (k !== undefined) out[destino] = obj[k];
  }
  return out;
};
// "in stock" / "out of stock" también son formas válidas de decir el stock
const stockDe = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  if (/^(out of stock|agotado|sin stock|no|false|0)$/.test(s)) return 0;
  if (/^(in stock|disponible|si|sí|true)$/.test(s)) return null; // disponible pero sin cantidad
  return numero(s);
};

let filas = [];
if (texto.startsWith('<')) {
  // ---- XML: se buscan los bloques que se repiten (item, product, entry, producto) ----
  const bloques = texto.match(/<(item|product|producto|entry|articulo)\b[\s\S]*?<\/\1>/gi) || [];
  if (!bloques.length) throw new Error('El XML no trae bloques <item>, <product> o <entry>');
  filas = bloques.map((bloque) => {
    // fuera la etiqueta que envuelve el bloque, o se leería el producto entero como un solo campo
    const b = bloque.replace(/^<[a-z0-9:_\-]+(?:\s[^>]*)?>/i, '').replace(/<\/[a-z0-9:_\-]+>\s*$/i, '');
    const campos = {};
    for (const m of b.matchAll(/<([a-z0-9:_\-]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)) {
      const valor = m[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim();
      const k = clave(m[1]);
      if (valor && campos[k] === undefined) campos[k] = valor;
    }
    return campos;
  });
} else {
  // ---- CSV ----
  const primera = texto.split('\n')[0];
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  const celdas = [];
  let campo = ''; let fila = []; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n') { fila.push(campo); celdas.push(fila); fila = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo !== '' || fila.length) { fila.push(campo); celdas.push(fila); }
  if (celdas.length < 2) throw new Error('El CSV del proveedor no tiene filas de datos');
  const cabecera = celdas[0].map(clave);
  filas = celdas.slice(1).map((f) => Object.fromEntries(cabecera.map((h, i) => [h, f[i]])));
}

const salida = [];
const vistos = new Set();
for (const cruda of filas) {
  const c = deAlias(cruda);
  const sku = String(c.sku ?? '').trim();
  if (!sku || vistos.has(sku)) continue;
  vistos.add(sku);
  const stock = stockDe(c.stock);
  salida.push({ json: {
    _lado: 'feed', sku,
    titulo: c.titulo ? String(c.titulo).trim() : '',
    stock: stock === null ? null : Math.max(0, Math.round(stock)),
    precio: numero(c.precio),
    proveedor: cfg.proveedor,
  } });
}
if (!salida.length) {
  throw new Error(`El feed no trajo ninguna referencia reconocible. Columnas vistas: ${Object.keys(filas[0] || {}).join(', ') || '(ninguna)'}`);
}
return salida;
