// Convierte lo que saca el nodo de extracción HTML en reseñas con la misma forma que el modo demo.
const cfg = $('Configuración').first().json;
const limpiar = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
// "Valorado con 2 de 5 estrellas" / "2,0" / "★★☆☆☆" -> 2
const puntuacionDe = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v);
  const estrellas = (s.match(/[★●]/g) || []).length;
  if (estrellas >= 1 && estrellas <= 5) return estrellas;
  const m = s.match(/(\d(?:[.,]\d)?)\s*(?:\/|de\s+|out of\s+)?\s*5?/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return n >= 0 && n <= 5 ? Math.round(n) : null;
};
const fechaDe = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const salida = [];
for (const item of $input.all()) {
  const j = item.json;
  const nombre = j.sitio || j.nombre || 'web';
  const textos = [].concat(j.texto || []);
  const autores = [].concat(j.autor || []);
  const puntos = [].concat(j.puntuacion || []);
  const fechas = [].concat(j.fecha || []);
  if (!textos.length) continue;
  textos.forEach((t, i) => {
    const texto = limpiar(t);
    if (texto.length < 3) return;
    salida.push({ json: {
      sitio: nombre,
      autor: limpiar(autores[i]) || 'anónimo',
      puntuacion: puntuacionDe(puntos[i]),
      fecha: fechaDe(fechas[i]) || cfg.ahora,
      texto,
      url: j.url || '',
    } });
  });
}
if (!salida.length) {
  throw new Error('No se extrajo ninguna reseña: revisa los selectores CSS (la página puede haber cambiado su maquetación)');
}
return salida;
