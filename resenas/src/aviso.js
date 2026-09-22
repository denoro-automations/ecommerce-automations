// Aviso inmediato: ha entrado una reseña negativa y conviene contestarla hoy.
const d = $input.first().json;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61';
const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef'; const ALERTA = '#8f2f24';
const estrellas = (n) => (n === null || n === undefined ? '—' : '★'.repeat(n) + '☆'.repeat(5 - n));
const cuando = (f) => new Date(f).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

const tarjetas = d.avisar.map((r) => `<div style="border-left:3px solid ${ALERTA};background:#f8eae7;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:12px">
<div style="font-size:12px;color:${SUAVE}">${esc(r.sitio)} · ${esc(r.autor)} · ${cuando(r.fecha)}</div>
<div style="font-size:15px;color:${ALERTA};letter-spacing:2px;padding:4px 0">${estrellas(r.puntuacion)}</div>
<div style="font-size:14px;color:${TINTA};line-height:1.5">${esc(r.texto)}</div>
${r.url ? `<div style="padding-top:8px"><a href="${esc(r.url)}" style="font-size:13px;color:${VERDE}">Ver y contestar</a></div>` : ''}
</div>`).join('');

const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="640" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${ALERTA}">${d.avisar.length === 1 ? 'Reseña negativa' : `${d.avisar.length} reseñas negativas`} · ${esc(d.tienda)}</div>
<div style="font-size:12px;color:${SUAVE};padding:2px 0 16px;border-bottom:1px solid ${REGLA}">${new Date(d.ahora).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}</div>
<p style="font-size:14px;color:${TINTA};margin:16px 0">Aquí tienes cada reseña completa y el enlace para contestarla.</p>
${tarjetas}
<div style="border-top:1px solid ${REGLA};margin-top:16px;padding-top:12px;font-size:11px;color:${SUAVE}">Denoro Automations</div>
</td></tr></table></td></tr></table></body></html>`;

const telegram = `⚠️ <b>${d.avisar.length === 1 ? 'Reseña negativa' : `${d.avisar.length} reseñas negativas`} · ${d.tienda}</b>\n\n` +
  d.avisar.slice(0, 3).map((r) => `${estrellas(r.puntuacion)} <b>${r.sitio}</b> · ${r.autor}\n<i>${String(r.texto).slice(0, 180)}${r.texto.length > 180 ? '…' : ''}</i>` +
    (r.url ? `\n<a href="${r.url}">Contestar</a>` : '')).join('\n\n') +
  (d.avisar.length > 3 ? `\n\n…y ${d.avisar.length - 3} más en el email.` : '');

return [{ json: { ...d, asunto: `⚠️ Denoro · ${d.avisar.length} reseña(s) negativa(s) en ${d.tienda}`, email_html, telegram } }];
