// ============ CONFIGURACIÓN DEL CLIENTE (edita solo este bloque) ============
const CONFIG = {
  tienda: 'Tienda Demo',
  web: 'https://tienda-demo.test',
  fuente: 'demo',                 // 'demo', 'shopify' o 'http'
  carritos_url: '',               // si fuente = 'http': endpoint que devuelve los carritos en JSON
  dominio_shopify: '',            // solo Shopify: tu-tienda.myshopify.com

  // --- la secuencia de avisos (se envía como mucho uno por carrito y ejecución) ---
  pasos: [
    { horas: 1,  asunto: '¿Te ayudamos a terminar tu pedido?', cupon: '' },
    { horas: 24, asunto: 'Tu carrito sigue esperándote',       cupon: '' },
    { horas: 72, asunto: 'Última oportunidad: 10 % en tu carrito', cupon: 'VUELVE10' },
  ],
  horas_limite: 168,              // pasada una semana, el carrito se da por perdido
  minimo_total: 10,               // carritos por debajo de este importe no merecen un email
  max_envios_por_ejecucion: 50,   // freno: evita una avalancha si algo se descuadra

  // --- consentimiento: escribir a quien no lo dio puede costar una multa ---
  solo_con_consentimiento: true,  // no dejes esto en false sin hablarlo con el cliente
  email_bajas: 'bajas@tu-dominio.com',   // dirección de baja que aparece en el pie

  // --- la marca de la TIENDA, que es quien firma el email al comprador ---
  marca_color: '#235b54',
  marca_texto_boton: 'Terminar mi pedido',

  moneda: 'EUR',
  email_from: 'tienda@tu-dominio.com',   // remitente de los avisos al comprador
  email_to: 'cliente@ejemplo.com',       // a quién le llega el RESUMEN (el dueño de la tienda)
  telegram_chat_id: 'TU_CHAT_ID',
};
// ============================================================================
if (!['demo', 'shopify', 'http'].includes(CONFIG.fuente)) {
  throw new Error(`fuente "${CONFIG.fuente}" no válida: usa demo, shopify o http`);
}
if (CONFIG.fuente === 'http' && !/^https?:\/\//i.test(String(CONFIG.carritos_url || ''))) {
  throw new Error('Con fuente = http hace falta un carritos_url que empiece por http:// o https://');
}
if (CONFIG.fuente === 'shopify' && !/\.myshopify\.com$/i.test(String(CONFIG.dominio_shopify || ''))) {
  throw new Error('Con fuente = shopify hace falta dominio_shopify (tu-tienda.myshopify.com)');
}
if (!Array.isArray(CONFIG.pasos) || !CONFIG.pasos.length) throw new Error('Define al menos un paso en pasos');
CONFIG.pasos.forEach((p, i) => {
  if (!(p.horas >= 0)) throw new Error(`El paso ${i + 1} necesita horas (número de horas desde que se abandonó)`);
  if (!String(p.asunto || '').trim()) throw new Error(`El paso ${i + 1} necesita asunto`);
  if (i > 0 && p.horas <= CONFIG.pasos[i - 1].horas) {
    throw new Error(`Los pasos van de menos a más horas: el ${i + 1} (${p.horas} h) no puede ir antes que el ${i} (${CONFIG.pasos[i - 1].horas} h)`);
  }
});
if (CONFIG.horas_limite <= CONFIG.pasos[CONFIG.pasos.length - 1].horas) {
  throw new Error('horas_limite tiene que ser mayor que las horas del último paso');
}
if (!(CONFIG.max_envios_por_ejecucion >= 1 && CONFIG.max_envios_por_ejecucion <= 500)) {
  throw new Error('max_envios_por_ejecucion debe estar entre 1 y 500');
}
const PLACEHOLDER = /ejemplo\.com|tu-dominio|TU_CHAT_ID/i;
for (const k of ['email_to', 'email_from', 'telegram_chat_id', 'email_bajas']) {
  if (PLACEHOLDER.test(String(CONFIG[k] || ''))) {
    throw new Error(`Configura "${k}" en el nodo Configuración (ahora tiene un valor de ejemplo). Déjalo vacío ('') para desactivar ese canal.`);
  }
}
if (!CONFIG.email_from) throw new Error('Falta email_from: sin remitente no se puede escribir a los compradores');
if (!CONFIG.email_bajas) throw new Error('Falta email_bajas: todo email comercial necesita una forma de darse de baja');
if (CONFIG.telegram_chat_id && !/^-?\d+$|^@\w+$/.test(String(CONFIG.telegram_chat_id))) {
  throw new Error('telegram_chat_id debe ser un número (p. ej. 123456789) o @canal');
}
if (!CONFIG.email_to && !CONFIG.telegram_chat_id) throw new Error('Configura al menos un canal para el resumen: email_to o telegram_chat_id');

return [{ json: {
  ...CONFIG,
  enviar_email: Boolean(CONFIG.email_to),
  enviar_telegram: Boolean(CONFIG.telegram_chat_id),
  ahora: new Date().toISOString(),
} }];
