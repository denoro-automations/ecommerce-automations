// Antes de leer ninguna página, mira su robots.txt. Si no permite la lectura automática
// a este bot (o a cualquiera), el workflow se para y dice qué sitio quitar de la lista.
const sitios = $('Preparar sitios').all().map((i) => i.json);
const respuestas = $input.all().map((i) => i.json || {});
const BOT = 'denorobot';

// Convierte un patrón de robots.txt (con * y $) en una expresión regular.
const aRegex = (p) => {
  const fin = p.endsWith('$');
  const cuerpo = (fin ? p.slice(0, -1) : p).split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + cuerpo + (fin ? '$' : ''));
};

const permitido = (texto, ruta) => {
  const grupos = [];
  let actual = null;
  let leyendoAgentes = false;
  for (const bruta of String(texto || '').split(/\r?\n/)) {
    const linea = bruta.replace(/#.*/, '').trim();
    const m = linea.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const clave = m[1].toLowerCase();
    const valor = m[2].trim();
    if (clave === 'user-agent') {
      if (!actual || !leyendoAgentes) { actual = { agentes: [], reglas: [] }; grupos.push(actual); }
      actual.agentes.push(valor.toLowerCase());
      leyendoAgentes = true;
    } else if (clave === 'allow' || clave === 'disallow') {
      leyendoAgentes = false;
      if (actual && valor) actual.reglas.push({ permite: clave === 'allow', patron: valor });
    } else {
      leyendoAgentes = false;
    }
  }
  // Manda el grupo que nombra a este bot; si no hay, el de "*".
  const propios = grupos.filter((g) => g.agentes.some((a) => a !== '*' && BOT.includes(a)));
  const aplicables = propios.length ? propios : grupos.filter((g) => g.agentes.includes('*'));
  let mejor = null;
  for (const r of aplicables.flatMap((g) => g.reglas)) {
    if (!aRegex(r.patron).test(ruta)) continue;
    // La regla más específica (más larga) gana; en empate, gana la que permite.
    if (!mejor || r.patron.length > mejor.patron.length || (r.patron.length === mejor.patron.length && r.permite)) mejor = r;
  }
  return mejor ? mejor.permite : true;
};

const bloqueados = [];
const dudosos = [];
sitios.forEach((s, i) => {
  const r = respuestas[i] || {};
  const estado = Number(r.statusCode || r.status || 0);
  const cuerpo = r.body ?? r.data ?? '';
  if (estado >= 500 || (!estado && r.error)) { dudosos.push(s.nombre); return; }
  // 4xx (sin robots.txt, o no accesible): por convención se entiende que no hay restricciones.
  if (estado >= 400) return;
  if (!permitido(cuerpo, s.ruta)) bloqueados.push(`${s.nombre} (${s.url})`);
});
if (bloqueados.length) {
  throw new Error(`Estos sitios no permiten la lectura automática según su robots.txt: ${bloqueados.join(', ')}. Quítalos de "sitios" en el nodo Configuración.`);
}
if (dudosos.length) {
  throw new Error(`No se ha podido comprobar el robots.txt de: ${dudosos.join(', ')}. Se reintentará en la próxima pasada.`);
}
return sitios.map((s) => ({ json: s }));
