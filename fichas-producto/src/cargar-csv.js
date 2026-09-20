// Convierte el CSV descargado en productos. Acepta ; o , como separador y comillas dobles.
const cfg = $('Configuración').first().json;
const entrada = $input.first();
let texto = entrada.json.data ?? entrada.json.body ?? entrada.json.texto ?? '';
if (!texto && entrada.binary) {
  const key = Object.keys(entrada.binary)[0];
  texto = Buffer.from(entrada.binary[key].data, 'base64').toString('utf8');
}
texto = String(texto).replace(/^﻿/, '').trim();
if (!texto) throw new Error('El CSV llegó vacío: revisa csv_url en el nodo Configuración');

// --- lector de CSV con comillas ---
const filas = [];
let campo = '';
let fila = [];
let comillas = false;
const sep = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
for (let i = 0; i < texto.length; i++) {
  const c = texto[i];
  if (comillas) {
    if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
    else if (c === '"') comillas = false;
    else campo += c;
  } else if (c === '"') comillas = true;
  else if (c === sep) { fila.push(campo); campo = ''; }
  else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
  else if (c !== '\r') campo += c;
}
if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
if (filas.length < 2) throw new Error('El CSV no tiene filas de datos (solo cabecera o nada)');

const norm = (s) => String(s).trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const cabecera = filas[0].map(norm);
const ALIAS = {
  sku: ['sku', 'referencia', 'ref', 'codigo', 'id'],
  titulo: ['titulo', 'title', 'nombre', 'name', 'producto'],
  marca: ['marca', 'brand', 'fabricante'],
  categoria: ['categoria', 'category', 'tipo', 'familia'],
  precio: ['precio', 'price', 'pvp'],
  stock: ['stock', 'existencias', 'inventario', 'cantidad', 'qty'],
  descripcion: ['descripcion', 'description', 'descripcion_larga', 'body_html'],
  url: ['url', 'enlace', 'link', 'permalink'],
};
const idx = {};
for (const [campoDestino, nombres] of Object.entries(ALIAS)) {
  const i = cabecera.findIndex((h) => nombres.includes(h));
  if (i >= 0) idx[campoDestino] = i;
}
if (idx.sku === undefined) throw new Error(`El CSV necesita una columna de referencia (sku, referencia o codigo). Encontradas: ${cabecera.join(', ')}`);
if (idx.titulo === undefined) throw new Error(`El CSV necesita una columna de título (titulo, nombre o name). Encontradas: ${cabecera.join(', ')}`);
const usadas = new Set(Object.values(idx));

const numero = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9,.\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const productos = [];
const vistos = new Set();
for (const f of filas.slice(1)) {
  if (!f.some((v) => String(v).trim() !== '')) continue;
  const sku = String(f[idx.sku] ?? '').trim();
  if (!sku || vistos.has(sku)) continue;
  vistos.add(sku);
  // el resto de columnas entran como atributos, que es lo que da detalle a la ficha
  const atributos = {};
  cabecera.forEach((h, i) => {
    if (!usadas.has(i) && h && String(f[i] ?? '').trim()) atributos[h] = String(f[i]).trim();
  });
  productos.push({
    sku,
    titulo: String(f[idx.titulo] ?? '').trim(),
    marca: idx.marca !== undefined ? String(f[idx.marca] ?? '').trim() : '',
    categoria: idx.categoria !== undefined ? String(f[idx.categoria] ?? '').trim() : '',
    precio: idx.precio !== undefined ? numero(f[idx.precio]) : null,
    moneda: cfg.moneda || 'EUR',
    stock: idx.stock !== undefined ? numero(f[idx.stock]) : null,
    url: idx.url !== undefined ? String(f[idx.url] ?? '').trim() : '',
    descripcion: idx.descripcion !== undefined ? String(f[idx.descripcion] ?? '').trim() : '',
    atributos,
  });
}
if (!productos.length) throw new Error('El CSV no trajo ningún producto con referencia');
return productos.map((p) => ({ json: p }));
