// Monta el parte de sincronización: email con la marca, aviso de Telegram y CSV con todo el detalle.
const c = $('Comparar con la tienda').first().json;
const ejecucion = $input.first().json || { aplicado: false, aplicados: [], fallidos: [] };
const r = c.resumen;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61';
const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef'; const ALERTA = '#8f2f24'; const OK = '#2c5f3c';
const h3 = (t) => `<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${VERDE};margin:24px 0 8px;font-weight:normal">${t}</h3>`;
const th = (t, der) => `<th align="${der ? 'right' : 'left'}" style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${REGLA};padding:6px 0;font-weight:normal">${t}</th>`;
const td = (t, der) => `<td align="${der ? 'right' : 'left'}" style="font-size:13px;color:${TINTA};border-bottom:1px solid ${REGLA};padding:8px 0">${t}</td>`;
const cifra = (n, t, color) => `<td width="25%" style="padding:0 8px"><div style="font-family:Georgia,serif;font-size:30px;color:${color || VERDE};line-height:1">${n}</div><div style="font-size:12px;color:${SUAVE};padding-top:2px">${t}</div></td>`;
const es = (n) => String(n).replace('.', ',');
const dinero = (n) => `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const ETIQUETA = { agotado: 'se agota', repuesto: 'vuelve a haber', ajuste: 'ajuste' };
const filas = c.cambios.slice(0, 15).map((x) => `<tr>${td(esc(x.sku))}${td(esc(x.titulo))}` +
  td(`${x.antes ?? '—'} → <b>${x.despues}</b>`, 1) +
  td(`<span style="color:${x.tipo === 'agotado' ? ALERTA : (x.tipo === 'repuesto' ? OK : SUAVE)}">${ETIQUETA[x.tipo]}</span>`, 1) + '</tr>').join('');
const filasPrecio = c.precios.slice(0, 10).map((x) => `<tr>${td(esc(x.sku))}${td(esc(x.titulo))}` +
  td(`${dinero(x.antes)} → ${dinero(x.despues)}`, 1) +
  td(`<span style="color:${x.variacion_pct > 0 ? ALERTA : OK}">${x.variacion_pct > 0 ? '+' : '−'}${es(Math.abs(x.variacion_pct))} %</span>`, 1) + '</tr>').join('');

const aviso = (texto, color) => `<div style="border-left:3px solid ${color};background:${color === ALERTA ? '#f8eae7' : '#e9f0ea'};padding:12px 14px;border-radius:0 8px 8px 0;font-size:14px;color:${TINTA};margin:4px 0 16px">${texto}</div>`;

let cabecera = '';
if (c.bloqueado) {
  cabecera = aviso(`<b>No se ha tocado la tienda.</b> El feed del proveedor no pasa las comprobaciones de seguridad:<ul style="margin:8px 0 0;padding-left:18px">${c.motivos.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`, ALERTA);
} else if (c.modo_prueba) {
  cabecera = aviso('<b>Modo prueba.</b> Esto es lo que se aplicaría; la tienda no se ha tocado. Pon <code>modo_prueba: false</code> cuando el resultado te cuadre.', VERDE);
} else if (ejecucion.fallidos.length) {
  cabecera = aviso(`<b>${ejecucion.aplicados.length} cambios aplicados y ${ejecucion.fallidos.length} con error.</b> Los fallidos están al final del CSV adjunto.`, ALERTA);
} else if (ejecucion.aplicado) {
  cabecera = aviso(`<b>${ejecucion.aplicados.length} cambios aplicados en la tienda.</b>`, VERDE);
} else if (!c.cambios.length) {
  cabecera = aviso('La tienda ya estaba al día: el stock coincide con el del proveedor.', VERDE);
}

const cuerpo = `${cabecera}
<table width="100%" cellspacing="0" style="margin:4px 0 8px"><tr>
${cifra(r.cambios, 'cambios de stock')}${cifra(r.agotados, 'se agotan', r.agotados ? ALERTA : null)}${cifra(r.repuestos, 'vuelven a haber')}${cifra(`${es(r.pct_catalogo)} %`, 'del catálogo')}
</tr></table>
${c.cambios.length ? `${h3('Stock')}
<table width="100%" cellspacing="0" style="border-collapse:collapse"><tr>${th('Ref.')}${th('Producto')}${th('Stock', 1)}${th('', 1)}</tr>${filas}</table>
${c.cambios.length > 15 ? `<p style="font-size:12px;color:${SUAVE};margin:8px 0 0">…y ${c.cambios.length - 15} más en el CSV adjunto.</p>` : ''}` : ''}
${c.precios.length ? `${h3('El proveedor ha movido precios')}
<p style="font-size:13px;color:${SUAVE};margin:0 0 8px">Comparado con la sincronización anterior. Solo informativo: el precio de venta no se toca nunca de forma automática.</p>
<table width="100%" cellspacing="0" style="border-collapse:collapse"><tr>${th('Ref.')}${th('Producto')}${th('Coste', 1)}${th('', 1)}</tr>${filasPrecio}</table>` : ''}
${c.nuevos.length ? `${h3('Altas nuevas del proveedor')}
<p style="font-size:13px;color:${TINTA};margin:0">${c.nuevos.length} referencia(s) que el proveedor lista y la tienda no tiene: <b>${c.nuevos.slice(0, 8).map((n) => esc(n.sku)).join(', ')}</b>${c.nuevos.length > 8 ? '…' : ''}</p>` : ''}
${c.descatalogados.length ? `${h3('Ya no vienen en el feed')}
<p style="font-size:13px;color:${TINTA};margin:0">${c.descatalogados.length} referencia(s) de la tienda no aparecen en el feed. <b>No se tocan</b>: podría ser un fallo del proveedor. ${c.descatalogados.slice(0, 8).map((n) => esc(n.sku)).join(', ')}${c.descatalogados.length > 8 ? '…' : ''}</p>` : ''}
${c.sin_gestion.length ? `<p style="font-size:13px;color:${SUAVE};margin-top:16px">${c.sin_gestion.length} producto(s) tienen el stock sin gestionar en la tienda, así que se han saltado.</p>` : ''}
<p style="font-size:13px;color:${SUAVE};margin-top:20px">Feed: ${r.referencias_feed} referencias del proveedor · Tienda: ${r.referencias_tienda} productos con SKU.</p>`;

const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="680" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${VERDE}">Stock · ${esc(c.tienda)}</div>
<div style="font-size:12px;color:${SUAVE};padding:2px 0 12px;border-bottom:1px solid ${REGLA}">${new Date(c.generado_en).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} · proveedor: ${esc(c.proveedor)}</div>
${cuerpo}
<div style="border-top:1px solid ${REGLA};margin-top:24px;padding-top:12px;font-size:11px;color:${SUAVE}">Denoro Automations</div>
</td></tr></table></td></tr></table></body></html>`;

const estado = c.bloqueado ? '⛔' : (c.cambios.length ? '🔄' : '✅');
const telegram = `${estado} <b>Stock · ${c.tienda}</b>\n` +
  (c.bloqueado ? `<b>Bloqueado:</b> ${c.motivos[0]}\n` : '') +
  `<b>Cambios:</b> ${r.cambios} (${es(r.pct_catalogo)} % del catálogo)\n` +
  `<b>Se agotan:</b> ${r.agotados} · <b>Vuelven:</b> ${r.repuestos}\n` +
  (r.cambios_precio ? `<b>Precios del proveedor:</b> ${r.cambios_precio} cambios\n` : '') +
  (c.bloqueado || c.modo_prueba ? '<i>No se ha tocado la tienda.</i>'
    : `<b>Aplicados:</b> ${ejecucion.aplicados.length}${ejecucion.fallidos.length ? ` · <b>Con error:</b> ${ejecucion.fallidos.length}` : ''}`);

// ---- CSV con todo el detalle ----
const celda = (v) => {
  const s = String(v ?? '').replace(/\r?\n\s*/g, ' ').trim();
  return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const fallados = new Set(ejecucion.fallidos.map((f) => f.sku));
const lineas = [['tipo', 'sku', 'producto', 'antes', 'despues', 'estado'].join(';')];
for (const x of c.cambios) {
  lineas.push([x.tipo, x.sku, x.titulo, x.antes, x.despues,
    c.bloqueado ? 'bloqueado' : (c.modo_prueba ? 'solo prueba' : (fallados.has(x.sku) ? 'ERROR' : 'aplicado'))].map(celda).join(';'));
}
for (const x of c.precios) lineas.push(['precio', x.sku, x.titulo, x.antes, x.despues, 'informativo'].map(celda).join(';'));
for (const x of c.nuevos) lineas.push(['alta nueva', x.sku, x.titulo, '', x.stock, 'informativo'].map(celda).join(';'));
for (const x of c.descatalogados) lineas.push(['sin feed', x.sku, x.titulo, x.stock, '', 'informativo'].map(celda).join(';'));
for (const x of ejecucion.fallidos) lineas.push(['error', x.sku, x.titulo, x.antes, x.despues, x.error].map(celda).join(';'));

// Sin cambios de stock ni de precio, sin bloqueo y sin fallos no hay nada que contar: no se manda nada.
const hayAlgo = Boolean(c.bloqueado || r.cambios || r.cambios_precio || (ejecucion.fallidos || []).length);
return [{
  json: {
    ...c,
    enviar_email: Boolean(c.enviar_email && hayAlgo),
    enviar_telegram: Boolean(c.enviar_telegram && hayAlgo),
    hay_algo: hayAlgo,
    asunto: c.bloqueado
      ? `⛔ Denoro · Stock de ${c.tienda}: feed bloqueado`
      : `Denoro · Stock de ${c.tienda}: ${r.cambios} cambios${c.modo_prueba ? ' (prueba)' : ''}`,
    email_html, telegram,
    ejecucion,
  },
  binary: lineas.length > 1 ? { cambios: {
    data: Buffer.from('﻿' + lineas.join('\n'), 'utf8').toString('base64'),
    mimeType: 'text/csv', fileName: `stock-${new Date(c.generado_en).toISOString().slice(0, 10)}.csv`, fileExtension: 'csv',
  } } : {},
}];
