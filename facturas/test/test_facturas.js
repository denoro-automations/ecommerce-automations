const assert = require('assert');
const path = require('path');
const { crearRunCode } = require('../../comun/test/harness');
const runCode = crearRunCode(path.join(__dirname, '..'));

const REAL = [
  ["telegram_chat_id: 'TU_CHAT_ID'", "telegram_chat_id: '123456789'"],
  ["email_to: 'cliente@ejemplo.com'", "email_to: 'dueno@tienda.test'"],
  ["email_from: 'facturacion@tu-dominio.com'", "email_from: 'facturas@tienda.test'"],
];
const con = (...cambios) => [...REAL, ...cambios];
let hechas = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); hechas++; };
const igual = (a, b, msg) => { assert.strictEqual(a, b, msg); hechas++; };
const cerca = (a, b, msg) => { assert.ok(Math.abs(a - b) < 0.001, `${msg}: ${a} vs ${b}`); hechas++; };

(async () => {
  // ---------- configuración ----------
  await assert.rejects(runCode('config.js'), /valor de ejemplo/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["nif: 'B00000000'", "nif: ''"]) }), /NIF/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["nif: 'B00000000'", "nif: 'hola'"]) }), /forma válida/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["direccion: 'Calle Ejemplo 1'", "direccion: ''"]) }), /emisor.direccion/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["documento: 'factura'", "documento: 'ticket'"]) }), /documento/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["serie: 'F'", "serie: ''"]) }), /serie/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(['iva: 21', 'iva: 120']) }), /iva/); hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["gotenberg_url: 'http://host.docker.internal:3000'", "gotenberg_url: 'local'"]) }), /gotenberg/); hechas++;

  const cfg = await runCode('config.js', { replace: REAL });
  const n = { 'Configuración': cfg };
  const pedidos = await runCode('demo-pedidos.js', { nodes: n });
  igual(pedidos.length, 6);

  // ---------- numeración y cuentas ----------
  const est = {};
  const num = await runCode('numerar.js', { input: pedidos, nodes: n, staticData: est });
  const d = num[0].json;
  igual(d.facturas.length, 5, 'factura los pedidos pagados con líneas');
  igual(d.omitidos.sin_pagar, 1, 'el pedido sin pagar no se factura');
  igual(d.resumen.sin_email, 1, 'uno no tiene email del cliente');
  igual(d.facturas[0].numero, `F${new Date().getFullYear()}-0001`);
  igual(d.facturas[4].numero, `F${new Date().getFullYear()}-0005`);
  ok(d.facturas.every((f, i) => f.numero.endsWith(String(i + 1).padStart(4, '0'))), 'correlativos sin huecos');

  const f1 = d.facturas.find((f) => f.numero_pedido === 1001);
  cerca(f1.total, 69.25, 'total con IVA incluido = lo que pagó el cliente');
  cerca(f1.base + f1.cuota, f1.total, 'base + cuota cuadra con el total');
  igual(f1.iva_por_tipo.length, 1);
  igual(f1.iva_por_tipo[0].tipo, 21);
  ok(f1.lineas.some((l) => l.titulo === 'Gastos de envío'), 'el envío entra como línea');

  const f3 = d.facturas.find((f) => f.numero_pedido === 1003);
  cerca(f3.total, 58.55, 'descuento aplicado: el total es lo que pagó el cliente, al céntimo');
  cerca(f3.lineas[0].importe, 38.7, 'el importe de la línea es precio × unidades, sin el descuento repartido');
  cerca(f3.lineas.reduce((s, l) => s + l.importe, 0) - f3.descuento, f3.total, 'líneas − descuento = total');
  // una batería de pedidos al azar: base + cuota tiene que dar siempre lo pagado, al céntimo
  for (let k = 0; k < 200; k++) {
    const lineasAzar = Array.from({ length: 1 + (k % 4) }, (_, i) => ({ titulo: 'x', unidades: 1 + ((k * 7 + i) % 5),
      precio: Math.round((1 + ((k * 13 + i * 31) % 997) / 7) * 100) / 100, iva: [21, 10, 4][(k + i) % 3] }));
    const bruto = lineasAzar.reduce((s, l) => s + l.precio * l.unidades, 0) + 4.95;
    const desc = Math.round((k % 3 ? (k % 9) : 0) * 100) / 100;
    const r = await runCode('numerar.js', { input: [{ json: { ...pedidos[0].json, id: 'azar-' + k, lineas: lineasAzar, descuento: desc } }], nodes: n, staticData: {} });
    const f = r[0].json.facturas[0];
    assert.strictEqual(Math.round(f.total * 100), Math.round((bruto - desc) * 100), `pedido ${k}: ${f.total} vs ${bruto - desc}`);
    assert.strictEqual(Math.round((f.base + f.cuota) * 100), Math.round(f.total * 100), `pedido ${k}: base + cuota`);
  }
  hechas += 400;
  igual(f3.iva_por_tipo.length, 2, 'dos tipos de IVA en la misma factura');
  igual(f3.iva_por_tipo[0].tipo, 21);
  igual(f3.iva_por_tipo[1].tipo, 4);
  cerca(f3.iva_por_tipo.reduce((s, t) => s + t.base + t.cuota, 0), f3.total, 'el desglose por tipos suma el total');

  const f2 = d.facturas.find((f) => f.numero_pedido === 1002);
  igual(f2.cliente.nif, 'B12345678', 'el NIF del cliente empresa va en la factura');

  // precios sin IVA incluido
  const sinIva = await runCode('numerar.js', {
    input: pedidos, staticData: {},
    nodes: { 'Configuración': await runCode('config.js', { replace: con(['precios_con_iva: true', 'precios_con_iva: false']) }) },
  });
  const s1 = sinIva[0].json.facturas.find((f) => f.numero_pedido === 1001);
  cerca(s1.base, 69.25, 'sin IVA incluido, el precio es la base');
  cerca(s1.total, 83.79, 'y el IVA se suma encima');

  // no se vuelve a facturar
  const num2 = await runCode('numerar.js', { input: pedidos, nodes: n, staticData: est });
  igual(num2[0].json.facturas.length, 0);
  igual(num2[0].json.omitidos.ya_facturados, 5);
  igual(est.contador.siguiente, 6, 'el contador no avanza si no se emite nada');

  // un pedido nuevo sigue la serie
  const nuevo = [{ json: { ...pedidos[0].json, id: 'p-9007', numero_pedido: 1007 } }];
  const num3 = await runCode('numerar.js', { input: nuevo, nodes: n, staticData: est });
  igual(num3[0].json.facturas[0].numero, `F${new Date().getFullYear()}-0006`);

  // cambio de año
  const estAnio = { emitidas: {}, contador: { anio: 2025, siguiente: 87 } };
  const num4 = await runCode('numerar.js', { input: pedidos, nodes: n, staticData: estAnio });
  ok(num4[0].json.facturas[0].numero.endsWith('-0001'), 'en enero el correlativo vuelve a 1');
  const estSigue = { emitidas: {}, contador: { anio: 2025, siguiente: 87 } };
  const num5 = await runCode('numerar.js', {
    input: pedidos, staticData: estSigue,
    nodes: { 'Configuración': await runCode('config.js', { replace: con(['reiniciar_cada_anio: true', 'reiniciar_cada_anio: false']) }) },
  });
  ok(num5[0].json.facturas[0].numero.endsWith('-0087'), 'sin reinicio, la serie continúa');

  // tope por ejecución
  const tope = await runCode('numerar.js', {
    input: pedidos, staticData: {},
    nodes: { 'Configuración': await runCode('config.js', { replace: con(['max_por_ejecucion: 25', 'max_por_ejecucion: 2']) }) },
  });
  igual(tope[0].json.facturas.length, 2);
  igual(tope[0].json.en_espera, 3);
  await assert.rejects(runCode('numerar.js', { input: [], nodes: n, staticData: {} }), /ningún pedido/); hechas++;

  // ---------- documento ----------
  const docs = await runCode('documento.js', { nodes: { ...n, 'Numerar facturas': num } });
  igual(docs.length, 5);
  const html = Buffer.from(docs[0].binary.index_html.data, 'base64').toString('utf8');
  ok(html.includes(d.facturas[0].numero) && html.includes('B00000000'), 'el PDF lleva número y NIF del emisor');
  ok(html.includes('Base imponible') && html.includes('IVA 21 %'), 'con desglose de IVA');
  ok(html.includes('@page'), 'con formato A4 para el PDF');
  igual((html.match(/<section/g) || []).length, 1);
  ok(docs[0].json.nombre_pdf.startsWith('factura-F'));

  const ambos = await runCode('documento.js', {
    nodes: { ...n, 'Numerar facturas': [{ json: { ...d, documento: 'ambos' } }] },
  });
  const htmlAmbos = Buffer.from(ambos[0].binary.index_html.data, 'base64').toString('utf8');
  igual((htmlAmbos.match(/<section/g) || []).length, 2, 'factura y albarán en el mismo PDF');
  ok(htmlAmbos.includes('Albarán'));
  const soloAlbaran = await runCode('documento.js', {
    nodes: { ...n, 'Numerar facturas': [{ json: { ...d, documento: 'albaran' } }] },
  });
  const htmlAlb = Buffer.from(soloAlbaran[0].binary.index_html.data, 'base64').toString('utf8');
  ok(!htmlAlb.includes('Base imponible'), 'el albarán no lleva importes');
  ok(htmlAlb.includes('Enviar a'));

  // ---------- envío ----------
  const pdfFalso = { data: Buffer.from('%PDF-1.4 falso').toString('base64'), mimeType: 'application/pdf' };
  const envio = await runCode('preparar-envio.js', {
    input: docs.map((doc, i) => (i === 4 ? { json: {}, binary: {} } : { json: {}, binary: { factura_pdf: pdfFalso } })),
    nodes: { ...n, 'Numerar facturas': num, 'Preparar documentos': docs },
  });
  igual(envio.length, 5);
  igual(envio[0].binary.factura.fileName, docs[0].json.nombre_pdf);
  igual(envio[0].json.con_pdf, true);
  igual(envio[4].json.con_pdf, false, 'si Gotenberg no responde se detecta');
  ok(envio[4].binary.factura.fileName.endsWith('.html'), 'y se adjunta el HTML en su lugar');
  const marta = envio.find((e) => e.json.cliente.nombre === 'Marta Gil');
  igual(marta.json.email_to, '', 'sin email del cliente no se manda a nadie');
  ok(envio[0].json.email_to === 'dueno@tienda.test' && envio[0].json.asunto.startsWith('[Demo → '),
    'en modo demo la factura llega al dueño');
  const numReal = [{ json: { ...num[0].json, fuente: 'shopify' } }];
  const envioReal = await runCode('preparar-envio.js', {
    input: docs.map(() => ({ json: {}, binary: { factura_pdf: pdfFalso } })),
    nodes: { ...n, 'Numerar facturas': numReal, 'Preparar documentos': docs },
  });
  ok(envioReal[0].json.email_to === envioReal[0].json.cliente.email && !envioReal[0].json.asunto.startsWith('[Demo'),
    'fuera de demo la factura va al cliente');
  ok(envio[0].json.email_html.includes('Tienda Demo, S.L.'), 'el email lo firma la tienda');
  ok(envio[0].json.asunto.includes('Factura F'));

  const recogido = await runCode('recoger-facturas.js', {
    input: envio.map((e, i) => (i === 1 ? { json: { error: { message: 'SMTP 421' } } } : { json: {} })),
    nodes: { ...n, 'Preparar envío': envio },
  });
  const rj = recogido[0].json;
  igual(rj.enviadas.length + rj.fallidas.length + rj.sin_email.length, 5);
  igual(rj.fallidas.length, 1);
  igual(rj.sin_email.length, 1);
  igual(rj.sin_pdf, 1);

  // ---------- registro ----------
  const reg = await runCode('registro.js', { input: recogido, nodes: { ...n, 'Numerar facturas': num } });
  const g = reg[0].json;
  ok(g.email_html.includes('#235b54') && g.email_html.includes('Denoro Automations'));
  ok(!/#1f5fd1|#2563eb/.test(g.email_html), 'sin restos de la paleta azul antigua');
  ok(g.email_html.includes('no se pudieron enviar'), 'avisa del fallo de envío');
  ok(g.email_html.includes('HTML en vez de PDF'), 'avisa de que Gotenberg no respondió');
  ok(g.asunto.includes('5 factura'));
  const csv = Buffer.from(reg[0].binary.libro.data, 'base64').toString('utf8');
  igual(csv.replace('﻿', '').split('\n').length, 6, 'cabecera + 5 facturas');
  ok(csv.includes('B12345678'), 'el libro lleva el NIF del cliente');
  ok(csv.includes('21% + 4%'), 'y los tipos de IVA aplicados');
  ok(csv.includes(';sin email'));

  const vacio = await runCode('registro.js', {
    input: await runCode('sin-facturas.js', { nodes: n }),
    nodes: { ...n, 'Numerar facturas': num2 },
  });
  ok(vacio[0].json.email_html.includes('No había pedidos nuevos'), 'la pasada sin trabajo no falla');
  assert.deepStrictEqual(vacio[0].binary, {}); hechas++;

  // ---------- normalizadores ----------
  const shop = await runCode('normalizar-shopify.js', {
    input: [{ json: { id: 55, order_number: 1055, processed_at: '2026-09-18T09:00:00Z', email: 'A@B.test',
      financial_status: 'paid', currency: 'EUR', total_discounts: '3.00',
      billing_address: { first_name: 'Ana', last_name: 'Ruiz', address1: 'C/ Uno', zip: '28001', city: 'Madrid', country: 'España' },
      note_attributes: [{ name: 'NIF', value: '12345678Z' }],
      shipping_lines: [{ price: '4.95' }],
      line_items: [{ title: 'Taza', quantity: 2, price: '14.50', tax_lines: [{ rate: 0.21 }] }] } }],
    nodes: n,
  });
  igual(shop[0].json.cliente.nombre, 'Ana Ruiz');
  igual(shop[0].json.cliente.nif, '12345678Z', 'recoge el NIF de las notas del pedido');
  igual(shop[0].json.lineas[0].iva, 21);
  igual(shop[0].json.pagado, true);

  const woo = await runCode('normalizar-woo.js', {
    input: [{ json: { id: 77, number: '77', date_paid: '2026-09-18T09:00:00Z', status: 'completed', currency: 'EUR',
      billing: { first_name: 'Luis', last_name: 'Sáez', email: 'L@S.test', postcode: '08001', city: 'Barcelona', address_1: 'Gran Via 1', country: 'ES' },
      meta_data: [{ key: '_billing_nif', value: '87654321X' }],
      line_items: [{ name: 'Silla', quantity: 2, total: '100.00', total_tax: '21.00' }],
      shipping_total: '4.00', shipping_tax: '0.84', discount_total: '0' } }],
    nodes: n,
  });
  igual(woo[0].json.lineas[0].precio, 60.5, 'el precio unitario incluye su IVA');
  igual(woo[0].json.cliente.nif, '87654321X');
  cerca(woo[0].json.envio, 4.84, 'el envío con su IVA');

  console.log(`facturas: ${hechas} comprobaciones OK`);
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
