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

  // Todo en céntimos enteros: así la base y la cuota suman el total exacto, sin céntimos sueltos.
  const c = (n) => Math.round((Number(n) + Number.EPSILON) * 100);
  // Importe de cada línea = precio × unidades, lo que ve el cliente. El descuento sale aparte.
  const lineas = brutas.map((l) => ({ ...l, importe: c(l.precio * l.unidades) / 100 }));

  // El descuento se reparte entre los tipos de IVA según su peso; el último tipo absorbe el
  // redondeo para que la suma sea exactamente lo que pagó el cliente.
  const tipos = [];
  for (const l of lineas) {
    let t = tipos.find((x) => x.tipo === l.iva);
    if (!t) { t = { tipo: l.iva, bruto: 0 }; tipos.push(t); }
    t.bruto += c(l.precio * l.unidades);
  }
  tipos.sort((a, b) => b.tipo - a.tipo);
  const brutoC = tipos.reduce((s, t) => s + t.bruto, 0);
  const netoC = brutoC - c(descuento);
  let repartido = 0;
  tipos.forEach((t, i) => {
    t.neto = i === tipos.length - 1 ? netoC - repartido
      : Math.round(brutoC > 0 ? t.bruto - c(descuento) * (t.bruto / brutoC) : t.bruto);
    repartido += t.neto;
  });
  const porTipo = tipos.map((t) => {
    const baseC = cfg.precios_con_iva ? Math.round(t.neto / (1 + t.tipo / 100)) : t.neto;
    const cuotaC = cfg.precios_con_iva ? t.neto - baseC : Math.round(baseC * t.tipo / 100);
    return { tipo: t.tipo, base: baseC / 100, cuota: cuotaC / 100 };
  });
  const base = porTipo.reduce((s, t) => s + c(t.base), 0) / 100;
  const cuota = porTipo.reduce((s, t) => s + c(t.cuota), 0) / 100;

  const numero = `${cfg.serie}${estado.contador.anio}-${String(estado.contador.siguiente).padStart(cfg.digitos, '0')}`;
  estado.contador.siguiente += 1;
  estado.emitidas[p.id] = { numero, fecha: cfg.ahora, total: (c(base) + c(cuota)) / 100 };

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
    total: (c(base) + c(cuota)) / 100,
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
