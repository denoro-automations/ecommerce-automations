// Resumen semanal: nota media, tendencia, de qué se queja la gente y qué reseñas destacan.
const d = $input.first().json;
const r = d.resumen;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61';
const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef'; const ALERTA = '#8f2f24'; const OK = '#2c5f3c';
const h3 = (t) => `<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${VERDE};margin:24px 0 8px;font-weight:normal">${t}</h3>`;
const cifra = (n, t, color) => `<td width="25%" style="padding:0 8px"><div style="font-family:Georgia,serif;font-size:30px;color:${color || VERDE};line-height:1">${n}</div><div style="font-size:12px;color:${SUAVE};padding-top:2px">${t}</div></td>`;
const es = (n) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));
const estrellasTxt = (n) => (n === null || n === undefined ? '—' : '★'.repeat(n) + '☆'.repeat(5 - n));

const maxBarra = Math.max(1, ...r.estrellas.map((e) => e.total));
const barras = [...r.estrellas].reverse().map((e) => `<tr>
<td width="60" style="font-size:13px;color:${SUAVE};padding:3px 0">${e.estrellas} ★</td>
<td style="padding:3px 0"><div style="background:${e.estrellas < d.umbral_negativa ? ALERTA : (e.estrellas === d.umbral_negativa ? '#8a857a' : VERDE)};height:10px;border-radius:5px;width:${Math.round((e.total / maxBarra) * 100)}%;min-width:${e.total ? '6px' : '0'}"></div></td>
<td width="40" align="right" style="font-size:13px;color:${TINTA};padding:3px 0">${e.total}</td></tr>`).join('');

const temas = r.temas.length ? `<table width="100%" cellspacing="0">${r.temas.map((t) => `<tr>
<td style="font-size:14px;color:${TINTA};padding:5px 0;border-bottom:1px solid ${REGLA}">${esc(t.tema)}</td>
<td align="right" style="font-size:14px;color:${ALERTA};padding:5px 0;border-bottom:1px solid ${REGLA}">${t.total}</td></tr>`).join('')}</table>`
  : `<p style="font-size:14px;color:${SUAVE};margin:0">Ninguna queja esta semana.</p>`;

const cita = (x, color) => `<div style="border-left:3px solid ${color};padding:10px 14px;margin-bottom:10px">
<div style="font-size:12px;color:${SUAVE}">${esc(x.sitio)} · ${esc(x.autor)} · <span style="letter-spacing:2px;color:${color}">${estrellasTxt(x.puntuacion)}</span></div>
<div style="font-size:14px;color:${TINTA};line-height:1.5;padding-top:4px">${esc(String(x.texto).slice(0, 240))}${x.texto.length > 240 ? '…' : ''}</div></div>`;

const flecha = r.tendencia ? (r.tendencia.media > 0 ? `<span style="color:${OK}">▲ +${es(r.tendencia.media)}</span>`
  : (r.tendencia.media < 0 ? `<span style="color:${ALERTA}">▼ −${es(Math.abs(r.tendencia.media))}</span>` : '=')) : '';

const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="680" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${VERDE}">Reseñas de la semana · ${esc(d.tienda)}</div>
<div style="font-size:12px;color:${SUAVE};padding:2px 0 12px;border-bottom:1px solid ${REGLA}">${new Date(d.ahora).toLocaleDateString('es-ES', { dateStyle: 'long' })} · ${Object.entries(r.por_sitio).map(([s, n]) => `${esc(s)}: ${n}`).join(' · ') || 'sin reseñas'}</div>
<table width="100%" cellspacing="0" style="margin:4px 0 8px"><tr>
${cifra(es(r.media), `nota media ${flecha}`)}${cifra(r.total_semana, 'reseñas')}${cifra(r.negativas, 'quejas', r.negativas ? ALERTA : null)}${cifra(r.positivas, 'elogios', r.positivas ? OK : null)}
</tr></table>
${h3('Reparto de estrellas')}
<table width="100%" cellspacing="0">${barras}</table>
${h3('De qué se queja la gente')}
${temas}
${d.peores.length ? `${h3('Para contestar')}${d.peores.map((x) => cita(x, ALERTA)).join('')}` : ''}
${d.mejores.length ? `${h3('Lo que mejor funciona')}${d.mejores.map((x) => cita(x, OK)).join('')}` : ''}
<div style="border-top:1px solid ${REGLA};margin-top:24px;padding-top:12px;font-size:11px;color:${SUAVE}">Denoro Automations</div>
</td></tr></table></td></tr></table></body></html>`;

const telegram = `⭐ <b>Reseñas de la semana · ${d.tienda}</b>\n` +
  `<b>Nota media:</b> ${es(r.media)}${r.tendencia ? ` (${r.tendencia.media > 0 ? '+' : '−'}${es(Math.abs(r.tendencia.media))} vs semana anterior)` : ''}\n` +
  `<b>Reseñas:</b> ${r.total_semana} · <b>Quejas:</b> ${r.negativas} · <b>Elogios:</b> ${r.positivas}` +
  (r.temas.length ? `\n<b>Motivo principal de queja:</b> ${r.temas[0].tema} (${r.temas[0].total})` : '');

return [{ json: { ...d, asunto: `Denoro · Reseñas de ${d.tienda}: media ${es(r.media)} (${r.total_semana} esta semana)`, email_html, telegram } }];
