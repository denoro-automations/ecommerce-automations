// Convierte la respuesta de la API en una ficha con la misma forma que la del motor "plantilla".
// Si una respuesta viene rota, ese producto se marca y el resto sigue: nunca tumba la ejecución.
const cfg = $('Configuración').first().json;
const preparados = $('Preparar productos').all().map((i) => i.json);
const entradas = $input.all();

const texto = (r) => {
  if (typeof r === 'string') return r;
  if (r?.choices?.[0]?.message?.content) return r.choices[0].message.content;
  if (r?.message?.content) return r.message.content;
  if (r?.content) return typeof r.content === 'string' ? r.content : (r.content[0]?.text || '');
  return '';
};
const extraerJson = (s) => {
  const limpio = String(s).replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(limpio); } catch (_) { /* sigue */ }
  const ini = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (ini >= 0 && fin > ini) {
    try { return JSON.parse(limpio.slice(ini, fin + 1)); } catch (_) { /* sigue */ }
  }
  return null;
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const salida = [];
entradas.forEach((item, i) => {
  const base = preparados[i] || preparados[0] || {};
  if (base.sin_trabajo) { salida.push({ json: base }); return; }
  const p = base.producto || {};
  const crudo = texto(item.json);
  const j = extraerJson(crudo);
  if (!j || !j.titulo_seo) {
    salida.push({ json: { ...base, motor: cfg.motor, ficha: null,
      fallo: `La respuesta de la API no traía un JSON válido para ${p.sku || base.sku}` } });
    return;
  }
  const lista = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : String(v || '')
    .split(/\n|;|•/).map((x) => x.replace(/^[-*\s]+/, '').trim()).filter(Boolean));
  const bullets = lista(j.bullets).slice(0, 5);
  const html = String(j.descripcion_html || '').trim()
    || `<p>${esc(j.resumen || j.meta_descripcion || '')}</p>\n<ul>\n${bullets.map((b) => `  <li>${esc(b)}</li>`).join('\n')}\n</ul>`;
  salida.push({ json: { ...base, motor: cfg.motor, ficha: {
    sku: p.sku || base.sku,
    titulo_seo: String(j.titulo_seo).trim(),
    meta_descripcion: String(j.meta_descripcion || j.meta || '').trim(),
    bullets,
    descripcion_html: html,
    keywords: lista(j.keywords).slice(0, 8),
    alt_imagen: String(j.alt_imagen || j.alt || '').trim(),
  } } });
});
return salida;
