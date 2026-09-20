// ============ CONFIGURACIÓN DEL CLIENTE (edita solo este bloque) ============
const CONFIG = {
  // --- quién emite la factura (sale tal cual en el PDF) ---
  emisor: {
    nombre: 'Tienda Demo, S.L.',
    nif: 'B00000000',
    direccion: 'Calle Ejemplo 1',
    cp_poblacion: '08001 Barcelona',
    pais: 'España',
    email: 'facturacion@tienda-demo.test',
    telefono: '',
  },

  fuente: 'demo',                 // 'demo', 'shopify' o 'woocommerce'
  documento: 'factura',           // 'factura', 'albaran' o 'ambos'

  serie: 'F',                     // prefijo del número: F2026-0001
  digitos: 4,                     // ceros a la izquierda del correlativo
  reiniciar_cada_anio: true,      // el correlativo vuelve a 1 en enero

  iva: 21,                        // tipo por defecto, si la línea no trae el suyo
  precios_con_iva: true,          // true = los precios de la tienda ya llevan IVA incluido
  moneda: 'EUR',

  enviar_al_cliente: true,        // false = solo se genera y se guarda, no se envía
  max_por_ejecucion: 25,
  texto_pie: 'Gracias por tu compra.',
  gotenberg_url: 'http://host.docker.internal:3000',

  email_from: 'facturacion@tu-dominio.com',   // remitente de las facturas
  email_to: 'cliente@ejemplo.com',            // a quién llega el RESUMEN diario
  telegram_chat_id: 'TU_CHAT_ID',
};
// ============================================================================
if (!['demo', 'shopify', 'woocommerce'].includes(CONFIG.fuente)) {
  throw new Error(`fuente "${CONFIG.fuente}" no válida: usa demo, shopify o woocommerce`);
}
if (!['factura', 'albaran', 'ambos'].includes(CONFIG.documento)) {
  throw new Error(`documento "${CONFIG.documento}" no válido: usa factura, albaran o ambos`);
}
// Una factura sin estos datos no es válida en España, así que mejor parar aquí.
for (const campo of ['nombre', 'nif', 'direccion', 'cp_poblacion']) {
  if (!String(CONFIG.emisor[campo] || '').trim()) {
    throw new Error(`Falta emisor.${campo}: una factura necesita el nombre fiscal, el NIF y el domicilio de quien la emite`);
  }
}
if (!/^[A-Z]?\d{7,8}[A-Z0-9]$/i.test(String(CONFIG.emisor.nif).replace(/[\s-]/g, ''))) {
  throw new Error(`El NIF "${CONFIG.emisor.nif}" no tiene una forma válida (p. ej. B12345678 o 12345678Z)`);
}
if (!String(CONFIG.serie || '').trim()) throw new Error('La serie no puede estar vacía');
if (!(CONFIG.digitos >= 1 && CONFIG.digitos <= 8)) throw new Error('digitos debe estar entre 1 y 8');
if (!(CONFIG.iva >= 0 && CONFIG.iva <= 100)) throw new Error('iva debe estar entre 0 y 100');
if (!(CONFIG.max_por_ejecucion >= 1 && CONFIG.max_por_ejecucion <= 200)) {
  throw new Error('max_por_ejecucion debe estar entre 1 y 200');
}
if (!/^https?:\/\//i.test(String(CONFIG.gotenberg_url || ''))) {
  throw new Error('gotenberg_url tiene que apuntar al servicio que convierte el HTML en PDF');
}
const PLACEHOLDER = /ejemplo\.com|tu-dominio|TU_CHAT_ID/i;
for (const k of ['email_to', 'email_from', 'telegram_chat_id']) {
  if (PLACEHOLDER.test(String(CONFIG[k] || ''))) {
    throw new Error(`Configura "${k}" en el nodo Configuración (ahora tiene un valor de ejemplo). Déjalo vacío ('') para desactivar ese canal.`);
  }
}
if (CONFIG.enviar_al_cliente && !CONFIG.email_from) {
  throw new Error('Falta email_from: sin remitente no se pueden enviar las facturas');
}
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
