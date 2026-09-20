// ============ CONFIGURACIÓN DEL CLIENTE (edita solo este bloque) ============
const CONFIG = {
  tienda: 'Tienda Demo',
  fuente: 'demo',                 // 'demo' o 'web'

  // Con fuente = 'web': cada sitio con sus selectores CSS.
  // Se sacan mirando la página con el inspector del navegador (clic derecho → Inspeccionar).
  sitios: [
    // {
    //   nombre: 'Trustpilot',
    //   url: 'https://es.trustpilot.com/review/tu-tienda.com',
    //   bloque: 'article[data-service-review-card-paper]',
    //   texto: 'p[data-service-review-text-typography]',
    //   puntuacion: 'div[data-service-review-rating] img',
    //   puntuacion_attr: 'alt',
    //   autor: 'span[data-consumer-name-typography]',
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
if (!['demo', 'web'].includes(CONFIG.fuente)) throw new Error(`fuente "${CONFIG.fuente}" no válida: usa demo o web`);
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
  enviar_email: Boolean(CONFIG.email_to),
  enviar_telegram: Boolean(CONFIG.telegram_chat_id),
  ahora: new Date().toISOString(),
} }];
