// Carritos de ejemplo, colocados en el tiempo para que se vean los tres pasos de la secuencia,
// una recuperación, un carrito sin consentimiento y uno demasiado pequeño.
const cfg = $('Configuración').first().json;
const ahora = new Date(cfg.ahora).getTime();
const hace = (h) => new Date(ahora - h * 3600000).toISOString();
const L = (titulo, unidades, precio) => ({ titulo, unidades, precio });

const C = (id, email, nombre, horas, total, lineas, extra = {}) => ({ json: {
  id, email, nombre,
  total, moneda: cfg.moneda,
  creado_en: hace(horas + 0.5), actualizado_en: hace(horas),
  completado_en: null, acepta_marketing: true,
  url_recuperacion: `${cfg.web}/carrito/${id}`,
  lineas, ...extra,
} });

return [
  C('C-1001', 'ana@ejemplo.test', 'Ana', 2, 78.90, [L('Botella térmica 750 ml', 1, 24.9), L('Mochila de diario 18 L', 1, 54)]),
  C('C-1002', 'bruno@ejemplo.test', 'Bruno', 30, 129.00, [L('Lámpara de pie de lectura', 1, 99), L('Taza de cerámica', 2, 15)]),
  C('C-1003', 'carla@ejemplo.test', 'Carla', 80, 245.00, [L('Mesa auxiliar', 1, 199), L('Vela de soja 220 g', 1, 46)]),
  C('C-1004', 'diego@ejemplo.test', 'Diego', 26, 64.00, [L('Juego de cuchillos', 1, 64)], { completado_en: hace(1) }),
  C('C-1005', 'elena@ejemplo.test', 'Elena', 5, 42.00, [L('Cargador de 65 W', 1, 42)], { acepta_marketing: false }),
  C('C-1006', 'fran@ejemplo.test', 'Fran', 10, 7.90, [L('Cuaderno de bolsillo A6', 1, 7.9)]),
  C('C-1007', '', 'Invitado', 6, 89.00, [L('Mochila de viaje 32 L', 1, 89)]),
  C('C-1008', 'gema@ejemplo.test', 'Gema', 200, 55.00, [L('Esterilla de yoga', 1, 54)]),
];
