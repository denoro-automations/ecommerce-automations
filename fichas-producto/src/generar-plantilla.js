// Motor "plantilla": escribe la ficha a partir de los datos del producto, sin llamar a ninguna API.
// Es determinista (misma entrada, misma salida) y por construcción no inventa nada.
const cfg = $('Configuración').first().json;

const PRIORIDAD = ['material', 'capacidad', 'medidas', 'dimensiones', 'diametro', 'altura', 'longitud',
  'potencia', 'bateria', 'autonomia', 'bluetooth', 'cancelacion', 'resistencia', 'impermeabilidad',
  'color', 'tallas', 'unidades', 'piezas', 'paginas', 'papel', 'peso', 'certificado', 'garantia'];

// Las claves llegan sin tildes (vienen de CSV o de la tienda); aquí se escriben bien.
const ETIQUETAS = {
  es: { material: 'Material', capacidad: 'Capacidad', medidas: 'Medidas', dimensiones: 'Dimensiones',
    diametro: 'Diámetro', altura: 'Altura', longitud: 'Longitud', potencia: 'Potencia', bateria: 'Batería',
    autonomia: 'Autonomía', bluetooth: 'Bluetooth', cancelacion: 'Cancelación de ruido', resistencia: 'Resistencia',
    impermeabilidad: 'Impermeabilidad', color: 'Color', tallas: 'Tallas', unidades: 'Unidades', piezas: 'Piezas',
    paginas: 'Páginas', papel: 'Papel', peso: 'Peso', certificado: 'Certificado', garantia: 'Garantía',
    mantiene_frio: 'Mantiene el frío', mantiene_calor: 'Mantiene el calor', portatil: 'Portátil',
    induccion: 'Inducción', mango: 'Mango', temperatura: 'Temperatura', encuadernacion: 'Encuadernación',
    rayado: 'Rayado', cierre: 'Cierre', reverso: 'Reverso', recambio: 'Recambio', acabado: 'Acabado',
    apta: 'Apta para', lavado: 'Lavado', carga: 'Carga', puertos: 'Puertos', tecnologia: 'Tecnología',
    grosor: 'Grosor', superficie: 'Superficie', duracion: 'Duración', aroma: 'Aroma', mecha: 'Mecha',
    cera: 'Cera', recipiente: 'Recipiente', ruido: 'Ruido', apagado: 'Apagado', luz: 'Luz', bolsa: 'Bolsa',
    resistencias: 'Resistencias', afilado: 'Afilado', interruptor: 'Interruptor', cabina: 'Cabina',
    antiadherente: 'Antiadherente', etiquetas: 'Etiquetas', datos: 'Datos', plegable: 'Plegable' },
  en: {},
};
const etiqueta = (k, idioma) => (ETIQUETAS[idioma] || {})[k]
  || String(k).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const T = {
  es: {
    intro: {
      cercano: [
        (p) => `${p.titulo}${p.marca ? ` de ${p.marca}` : ''}, para el día a día.`,
        (p) => `${p.titulo}: lo justo, bien hecho${p.marca ? `, de ${p.marca}` : ''}.`,
        (p) => `Esto es ${p.titulo.toLowerCase()}${p.marca ? ` de ${p.marca}` : ''}, sin más vueltas.`,
      ],
      tecnico: [
        (p) => `${p.titulo}${p.marca ? ` (${p.marca})` : ''}: ficha técnica y características.`,
        (p) => `Características de ${p.titulo.toLowerCase()}${p.marca ? `, ${p.marca}` : ''}.`,
        (p) => `${p.titulo}. Estos son los datos que importan antes de decidir.`,
      ],
      premium: [
        (p) => `${p.titulo}${p.marca ? ` de ${p.marca}` : ''}. Materiales escogidos y acabado cuidado.`,
        (p) => `${p.titulo}: la versión sobria${p.marca ? `, firmada por ${p.marca}` : ''}.`,
        (p) => `${p.titulo}. Pocas piezas, bien resueltas.`,
      ],
    },
    cierre: {
      cercano: [
        () => `Una compra para años, no para una temporada.`,
        () => `Sencillo de usar y fácil de mantener.`,
        () => `De esas cosas que se compran una vez.`,
      ],
      tecnico: [
        () => `Consulta las características antes de comprar para asegurarte de que encaja con tu uso.`,
        () => `Todos los datos de arriba vienen de la ficha del fabricante.`,
        () => `Si necesitas una medida concreta, la tienes en la lista.`,
      ],
      premium: [
        () => `Una pieza pensada para quedarse, no para reemplazarse cada temporada.`,
        () => `El tipo de objeto que mejora con el uso.`,
        () => `Sin adornos: materiales, proporción y oficio.`,
      ],
    },
    cadaUno: 'Características',
    conector: 'con',
  },
  en: {
    intro: {
      cercano: [
        (p) => `${p.titulo}${p.marca ? ` by ${p.marca}` : ''}, made for everyday use.`,
        (p) => `${p.titulo}: the essentials, done properly${p.marca ? `, by ${p.marca}` : ''}.`,
        (p) => `This is ${p.titulo.toLowerCase()}${p.marca ? ` by ${p.marca}` : ''}, nothing more.`,
      ],
      tecnico: [
        (p) => `${p.titulo}${p.marca ? ` (${p.marca})` : ''}: specs and key features.`,
        (p) => `Specifications for ${p.titulo.toLowerCase()}${p.marca ? `, ${p.marca}` : ''}.`,
        (p) => `${p.titulo}. The numbers that matter before you decide.`,
      ],
      premium: [
        (p) => `${p.titulo}${p.marca ? ` by ${p.marca}` : ''}. Considered materials, careful finish.`,
        (p) => `${p.titulo}: the restrained version${p.marca ? `, signed by ${p.marca}` : ''}.`,
        (p) => `${p.titulo}. Few parts, all of them resolved.`,
      ],
    },
    cierre: {
      cercano: [
        () => `Something to keep for years, not for one season.`,
        () => `Easy to use, easy to look after.`,
        () => `One of those things you buy once.`,
      ],
      tecnico: [
        () => `Check the specs above to make sure it fits your use case.`,
        () => `Every figure above comes from the manufacturer's sheet.`,
        () => `If you need an exact measurement, it is in the list.`,
      ],
      premium: [
        () => `Built to stay, not to be replaced every season.`,
        () => `The kind of object that improves with use.`,
        () => `No decoration: materials, proportion and craft.`,
      ],
    },
    cadaUno: 'Features',
    conector: 'with',
  },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mayus = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
// Une piezas mientras quepan: así nunca se corta un valor por la mitad
// (un "2,4 kg" recortado en "2." sería un dato falso en la ficha).
const unir = (primera, piezas, sep, max) => {
  let out = String(primera).trim();
  for (const pieza of piezas) {
    const cand = `${out}${sep}${String(pieza).trim()}`;
    if (cand.length <= max) out = cand;
  }
  return out;
};
// corta por palabra entera y sin dejar signos colgando
const recortar = (s, max) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cortado = t.slice(0, max + 1);
  const hasta = cortado.lastIndexOf(' ');
  return (hasta > max * 0.5 ? cortado.slice(0, hasta) : t.slice(0, max)).replace(/[\s,;:.·|-]+$/, '');
};

const salida = [];
for (const item of $input.all()) {
  const d = item.json;
  if (d.sin_trabajo) { salida.push({ json: d }); continue; }
  const p = d.producto;
  const L = T[cfg.idioma] || T.es;
  const attrs = Object.entries(p.atributos || {});
  attrs.sort((a, b) => {
    const ia = PRIORIDAD.indexOf(a[0]); const ib = PRIORIDAD.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const bullets = attrs.slice(0, 5).map(([k, v]) => `${etiqueta(k, cfg.idioma)}: ${v}`);
  const primeraOpcion = (v) => String(v).split(/,\s+/)[0].trim();   // "S, M, L" -> "S"; "2,4 kg" intacto
  const destacado = attrs.length ? primeraOpcion(attrs[0][1]) : '';

  const sinTildes = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const yaEsta = destacado && sinTildes(destacado).split(/\s+/).filter((w) => w.length > 3)
    .some((w) => sinTildes(p.titulo).includes(w));
  const titulo_seo = unir(recortar(p.titulo, cfg.largo_titulo),
    [!yaEsta && destacado && destacado.length <= 22 ? destacado : '', p.marca].filter(Boolean),
    ' · ', cfg.largo_titulo);
  const rasgos = attrs.slice(0, 3).map(([, v]) => primeraOpcion(v)).filter(Boolean);
  const cabeza = recortar(`${p.titulo}${p.marca ? ` de ${p.marca}` : ''}`, cfg.largo_meta - 1);
  let meta = cabeza;
  rasgos.forEach((rasgo, i) => {
    const cand = `${meta}${i === 0 ? ': ' : ', '}${rasgo}`;
    if (cand.length + 1 <= cfg.largo_meta) meta = cand;
  });
  meta += '.';

  const semilla = [...String(p.sku)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const intro = L.intro[cfg.tono][semilla % L.intro[cfg.tono].length](p);
  const cierre = L.cierre[cfg.tono][semilla % L.cierre[cfg.tono].length](p);
  const descripcion_html = `<p>${esc(intro)}</p>\n<ul>\n${bullets.map((b) => `  <li>${esc(b)}</li>`).join('\n')}\n</ul>\n<p>${esc(cierre)}</p>`;

  const palabras = `${p.titulo} ${p.categoria} ${p.marca}`.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const frases = [p.titulo, p.categoria, p.marca && p.categoria ? `${p.categoria} ${p.marca}` : '']
    .filter(Boolean).map((s) => String(s).toLowerCase());
  const keywords = [...new Set([...frases, ...palabras, ...cfg.palabras_clave_extra.map((k) => String(k).toLowerCase())])].slice(0, 8);
  const alt_imagen = recortar([p.titulo, p.marca, p.atributos && p.atributos.color].filter(Boolean).join(', '), 120);

  salida.push({ json: { ...d, motor: 'plantilla', ficha: {
    sku: p.sku, titulo_seo, meta_descripcion: meta, bullets, descripcion_html, keywords, alt_imagen,
  } } });
}
return salida;
