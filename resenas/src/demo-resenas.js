// Reseñas de ejemplo repartidas en el tiempo, con quejas repetidas sobre el mismo tema
// (el plazo de envío), que es justo lo que el resumen tiene que hacer visible.
const cfg = $('Configuración').first().json;
const ahora = new Date(cfg.ahora).getTime();
const hace = (d) => new Date(ahora - d * 86400000).toISOString();
const R = (sitio, autor, puntuacion, dias, texto) => ({ json: {
  sitio, autor, puntuacion, fecha: hace(dias), texto, url: 'https://resenas.test/' + autor.toLowerCase(),
} });

return [
  R('Trustpilot', 'Marta', 5, 0.2, 'La mesa llegó perfecta y el montaje fue sencillo. Repetiré sin duda.'),
  R('Trustpilot', 'Javier', 2, 0.5, 'El pedido tardó tres semanas en llegar. El producto bien, pero el plazo de envío es inaceptable.'),
  R('Trustpilot', 'Lucía', 1, 1, 'Sigo esperando mi pedido. Nadie contesta al correo de atención al cliente.'),
  R('Trustpilot', 'Pablo', 4, 2, 'Buena calidad por el precio. El envío tardó algo más de lo previsto.'),
  R('Google', 'Ana', 5, 3, 'Atención impecable, me resolvieron una duda por teléfono en dos minutos.'),
  R('Google', 'Sergio', 2, 4, 'Producto correcto pero el envío se retrasó una semana sin avisar.'),
  R('Google', 'Elena', 5, 5, 'Encantada con la lámpara, se ve mejor que en las fotos.'),
  R('Trustpilot', 'Rubén', 3, 6, 'Cumple. Nada especial, el embalaje llegó algo dañado.'),
  R('Google', 'Nuria', 5, 8, 'Segunda compra y todo perfecto otra vez.'),
  R('Trustpilot', 'Iván', 1, 9, 'Devolución imposible. Llevo dos semanas persiguiendo el reembolso.'),
  R('Google', 'Carmen', 4, 11, 'Muy contenta con la compra, el envío fue rápido esta vez.'),
  R('Trustpilot', 'Óscar', 5, 13, 'Excelente calidad de los materiales y buen precio.'),
];
