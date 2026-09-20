// Asigna el número correlativo y calcula la base, el IVA por tipos y el total.
// Un pedido ya facturado NUNCA se vuelve a numerar: el número queda guardado por pedido.
const cfg = $('Configuración').first().json;
const estado = $getWorkflowStaticData('global');
estado.emitidas = estado.emitidas || {};
estado.contador = estado.contador || { anio: null, siguiente: 1 };

const pedidos = $input.all().map((i) => i.json).filter((p) => p && p.id);
if (!pedidos.length) throw new Error('No llegó ningún pedido');

const anio = new Date(cfg.ahora).getFullYear();
if (estado.contador.anio === null) estado.contador.anio = anio;
else if (cfg.reiniciar_cada_anio && estado.contador.anio !== anio) estado.contador = { anio, siguiente: 1 };

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const omitidos = { ya_facturados: 0, sin_pagar: 0, sin_lineas: 0 };
const pendientes = [];
for (const p of pedidos) {
  if (estado.emitidas[p.id]) { omitidos.ya_facturados += 1; continue; }
  if (!p.pagado) { omitidos.sin_pagar += 1; continue; }
  if (!Array.isArray(p.lineas) || !p.lineas.length) { omitidos.sin_lineas += 1; continue; }
  pendientes.push(p);
}
pendientes.sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));   // por fecha: el número sigue al tiempo
const aFacturar = pendientes.slice(0, cfg.max_por_ejecucion);

const facturas = [];
for (const p of aFacturar) {
  const brutas = p.lineas.map((l) => ({
    titulo: l.titulo || 'Producto',
    unidades: Number(l.unidades) || 1,
    precio: Number(l.precio) || 0,
    iva: (l.iva === null || l.iva === undefined) ? cfg.iva : Number(l.iva),
  }));
  if (Number(p.envio) > 0) {
    brutas.push({ titulo: 'Gastos de envío', unidades: 1, precio: Number(p.envio), iva: cfg.iva });
  }
  const totalBruto = brutas.reduce((s, l) => s + l.precio * l.unidades, 0);
  const descuento = Math.min(Number(p.descuento) || 0, totalBruto);

  const lineas = brutas.map((l) => {
    const bruto = l.precio * l.unidades;
    // el descuento se reparte entre las líneas según su peso, para que el IVA salga bien
    const conDescuento = totalBruto > 0 ? bruto - descuento * (bruto / totalBruto) : bruto;
    const base = cfg.precios_con_iva ? conDescuento / (1 + l.iva / 100) : conDescuento;
    const cuota = base * (l.iva / 100);
    return { ...l, importe: redondear(conDescuento), base: redondear(base), cuota: redondear(cuota) };
  });

  const porTipo = [];
  for (const l of lineas) {
    let t = porTipo.find((x) => x.tipo === l.iva);
    if (!t) { t = { tipo: l.iva, base: 0, cuota: 0 }; porTipo.push(t); }
    t.base = redondear(t.base + l.base);
    t.cuota = redondear(t.cuota + l.cuota);
  }
  porTipo.sort((a, b) => b.tipo - a.tipo);
  const base = redondear(porTipo.reduce((s, t) => s + t.base, 0));
  const cuota = redondear(porTipo.reduce((s, t) => s + t.cuota, 0));

  const numero = `${cfg.serie}${estado.contador.anio}-${String(estado.contador.siguiente).padStart(cfg.digitos, '0')}`;
  estado.contador.siguiente += 1;
  estado.emitidas[p.id] = { numero, fecha: cfg.ahora, total: redondear(base + cuota) };

  facturas.push({
    numero,
    pedido: p.id,
    numero_pedido: p.numero_pedido,
    fecha_pedido: p.fecha,
    fecha_factura: cfg.ahora,
    cliente: p.cliente,
    moneda: p.moneda || cfg.moneda,
    lineas,
    descuento: redondear(descuento),
    base, iva_por_tipo: porTipo, cuota,
    total: redondear(base + cuota),
    enviar: Boolean(cfg.enviar_al_cliente && p.cliente && p.cliente.email),
  });
}

return [{ json: {
  ...cfg,
  hay_facturas: facturas.length > 0,
  facturas,
  en_espera: pendientes.length - aFacturar.length,
  omitidos,
  resumen: {
    emitidas: facturas.length,
    total: Math.round(facturas.reduce((s, f) => s + f.total, 0) * 100) / 100,
    base: Math.round(facturas.reduce((s, f) => s + f.base, 0) * 100) / 100,
    cuota: Math.round(facturas.reduce((s, f) => s + f.cuota, 0) * 100) / 100,
    sin_email: facturas.filter((f) => !f.enviar).length,
    pedidos_vistos: pedidos.length,
  },
} }];
