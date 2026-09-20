// Deja los "abandoned checkouts" de Shopify con la forma que usa el resto del workflow.
const cfg = $('Configuración').first().json;
const salida = [];
for (const item of $input.all()) {
  const ch = item.json;
  if (!ch || !ch.id) continue;
  const cliente = ch.customer || {};
  salida.push({ json: {
    id: String(ch.token || ch.id),
    email: (ch.email || cliente.email || '').trim().toLowerCase(),
    nombre: (ch.billing_address?.first_name || cliente.first_name || '').trim(),
    total: parseFloat(ch.total_price || 0),
    moneda: ch.currency || cfg.moneda,
    creado_en: ch.created_at,
    actualizado_en: ch.updated_at || ch.created_at,
    completado_en: ch.completed_at || null,
    // Shopify guarda el consentimiento del comprador en el propio checkout
    acepta_marketing: Boolean(ch.buyer_accepts_marketing ?? cliente.accepts_marketing),
    url_recuperacion: ch.abandoned_checkout_url || '',
    lineas: (ch.line_items || []).map((l) => ({
      titulo: l.title + (l.variant_title ? ` · ${l.variant_title}` : ''),
      unidades: l.quantity, precio: parseFloat(l.price || 0),
    })),
  } });
}
return salida;
