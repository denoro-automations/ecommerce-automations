// Reseñas de la propia tienda WooCommerce, leídas con su API oficial y la credencial del cliente.
// El email del autor que devuelve la API no se usa ni se guarda.
const cfg = $('Configuración').first().json;
const limpiar = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const salida = [];
for (const item of $input.all()) {
  const r = item.json;
  if (!r || !r.id || r.status && r.status !== 'approved') continue;
  const texto = limpiar(r.review);
  if (!texto) continue;
  const nota = Number(r.rating);
  salida.push({ json: {
    sitio: 'Tu tienda',
    autor: limpiar(r.reviewer) || 'anónimo',
    puntuacion: nota >= 1 && nota <= 5 ? Math.round(nota) : null,
    fecha: r.date_created_gmt ? `${r.date_created_gmt}Z`.replace(/ZZ$/, 'Z') : (r.date_created || cfg.ahora),
    texto: r.product_name ? `${texto} (sobre «${limpiar(r.product_name)}»)` : texto,
    url: r.product_permalink ? `${r.product_permalink}#reviews` : `${cfg.woo_url}/wp-admin/edit.php?post_type=product&page=product-reviews`,
  } });
}
if (!salida.length) throw new Error('WooCommerce no devolvió reseñas aprobadas: revisa la credencial y que la tienda tenga reseñas');
return salida;
