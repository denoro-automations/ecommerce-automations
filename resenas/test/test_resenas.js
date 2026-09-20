const assert = require('assert');
const path = require('path');
const { crearRunCode } = require('../../comun/test/harness');
const runCode = crearRunCode(path.join(__dirname, '..'));

const REAL = [
  ["telegram_chat_id: 'TU_CHAT_ID'", "telegram_chat_id: '123456789'"],
  ["email_to: 'cliente@ejemplo.com'", "email_to: 'dueno@tienda.test'"],
  ["email_from: 'resenas@tu-dominio.com'", "email_from: 'resenas@denoro.test'"],
];
const con = (...cambios) => [...REAL, ...cambios];
const SITIO = ["sitios: [", "sitios: [{ nombre: 'Trustpilot', url: 'https://x.test/r', bloque: 'article', texto: 'p' },"];
const entrada = (modo) => [{ json: { modo } }];
let hechas = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); hechas++; };
const igual = (a, b, msg) => { assert.strictEqual(a, b, msg); hechas++; };

(async () => {
  // ---------- configuración ----------
  await assert.rejects(runCode('config.js', { input: entrada('vigilancia') }), /valor de ejemplo/); hechas++;
  await assert.rejects(runCode('config.js', { input: entrada('vigilancia'), replace: con(["fuente: 'demo'", "fuente: 'web'"]) }),
    /al menos un sitio/); hechas++;
  await assert.rejects(runCode('config.js', {
    input: entrada('vigilancia'),
    replace: con(["fuente: 'demo'", "fuente: 'web'"], ["sitios: [", "sitios: [{ nombre: 'X', url: 'https://x.test', bloque: 'article' },"]),
  }), /"texto"/); hechas++;
  await assert.rejects(runCode('config.js', {
    input: entrada('vigilancia'),
    replace: con(["fuente: 'demo'", "fuente: 'web'"], ["sitios: [", "sitios: [{ nombre: 'X', url: 'x.test', bloque: 'a', texto: 'p' },"]),
  }), /http/); hechas++;
  await assert.rejects(runCode('config.js', { input: entrada('vigilancia'), replace: con(['umbral_negativa: 3', 'umbral_negativa: 9']) }),
    /umbral_negativa/); hechas++;

  const cfg = await runCode('config.js', { input: entrada('vigilancia'), replace: REAL });
  igual(cfg[0].json.modo, 'vigilancia');
  igual((await runCode('config.js', { input: entrada('resumen'), replace: REAL }))[0].json.modo, 'resumen');
  igual((await runCode('config.js', { input: [{ json: {} }], replace: REAL }))[0].json.modo, 'vigilancia',
    'sin modo indicado, vigila');
  const webOk = await runCode('config.js', {
    input: entrada('vigilancia'), replace: con(["fuente: 'demo'", "fuente: 'web'"], SITIO),
  });
  igual(webOk[0].json.sitios.length, 1);
  const n = { 'Configuración': cfg };

  // ---------- reseñas de ejemplo ----------
  const demo = await runCode('demo-resenas.js', { nodes: n });
  igual(demo.length, 12);

  // ---------- análisis ----------
  const est = {};
  const an = await runCode('analizar.js', { input: demo, nodes: n, staticData: est });
  const a = an[0].json;
  igual(a.nuevas, 12, 'la primera vez todas son nuevas');
  igual(a.hay_avisos, true);
  igual(a.avisar.length, 4, 'cuatro reseñas de 1 y 2 estrellas');
  igual(a.avisar[0].puntuacion, 1, 'primero las peores');
  ok(a.avisar.every((r) => r.puntuacion <= 2), 'un 3 no es una queja con umbral 3');
  igual(a.resumen.total_semana, 8, 'el resumen mira los últimos 7 días');
  igual(a.resumen.media, 3.4);
  igual(a.resumen.negativas, 3);
  igual(a.resumen.temas[0].tema, 'Plazos de envío', 'agrupa las quejas por tema');
  ok(a.resumen.temas.some((t) => t.tema === 'Atención al cliente'));
  igual(a.resumen.estrellas.find((e) => e.estrellas === 5).total, 3);
  assert.deepStrictEqual(a.resumen.por_sitio, { Trustpilot: 5, Google: 3 }); hechas++;
  igual(a.resumen.tendencia, null, 'sin semana anterior no hay tendencia');
  ok(est.vistas.Trustpilot.length === 7 && est.vistas.Google.length === 5, 'guarda lo ya visto');

  // segunda pasada: nada nuevo
  const an2 = await runCode('analizar.js', { input: demo, nodes: n, staticData: est });
  igual(an2[0].json.nuevas, 0);
  igual(an2[0].json.hay_avisos, false, 'no repite avisos de reseñas ya vistas');

  // llega una nueva reseña mala
  const conNueva = [...demo, { json: { sitio: 'Google', autor: 'Tomás', puntuacion: 1, fecha: new Date().toISOString(),
    texto: 'Pedido nunca llegó y nadie contesta.', url: 'https://r.test/tomas' } }];
  const an3 = await runCode('analizar.js', { input: conNueva, nodes: n, staticData: est });
  igual(an3[0].json.avisar.length, 1);
  igual(an3[0].json.avisar[0].autor, 'Tomás');

  // con avisar_solo_nuevas: false vuelve a avisar de todas
  const todas = await runCode('analizar.js', {
    input: demo, staticData: est,
    nodes: { 'Configuración': await runCode('config.js', { input: entrada('vigilancia'), replace: con(['avisar_solo_nuevas: true', 'avisar_solo_nuevas: false']) }) },
  });
  igual(todas[0].json.avisar.length, 4);

  // sin estrellas, clasifica por las palabras
  const sinNota = await runCode('analizar.js', {
    input: [
      { json: { sitio: 'Blog', autor: 'A', puntuacion: null, fecha: new Date().toISOString(), texto: 'Producto roto y encima llegó tarde, pésimo.' } },
      { json: { sitio: 'Blog', autor: 'B', puntuacion: null, fecha: new Date().toISOString(), texto: 'Perfecto, lo recomiendo, atención excelente.' } },
    ], nodes: n, staticData: {},
  });
  igual(sinNota[0].json.avisar.length, 1);
  igual(sinNota[0].json.resumen.positivas, 1);
  igual(sinNota[0].json.resumen.media, null, 'sin estrellas no hay nota media');

  // tope por aviso
  const tope = await runCode('analizar.js', {
    input: demo, staticData: {},
    nodes: { 'Configuración': await runCode('config.js', { input: entrada('vigilancia'), replace: con(['max_por_aviso: 10', 'max_por_aviso: 2']) }) },
  });
  igual(tope[0].json.avisar.length, 2);

  // modo resumen: guarda la semana y calcula tendencia a la siguiente
  const estSem = {};
  const cfgRes = { 'Configuración': await runCode('config.js', { input: entrada('resumen'), replace: REAL }) };
  await runCode('analizar.js', { input: demo, nodes: cfgRes, staticData: estSem });
  igual(estSem.semanas.length, 1, 'el resumen deja la foto de la semana');
  const peores = demo.map((d) => ({ json: { ...d.json, puntuacion: Math.max(1, (d.json.puntuacion || 3) - 2) } }));
  const an4 = await runCode('analizar.js', { input: peores, nodes: cfgRes, staticData: estSem });
  ok(an4[0].json.resumen.tendencia.media < 0, 'si baja la nota, la tendencia lo dice');
  await assert.rejects(runCode('analizar.js', { input: [], nodes: n, staticData: {} }), /ninguna reseña/); hechas++;

  // ---------- aviso ----------
  const av = await runCode('aviso.js', { input: an, nodes: n });
  const aj = av[0].json;
  ok(aj.email_html.includes('#8f2f24'), 'el aviso usa el rojo de la marca');
  ok(aj.email_html.includes('Denoro Automations'));
  ok(!/#1f5fd1|#2563eb/.test(aj.email_html), 'sin restos de la paleta azul antigua');
  ok(aj.email_html.includes('★☆☆☆☆'), 'pinta las estrellas');
  ok(aj.email_html.includes('Lucía') && aj.email_html.includes('Contestar'));
  ok(aj.asunto.includes('4 reseña'));
  ok(aj.telegram.includes('Trustpilot'));
  const una = await runCode('aviso.js', { input: [{ json: { ...a, avisar: [a.avisar[0]] } }], nodes: n });
  ok(una[0].json.email_html.includes('Reseña negativa ·'), 'singular cuando solo hay una');

  // ---------- resumen semanal ----------
  const rs = await runCode('resumen-semanal.js', { input: an, nodes: n });
  const rj = rs[0].json;
  ok(rj.email_html.includes('Reparto de estrellas') && rj.email_html.includes('De qué se queja la gente'));
  ok(rj.email_html.includes('Plazos de envío'));
  ok(rj.email_html.includes('#235b54') && rj.email_html.includes('Denoro Automations'));
  ok(rj.asunto.includes('media 3.4'));
  ok(rj.telegram.includes('Plazos de envío'));
  const vacia = await runCode('resumen-semanal.js', {
    input: [{ json: { ...a, resumen: { ...a.resumen, total_semana: 0, media: null, negativas: 0, positivas: 0, temas: [], estrellas: a.resumen.estrellas.map((e) => ({ ...e, total: 0 })), por_sitio: {}, tendencia: null }, peores: [], mejores: [] } }],
    nodes: n,
  });
  ok(vacia[0].json.email_html.includes('Ninguna queja esta semana'), 'una semana sin quejas no rompe el resumen');

  // ---------- extracción web ----------
  const sitios = await runCode('preparar-sitios.js', { nodes: { 'Configuración': webOk } });
  igual(sitios.length, 1);
  igual(sitios[0].json.sel.bloque, 'article');

  const web = await runCode('normalizar-web.js', {
    input: [{ json: { sitio: 'Trustpilot', url: 'https://x.test/r',
      texto: ['  Muy buen servicio  ', 'Tardó mucho'],
      autor: ['Ana', ''],
      puntuacion: ['Valorado con 5 de 5 estrellas', '★★☆☆☆'],
      fecha: ['2026-09-18T10:00:00Z', 'no es una fecha'] } }],
    nodes: n,
  });
  igual(web.length, 2);
  igual(web[0].json.puntuacion, 5, 'lee la puntuación del texto alternativo');
  igual(web[1].json.puntuacion, 2, 'y también las estrellas dibujadas');
  igual(web[1].json.autor, 'anónimo');
  igual(web[0].json.texto, 'Muy buen servicio');
  ok(web[1].json.fecha === cfg[0].json.ahora, 'una fecha ilegible no tumba la reseña');
  await assert.rejects(runCode('normalizar-web.js', { input: [{ json: { sitio: 'X', texto: [] } }], nodes: n }),
    /selectores CSS/); hechas++;

  console.log(`resenas: ${hechas} comprobaciones OK`);
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
