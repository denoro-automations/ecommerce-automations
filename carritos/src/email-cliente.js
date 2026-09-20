// Un item por aviso, con el email que verá el comprador. Lo firma la TIENDA, no Denoro.
const d = $('Decidir a quién escribo').first().json;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dinero = (n, m) => `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${m === 'EUR' ? '€' : m}`;
const COLOR = /^#[0-9a-f]{6}$/i.test(String(d.marca_color)) ? d.marca_color : '#235b54';
const TINTA = '#35322c'; const SUAVE = '#6e6a61'; const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef';

const SALUDO = {
  1: (n) => `${n ? `Hola, ${n}` : 'Hola'}: has dejado algo a medias`,
  2: (n) => `${n ? `${n}, tu` : 'Tu'} carrito sigue guardado`,
  3: (n) => `${n ? `${n}, ` : ''}última llamada`,
};
const CUERPO = {
  1: 'Hemos guardado tu carrito por si quieres terminar el pedido. Nada más.',
  2: 'Seguimos guardándote lo que elegiste. Si algo no te encajaba, contéstanos a este correo y lo miramos.',
  3: 'Vamos a liberar el carrito en breve. Si lo quieres, este es el momento.',
};

return d.envios.map((c) => {
  const lineas = c.lineas.map((l) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid ${REGLA};font-size:14px;color:${TINTA}">${esc(l.titulo)}${l.unidades > 1 ? ` <span style="color:${SUAVE}">× ${l.unidades}</span>` : ''}</td>
<td align="right" style="padding:8px 0;border-bottom:1px solid ${REGLA};font-size:14px;color:${TINTA}">${dinero(l.precio * l.unidades, c.moneda)}</td></tr>`).join('');

  const cupon = c.cupon ? `<div style="border:1px dashed ${COLOR};border-radius:10px;padding:14px;text-align:center;margin:20px 0">
<div style="font-size:12px;color:${SUAVE};letter-spacing:.06em;text-transform:uppercase">Código de descuento</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${COLOR};padding-top:4px">${esc(c.cupon)}</div></div>` : '';

  const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:${COLOR};padding-bottom:4px">${esc(d.tienda)}</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${TINTA};padding:8px 0 4px">${esc(SALUDO[Math.min(c.paso, 3)](c.nombre))}</div>
<p style="font-size:15px;color:${TINTA};line-height:1.5;margin:8px 0 20px">${CUERPO[Math.min(c.paso, 3)]}</p>
<table width="100%" cellspacing="0" style="border-collapse:collapse">${lineas}
<tr><td style="padding:12px 0;font-size:15px"><b>Total</b></td><td align="right" style="padding:12px 0;font-size:15px"><b>${dinero(c.total, c.moneda)}</b></td></tr></table>
${cupon}
<table cellspacing="0" style="margin:20px 0"><tr><td style="background:${COLOR};border-radius:8px">
<a href="${esc(c.url_recuperacion)}" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;font-size:15px">${esc(d.marca_texto_boton)}</a>
</td></tr></table>
<div style="border-top:1px solid ${REGLA};margin-top:24px;padding-top:12px;font-size:11px;color:${SUAVE};line-height:1.5">
${esc(d.tienda)} · <a href="${esc(d.web)}" style="color:${SUAVE}">${esc(d.web.replace(/^https?:\/\//, ''))}</a><br>
Recibes este aviso porque dejaste un carrito en nuestra tienda y aceptaste recibir comunicaciones.
Para dejar de recibirlos, escribe a <a href="mailto:${esc(d.email_bajas)}" style="color:${SUAVE}">${esc(d.email_bajas)}</a>.
</div>
</td></tr></table></td></tr></table></body></html>`;

  return { json: {
    ...c,
    email_to: c.email,
    email_from: d.email_from,
    asunto: c.asunto,
    email_html,
  } };
});
