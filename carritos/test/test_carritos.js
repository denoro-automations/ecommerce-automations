const assert = require('assert');
const path = require('path');
const { crearRunCode } = require('../../comun/test/harness');
const runCode = crearRunCode(path.join(__dirname, '..'));

const REAL = [
  ["telegram_chat_id: 'TU_CHAT_ID'", "telegram_chat_id: '123456789'"],
  ["email_to: 'cliente@ejemplo.com'", "email_to: 'dueno@tienda.test'"],
  ["email_from: 'tienda@tu-dominio.com'", "email_from: 'hola@tienda.test'"],
  ["email_bajas: 'bajas@tu-dominio.com'", "email_bajas: 'bajas@tienda.test'"],
];
const con = (...cambios) => [...REAL, ...cambios];
let hechas = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); hechas++; };
const igual = (a, b, msg) => { assert.strictEqual(a, b, msg); hechas++; };

(async () => {
  // ---------- configuración ----------
  await assert.rejects(runCode('config.js'), /valor de ejemplo/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["fuente: 'demo'", "fuente: 'magento'"]) }), /fuente/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["fuente: 'demo'", "fuente: 'http'"]) }), /carritos_url/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["fuente: 'demo'", "fuente: 'shopify'"]) }), /dominio_shopify/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(['horas: 24, asunto', 'horas: 0, asunto']) }), /de menos a más horas/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(['horas_limite: 168', 'horas_limite: 48']) }), /horas_limite/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["email_bajas: 'bajas@tienda.test'", "email_bajas: ''"]) }), /baja/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["email_from: 'hola@tienda.test'", "email_from: ''"]) }), /remitente/); hechas++;

  const cfg = await runCode('config.js', { replace: REAL });
  const n = { 'Configuración': cfg };
  igual(cfg[0].json.solo_con_consentimiento, true, 'de fábrica solo escribe a quien dio permiso');

  // ---------- carritos de ejemplo ----------
  const demo = await runCode('demo-carritos.js', { nodes: n });
  igual(demo.length, 8);

  // ---------- decisión ----------
  const est = {};
  const dec = await runCode('decidir.js', { input: demo, nodes: n, staticData: est });
  const d = dec[0].json;
  igual(d.envios.length, 3, 'tres carritos en su ventana');
  igual(d.envios[0].id, 'C-1003', 'los carritos grandes primero');
  igual(d.envios[0].paso, 3, 'a un carrito de 80 h le toca el tercer aviso');
  assert.deepStrictEqual(d.envios[0].saltados, [1, 2], 'los pasos anteriores se dan por pasados'); hechas++;
  igual(d.envios[0].cupon, 'VUELVE10');
  igual(d.envios.find((e) => e.id === 'C-1002').paso, 2);
  igual(d.envios.find((e) => e.id === 'C-1001').paso, 1);
  igual(d.omitidos.sin_consentimiento, 1, 'C-1005 no dio permiso');
  igual(d.omitidos.sin_email, 1, 'C-1007 no dejó email');
  igual(d.omitidos.importe_bajo, 1, 'C-1006 no llega al mínimo');
  igual(d.omitidos.caducados, 1, 'C-1008 lleva más de una semana');
  igual(d.recuperados.length, 0, 'una compra sin aviso previo no cuenta como recuperada');
  igual(d.resumen.valor_en_juego, 452.9);

  // sin consentimiento obligatorio, C-1005 entra
  const sinPermiso = await runCode('decidir.js', {
    input: demo, staticData: {},
    nodes: { 'Configuración': await runCode('config.js', { replace: con(['solo_con_consentimiento: true', 'solo_con_consentimiento: false']) }) },
  });
  igual(sinPermiso[0].json.envios.length, 4);

  // ---------- envío y estado ----------
  const prep = await runCode('email-cliente.js', { input: dec, nodes: { ...n, 'Decidir a quién escribo': dec } });
  igual(prep.length, 3);
  ok(prep[0].json.email_to === 'dueno@tienda.test' && prep[0].json.asunto.startsWith('[Demo → carla@ejemplo.test]'),
    'en modo demo el aviso llega al dueño, con el comprador en el asunto');
  const decReal = [{ json: { ...dec[0].json, fuente: 'shopify' } }];
  const prepReal = await runCode('email-cliente.js', { input: decReal, nodes: { ...n, 'Decidir a quién escribo': decReal } });
  ok(prepReal[0].json.email_to === 'carla@ejemplo.test' && prepReal[0].json.email_from === 'hola@tienda.test'
    && !prepReal[0].json.asunto.includes('Demo'), 'fuera de demo el aviso va al comprador');
  ok(prep[0].json.email_html.includes('VUELVE10'), 'el cupón sale en el email del tercer aviso');
  ok(prep[0].json.email_html.includes('bajas@tienda.test'), 'el pie lleva la dirección de baja');
  ok(prep[0].json.email_html.includes('Mesa auxiliar') && prep[0].json.email_html.includes('245,00 €'),
    'el email enseña el carrito y el total');
  ok(!prep[0].json.email_html.includes('Denoro'), 'el email al comprador lo firma la tienda, no Denoro');
  ok(prep[1].json.email_html.includes('sigue guardado') && !prep[1].json.email_html.includes('Código de descuento'),
    'el segundo aviso no regala descuento');

  const recogido = await runCode('recoger-envios.js', {
    input: [{ json: {} }, { json: {} }, { json: { error: { message: 'SMTP 550' } } }],
    nodes: { ...n, 'Preparar avisos': prep }, staticData: est,
  });
  igual(recogido[0].json.enviados.length, 2);
  igual(recogido[0].json.fallidos.length, 1);
  ok(recogido[0].json.fallidos[0].error.includes('550'));
  assert.deepStrictEqual(est.carritos['C-1003'].pasos, [1, 2, 3], 'marca también los pasos saltados'); hechas++;
  igual(est.carritos['C-1001'], undefined, 'el aviso que falló no se marca: se reintenta');
  igual(est.historico.enviados, 2);

  // segunda pasada: a quien ya se escribió no se le repite
  const dec2 = await runCode('decidir.js', { input: demo, nodes: n, staticData: est });
  ok(!dec2[0].json.envios.some((e) => e.id === 'C-1003'), 'no se repite el aviso ya enviado');
  ok(dec2[0].json.envios.some((e) => e.id === 'C-1001'), 'el que falló sí vuelve a intentarse');

  // recuperación: el carrito vuelve completado después de haberle escrito
  const completado = JSON.parse(JSON.stringify(demo));
  const c1003 = completado.find((x) => x.json.id === 'C-1003');
  c1003.json.completado_en = new Date().toISOString();
  const dec3 = await runCode('decidir.js', { input: completado, nodes: n, staticData: est });
  igual(dec3[0].json.recuperados.length, 1);
  igual(dec3[0].json.recuperados[0].pasos, 3);
  igual(dec3[0].json.resumen.valor_recuperado, 245);
  igual(est.historico.recuperados, 1);
  igual(est.carritos['C-1003'], undefined, 'un carrito recuperado sale del seguimiento');

  // tope de envíos
  const tope = await runCode('decidir.js', {
    input: demo, staticData: {},
    nodes: { 'Configuración': await runCode('config.js', { replace: con(['max_envios_por_ejecucion: 50', 'max_envios_por_ejecucion: 2']) }) },
  });
  igual(tope[0].json.envios.length, 2);
  igual(tope[0].json.en_espera, 1);

  // ---------- resumen ----------
  const res = await runCode('resumen.js', {
    input: recogido, nodes: { ...n, 'Decidir a quién escribo': dec },
  });
  const rj = res[0].json;
  ok(rj.email_html.includes('#235b54') && rj.email_html.includes('Denoro Automations'), 'el resumen sí lleva la marca Denoro');
  ok(!/#1f5fd1|#2563eb/.test(rj.email_html), 'sin restos de la paleta azul antigua');
  ok(rj.email_html.includes('sin consentimiento'), 'dice por qué no escribió a algunos');
  ok(rj.email_html.includes('no salieron'), 'avisa del envío fallido');
  ok(rj.asunto.includes('2 avisos'));
  ok(rj.telegram.includes('452,90') || rj.telegram.includes('452,9'), 'el aviso de Telegram lleva el importe en juego');

  const vacio = await runCode('resumen.js', {
    input: await runCode('sin-envios.js', { nodes: n, staticData: est }),
    nodes: { ...n, 'Decidir a quién escribo': [{ json: { ...dec[0].json, envios: [], recuperados: [], resumen: { ...dec[0].json.resumen, avisos: 0, valor_en_juego: 0, valor_recuperado: 0 } } }] },
  });
  ok(vacio[0].json.email_html.includes('Ningún carrito'), 'la pasada sin trabajo no falla');

  // ---------- normalizadores ----------
  const shop = await runCode('normalizar-shopify.js', {
    input: [{ json: { id: 1, token: 'tok1', email: 'A@B.test', total_price: '49.90', currency: 'EUR',
      created_at: '2026-09-19T10:00:00Z', updated_at: '2026-09-19T10:05:00Z', completed_at: null,
      buyer_accepts_marketing: true, abandoned_checkout_url: 'https://t.test/r/1',
      billing_address: { first_name: 'Ana' },
      line_items: [{ title: 'Taza', variant_title: 'Blanca', quantity: 2, price: '14.50' }] } }],
    nodes: n,
  });
  igual(shop[0].json.id, 'tok1');
  igual(shop[0].json.email, 'a@b.test', 'el email se normaliza en minúsculas');
  igual(shop[0].json.lineas[0].titulo, 'Taza · Blanca');
  igual(shop[0].json.acepta_marketing, true);

  const http = await runCode('normalizar-http.js', {
    input: [{ json: { carritos: [
      { cart_id: 'w-9', customer_email: 'X@Y.test', cart_total: '120.00', last_activity: '2026-09-19T08:00:00Z',
        marketing_consent: 1, recovery_url: 'https://t.test/w9', items: [{ name: 'Silla', quantity: 1, price: '120' }] },
      { id: '', email: 'sin-id@t.test' },
      { id: 'w-10', email: 'z@t.test', updated_at: 1758268800 },
    ] } }],
    nodes: n,
  });
  igual(http.length, 2, 'descarta los carritos sin id');
  igual(http[0].json.email, 'x@y.test');
  igual(http[0].json.lineas[0].titulo, 'Silla');
  ok(http[1].json.actualizado_en.startsWith('2025-') || http[1].json.actualizado_en.includes('T'),
    'admite fechas en segundos epoch');
  await assert.rejects(runCode('normalizar-http.js', { input: [{ json: { carritos: [] } }], nodes: n }), /Ningún carrito/); hechas++;

  console.log(`carritos: ${hechas} comprobaciones OK`);
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
