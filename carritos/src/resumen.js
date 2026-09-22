// Resumen para el dueño de la tienda: qué se ha enviado, qué se ha recuperado y qué no se tocó.
const d = $('Decidir a quién escribo').first().json;
const ej = $input.first().json || { hubo_envios: false, enviados: [], fallidos: [], historico: {} };
const r = d.resumen;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61';
const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef'; const ALERTA = '#8f2f24'; const OK = '#2c5f3c';
const dinero = (n) => `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const h3 = (t) => `<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${VERDE};margin:24px 0 8px;font-weight:normal">${t}</h3>`;
const th = (t, der) => `<th align="${der ? 'right' : 'left'}" style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${REGLA};padding:6px 0;font-weight:normal">${t}</th>`;
const td = (t, der) => `<td align="${der ? 'right' : 'left'}" style="font-size:13px;color:${TINTA};border-bottom:1px solid ${REGLA};padding:8px 0">${t}</td>`;
const cifra = (n, t, color) => `<td width="25%" style="padding:0 8px"><div style="font-family:Georgia,serif;font-size:30px;color:${color || VERDE};line-height:1">${n}</div><div style="font-size:12px;color:${SUAVE};padding-top:2px">${t}</div></td>`;

const filas = ej.enviados.slice(0, 12).map((e) => `<tr>${td(esc(e.email))}${td(`aviso ${e.paso}`)}${td(dinero(e.total), 1)}</tr>`).join('');
const filasRec = d.recuperados.slice(0, 10).map((x) => `<tr>${td(esc(x.email))}${td(`tras ${x.pasos} aviso${x.pasos > 1 ? 's' : ''}`)}${td(dinero(x.total), 1)}</tr>`).join('');
const om = d.omitidos;
const motivos = [
  om.sin_consentimiento ? `${om.sin_consentimiento} sin consentimiento` : '',
  om.sin_email ? `${om.sin_email} sin email` : '',
  om.importe_bajo ? `${om.importe_bajo} por debajo de ${dinero(d.minimo_total)}` : '',
  om.caducados ? `${om.caducados} caducados` : '',
  om.al_dia ? `${om.al_dia} ya al día` : '',
].filter(Boolean);

const cuerpo = `<table width="100%" cellspacing="0" style="margin:4px 0 8px"><tr>
${cifra(ej.enviados.length, 'avisos enviados')}${cifra(dinero(r.valor_en_juego), 'en juego')}${cifra(d.recuperados.length, 'recuperados', d.recuperados.length ? OK : null)}${cifra(dinero(r.valor_recuperado), 'recuperado', d.recuperados.length ? OK : null)}
</tr></table>
${ej.enviados.length ? `${h3('Avisos enviados')}
<table width="100%" cellspacing="0" style="border-collapse:collapse"><tr>${th('Comprador')}${th('Paso')}${th('Carrito', 1)}</tr>${filas}</table>
${ej.enviados.length > 12 ? `<p style="font-size:12px;color:${SUAVE};margin:8px 0 0">…y ${ej.enviados.length - 12} más.</p>` : ''}`
  : `<p style="font-size:15px;color:${TINTA};margin:0">Ningún carrito necesitaba un aviso en esta pasada.</p>`}
${d.recuperados.length ? `${h3('Carritos recuperados')}
<table width="100%" cellspacing="0" style="border-collapse:collapse"><tr>${th('Comprador')}${th('Cuándo')}${th('Pedido', 1)}</tr>${filasRec}</table>` : ''}
${ej.fallidos.length ? `<p style="font-size:13px;color:${ALERTA};margin-top:16px">${ej.fallidos.length} aviso(s) no salieron (se reintentan en la próxima pasada): ${esc(ej.fallidos.slice(0, 3).map((f) => f.email).join(', '))}</p>` : ''}
${d.en_espera ? `<p style="font-size:13px;color:${SUAVE};margin-top:12px">${d.en_espera} carrito(s) esperan a la próxima pasada por el tope de ${d.max_envios_por_ejecucion} envíos.</p>` : ''}
${motivos.length ? `<p style="font-size:13px;color:${SUAVE};margin-top:12px">No se escribió a: ${motivos.join(' · ')}.</p>` : ''}
<p style="font-size:13px;color:${SUAVE};margin-top:20px">Desde que está en marcha: ${ej.historico.enviados || 0} avisos, ${ej.historico.recuperados || 0} carritos recuperados y ${dinero(ej.historico.valor_recuperado)} en pedidos.</p>`;

const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="680" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${VERDE}">Carritos abandonados · ${esc(d.tienda)}</div>
<div style="font-size:12px;color:${SUAVE};padding:2px 0 12px;border-bottom:1px solid ${REGLA}">${new Date(d.ahora).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} · ${r.carritos_vistos} carritos revisados</div>
${cuerpo}
<div style="border-top:1px solid ${REGLA};margin-top:24px;padding-top:12px;font-size:11px;color:${SUAVE}">Denoro Automations</div>
</td></tr></table></td></tr></table></body></html>`;

const telegram = `🛒 <b>Carritos · ${d.tienda}</b>\n` +
  `<b>Avisos enviados:</b> ${ej.enviados.length} (${dinero(r.valor_en_juego)} en juego)\n` +
  (d.recuperados.length ? `<b>Recuperados:</b> ${d.recuperados.length} · ${dinero(r.valor_recuperado)}\n` : '') +
  (ej.fallidos.length ? `⚠️ ${ej.fallidos.length} no salieron\n` : '') +
  `<i>Total desde el inicio: ${ej.historico.recuperados || 0} recuperados, ${dinero(ej.historico.valor_recuperado)}</i>`;

// Sin avisos, recuperados ni fallos no hay nada que contar: no se manda nada (corre cada 30 minutos).
const hayAlgo = Boolean(ej.enviados.length || d.recuperados.length || ej.fallidos.length);
return [{ json: { ...d, enviar_email: Boolean(d.enviar_email && hayAlgo), enviar_telegram: Boolean(d.enviar_telegram && hayAlgo), hay_algo: hayAlgo, asunto: `Denoro · Carritos de ${d.tienda}: ${ej.enviados.length} avisos${d.recuperados.length ? `, ${d.recuperados.length} recuperados` : ''}`, email_html, telegram, ejecucion: ej } }];
