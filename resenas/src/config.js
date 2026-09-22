// ============ CONFIGURACIÓN DEL CLIENTE (edita solo este bloque) ============
const CONFIG = {
  tienda: 'Tienda Demo',
  fuente: 'demo',                 // 'demo', 'woocommerce' o 'web'
  woo_url: '',                    // si fuente = 'woocommerce': https://tu-tienda.com (usa su API con tu credencial)

  // Con fuente = 'web': páginas públicas de opiniones, cada una con sus selectores CSS
  // (se sacan con el inspector del navegador: clic derecho → Inspeccionar).
  // Antes de leer cada página se comprueba su robots.txt: si no permite la lectura
  // automática, el workflow se para y lo dice. Trustpilot, por ejemplo, no la permite.
  // Las reseñas de Google Maps se cargan con JavaScript y así no se leen: para esas está la API de Google Business Profile.
  sitios: [
    // {
    //   nombre: 'Opiniones de mi web',
    //   url: 'https://mi-tienda.com/opiniones',
    //   bloque: '.opinion',
    //   texto: '.opinion-texto',
    //   puntuacion: '.opinion-estrellas',
    //   puntuacion_attr: 'data-nota',
    //   autor: '.opinion-autor',
    //   fecha: 'time',
    //   fecha_attr: 'datetime',
    // },
  ],

  umbral_negativa: 3,             // puntuación (sobre 5) que se considera una queja
  avisar_solo_nuevas: true,       // no repetir avisos de reseñas ya vistas
  max_por_aviso: 10,              // tope de reseñas por aviso, para no mandar un tocho

  email_to: 'cliente@ejemplo.com',
  email_from: 'resenas@tu-dominio.com',
  telegram_chat_id: 'TU_CHAT_ID',
};
// ============================================================================
if (!['demo', 'woocommerce', 'web'].includes(CONFIG.fuente)) throw new Error(`fuente "${CONFIG.fuente}" no válida: usa demo, woocommerce o web`);
if (CONFIG.fuente === 'woocommerce' && !/^https?:\/\/[^/]+/i.test(String(CONFIG.woo_url || ''))) {
  throw new Error('Con fuente = woocommerce hace falta woo_url: la dirección de la tienda (https://tu-tienda.com)');
}
if (CONFIG.fuente === 'web') {
  if (!Array.isArray(CONFIG.sitios) || !CONFIG.sitios.length) {
    throw new Error('Con fuente = web hay que definir al menos un sitio en "sitios"');
  }
  CONFIG.sitios.forEach((s, i) => {
    for (const campo of ['nombre', 'url', 'bloque', 'texto']) {
      if (!String(s[campo] || '').trim()) throw new Error(`Al sitio ${i + 1} le falta "${campo}"`);
    }
    if (!/^https?:\/\//i.test(s.url)) throw new Error(`La url del sitio "${s.nombre}" tiene que empezar por http:// o https://`);
  });
}
if (!(CONFIG.umbral_negativa >= 1 && CONFIG.umbral_negativa <= 5)) {
  throw new Error('umbral_negativa debe estar entre 1 y 5');
}
if (!(CONFIG.max_por_aviso >= 1 && CONFIG.max_por_aviso <= 100)) throw new Error('max_por_aviso debe estar entre 1 y 100');
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

const modo = $input.first().json.modo === 'resumen' ? 'resumen' : 'vigilancia';
return [{ json: {
  ...CONFIG,
  modo,
  woo_url: String(CONFIG.woo_url || '').replace(/\/+$/, ''),
  enviar_email: Boolean(CONFIG.email_to),
  enviar_telegram: Boolean(CONFIG.telegram_chat_id),
  ahora: new Date().toISOString(),
} }];
