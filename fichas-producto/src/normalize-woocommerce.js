// Deja los productos de WooCommerce con la misma forma que el resto de fuentes.
const cfg = $('Configuración').first().json;
const limpiar = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const salida = [];
for (const item of $input.all()) {
  const p = item.json;
  const atributos = {};
  for (const a of p.attributes || []) {
    const vals = (a.options || []).filter(Boolean);
    if (a.name && vals.length) atributos[String(a.name).toLowerCase()] = vals.join(', ');
  }
  if (p.weight) atributos.peso = `${p.weight} kg`;
  const d = p.dimensions || {};
  if (d.length && d.width) atributos.medidas = `${d.length} × ${d.width}${d.height ? ` × ${d.height}` : ''} cm`;
  salida.push({ json: {
    sku: p.sku || String(p.id),
    id_tienda: p.id,
    titulo: p.name || '',
    marca: (p.brands && p.brands[0] && p.brands[0].name) || '',
    categoria: (p.categories || []).map((c) => c.name).join(', '),
    precio: p.price != null && p.price !== '' ? parseFloat(p.price) : null,
    moneda: cfg.moneda || 'EUR',
    stock: p.stock_quantity ?? null,
    url: p.permalink || '',
    descripcion: limpiar(p.description || p.short_description),
    atributos,
  } });
}
if (!salida.length) throw new Error('WooCommerce no devolvió productos: revisa la credencial y que haya catálogo');
return salida;
