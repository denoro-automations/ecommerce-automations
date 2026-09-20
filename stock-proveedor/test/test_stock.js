const assert = require('assert');
const path = require('path');
const { crearRunCode } = require('../../comun/test/harness');
const runCode = crearRunCode(path.join(__dirname, '..'));

const REAL = [
  ["telegram_chat_id: 'TU_CHAT_ID'", "telegram_chat_id: '123456789'"],
  ["email_to: 'cliente@ejemplo.com'", "email_to: 'dueno@tienda.test'"],
  ["email_from: 'stock@tu-dominio.com'", "email_from: 'stock@denoro.test'"],
];
const con = (...cambios) => [...REAL, ...cambios];
const EN_VIVO = ['modo_prueba: true', 'modo_prueba: false'];
let hechas = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); hechas++; };
const igual = (a, b, msg) => { assert.strictEqual(a, b, msg); hechas++; };

(async () => {
  // ---------- configuración ----------
  await assert.rejects(runCode('config.js'), /valor de ejemplo/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["fuente: 'demo'", "fuente: 'ftp'"]) }), /fuente/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["destino: 'demo'", "destino: 'prestashop'"]) }), /destino/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["fuente: 'demo'", "fuente: 'url'"]) }), /feed_url/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["destino: 'demo'", "destino: 'shopify'"], EN_VIVO) }), /dominio_shopify/); hechas++;
  await assert.rejects(runCode('config.js', {
    replace: con(["destino: 'demo'", "destino: 'shopify'"], EN_VIVO, ["dominio_shopify: ''", "dominio_shopify: 'x.myshopify.com'"]),
  }), /location_id/); hechas++;
  ok((await runCode('config.js', { replace: con(["destino: 'demo'", "destino: 'shopify'"]) }))[0].json.destino === 'shopify',
    'en modo prueba no exige credenciales de Shopify');
  await assert.rejects(runCode('config.js', { replace: con(['max_cambios_pct: 40', 'max_cambios_pct: 0']) }), /max_cambios_pct/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(['margen_stock: 0', 'margen_stock: -3']) }), /margen_stock/); hechas++;

  const cfg = await runCode('config.js', { replace: REAL });
  const n = { 'Configuración': cfg };
  igual(cfg[0].json.modo_prueba, true, 'de fábrica viene en modo prueba');

  // ---------- datos de ejemplo ----------
  const feed = await runCode('demo-feed.js', { nodes: n });
  const tienda = await runCode('demo-tienda.js', { nodes: n });
  igual(feed.length, 18);
  igual(tienda.length, 18);
  ok(feed.every((f) => f.json._lado === 'feed') && tienda.every((t) => t.json._lado === 'tienda'),
    'cada item dice de qué lado viene');

  // ---------- comparación ----------
  const juntos = [...feed, ...tienda];
  const est = {};
  const comp = await runCode('comparar.js', { input: juntos, nodes: n, staticData: est });
  const j = comp[0].json;
  igual(j.resumen.cambios, 7);
  igual(j.resumen.agotados, 2);
  igual(j.resumen.repuestos, 1);
  igual(j.resumen.altas_nuevas, 1);
  igual(j.resumen.descatalogados, 1);
  igual(j.resumen.cambios_precio, 0, 'en la primera vuelta no hay precio anterior con el que comparar');
  igual(j.bloqueado, false);
  igual(j.aplicar, false, 'en modo prueba nunca se aplica');
  ok(j.cambios.find((c) => c.sku === 'EST-02').tipo === 'agotado');
  ok(j.cambios.find((c) => c.sku === 'PER-01').tipo === 'repuesto');
  ok(j.nuevos[0].sku === 'ESP-12', 'la referencia que la tienda no tiene sale como alta');
  ok(j.descatalogados[0].sku === 'ANT-99', 'lo que no viene en el feed se informa, no se pone a 0');
  ok(!j.cambios.some((c) => c.sku === 'ANT-99'), 'una referencia ausente del feed NUNCA se toca');
  ok(est.precios_proveedor && est.precios_proveedor['MES-01'] === 289, 'guarda la foto de precios del proveedor');

  // segunda vuelta: el proveedor sube un precio
  const feedCaro = JSON.parse(JSON.stringify(feed));
  feedCaro[0].json.precio = 319;
  const comp2 = await runCode('comparar.js', { input: [...feedCaro, ...tienda], nodes: n, staticData: est });
  igual(comp2[0].json.precios.length, 1);
  igual(comp2[0].json.precios[0].variacion_pct, 10.4);
  const feedPoco = JSON.parse(JSON.stringify(feed));
  feedPoco[0].json.precio = 289.5;   // +0,17 %: por debajo del umbral
  igual((await runCode('comparar.js', {
    input: [...feedPoco, ...tienda], nodes: n, staticData: { precios_proveedor: { 'MES-01': 289 } },
  }))[0].json.precios.length, 0, 'los cambios de precio pequeños no molestan');

  // aplicar de verdad
  const vivo = { 'Configuración': await runCode('config.js', { replace: con(EN_VIVO) }) };
  const compVivo = await runCode('comparar.js', { input: juntos, nodes: vivo, staticData: {} });
  igual(compVivo[0].json.aplicar, true, 'fuera del modo prueba sí aplica');

  // margen de seguridad
  const conMargen = { 'Configuración': await runCode('config.js', { replace: con(['margen_stock: 0', 'margen_stock: 2']) }) };
  const cm = await runCode('comparar.js', { input: juntos, nodes: conMargen, staticData: {} });
  igual(cm[0].json.cambios.find((c) => c.sku === 'SIL-04').despues, 38, 'el margen resta unidades al stock del proveedor');
  igual(cm[0].json.cambios.find((c) => c.sku === 'EST-02').despues, 0, 'el margen no baja de cero');

  // ---------- frenos de seguridad ----------
  const feedCorto = feed.slice(0, 3);
  const corto = await runCode('comparar.js', { input: [...feedCorto, ...tienda], nodes: vivo, staticData: {} });
  igual(corto[0].json.bloqueado, true);
  ok(corto[0].json.motivos[0].includes('incompleto'), 'un feed corto se bloquea');
  igual(corto[0].json.aplicar, false, 'bloqueado nunca aplica');

  const estLimpio = { precios_proveedor: { 'MES-01': 289 } };
  await runCode('comparar.js', { input: [...feedCorto, ...tienda], nodes: vivo, staticData: estLimpio });
  assert.deepStrictEqual(estLimpio.precios_proveedor, { 'MES-01': 289 },
    'un feed bloqueado no ensucia la referencia de precios'); hechas++;

  const estricto = { 'Configuración': await runCode('config.js', { replace: con(EN_VIVO, ['max_cambios_pct: 40', 'max_cambios_pct: 30']) }) };
  const dem = await runCode('comparar.js', { input: juntos, nodes: estricto, staticData: {} });
  igual(dem[0].json.bloqueado, true);
  ok(dem[0].json.motivos[0].includes('38.9 %'), 'dice exactamente cuánto se pasa');

  const vaciado = JSON.parse(JSON.stringify(feed)).map((f) => ({ json: { ...f.json, stock: 0 } }));
  const cero = await runCode('comparar.js', { input: [...vaciado, ...tienda], nodes: vivo, staticData: {} });
  igual(cero[0].json.bloqueado, true, 'un feed que vaciaría la tienda se bloquea');
  ok(cero[0].json.motivos.some((m) => m.includes('agotado')));

  // stock no gestionado en la tienda
  const sinGestion = JSON.parse(JSON.stringify(tienda));
  sinGestion[0].json.gestiona_stock = false;
  const sg = await runCode('comparar.js', { input: [...feed, ...sinGestion], nodes: n, staticData: {} });
  ok(sg[0].json.sin_gestion.some((x) => x.sku === 'MES-01'), 'se salta lo que la tienda no gestiona');
  ok(!sg[0].json.cambios.some((c) => c.sku === 'MES-01'));

  await assert.rejects(runCode('comparar.js', { input: tienda, nodes: n }), /proveedor/); hechas++;
  await assert.rejects(runCode('comparar.js', { input: feed, nodes: n }), /tienda/); hechas++;

  // ---------- lector de feed ----------
  const leer = (texto) => runCode('leer-feed.js', { input: [{ json: { data: texto } }], nodes: n });
  const csv = await leer('sku;stock;precio;nombre\nA-1;12;1.234,50;Mesa\nA-2;0;89,00;Silla\n');
  igual(csv.length, 2);
  igual(csv[0].json.stock, 12);
  igual(csv[0].json.precio, 1234.5, 'miles con punto y decimales con coma');
  igual(csv[1].json.stock, 0);
  const csvIngles = await leer('sku,quantity,price\nB-1,5,"1,299.99"\n');
  igual(csvIngles[0].json.precio, 1299.99, 'formato inglés');
  const dispo = await leer('referencia;disponibilidad\nC-1;out of stock\nC-2;in stock\n');
  igual(dispo[0].json.stock, 0, '"out of stock" es cero');
  igual(dispo[1].json.stock, null, '"in stock" sin cantidad no cambia nada');

  const xml = await leer(`<?xml version="1.0"?><productos>
    <producto><sku>X-1</sku><stock>7</stock><precio>19,90</precio><nombre><![CDATA[Vela & co]]></nombre></producto>
    <producto><sku>X-2</sku><stock>0</stock><precio>5,00</precio><nombre>Taza</nombre></producto>
  </productos>`);
  igual(xml.length, 2);
  igual(xml[0].json.titulo, 'Vela & co', 'lee CDATA');
  igual(xml[1].json.stock, 0);
  const google = await leer(`<rss><channel>
    <item><g:id>G-1</g:id><g:price>24.00 EUR</g:price><g:availability>in stock</g:availability><title>Camiseta</title></item>
  </channel></rss>`);
  igual(google[0].json.sku, 'G-1', 'admite el prefijo g: de los feeds de Google');
  igual(google[0].json.precio, 24);
  await assert.rejects(leer(''), /vacío/); hechas++;
  await assert.rejects(leer('<lista><otra>1</otra></lista>'), /bloques/); hechas++;
  await assert.rejects(leer('nombre;precio\nMesa;10\n'), /reconocible/); hechas++;
  const repes = await leer('sku;stock\nD-1;5\nD-1;9\n');
  igual(repes.length, 1, 'se queda con la primera aparición de cada referencia');

  // ---------- aplicación ----------
  const enVivoComp = { 'Comparar con la tienda': compVivo };
  const prep = await runCode('preparar-actualizacion.js', { nodes: { ...n, ...enVivoComp } });
  igual(prep.length, 7);
  ok(prep[0].json.sku && prep[0].json.despues !== undefined && prep[0].json.destino === 'demo');
  const nada = await runCode('preparar-actualizacion.js', { nodes: { ...n, 'Comparar con la tienda': comp } });
  igual(nada.length, 0, 'en modo prueba no se prepara nada');

  const simul = await runCode('simular.js', { input: prep, nodes: n });
  igual(simul.length, 7);
  const recogido = await runCode('recoger.js', {
    input: [...simul.slice(0, 5).map((s) => ({ json: s.json })), { json: { error: { message: 'API rate limit' } } }, { json: {} }],
    nodes: { ...n, 'Preparar actualizaciones': prep },
  });
  igual(recogido[0].json.aplicados.length, 6);
  igual(recogido[0].json.fallidos.length, 1);
  ok(recogido[0].json.fallidos[0].error.includes('rate limit'));

  // ---------- informe ----------
  const inf = await runCode('informe.js', {
    input: [{ json: { aplicado: false, aplicados: [], fallidos: [] } }],
    nodes: { ...n, 'Comparar con la tienda': comp },
  });
  const ij = inf[0].json;
  ok(ij.email_html.includes('#235b54') && ij.email_html.includes('Denoro Automations'), 'email con la marca');
  ok(!/#1f5fd1|#2563eb/.test(ij.email_html), 'sin restos de la paleta azul antigua');
  ok(ij.email_html.includes('Modo prueba'), 'avisa de que no ha tocado nada');
  ok(ij.asunto.includes('(prueba)'));
  ok(ij.telegram.includes('7'));
  const csvSalida = Buffer.from(inf[0].binary.cambios.data, 'base64').toString('utf8');
  igual(csvSalida.replace('﻿', '').split('\n').length, 1 + 7 + 1 + 1, 'cabecera + 7 cambios + alta + descatalogado');
  ok(csvSalida.includes('solo prueba'));

  const infBloqueado = await runCode('informe.js', {
    input: [{ json: { aplicado: false, aplicados: [], fallidos: [] } }],
    nodes: { ...n, 'Comparar con la tienda': corto },
  });
  ok(infBloqueado[0].json.asunto.includes('bloqueado'));
  ok(infBloqueado[0].json.email_html.includes('No se ha tocado la tienda'));

  const infAplicado = await runCode('informe.js', {
    input: [{ json: { aplicado: true, aplicados: prep.map((p) => p.json).slice(0, 6), fallidos: [{ ...prep[6].json, error: 'API rate limit' }] } }],
    nodes: { ...n, 'Comparar con la tienda': compVivo },
  });
  ok(infAplicado[0].json.email_html.includes('6 cambios aplicados y 1 con error'));
  ok(Buffer.from(infAplicado[0].binary.cambios.data, 'base64').toString('utf8').includes('ERROR'));

  console.log(`stock-proveedor: ${hechas} comprobaciones OK`);
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
