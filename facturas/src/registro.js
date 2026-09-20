// Resumen para el dueño + CSV con el libro de facturas emitidas en esta pasada.
const d = $('Numerar facturas').first().json;
const ej = $input.first().json || { enviadas: [], fallidas: [], sin_email: [], sin_pdf: 0 };
const r = d.resumen;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61';
const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef'; const ALERTA = '#8f2f24';
const dinero = (n) => `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const h3 = (t) => `<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${VERDE};margin:24px 0 8px;font-weight:normal">${t}</h3>`;
const th = (t, der) => `<th align="${der ? 'right' : 'left'}" style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${REGLA};padding:6px 0;font-weight:normal">${t}</th>`;
const td = (t, der) => `<td align="${der ? 'right' : 'left'}" style="font-size:13px;color:${TINTA};border-bottom:1px solid ${REGLA};padding:8px 0">${t}</td>`;
const cifra = (n, t, color) => `<td width="25%" style="padding:0 8px"><div style="font-family:Georgia,serif;font-size:30px;color:${color || VERDE};line-height:1">${n}</div><div style="font-size:12px;color:${SUAVE};padding-top:2px">${t}</div></td>`;

const enviadas = new Set(ej.enviadas.map((e) => e.numero));
const filas = d.facturas.slice(0, 15).map((f) => `<tr>${td(esc(f.numero))}${td(esc(f.cliente.nombre))}${td(dinero(f.total), 1)}` +
  td(enviadas.has(f.numero) ? 'enviada' : (f.enviar ? `<span style="color:${ALERTA}">no salió</span>` : 'sin email'), 1) + '</tr>').join('');

const cuerpo = d.facturas.length ? `<table width="100%" cellspacing="0" style="margin:4px 0 8px"><tr>
${cifra(r.emitidas, 'facturas')}${cifra(dinero(r.base), 'base imponible')}${cifra(dinero(r.cuota), 'IVA')}${cifra(dinero(r.total), 'total')}
</tr></table>
${h3('Emitidas')}
<table width="100%" cellspacing="0" style="border-collapse:collapse"><tr>${th('Número')}${th('Cliente')}${th('Total', 1)}${th('', 1)}</tr>${filas}</table>
${d.facturas.length > 15 ? `<p style="font-size:12px;color:${SUAVE};margin:8px 0 0">…y ${d.facturas.length - 15} más en el CSV adjunto.</p>` : ''}
${ej.fallidas.length ? `<p style="font-size:13px;color:${ALERTA};margin-top:16px">${ej.fallidas.length} factura(s) no se pudieron enviar (la factura está emitida igualmente): ${esc(ej.fallidas.slice(0, 3).map((f) => f.numero).join(', '))}</p>` : ''}
${ej.sin_email.length ? `<p style="font-size:13px;color:${SUAVE};margin-top:12px">${ej.sin_email.length} sin email del cliente: están en el CSV para enviarlas a mano.</p>` : ''}
${ej.sin_pdf ? `<p style="font-size:13px;color:${ALERTA};margin-top:12px">${ej.sin_pdf} salieron en HTML en vez de PDF: revisa que Gotenberg esté en marcha.</p>` : ''}
${d.en_espera ? `<p style="font-size:13px;color:${SUAVE};margin-top:12px">${d.en_espera} pedido(s) esperan a la próxima pasada por el tope de ${d.max_por_ejecucion}.</p>` : ''}
<p style="font-size:13px;color:${SUAVE};margin-top:20px">De ${r.pedidos_vistos} pedidos: ${d.omitidos.ya_facturados} ya facturados, ${d.omitidos.sin_pagar} sin pagar, ${d.omitidos.sin_lineas} sin líneas.</p>`
  : `<p style="font-size:15px;color:${TINTA};margin:0">No había pedidos nuevos que facturar. De ${r.pedidos_vistos} revisados: ${d.omitidos.ya_facturados} ya tenían factura y ${d.omitidos.sin_pagar} no están pagados.</p>`;

const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="680" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${VERDE}">Facturación · ${esc(d.emisor.nombre)}</div>
<div style="font-size:12px;color:${SUAVE};padding:2px 0 12px;border-bottom:1px solid ${REGLA}">${new Date(d.ahora).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} · serie ${esc(d.serie)}</div>
${cuerpo}
<div style="border-top:1px solid ${REGLA};margin-top:24px;padding-top:12px;font-size:11px;color:${SUAVE}">Denoro Automations</div>
</td></tr></table></td></tr></table></body></html>`;

const telegram = `🧾 <b>Facturación · ${d.emisor.nombre}</b>\n` +
  `<b>Emitidas:</b> ${r.emitidas}${d.facturas.length ? ` (${d.facturas[0].numero} → ${d.facturas[d.facturas.length - 1].numero})` : ''}\n` +
  `<b>Base:</b> ${dinero(r.base)} · <b>IVA:</b> ${dinero(r.cuota)} · <b>Total:</b> ${dinero(r.total)}\n` +
  `<b>Enviadas:</b> ${ej.enviadas.length}` +
  (ej.fallidas.length ? ` · ⚠️ <b>Con error:</b> ${ej.fallidas.length}` : '') +
  (ej.sin_email.length ? ` · <b>Sin email:</b> ${ej.sin_email.length}` : '');

// ---- libro de facturas (CSV) ----
const celda = (v) => {
  const s = String(v ?? '').replace(/\r?\n\s*/g, ' ').trim();
  return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cabecera = ['numero', 'fecha', 'pedido', 'cliente', 'nif', 'base', 'iva', 'cuota', 'total', 'estado'];
const lineas = [cabecera.join(';'), ...d.facturas.map((f) => [
  f.numero, new Date(f.fecha_factura).toISOString().slice(0, 10), f.numero_pedido, f.cliente.nombre,
  f.cliente.nif || '', f.base.toFixed(2).replace('.', ','),
  f.iva_por_tipo.map((t) => `${t.tipo}%`).join(' + '), f.cuota.toFixed(2).replace('.', ','),
  f.total.toFixed(2).replace('.', ','),
  enviadas.has(f.numero) ? 'enviada' : (f.enviar ? 'no enviada' : 'sin email'),
].map(celda).join(';'))];

return [{
  json: { ...d, asunto: `Denoro · ${r.emitidas} factura(s) de ${d.emisor.nombre}${r.emitidas ? ` · ${dinero(r.total)}` : ''}`,
    email_html, telegram, ejecucion: ej },
  binary: d.facturas.length ? { libro: {
    data: Buffer.from('﻿' + lineas.join('\n'), 'utf8').toString('base64'),
    mimeType: 'text/csv', fileName: `facturas-${new Date(d.ahora).toISOString().slice(0, 10)}.csv`, fileExtension: 'csv',
  } } : {},
}];
