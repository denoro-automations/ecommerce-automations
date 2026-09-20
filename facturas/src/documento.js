// Monta el HTML del documento (una página por factura, y otra por albarán si toca)
// y lo deja como binario para que Gotenberg lo convierta en PDF.
const d = $('Numerar facturas').first().json;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61'; const REGLA = '#e7e4dc';
const dinero = (n, m) => `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${m === 'EUR' ? '€' : m}`;
const dia = (f) => new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const pagina = (f, tipo) => {
  const conPrecios = tipo === 'factura';
  const filas = f.lineas.map((l) => `<tr>
<td style="padding:7px 0;border-bottom:1px solid ${REGLA}">${esc(l.titulo)}</td>
<td align="right" style="padding:7px 0;border-bottom:1px solid ${REGLA}">${l.unidades}</td>
${conPrecios ? `<td align="right" style="padding:7px 0;border-bottom:1px solid ${REGLA}">${dinero(l.precio, f.moneda)}</td>
<td align="right" style="padding:7px 0;border-bottom:1px solid ${REGLA}">${l.iva} %</td>
<td align="right" style="padding:7px 0;border-bottom:1px solid ${REGLA}">${dinero(l.importe, f.moneda)}</td>` : ''}
</tr>`).join('');

  const totales = conPrecios ? `<table width="100%" cellspacing="0" style="margin-top:14px">
${f.descuento ? `<tr><td align="right" style="padding:3px 0;color:${SUAVE}">Descuento</td><td align="right" width="120" style="padding:3px 0">−${dinero(f.descuento, f.moneda)}</td></tr>` : ''}
<tr><td align="right" style="padding:3px 0;color:${SUAVE}">Base imponible</td><td align="right" width="120" style="padding:3px 0">${dinero(f.base, f.moneda)}</td></tr>
${f.iva_por_tipo.map((t) => `<tr><td align="right" style="padding:3px 0;color:${SUAVE}">IVA ${t.tipo} % sobre ${dinero(t.base, f.moneda)}</td><td align="right" style="padding:3px 0">${dinero(t.cuota, f.moneda)}</td></tr>`).join('')}
<tr><td align="right" style="padding:10px 0 0;font-size:15px"><b>Total</b></td><td align="right" style="padding:10px 0 0;font-size:15px;color:${VERDE}"><b>${dinero(f.total, f.moneda)}</b></td></tr>
</table>` : '';

  return `<section style="page-break-after:always;padding:0 0 10px">
<table width="100%" cellspacing="0"><tr>
<td valign="top">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${VERDE}">${esc(d.emisor.nombre)}</div>
  <div style="font-size:11px;color:${SUAVE};line-height:1.5;padding-top:4px">
  NIF ${esc(d.emisor.nif)}<br>${esc(d.emisor.direccion)}<br>${esc(d.emisor.cp_poblacion)}<br>${esc(d.emisor.pais)}
  ${d.emisor.email ? `<br>${esc(d.emisor.email)}` : ''}${d.emisor.telefono ? ` · ${esc(d.emisor.telefono)}` : ''}</div>
</td>
<td valign="top" align="right">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${TINTA};text-transform:uppercase;letter-spacing:.04em">${tipo === 'factura' ? 'Factura' : 'Albarán'}</div>
  <div style="font-size:13px;color:${TINTA};padding-top:4px">${esc(f.numero)}${tipo === 'albaran' ? ' · A' : ''}</div>
  <div style="font-size:11px;color:${SUAVE};padding-top:2px">Fecha: ${dia(f.fecha_factura)}<br>Pedido: ${esc(f.numero_pedido)} · ${dia(f.fecha_pedido)}</div>
</td></tr></table>

<div style="border-top:1px solid ${REGLA};margin:18px 0 0;padding-top:14px">
<div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${SUAVE}">${tipo === 'factura' ? 'Destinatario' : 'Enviar a'}</div>
<div style="font-size:13px;color:${TINTA};line-height:1.5;padding-top:4px">
${esc(f.cliente.nombre)}${f.cliente.nif ? `<br>NIF ${esc(f.cliente.nif)}` : ''}<br>${esc(f.cliente.direccion)}<br>${esc(f.cliente.cp_poblacion)}${f.cliente.pais ? `<br>${esc(f.cliente.pais)}` : ''}</div>
</div>

<table width="100%" cellspacing="0" style="margin-top:20px;border-collapse:collapse;font-size:12px;color:${TINTA}">
<tr>
<th align="left" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${TINTA};padding-bottom:6px;font-weight:normal">Concepto</th>
<th align="right" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${TINTA};padding-bottom:6px;font-weight:normal">Uds.</th>
${conPrecios ? `<th align="right" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${TINTA};padding-bottom:6px;font-weight:normal">Precio</th>
<th align="right" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${TINTA};padding-bottom:6px;font-weight:normal">IVA</th>
<th align="right" style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${TINTA};padding-bottom:6px;font-weight:normal">Importe</th>` : ''}
</tr>${filas}</table>
${totales}
<div style="margin-top:28px;font-size:10px;color:${SUAVE};line-height:1.6;border-top:1px solid ${REGLA};padding-top:10px">
${esc(d.texto_pie)}${tipo === 'factura' && d.precios_con_iva ? ' Los precios de la tienda incluyen el IVA; el desglose figura arriba.' : ''}
</div>
</section>`;
};

const tipos = d.documento === 'ambos' ? ['factura', 'albaran'] : [d.documento];

return d.facturas.map((f) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:14mm}
body{margin:0;font-family:Arial,Helvetica,sans-serif;color:${TINTA};-webkit-print-color-adjust:exact;print-color-adjust:exact}
section:last-child{page-break-after:auto}
</style></head><body>${tipos.map((t) => pagina(f, t)).join('')}</body></html>`;
  return {
    json: { ...f, gotenberg_url: d.gotenberg_url, nombre_pdf: `${d.documento === 'albaran' ? 'albaran' : 'factura'}-${f.numero}.pdf` },
    binary: { index_html: {
      data: Buffer.from(html, 'utf8').toString('base64'),
      mimeType: 'text/html', fileName: 'index.html', fileExtension: 'html',
    } },
  };
});
