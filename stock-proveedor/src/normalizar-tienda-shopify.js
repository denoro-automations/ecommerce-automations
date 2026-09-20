// Foto del catálogo de Shopify: una línea por variante, que es lo que tiene SKU y stock.
const salida = [];
for (const item of $input.all()) {
  const p = item.json;
  for (const v of p.variants || []) {
    if (!v.sku) continue;
    salida.push({ json: {
      _lado: 'tienda',
      sku: String(v.sku).trim(),
      titulo: (p.variants || []).length > 1 ? `${p.title} · ${v.title}` : p.title,
      stock: v.inventory_quantity ?? null,
      precio: v.price != null ? parseFloat(v.price) : null,
      id_tienda: v.id,
      inventory_item_id: v.inventory_item_id,
      gestiona_stock: v.inventory_management === 'shopify',
    } });
  }
}
if (!salida.length) throw new Error('Shopify no devolvió variantes con SKU: sin SKU no se puede casar el feed con la tienda');
return salida;
