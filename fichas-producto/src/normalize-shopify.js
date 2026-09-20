// Deja los productos de Shopify con la misma forma que el resto de fuentes.
const cfg = $('Configuración').first().json;
const limpiar = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const salida = [];
for (const item of $input.all()) {
  const p = item.json;
  const v = (p.variants && p.variants[0]) || {};
  const atributos = {};
  for (const op of p.options || []) {
    const vals = (op.values || []).filter(Boolean);
    if (op.name && vals.length) atributos[String(op.name).toLowerCase()] = vals.join(', ');
  }
  if (p.tags) atributos.etiquetas = String(p.tags);
  if (v.weight) atributos.peso = `${v.weight} ${v.weight_unit || 'g'}`;
  salida.push({ json: {
    sku: v.sku || String(p.id),
    id_tienda: p.id,
    titulo: p.title || '',
    marca: p.vendor || '',
    categoria: p.product_type || '',
    precio: v.price != null ? parseFloat(v.price) : null,
    moneda: cfg.moneda || 'EUR',
    stock: v.inventory_quantity ?? null,
    url: p.handle ? `https://${cfg.dominio_tienda || 'tu-tienda.myshopify.com'}/products/${p.handle}` : '',
    descripcion: limpiar(p.body_html),
    atributos,
  } });
}
if (!salida.length) throw new Error('Shopify no devolvió productos: revisa la credencial y que haya catálogo');
return salida;
