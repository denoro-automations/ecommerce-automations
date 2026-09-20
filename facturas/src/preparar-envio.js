// Deja cada factura lista para enviar al cliente, con el PDF adjunto.
const d = $('Numerar facturas').first().json;
const docs = $('Preparar documentos').all();
const pdfs = $input.all();
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61'; const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef';
const dinero = (n, m) => `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${m === 'EUR' ? '€' : m}`;

return docs.map((doc, i) => {
  const f = doc.json;
  const salida = pdfs[i] || {};
  const bin = salida.binary || {};
  // Si Gotenberg no responde, se adjunta el documento en HTML antes que no mandar nada.
  const pdf = bin.factura_pdf || bin.data || null;
  const adjunto = pdf
    ? { ...pdf, fileName: f.nombre_pdf, fileExtension: 'pdf', mimeType: 'application/pdf' }
    : { ...(doc.binary.index_html), fileName: f.nombre_pdf.replace(/\.pdf$/, '.html') };

  const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:${VERDE}">${esc(d.emisor.nombre)}</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${TINTA};padding:10px 0 4px">Tu factura ${esc(f.numero)}</div>
<p style="font-size:15px;color:${TINTA};line-height:1.5;margin:8px 0 16px">
${esc(f.cliente.nombre ? `Hola, ${f.cliente.nombre.split(' ')[0]}:` : 'Hola:')} adjuntamos la factura del pedido ${esc(f.numero_pedido)} por ${dinero(f.total, f.moneda)}.</p>
<table width="100%" cellspacing="0" style="font-size:13px;color:${SUAVE}">
<tr><td style="padding:4px 0;border-bottom:1px solid ${REGLA}">Número</td><td align="right" style="padding:4px 0;border-bottom:1px solid ${REGLA};color:${TINTA}">${esc(f.numero)}</td></tr>
<tr><td style="padding:4px 0;border-bottom:1px solid ${REGLA}">Base imponible</td><td align="right" style="padding:4px 0;border-bottom:1px solid ${REGLA};color:${TINTA}">${dinero(f.base, f.moneda)}</td></tr>
<tr><td style="padding:4px 0;border-bottom:1px solid ${REGLA}">IVA</td><td align="right" style="padding:4px 0;border-bottom:1px solid ${REGLA};color:${TINTA}">${dinero(f.cuota, f.moneda)}</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:${TINTA}"><b>Total</b></td><td align="right" style="padding:8px 0;font-size:15px;color:${VERDE}"><b>${dinero(f.total, f.moneda)}</b></td></tr>
</table>
<p style="font-size:13px;color:${SUAVE};margin-top:18px">${esc(d.texto_pie)} Si necesitas cualquier cambio en los datos fiscales, responde a este correo.</p>
<div style="border-top:1px solid ${REGLA};margin-top:20px;padding-top:12px;font-size:11px;color:${SUAVE}">
${esc(d.emisor.nombre)} · NIF ${esc(d.emisor.nif)} · ${esc(d.emisor.cp_poblacion)}</div>
</td></tr></table></td></tr></table></body></html>`;

  return {
    json: { ...f, con_pdf: Boolean(pdf), email_to: f.enviar ? f.cliente.email : '', email_from: d.email_from,
      asunto: `${d.emisor.nombre} · Factura ${f.numero}`, email_html },
    binary: { factura: adjunto },
  };
});
