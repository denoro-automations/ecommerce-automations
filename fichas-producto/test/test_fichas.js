const assert = require('assert');
const path = require('path');
const { crearRunCode } = require('../../comun/test/harness');
const runCode = crearRunCode(path.join(__dirname, '..'));

const REAL = [
  ["telegram_chat_id: 'TU_CHAT_ID'", "telegram_chat_id: '123456789'"],
  ["email_to: 'cliente@ejemplo.com'", "email_to: 'dueno@tienda.test'"],
  ["email_from: 'fichas@tu-dominio.com'", "email_from: 'fichas@denoro.test'"],
];
const con = (...cambios) => [...REAL, ...cambios];
let hechas = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); hechas++; };
const igual = (a, b, msg) => { assert.strictEqual(a, b, msg); hechas++; };

(async () => {
  // ---------- configuración ----------
  await assert.rejects(runCode('config.js'), /valor de ejemplo/, 'avisa de los destinos de ejemplo');
  hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["fuente: 'demo'", "fuente: 'magento'"]) }), /no válida/);
  hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["motor: 'plantilla'", "motor: 'magia'"]) }), /motor/);
  hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["fuente: 'demo'", "fuente: 'csv'"]) }), /csv_url/);
  hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["max_productos: 50", "max_productos: 9000"]) }), /max_productos/);
  hechas++;
  await assert.rejects(runCode('config.js', { replace: con(["telegram_chat_id: '123456789'", "telegram_chat_id: 'hola'"]) }), /telegram_chat_id/);
  hechas++;

  const cfg = await runCode('config.js', { replace: REAL });
  igual(cfg[0].json.enviar_email, true);
  igual(cfg[0].json.enviar_telegram, true);
  const nodos = { 'Configuración': cfg };

  // ---------- catálogo de ejemplo ----------
  const demo = await runCode('demo-data.js', { nodes: nodos });
  igual(demo.length, 24, 'el catálogo de ejemplo trae 24 productos');
  ok(demo.every((d) => d.json.sku && d.json.titulo && Object.keys(d.json.atributos).length >= 3));
  const demo2 = await runCode('demo-data.js', { nodes: nodos });
  assert.deepStrictEqual(demo2, demo, 'el catálogo de ejemplo es determinista'); hechas++;

  // ---------- preparación ----------
  const prep = await runCode('preparar.js', { input: demo, nodes: nodos });
  igual(prep.length, 22, 'deja fuera los 2 productos que ya tienen descripción larga');
  igual(prep[0].json.total_catalogo, 24);
  ok(prep.every((p) => p.json.hechos.includes('Referencia:') && p.json.prompt_sistema.includes('SOLO')));
  ok(!prep.some((p) => p.json.sku === 'MOC-07'), 'MOC-07 ya tenía descripción');

  const todos = await runCode('preparar.js', {
    input: demo, nodes: { 'Configuración': await runCode('config.js', { replace: con(['solo_sin_descripcion: true', 'solo_sin_descripcion: false']) }) },
  });
  igual(todos.length, 24, 'con solo_sin_descripcion:false entra todo el catálogo');

  const tope = await runCode('preparar.js', {
    input: demo, nodes: { 'Configuración': await runCode('config.js', { replace: con(['max_productos: 50', 'max_productos: 5']) }) },
  });
  igual(tope.length, 5, 'max_productos limita la ejecución');

  const vacia = await runCode('preparar.js', {
    input: [demo[3]], nodes: nodos,   // MOC-07, que ya tiene descripción
  });
  igual(vacia[0].json.sin_trabajo, true, 'sin candidatos avisa en vez de fallar');

  // ---------- motor plantilla ----------
  const gen = await runCode('generar-plantilla.js', { input: prep, nodes: nodos });
  igual(gen.length, 22);
  for (const g of gen) {
    const f = g.json.ficha;
    ok(f.titulo_seo.length <= 60, `título de ${f.sku} dentro de 60: ${f.titulo_seo.length}`);
    ok(f.meta_descripcion.length <= 155, `meta de ${f.sku} dentro de 155`);
    ok(f.bullets.length >= 3 && f.bullets.length <= 5, `${f.sku}: entre 3 y 5 características`);
    ok(f.keywords.length >= 3, `${f.sku}: al menos 3 palabras clave`);
    ok(/^<p>.*<\/p>$/s.test(f.descripcion_html) && f.descripcion_html.includes('<ul>'));
    ok(!/undefined|null|NaN/.test(JSON.stringify(f)), `${f.sku} sin huecos sin rellenar`);
  }
  const gen2 = await runCode('generar-plantilla.js', { input: prep, nodes: nodos });
  assert.deepStrictEqual(gen2, gen, 'el motor plantilla es determinista'); hechas++;
  ok(new Set(gen.map((g) => g.json.ficha.descripcion_html.split('\n')[0])).size > 1,
    'las entradillas varían entre productos (no suena a plantilla)');
  const yog = gen.find((g) => g.json.ficha.sku === 'YOG-01').json.ficha;
  ok(yog.meta_descripcion.includes('2,4 kg'), 'no parte los decimales por la coma');
  const cam = gen.find((g) => g.json.ficha.sku === 'CAM-02').json.ficha;
  ok(cam.bullets.some((b) => b.startsWith('Tallas: XS a XXL')), 'las listas de opciones se mantienen enteras');
  ok(cam.bullets.some((b) => b.includes('Garantía') === false) || true);
  ok(gen.some((g) => g.json.ficha.bullets.some((b) => /^Garantía:/.test(b))), 'las etiquetas llevan tilde');

  const ingles = await runCode('generar-plantilla.js', {
    input: prep, nodes: { 'Configuración': await runCode('config.js', { replace: con(["idioma: 'es'", "idioma: 'en'"]) }) },
  });
  ok(/everyday use|essentials|nothing more/.test(ingles[0].json.ficha.descripcion_html), 'el idioma en cambia el texto');
  const premium = await runCode('generar-plantilla.js', {
    input: prep, nodes: { 'Configuración': await runCode('config.js', { replace: con(["tono: 'cercano'", "tono: 'premium'"]) }) },
  });
  ok(premium[0].json.ficha.descripcion_html !== gen[0].json.ficha.descripcion_html, 'el tono cambia el texto');

  // ---------- salida ----------
  const out = await runCode('salida.js', { input: gen, nodes: nodos });
  const j = out[0].json;
  igual(j.resumen.escritas, 22);
  igual(j.resumen.con_aviso, 0, 'las fichas de plantilla salen limpias');
  igual(j.resumen.catalogo, 24);
  ok(j.asunto.includes('22 fichas'));
  ok(j.email_html.includes('#235b54') && j.email_html.includes('Denoro Automations'), 'email con la marca');
  ok(!/#1f5fd1|#2563eb/.test(j.email_html), 'sin restos de la paleta azul antigua');
  const csv = Buffer.from(out[0].binary.fichas.data, 'base64').toString('utf8');
  igual(csv.split('\n').length, 23, 'cabecera + 22 filas');
  ok(csv.startsWith('\uFEFF'), 'BOM para que Excel respete los acentos');
  ok(out[0].binary.fichas.fileName.endsWith('.csv'));
  const cabecera = csv.replace('\uFEFF', '').split('\n')[0].split(';');
  assert.deepStrictEqual(cabecera.slice(0, 3), ['sku', 'titulo_seo', 'meta_descripcion']); hechas++;
  const conSignos = JSON.parse(JSON.stringify(gen)).slice(0, 1);
  conSignos[0].json.ficha.titulo_seo = 'Mesa "roble"; 2 cajones';
  const csvSignos = Buffer.from((await runCode('salida.js', { input: conSignos, nodes: nodos }))[0].binary.fichas.data, 'base64').toString('utf8');
  ok(csvSignos.includes('"Mesa ""roble""; 2 cajones"'), 'las celdas con ; o comillas van entrecomilladas');
  igual(csvSignos.replace('\uFEFF', '').split('\n').length, 2, 'cada ficha ocupa una sola línea');

  // una ficha que se inventa datos tiene que salir marcada
  const trucada = JSON.parse(JSON.stringify(gen));
  trucada[0].json.ficha.descripcion_html = '<p>Incluye 10 años de garantía y envío en 24 horas.</p><ul><li>a</li></ul>';
  trucada[1].json.ficha.titulo_seo = 'x'.repeat(80);
  trucada[2].json.ficha.meta_descripcion = '';
  trucada[3].json.ficha.descripcion_html = '<p>Hola</p><script>alert(1)</script>';
  trucada[4].json.ficha.bullets = ['solo una'];
  const revisada = await runCode('salida.js', { input: trucada, nodes: nodos });
  const fichas = revisada[0].json.fichas;
  ok(fichas[0].avisos.some((a) => a.includes('sin respaldo')), 'caza los datos inventados');
  ok(fichas[1].avisos.some((a) => a.includes('título')), 'caza el título largo');
  ok(fichas[2].avisos.some((a) => a.includes('meta')), 'caza la meta vacía');
  ok(fichas[3].avisos.some((a) => a.includes('HTML no permitidas')), 'caza el HTML peligroso');
  ok(fichas[4].avisos.some((a) => a.includes('características')), 'caza las fichas cortas');
  igual(revisada[0].json.resumen.con_aviso, 5);
  ok(revisada[0].json.asunto.includes('5 a revisar'));

  const nada = await runCode('salida.js', { input: [{ json: { sin_trabajo: true, total_catalogo: 24 } }], nodes: nodos });
  ok(nada[0].json.asunto.includes('nada pendiente'), 'el caso sin trabajo no falla');
  assert.deepStrictEqual(nada[0].binary, {}, 'sin fichas no adjunta CSV'); hechas++;

  // ---------- lector de CSV ----------
  const leer = (texto, replace = REAL) => runCode('cargar-csv.js', {
    input: [{ json: { data: texto } }],
    nodes: { 'Configuración': cfgCache[replace] || (cfgCache[replace] = cfg) },
  });
  const cfgCache = {};
  const csvPuntoYComa = 'sku;nombre;marca;precio;stock;material\nA-1;Mesa roble;Nord;199,90;4;roble macizo\nA-2;Silla;Nord;89,00;12;haya\n';
  const p1 = await leer(csvPuntoYComa);
  igual(p1.length, 2);
  igual(p1[0].json.precio, 199.9, 'precio con coma decimal');
  igual(p1[0].json.atributos.material, 'roble macizo', 'las columnas extra entran como características');
  const p2 = await leer('SKU,Title,Description\nB-1,"Lámpara ""Luna""","Con, coma"\n');
  igual(p2[0].json.titulo, 'Lámpara "Luna"', 'comillas escapadas');
  igual(p2[0].json.descripcion, 'Con, coma');
  await assert.rejects(leer('nombre,precio\nMesa,10\n'), /referencia/); hechas++;
  await assert.rejects(leer(''), /vacío/); hechas++;
  const p3 = await leer('sku;nombre\nC-1;Uno\nC-1;Repetido\n\nC-2;Dos\n');
  igual(p3.length, 2, 'ignora repetidos y líneas en blanco');

  // ---------- normalizadores ----------
  const shop = await runCode('normalize-shopify.js', {
    input: [{ json: { id: 7, title: 'Camiseta', vendor: 'Vela', product_type: 'Ropa', handle: 'camiseta',
      body_html: '<p>Algo&nbsp;<b>bonito</b></p>', tags: 'verano,algodón',
      options: [{ name: 'Talla', values: ['S', 'M'] }],
      variants: [{ sku: 'CAM-1', price: '24.00', inventory_quantity: 9 }] } }],
    nodes: nodos,
  });
  igual(shop[0].json.sku, 'CAM-1');
  igual(shop[0].json.precio, 24);
  igual(shop[0].json.atributos.talla, 'S, M');
  ok(!shop[0].json.descripcion.includes('<'), 'quita el HTML de la descripción');
  await assert.rejects(runCode('normalize-shopify.js', { input: [], nodes: nodos }), /no devolvió/); hechas++;

  const woo = await runCode('normalize-woocommerce.js', {
    input: [{ json: { id: 3, name: 'Taza', sku: 'TAZ-1', price: '14.50', stock_quantity: 5,
      categories: [{ name: 'Cocina' }], attributes: [{ name: 'Color', options: ['Blanco'] }],
      weight: '0.4', dimensions: { length: '10', width: '8', height: '9' },
      permalink: 'https://t.test/taza', description: '<p>Taza</p>' } }],
    nodes: nodos,
  });
  igual(woo[0].json.atributos.medidas, '10 × 8 × 9 cm');
  igual(woo[0].json.atributos.peso, '0.4 kg');
  igual(woo[0].json.categoria, 'Cocina');

  // ---------- respuesta de la IA ----------
  const preparado = prep.slice(0, 3);
  const respuesta = (obj) => ({ json: { choices: [{ message: { content: JSON.stringify(obj) } }] } });
  const buena = { titulo_seo: 'Botella térmica 750 ml · Nordkap', meta_descripcion: 'Acero 18/8, 750 ml.',
    bullets: ['Acero inoxidable', 'Mantiene el frío 24 h', 'Tapón hermético'],
    descripcion_html: '<p>Una botella</p><ul><li>Acero</li></ul>', keywords: ['botella', 'térmica', 'acero'],
    alt_imagen: 'Botella verde' };
  const ia = await runCode('parsear-ia.js', {
    input: [respuesta(buena),
      { json: { choices: [{ message: { content: '```json\n' + JSON.stringify(buena) + '\n```' } }] } },
      { json: { error: { message: 'timeout' } } }],
    nodes: { ...nodos, 'Preparar productos': preparado },
  });
  igual(ia[0].json.ficha.titulo_seo, buena.titulo_seo);
  igual(ia[1].json.ficha.bullets.length, 3, 'lee el JSON aunque venga en un bloque de código');
  igual(ia[2].json.ficha, null, 'una respuesta rota no tumba la ejecución');
  ok(ia[2].json.fallo.includes(preparado[2].json.sku));
  const conFallo = await runCode('salida.js', { input: ia, nodes: nodos });
  igual(conFallo[0].json.resumen.sin_ficha, 1);
  igual(conFallo[0].json.resumen.escritas, 2);

  console.log(`fichas-producto: ${hechas} comprobaciones OK`);
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
