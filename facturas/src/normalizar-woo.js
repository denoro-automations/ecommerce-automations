// Pedidos de WooCommerce con la forma que usa el resto del workflow.
const cfg = $('Configuración').first().json;
const salida = [];
for (const item of $input.all()) {
  const o = item.json;
  if (!o || !o.id) continue;
  const b = o.billing || {};
  const meta = (o.meta_data || []).find((m) => /nif|cif|vat|dni/i.test(m.key));
  salida.push({ json: {
    id: String(o.id),
    numero_pedido: o.number || o.id,
    fecha: o.date_paid || o.date_created,
    cliente: {
      nombre: [b.first_name, b.last_name].filter(Boolean).join(' ') || b.company || 'Cliente',
      email: (b.email || '').trim().toLowerCase(),
      nif: (meta && String(meta.value)) || '',
      direccion: [b.address_1, b.address_2].filter(Boolean).join(', '),
      cp_poblacion: [b.postcode, b.city].filter(Boolean).join(' '),
      pais: b.country || 'España',
    },
    lineas: (o.line_items || []).map((l) => ({
      titulo: l.name,
      unidades: l.quantity,
      precio: l.quantity ? Math.round((parseFloat(l.total || 0) + parseFloat(l.total_tax || 0)) / l.quantity * 100) / 100 : 0,
      iva: null,
    })),
    envio: parseFloat(o.shipping_total || 0) + parseFloat(o.shipping_tax || 0),
    descuento: parseFloat(o.discount_total || 0),
    moneda: o.currency || cfg.moneda,
    pagado: ['processing', 'completed'].includes(o.status),
  } });
}
return salida;
