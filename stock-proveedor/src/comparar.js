// Compara el feed del proveedor con la foto de la tienda y decide qué hay que tocar.
// Si el resultado tiene mala pinta (feed corto, demasiados cambios, demasiados agotados),
// se bloquea y avisa en vez de aplicar: un feed roto puede vaciar una tienda entera.
const cfg = $('Configuración').first().json;
const todos = $input.all().map((i) => i.json).filter(Boolean);
const feed = todos.filter((x) => x._lado === 'feed');
const tienda = todos.filter((x) => x._lado === 'tienda');
if (!feed.length) throw new Error('No llegó ninguna referencia del proveedor');
if (!tienda.length) throw new Error('No llegó ningún producto de la tienda');

// El feed trae precios de coste del proveedor: compararlos con el PVP de la tienda no dice nada.
// Lo que interesa es si el proveedor ha movido su precio desde la última sincronización.
const estado = $getWorkflowStaticData('global');
const preciosPrevios = estado.precios_proveedor || {};
const preciosAhora = {};

const porSku = new Map();
for (const t of tienda) if (!porSku.has(t.sku)) porSku.set(t.sku, t);

const cambios = [];
const precios = [];
const nuevos = [];
const sinGestion = [];
const enFeed = new Set();

for (const f of feed) {
  enFeed.add(f.sku);
  const t = porSku.get(f.sku);
  if (!t) {
    if (f.precio != null) preciosAhora[f.sku] = f.precio;
    nuevos.push({ sku: f.sku, titulo: f.titulo || '', stock: f.stock, precio: f.precio });
    continue;
  }
  if (f.stock !== null && f.stock !== undefined) {
    const objetivo = Math.max(0, f.stock - cfg.margen_stock);
    if (t.gestiona_stock === false) {
      if (objetivo !== t.stock) sinGestion.push({ sku: f.sku, titulo: t.titulo });
    } else if (t.stock === null || objetivo !== t.stock) {
      cambios.push({
        sku: f.sku, titulo: t.titulo, id_tienda: t.id_tienda, inventory_item_id: t.inventory_item_id,
        antes: t.stock, despues: objetivo, diferencia: t.stock === null ? null : objetivo - t.stock,
        tipo: objetivo === 0 ? 'agotado' : (t.stock === 0 || t.stock === null ? 'repuesto' : 'ajuste'),
      });
    }
  }
  if (f.precio != null) {
    preciosAhora[f.sku] = f.precio;
    const antes = preciosPrevios[f.sku];
    if (antes != null && antes > 0 && Math.abs(f.precio - antes) >= 0.01) {
      const variacion = Math.round(((f.precio - antes) / antes) * 1000) / 10;
      if (Math.abs(variacion) >= cfg.avisar_cambio_precio_pct) {
        precios.push({ sku: f.sku, titulo: t.titulo, antes, despues: f.precio, variacion_pct: variacion });
      }
    }
  }
}
const descatalogados = tienda.filter((t) => !enFeed.has(t.sku))
  .map((t) => ({ sku: t.sku, titulo: t.titulo, stock: t.stock }));

// ---- frenos de seguridad ----
const motivos = [];
const pct = (n) => Math.round((n / tienda.length) * 1000) / 10;
const es = (n) => String(n).replace('.', ',');   // 38.9 -> "38,9" en los mensajes
const agotados = cambios.filter((c) => c.tipo === 'agotado').length;
if (feed.length < cfg.min_referencias) {
  motivos.push(`el feed trae ${feed.length} referencias y el mínimo esperado es ${cfg.min_referencias}: parece incompleto`);
}
if (pct(cambios.length) > cfg.max_cambios_pct) {
  motivos.push(`cambiaría el ${es(pct(cambios.length))} % del catálogo (el tope es ${cfg.max_cambios_pct} %)`);
}
if (pct(agotados) > cfg.max_agotados_pct) {
  motivos.push(`dejaría agotado el ${es(pct(agotados))} % del catálogo (el tope es ${cfg.max_agotados_pct} %)`);
}
const bloqueado = motivos.length > 0;
// Un feed bloqueado no sirve de referencia de precios: no se guarda como foto buena.
if (!bloqueado) estado.precios_proveedor = preciosAhora;
const aplicar = !bloqueado && !cfg.modo_prueba && cambios.length > 0;

return [{ json: {
  ...cfg,
  aplicar,
  bloqueado,
  motivos,
  cambios, precios, nuevos, descatalogados, sin_gestion: sinGestion,
  resumen: {
    referencias_feed: feed.length,
    referencias_tienda: tienda.length,
    cambios: cambios.length,
    agotados,
    repuestos: cambios.filter((c) => c.tipo === 'repuesto').length,
    cambios_precio: precios.length,
    altas_nuevas: nuevos.length,
    descatalogados: descatalogados.length,
    pct_catalogo: pct(cambios.length),
  },
} }];
