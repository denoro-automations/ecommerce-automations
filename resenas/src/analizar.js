// Clasifica las reseñas, se queda con las que no se habían visto y agrupa las quejas por tema.
const cfg = $('Configuración').first().json;
const estado = $getWorkflowStaticData('global');
estado.vistas = estado.vistas || {};
estado.semanas = estado.semanas || [];

const ahora = new Date(cfg.ahora).getTime();
const resenas = $input.all().map((i) => i.json).filter((r) => r && r.texto);
if (!resenas.length) throw new Error('No llegó ninguna reseña');

// huella corta y estable para no repetir avisos (no se guarda el texto entero)
const huella = (r) => {
  const base = `${r.sitio}|${r.autor}|${String(r.texto).slice(0, 80)}`;
  let h = 5381;
  for (let i = 0; i < base.length; i++) h = ((h * 33) ^ base.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

const sinTildes = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const NEGATIVAS = ['tarde', 'tardo', 'retraso', 'nunca llego', 'no llego', 'roto', 'danado', 'defectuoso',
  'imposible', 'pesimo', 'horrible', 'estafa', 'no contesta', 'sin avisar', 'esperando', 'inaceptable',
  'lamentable', 'decepcion', 'mala experiencia', 'no recomiendo'];
const POSITIVAS = ['perfecto', 'perfecta', 'excelente', 'impecable', 'rapido', 'rapida', 'encantad',
  'recomiendo', 'repetire', 'genial', 'buena calidad', 'contenta', 'contento', 'fantastic', 'muy bien'];
const TEMAS = {
  'Plazos de envío': ['envio', 'envío', 'tardo', 'tarde', 'retraso', 'plazo', 'llego', 'esperando', 'semanas', 'dias'],
  'Atención al cliente': ['atencion', 'contesta', 'respuesta', 'telefono', 'correo', 'soporte', 'nadie', 'ignoran'],
  'Devoluciones y reembolsos': ['devolucion', 'reembolso', 'cambio', 'garantia', 'devolver'],
  'Estado del producto': ['roto', 'danado', 'defectuoso', 'embalaje', 'golpe', 'falta', 'incompleto'],
  'Precio': ['precio', 'caro', 'coste', 'cobrado'],
};

// Solo para reseñas sin estrellas: cuando hay nota, manda la nota.
const porPalabras = (r) => {
  const t = sinTildes(r.texto);
  const neg = NEGATIVAS.filter((p) => t.includes(p)).length;
  const pos = POSITIVAS.filter((p) => t.includes(p)).length;
  if (neg > pos) return 'negativa';
  if (pos > neg) return 'positiva';
  return 'neutra';
};

const marcadas = resenas.map((r) => {
  const h = huella(r);
  const vistasSitio = estado.vistas[r.sitio] || [];
  // Con umbral 3, un 3 es "regular" (neutra) y el 1 y el 2 son quejas.
  const sentimiento = (r.puntuacion === null || r.puntuacion === undefined) ? porPalabras(r)
    : (r.puntuacion < cfg.umbral_negativa ? 'negativa'
      : (r.puntuacion === cfg.umbral_negativa ? 'neutra' : 'positiva'));
  return { ...r, huella: h, nueva: !vistasSitio.includes(h), sentimiento };
});

const nuevas = marcadas.filter((r) => r.nueva);
const paraAvisar = (cfg.avisar_solo_nuevas ? nuevas : marcadas)
  .filter((r) => r.sentimiento === 'negativa')
  .sort((a, b) => (a.puntuacion ?? 9) - (b.puntuacion ?? 9))
  .slice(0, cfg.max_por_aviso);

// --- estadísticas de los últimos 7 días, para el resumen semanal ---
const semana = marcadas.filter((r) => ahora - Date.parse(r.fecha) <= 7 * 86400000);
const conNota = semana.filter((r) => typeof r.puntuacion === 'number');
const media = conNota.length ? Math.round((conNota.reduce((s, r) => s + r.puntuacion, 0) / conNota.length) * 10) / 10 : null;
const estrellas = [1, 2, 3, 4, 5].map((n) => ({ estrellas: n, total: conNota.filter((r) => r.puntuacion === n).length }));
const porSitio = {};
for (const r of semana) porSitio[r.sitio] = (porSitio[r.sitio] || 0) + 1;

const quejas = semana.filter((r) => r.sentimiento === 'negativa');
const temas = Object.entries(TEMAS).map(([tema, palabras]) => ({
  tema,
  total: quejas.filter((r) => palabras.some((p) => sinTildes(r.texto).includes(sinTildes(p)))).length,
})).filter((t) => t.total > 0).sort((a, b) => b.total - a.total);

const anterior = estado.semanas[estado.semanas.length - 1] || null;
const tendencia = anterior && media !== null && anterior.media !== null
  ? { media: Math.round((media - anterior.media) * 10) / 10, total: semana.length - anterior.total }
  : null;

// --- se guarda lo visto (acotado, para que el estado no crezca sin fin) ---
for (const r of marcadas) {
  const lista = estado.vistas[r.sitio] || [];
  if (!lista.includes(r.huella)) lista.push(r.huella);
  estado.vistas[r.sitio] = lista.slice(-800);
}
if (cfg.modo === 'resumen') {
  estado.semanas.push({ hasta: cfg.ahora, total: semana.length, media, negativas: quejas.length });
  estado.semanas = estado.semanas.slice(-12);
}

return [{ json: {
  ...cfg,
  hay_avisos: paraAvisar.length > 0,
  avisar: paraAvisar,
  nuevas: nuevas.length,
  resumen: {
    total_semana: semana.length,
    media,
    estrellas,
    por_sitio: porSitio,
    negativas: quejas.length,
    positivas: semana.filter((r) => r.sentimiento === 'positiva').length,
    neutras: semana.filter((r) => r.sentimiento === 'neutra').length,
    temas,
    tendencia,
  },
  mejores: semana.filter((r) => r.sentimiento === 'positiva').slice(0, 3),
  peores: quejas.slice(0, 5),
} }];
