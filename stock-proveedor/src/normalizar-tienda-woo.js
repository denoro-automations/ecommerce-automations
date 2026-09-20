// Foto del catálogo de WooCommerce.
const salida = [];
for (const item of $input.all()) {
  const p = item.json;
  if (!p.sku) continue;
  salida.push({ json: {
    _lado: 'tienda',
    sku: String(p.sku).trim(),
    titulo: p.name || '',
    stock: p.stock_quantity ?? null,
    precio: p.price != null && p.price !== '' ? parseFloat(p.price) : null,
    id_tienda: p.id,
    gestiona_stock: p.manage_stock !== false,
  } });
}
if (!salida.length) throw new Error('WooCommerce no devolvió productos con SKU: sin SKU no se puede casar el feed con la tienda');
return salida;
