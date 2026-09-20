// Carritos desde un endpoint propio (un plugin de WooCommerce, un export de la tienda...).
// Se admiten varias formas de nombrar lo mismo para no obligar al cliente a cambiar su endpoint.
const cfg = $('Configuración').first().json;
const primera = $input.first().json;
const lista = Array.isArray(primera) ? primera
  : (primera.carritos || primera.carts || primera.data || primera.items
    || $input.all().map((i) => i.json));
if (!Array.isArray(lista)) throw new Error('El endpoint no devolvió una lista de carritos (ni en carritos, carts, data o items)');

const fecha = (v) => {
  if (!v) return null;
  const n = typeof v === 'number' ? v * (String(v).length <= 10 ? 1000 : 1) : Date.parse(v);
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const salida = [];
for (const c of lista) {
  if (!c) continue;
  const id = String(c.id ?? c.cart_id ?? c.token ?? c.session_id ?? '').trim();
  if (!id) continue;
  const actualizado = fecha(c.actualizado_en ?? c.updated_at ?? c.last_activity ?? c.creado_en ?? c.created_at);
  if (!actualizado) continue;
  salida.push({ json: {
    id,
    email: String(c.email ?? c.customer_email ?? '').trim().toLowerCase(),
    nombre: String(c.nombre ?? c.first_name ?? c.customer_name ?? '').trim(),
    total: parseFloat(c.total ?? c.cart_total ?? 0) || 0,
    moneda: c.moneda || c.currency || cfg.moneda,
    creado_en: fecha(c.creado_en ?? c.created_at) || actualizado,
    actualizado_en: actualizado,
    completado_en: fecha(c.completado_en ?? c.completed_at ?? c.order_date),
    acepta_marketing: Boolean(c.acepta_marketing ?? c.accepts_marketing ?? c.marketing_consent),
    url_recuperacion: c.url_recuperacion || c.recovery_url || c.checkout_url || '',
    lineas: (c.lineas || c.items || c.line_items || []).map((l) => ({
      titulo: String(l.titulo ?? l.title ?? l.name ?? 'Producto'),
      unidades: Number(l.unidades ?? l.quantity ?? 1),
      precio: parseFloat(l.precio ?? l.price ?? 0) || 0,
    })),
  } });
}
if (!salida.length) throw new Error('Ningún carrito del endpoint traía id y fecha: revisa el formato');
return salida;
