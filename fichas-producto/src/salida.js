// Revisa las fichas, monta el CSV para importar en la tienda y el email de resumen.
const cfg = $('Configuración').first().json;
const items = $input.all().map((i) => i.json).filter(Boolean);

const vacio = items.length === 1 && items[0].sin_trabajo;
const TAGS_OK = /^(p|ul|ol|li|br|strong|em|h2|h3)$/i;

const numeros = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.'));

const revisadas = [];
const fallos = [];
for (const it of items) {
  if (it.sin_trabajo) continue;
  if (!it.ficha) { fallos.push(it.fallo || `Sin ficha para ${it.sku}`); continue; }
  const f = it.ficha;
  const avisos = [];

  if (f.titulo_seo.length > cfg.largo_titulo) avisos.push(`título de ${f.titulo_seo.length} caracteres (máx ${cfg.largo_titulo})`);
  if (!f.meta_descripcion) avisos.push('sin meta descripción');
  else if (f.meta_descripcion.length > cfg.largo_meta) avisos.push(`meta de ${f.meta_descripcion.length} caracteres (máx ${cfg.largo_meta})`);
  if (f.bullets.length < 3) avisos.push(`solo ${f.bullets.length} características`);
  if (!f.alt_imagen) avisos.push('sin texto alternativo de imagen');
  if (f.keywords.length < 3) avisos.push('menos de 3 palabras clave');

  const etiquetasRaras = [...new Set((f.descripcion_html.match(/<\/?([a-z0-9]+)/gi) || [])
    .map((t) => t.replace(/[<\/]/g, '')).filter((t) => !TAGS_OK.test(t)))];
  if (etiquetasRaras.length) avisos.push(`etiquetas HTML no permitidas: ${etiquetasRaras.join(', ')}`);

  // Ningún número puede aparecer en la ficha si no estaba en los datos del producto:
  // es la comprobación que impide que el texto se invente medidas, garantías o plazos.
  const enDatos = new Set(numeros(it.hechos));
  const generado = [f.titulo_seo, f.meta_descripcion, ...f.bullets, f.descripcion_html.replace(/<[^>]*>/g, ' '), f.alt_imagen].join(' ');
  const inventados = [...new Set(numeros(generado))].filter((n) => !enDatos.has(n));
  if (inventados.length) avisos.push(`datos sin respaldo en el producto: ${inventados.join(', ')}`);

  if (/lorem|ipsum|\bTODO\b|XXX|\[[^\]]*\]/i.test(generado)) avisos.push('texto de relleno sin sustituir');

  revisadas.push({ ...f, url: it.producto?.url || '', avisos, revisar: avisos.length > 0 });
}

const total = items[0]?.total_catalogo ?? revisadas.length;
const candidatos = items[0]?.candidatos ?? revisadas.length;
const conAviso = revisadas.filter((f) => f.revisar);

// ---- CSV para importar en la tienda ----
const COLS = ['sku', 'titulo_seo', 'meta_descripcion', 'descripcion_html', 'bullets', 'keywords', 'alt_imagen', 'avisos'];
const celda = (v) => {
  // sin saltos de línea dentro de las celdas: hay importadores de tienda que los parten mal
  const s = (Array.isArray(v) ? v.join(' | ') : String(v ?? '')).replace(/\r?\n\s*/g, ' ').trim();
  return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [COLS.join(';'), ...revisadas.map((f) => COLS.map((c) => celda(f[c])).join(';'))].join('\n');

// ---- Email ----
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VERDE = '#235b54'; const TINTA = '#35322c'; const SUAVE = '#6e6a61';
const REGLA = '#e7e4dc'; const PAPEL = '#f4f3ef'; const ALERTA = '#8f2f24';
const h3 = (t) => `<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:${VERDE};margin:24px 0 8px;font-weight:normal">${t}</h3>`;
const th = (t, der) => `<th align="${der ? 'right' : 'left'}" style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${SUAVE};border-bottom:1px solid ${REGLA};padding:6px 0;font-weight:normal">${t}</th>`;
const td = (t, der) => `<td align="${der ? 'right' : 'left'}" style="font-size:13px;color:${TINTA};border-bottom:1px solid ${REGLA};padding:8px 0">${t}</td>`;

const filas = revisadas.slice(0, 12).map((f) => `<tr>${td(esc(f.sku))}${td(esc(f.titulo_seo))}${td(
  f.revisar ? `<span style="color:${ALERTA}">revisar</span>` : 'lista', 1)}</tr>`).join('');
const muestra = revisadas[0];
const cifra = (n, t) => `<td width="33%" style="padding:0 8px"><div style="font-family:Georgia,serif;font-size:30px;color:${VERDE};line-height:1">${n}</div><div style="font-size:12px;color:${SUAVE};padding-top:2px">${t}</div></td>`;

const cuerpo = vacio
  ? `<p style="font-size:15px;color:${TINTA};margin:0">No había ningún producto pendiente de ficha: los ${total} del catálogo ya tienen descripción.</p>`
  : `<table width="100%" cellspacing="0" style="margin:4px 0 8px"><tr>
${cifra(revisadas.length, 'fichas escritas')}${cifra(conAviso.length, 'para revisar')}${cifra(`${candidatos}/${total}`, 'pendientes del catálogo')}
</tr></table>
${h3('Fichas generadas')}
<table width="100%" cellspacing="0" style="border-collapse:collapse"><tr>${th('Ref.')}${th('Título SEO')}${th('Estado', 1)}</tr>${filas}</table>
${revisadas.length > 12 ? `<p style="font-size:12px;color:${SUAVE};margin:8px 0 0">…y ${revisadas.length - 12} más en el CSV adjunto.</p>` : ''}
${muestra ? `${h3('Así queda una ficha')}
<div style="border:1px solid ${REGLA};border-radius:10px;padding:16px;background:#fff">
<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${SUAVE}">${esc(muestra.sku)}</div>
<div style="font-family:Georgia,serif;font-size:18px;color:${TINTA};margin:4px 0 6px">${esc(muestra.titulo_seo)}</div>
<div style="font-size:13px;color:${SUAVE};margin-bottom:10px">${esc(muestra.meta_descripcion)}</div>
<div style="font-size:13px;color:${TINTA}">${muestra.descripcion_html}</div>
</div>` : ''}
${conAviso.length ? `${h3('⚠️ Repasa antes de publicar')}
<ul style="font-size:13px;color:${TINTA};padding-left:18px;margin:0">${conAviso.slice(0, 8).map((f) => `<li style="margin-bottom:4px"><b>${esc(f.sku)}</b>: ${esc(f.avisos.join('; '))}</li>`).join('')}</ul>` : ''}
${fallos.length ? `<p style="font-size:13px;color:${ALERTA};margin-top:16px">${fallos.length} producto(s) sin ficha: ${esc(fallos.slice(0, 3).join(' · '))}</p>` : ''}
<p style="font-size:13px;color:${SUAVE};margin-top:20px">El CSV adjunto se importa tal cual en la tienda. Las fichas marcadas como «revisar» llevan el motivo en la última columna.</p>`;

const email_html = `<!doctype html><html><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA}">
<table width="100%" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="680" cellspacing="0" style="background:#fff;border-radius:12px"><tr><td style="padding:28px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${VERDE}">Fichas de producto · ${esc(cfg.tienda)}</div>
<div style="font-size:12px;color:${SUAVE};padding:2px 0 12px;border-bottom:1px solid ${REGLA}">${new Date(cfg.generado_en).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} · motor: ${esc(items.find((i) => i.motor)?.motor || cfg.motor)}</div>
${cuerpo}
<div style="border-top:1px solid ${REGLA};margin-top:24px;padding-top:12px;font-size:11px;color:${SUAVE}">Denoro Automations</div>
</td></tr></table></td></tr></table></body></html>`;

const telegram = vacio
  ? `✅ <b>Fichas de producto</b>\nNada pendiente: los ${total} productos ya tienen descripción.`
  : `✅ <b>Fichas de producto · ${cfg.tienda}</b>\n` +
    `<b>Escritas:</b> ${revisadas.length}\n<b>Para revisar:</b> ${conAviso.length}\n` +
    `<b>Pendientes del catálogo:</b> ${candidatos} de ${total}` +
    (fallos.length ? `\n⚠️ ${fallos.length} sin ficha` : '');

const nombre = `fichas-${new Date(cfg.generado_en).toISOString().slice(0, 10)}.csv`;
return [{
  json: {
    ...cfg,
    asunto: vacio
      ? `Denoro · ${cfg.tienda}: nada pendiente de ficha`
      : `Denoro · ${revisadas.length} fichas para ${cfg.tienda}${conAviso.length ? ` (${conAviso.length} a revisar)` : ''}`,
    email_html, telegram,
    resumen: { escritas: revisadas.length, con_aviso: conAviso.length, sin_ficha: fallos.length, catalogo: total, candidatos },
    fichas: revisadas,
  },
  binary: vacio ? {} : { fichas: {
    data: Buffer.from('﻿' + csv, 'utf8').toString('base64'),
    mimeType: 'text/csv', fileName: nombre, fileExtension: 'csv',
  } },
}];
