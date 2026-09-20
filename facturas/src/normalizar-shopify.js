// Pedidos de Shopify con la forma que usa el resto del workflow.
const cfg = $('Configuración').first().json;
const salida = [];
for (const item of $input.all()) {
  const o = item.json;
  if (!o || !o.id) continue;
  const dir = o.billing_address || o.shipping_address || {};
  salida.push({ json: {
    id: String(o.id),
    numero_pedido: o.order_number || o.name || o.id,
    fecha: o.processed_at || o.created_at,
    cliente: {
      nombre: [dir.first_name, dir.last_name].filter(Boolean).join(' ') || dir.company || o.email || 'Cliente',
      email: (o.email || '').trim().toLowerCase(),
      nif: (o.note_attributes || []).find((a) => /nif|cif|vat|dni/i.test(a.name))?.value || '',
      direccion: [dir.address1, dir.address2].filter(Boolean).join(', '),
      cp_poblacion: [dir.zip, dir.city].filter(Boolean).join(' '),
      pais: dir.country || 'España',
    },
    lineas: (o.line_items || []).map((l) => ({
      titulo: l.title + (l.variant_title ? ` · ${l.variant_title}` : ''),
      unidades: l.quantity,
      precio: parseFloat(l.price || 0),
      iva: l.tax_lines && l.tax_lines[0] ? Math.round(parseFloat(l.tax_lines[0].rate || 0) * 100) : null,
    })),
    envio: parseFloat(o.total_shipping_price_set?.shop_money?.amount ?? o.shipping_lines?.[0]?.price ?? 0),
    descuento: parseFloat(o.total_discounts || 0),
    moneda: o.currency || cfg.moneda,
    pagado: o.financial_status === 'paid',
  } });
}
return salida;
