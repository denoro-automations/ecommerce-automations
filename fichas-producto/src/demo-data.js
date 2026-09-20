// Catálogo de ejemplo: permite probar el workflow sin conectar ninguna tienda.
// Los datos son fijos, así dos ejecuciones dan exactamente el mismo resultado.
const cfg = $('Configuración').first().json;
const P = (sku, titulo, marca, categoria, precio, stock, descripcion, atributos) =>
  ({ sku, titulo, marca, categoria, precio, moneda: cfg.moneda || 'EUR', stock,
     url: `https://tienda-demo.test/productos/${sku.toLowerCase()}`, descripcion, atributos });

const productos = [
  P('BOT-09', 'Botella térmica 750 ml', 'Nordkap', 'Botellas', 24.9, 0, '', { material: 'acero inoxidable 18/8', capacidad: '750 ml', color: 'verde bosque', mantiene_frio: '24 h', mantiene_calor: '12 h', peso: '395 g', garantia: '2 años' }),
  P('BOT-11', 'Botella térmica 500 ml', 'Nordkap', 'Botellas', 19.9, 42, '', { material: 'acero inoxidable 18/8', capacidad: '500 ml', color: 'arena', mantiene_frio: '24 h', mantiene_calor: '12 h', peso: '290 g', garantia: '2 años' }),
  P('MOC-04', 'Mochila de diario 18 L', 'Vela', 'Mochilas', 59.0, 4, '', { material: 'lona reciclada 600D', capacidad: '18 L', color: 'negro', portatil: 'hasta 15"', impermeable: 'resistente a la lluvia', peso: '640 g', garantia: '5 años' }),
  P('MOC-07', 'Mochila de viaje 32 L', 'Vela', 'Mochilas', 89.0, 11, 'Mochila de viaje de 32 litros pensada para escapadas de fin de semana: cumple las medidas de equipaje de mano, abre en plano como una maleta y lleva un compartimento acolchado para el portátil de hasta 16 pulgadas.', { material: 'lona reciclada 900D', capacidad: '32 L', color: 'verde oliva', portatil: 'hasta 16"', cabina: 'medidas de equipaje de mano', peso: '980 g', garantia: '5 años' }),
  P('CHA-08', 'Chaqueta cortavientos', 'Vela', 'Ropa', 79.0, 18, '', { material: 'nailon reciclado', impermeabilidad: '5.000 mm', color: 'azul noche', tallas: 'S a XXL', peso: '310 g', garantia: '2 años' }),
  P('CAM-02', 'Camiseta de algodón orgánico', 'Vela', 'Ropa', 24.0, 120, '', { material: 'algodón orgánico 180 g', color: 'crudo', tallas: 'XS a XXL', certificado: 'GOTS', lavado: 'a 30 °C' }),
  P('TAZ-01', 'Taza de cerámica 350 ml', 'Casa Lumo', 'Cocina', 14.5, 64, '', { material: 'gres esmaltado', capacidad: '350 ml', color: 'blanco roto', apta: 'microondas y lavavajillas', peso: '380 g' }),
  P('TAZ-03', 'Juego de 4 tazas', 'Casa Lumo', 'Cocina', 49.0, 9, '', { material: 'gres esmaltado', capacidad: '350 ml', unidades: '4', apta: 'microondas y lavavajillas', peso: '1,5 kg' }),
  P('SAR-05', 'Sartén antiadherente 28 cm', 'Casa Lumo', 'Cocina', 39.9, 27, '', { material: 'aluminio forjado', diametro: '28 cm', antiadherente: 'sin PFOA', induccion: 'apta', mango: 'baquelita', garantia: '3 años' }),
  P('CUC-02', 'Juego de cuchillos 3 piezas', 'Casa Lumo', 'Cocina', 64.0, 6, '', { material: 'acero al carbono', piezas: '3', mango: 'madera de haya', afilado: 'a mano' }),
  P('LAM-06', 'Lámpara de mesa LED', 'Casa Lumo', 'Iluminación', 45.0, 15, '', { material: 'aluminio y roble', potencia: '7 W', temperatura: '2700 K regulable', usb: 'carga USB-C', altura: '38 cm' }),
  P('LAM-09', 'Lámpara de pie de lectura', 'Casa Lumo', 'Iluminación', 99.0, 3, '', { material: 'acero y lino', potencia: '12 W', temperatura: '3000 K', altura: '150 cm', interruptor: 'de pie' }),
  P('CUA-03', 'Cuaderno de tapa dura A5', 'Papel Norte', 'Papelería', 12.9, 210, '', { paginas: '192', papel: '100 g/m² marfil', rayado: 'liso', cierre: 'goma elástica', encuadernacion: 'cosida' }),
  P('CUA-05', 'Cuaderno de bolsillo A6', 'Papel Norte', 'Papelería', 7.9, 180, '', { paginas: '96', papel: '90 g/m²', rayado: 'punteado', unidades: 'pack de 2' }),
  P('BOL-02', 'Bolígrafo de latón', 'Papel Norte', 'Papelería', 29.0, 33, '', { material: 'latón macizo', recambio: 'estándar D1', peso: '42 g', acabado: 'envejece con el uso' }),
  P('ALF-01', 'Alfombrilla de escritorio', 'Papel Norte', 'Oficina', 34.0, 21, '', { material: 'fieltro y corcho', medidas: '80 × 40 cm', color: 'gris piedra', reverso: 'antideslizante' }),
  P('AUR-04', 'Auriculares inalámbricos', 'Sonda', 'Audio', 119.0, 8, 'Auriculares inalámbricos con cancelación activa de ruido, ocho horas de batería y veinticuatro más en el estuche. Se conectan por Bluetooth 5.3, resisten el sudor y la lluvia ligera y cargan por USB-C en menos de una hora.', { bateria: '8 h + 24 h con estuche', bluetooth: '5.3', cancelacion: 'activa de ruido', resistencia: 'IPX4', carga: 'USB-C', garantia: '2 años' }),
  P('ALT-02', 'Altavoz portátil', 'Sonda', 'Audio', 79.0, 14, '', { bateria: '12 h', bluetooth: '5.2', potencia: '20 W', resistencia: 'IP67', peso: '560 g', garantia: '2 años' }),
  P('CAB-07', 'Cable USB-C trenzado 2 m', 'Sonda', 'Accesorios', 16.9, 96, '', { longitud: '2 m', potencia: '100 W', datos: '480 Mbps', material: 'nailon trenzado', color: 'gris' }),
  P('CAR-03', 'Cargador de 65 W', 'Sonda', 'Accesorios', 42.0, 2, '', { potencia: '65 W', puertos: '2 USB-C + 1 USB-A', tecnologia: 'GaN', plegable: 'clavijas plegables', garantia: '2 años' }),
  P('YOG-01', 'Esterilla de yoga 6 mm', 'Sereno', 'Deporte', 54.0, 19, '', { material: 'caucho natural', grosor: '6 mm', medidas: '183 × 61 cm', peso: '2,4 kg', superficie: 'antideslizante' }),
  P('BAN-02', 'Bandas elásticas (set de 3)', 'Sereno', 'Deporte', 22.0, 47, '', { material: 'látex natural', resistencias: 'suave, media y fuerte', unidades: '3', bolsa: 'incluida' }),
  P('VEL-04', 'Vela de soja 220 g', 'Sereno', 'Hogar', 26.0, 38, '', { cera: 'soja 100 %', duracion: '45 h', aroma: 'higo y cedro', mecha: 'algodón', recipiente: 'vidrio reutilizable' }),
  P('DIF-01', 'Difusor de aceites esenciales', 'Sereno', 'Hogar', 49.0, 7, '', { capacidad: '300 ml', autonomia: '10 h', apagado: 'automático', luz: 'cálida regulable', ruido: 'menos de 25 dB' }),
];

return productos.map((p) => ({ json: p }));
