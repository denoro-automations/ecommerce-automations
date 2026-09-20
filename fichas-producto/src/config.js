// ============ CONFIGURACIÓN DEL CLIENTE (edita solo este bloque) ============
const CONFIG = {
  tienda: 'Tienda Demo',
  fuente: 'demo',                 // 'demo', 'csv', 'shopify' o 'woocommerce'
  csv_url: '',                    // si fuente = 'csv': enlace directo al CSV del catálogo
  moneda: 'EUR',
  dominio_tienda: '',             // solo Shopify: tu-tienda.myshopify.com (para los enlaces)
  idioma: 'es',                   // 'es' o 'en'
  tono: 'cercano',                // 'cercano', 'tecnico' o 'premium'

  motor: 'plantilla',             // 'plantilla' (sin coste, sin API) u 'openai'
  modelo: 'gpt-4o-mini',          // solo si motor = 'openai'

  max_productos: 50,              // tope por ejecución (protege la factura de la API)
  solo_sin_descripcion: true,     // true = solo productos con la descripción vacía o muy corta
  descripcion_corta: 120,         // por debajo de estos caracteres se considera "sin descripción"
  palabras_clave_extra: [],       // p. ej. ['envío 24h', 'hecho en España']

  largo_titulo: 60,               // máximo de caracteres del título SEO
  largo_meta: 155,                // máximo de caracteres de la meta descripción

  email_to: 'cliente@ejemplo.com',
  email_from: 'fichas@tu-dominio.com',   // la cuenta SMTP que envía
  telegram_chat_id: 'TU_CHAT_ID',
};
// ============================================================================
if (!['demo', 'csv', 'shopify', 'woocommerce'].includes(CONFIG.fuente)) {
  throw new Error(`fuente "${CONFIG.fuente}" no válida: usa demo, csv, shopify o woocommerce`);
}
if (!['plantilla', 'openai'].includes(CONFIG.motor)) {
  throw new Error(`motor "${CONFIG.motor}" no válido: usa plantilla u openai`);
}
if (!['es', 'en'].includes(CONFIG.idioma)) throw new Error('idioma debe ser es o en');
if (!['cercano', 'tecnico', 'premium'].includes(CONFIG.tono)) {
  throw new Error('tono debe ser cercano, tecnico o premium');
}
if (CONFIG.fuente === 'csv' && !/^https?:\/\//i.test(String(CONFIG.csv_url || ''))) {
  throw new Error('Con fuente = csv hace falta un csv_url que empiece por http:// o https://');
}
if (!(CONFIG.max_productos >= 1 && CONFIG.max_productos <= 500)) {
  throw new Error('max_productos debe estar entre 1 y 500');
}
// Destinos: vacío = canal desactivado; valores de ejemplo = error claro
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
