// Un item por sitio a vigilar, con su URL y sus selectores.
const cfg = $('Configuración').first().json;
return cfg.sitios.map((s) => ({ json: {
  nombre: s.nombre,
  url: s.url,
  sel: {
    bloque: s.bloque,
    texto: s.texto,
    puntuacion: s.puntuacion || '',
    puntuacion_attr: s.puntuacion_attr || '',
    autor: s.autor || '',
    fecha: s.fecha || '',
    fecha_attr: s.fecha_attr || '',
  },
} }));
