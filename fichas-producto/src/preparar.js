// Filtra el catálogo, aplica el tope por ejecución y deja un producto por item,
// con los "hechos" que luego sirven para comprobar que la ficha no se inventa nada.
const cfg = $('Configuración').first().json;
const productos = $input.all().map((i) => i.json).filter((p) => p && p.sku && p.titulo);
if (!productos.length) throw new Error('No llegó ningún producto con referencia y título');

const corta = (p) => String(p.descripcion || '').replace(/<[^>]*>/g, '').trim().length < cfg.descripcion_corta;
const candidatos = cfg.solo_sin_descripcion ? productos.filter(corta) : productos;
const total = productos.length;
const elegidos = candidatos.slice(0, cfg.max_productos);

if (!elegidos.length) {
  return [{ json: { sin_trabajo: true, total_catalogo: total, candidatos: 0, motor: cfg.motor, ficha: null } }];
}

const textoAtributos = (p) => Object.entries(p.atributos || {})
  .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join('; ');

const TONOS = {
  es: {
    cercano: 'cercano y claro, de tú, sin exagerar',
    tecnico: 'preciso y técnico, centrado en datos y materiales',
    premium: 'sobrio y cuidado, con vocabulario de producto de gama alta, sin florituras',
  },
  en: {
    cercano: 'friendly and plain, second person, no hype',
    tecnico: 'precise and technical, focused on specs and materials',
    premium: 'restrained and refined, high-end product vocabulary, no fluff',
  },
};

return elegidos.map((p) => {
  const hechos = [
    `Referencia: ${p.sku}`,
    `Nombre: ${p.titulo}`,
    p.marca ? `Marca: ${p.marca}` : '',
    p.categoria ? `Categoría: ${p.categoria}` : '',
    p.precio != null ? `Precio: ${p.precio} ${p.moneda || 'EUR'}` : '',
    textoAtributos(p) ? `Características: ${textoAtributos(p)}` : '',
    p.descripcion ? `Texto actual: ${p.descripcion}` : '',
  ].filter(Boolean).join('\n');

  const instrucciones = cfg.idioma === 'en'
    ? `You write product copy for the online shop "${cfg.tienda}". Tone: ${TONOS.en[cfg.tono]}.`
    : `Escribes fichas de producto para la tienda online "${cfg.tienda}". Tono: ${TONOS.es[cfg.tono]}.`;
  const reglas = cfg.idioma === 'en'
    ? `Use ONLY the facts given. Never invent measurements, materials, certifications, guarantees or shipping claims. If a fact is missing, leave it out.`
    : `Usa SOLO los datos que te doy. No inventes medidas, materiales, certificados, garantías ni plazos de envío. Si un dato no está, no lo menciones.`;
  const formato = `Devuelve solo un objeto JSON con estas claves: titulo_seo (máx ${cfg.largo_titulo} caracteres), meta_descripcion (máx ${cfg.largo_meta}), bullets (array de 3 a 5 frases cortas), descripcion_html (2 párrafos <p> y una lista <ul><li>), keywords (array de 4 a 8), alt_imagen (una frase).`;

  return { json: {
    sku: p.sku,
    motor: cfg.motor,
    modelo: cfg.modelo,
    producto: p,
    hechos,
    total_catalogo: total,
    candidatos: candidatos.length,
    prompt_sistema: `${instrucciones}\n${reglas}\n${formato}`,
    prompt_usuario: hechos + (cfg.palabras_clave_extra.length ? `\nPalabras clave a incluir si encajan: ${cfg.palabras_clave_extra.join(', ')}` : ''),
  } };
});
