// ============ CONFIGURACIÓN DEL CLIENTE (edita solo este bloque) ============
const CONFIG = {
  tienda: 'Tienda Demo',
  proveedor: 'Proveedor Demo',

  fuente: 'demo',                 // 'demo' o 'url'
  feed_url: '',                   // si fuente = 'url': CSV o XML del proveedor
  destino: 'demo',                // 'demo', 'shopify' o 'woocommerce'
  dominio_shopify: '',            // solo Shopify: tu-tienda.myshopify.com
  location_id: '',                // solo Shopify: almacén sobre el que se ajusta el stock

  modo_prueba: true,              // true = calcula y avisa, pero NO toca la tienda
  avisar_cambio_precio_pct: 3,    // avisa si el proveedor sube o baja un precio más de este %

  // --- frenos de seguridad: si el feed llega mal, mejor no tocar nada ---
  min_referencias: 5,             // por debajo de esto, el feed se considera incompleto
  max_cambios_pct: 40,            // si cambiaría más de este % del catálogo, se bloquea
  max_agotados_pct: 25,           // si dejaría agotado más de este % del catálogo, se bloquea
  margen_stock: 0,                // resta unidades al stock del proveedor (colchón de seguridad)

  email_to: 'cliente@ejemplo.com',
  email_from: 'stock@tu-dominio.com',
  telegram_chat_id: 'TU_CHAT_ID',
};
// ============================================================================
if (!['demo', 'url'].includes(CONFIG.fuente)) throw new Error(`fuente "${CONFIG.fuente}" no válida: usa demo o url`);
if (!['demo', 'shopify', 'woocommerce'].includes(CONFIG.destino)) {
  throw new Error(`destino "${CONFIG.destino}" no válido: usa demo, shopify o woocommerce`);
}
if (CONFIG.fuente === 'url' && !/^https?:\/\//i.test(String(CONFIG.feed_url || ''))) {
  throw new Error('Con fuente = url hace falta un feed_url que empiece por http:// o https://');
}
if (CONFIG.destino === 'shopify' && !CONFIG.modo_prueba) {
  if (!/\.myshopify\.com$/i.test(String(CONFIG.dominio_shopify || ''))) {
    throw new Error('Con destino = shopify hace falta dominio_shopify (tu-tienda.myshopify.com)');
  }
  if (!String(CONFIG.location_id || '').trim()) {
    throw new Error('Con destino = shopify hace falta location_id: el almacén sobre el que se ajusta el stock');
  }
}
for (const [k, min, max] of [['max_cambios_pct', 1, 100], ['max_agotados_pct', 1, 100],
  ['min_referencias', 1, 1e6], ['avisar_cambio_precio_pct', 0, 100]]) {
  if (!(CONFIG[k] >= min && CONFIG[k] <= max)) throw new Error(`${k} debe estar entre ${min} y ${max}`);
}
if (CONFIG.margen_stock < 0) throw new Error('margen_stock no puede ser negativo');
const PLACEHOLDER = /ejemplo\.com|tu-dominio|TU_CHAT_ID/i;
for (const k of ['email_to', 'email_from', 'telegram_chat_id']) {
  if (PLACEHOLDER.test(String(CONFIG[k] || ''))) {
    throw new Error(`Configura "${k}" en el nodo Configuración (ahora tiene un valor de ejemplo). Déjalo vacío ('') para desactivar ese canal.`);
  }
}
if (CONFIG.telegram_chat_id && !/^-?\d+$|^@\w+$/.test(String(CONFIG.telegram_chat_id))) {
  throw new Error('telegram_chat_id debe ser un número (p. ej. 123456789) o @canal');
}
if (!CONFIG.email_to && !CONFIG.telegram_chat_id) throw new Error('Configura al menos un canal: email_to o telegram_chat_id');
if (CONFIG.email_to && !CONFIG.email_from) throw new Error('Falta email_from (la cuenta SMTP que envía)');

return [{ json: {
  ...CONFIG,
  enviar_email: Boolean(CONFIG.email_to),
  enviar_telegram: Boolean(CONFIG.telegram_chat_id),
  generado_en: new Date().toISOString(),
} }];
