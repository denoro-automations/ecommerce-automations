// Foto del catálogo de la tienda, para el modo demo.
const T = (sku, titulo, stock, precio, id) => ({ json: {
  _lado: 'tienda', sku, titulo, stock, precio, id_tienda: id, inventory_item_id: 9000 + id,
} });
return [
  T('MES-01', 'Mesa de comedor extensible', 6, 449.00, 1),
  T('SIL-04', 'Silla de comedor', 24, 89.00, 2),
  T('EST-02', 'Estantería de pared', 11, 129.00, 3),
  T('BAN-07', 'Banco de recibidor', 3, 199.00, 4),
  T('PER-01', 'Perchero de pie', 0, 79.00, 5),
  T('LAM-06', 'Lámpara de mesa LED', 12, 45.00, 6),
  T('LAM-09', 'Lámpara de pie de lectura', 3, 99.00, 7),
  T('TAZ-01', 'Taza de cerámica 350 ml', 64, 14.50, 8),
  T('TAZ-03', 'Juego de 4 tazas', 9, 49.00, 9),
  T('SAR-05', 'Sartén antiadherente 28 cm', 27, 39.90, 10),
  T('CUC-02', 'Juego de cuchillos 3 piezas', 6, 64.00, 11),
  T('ALF-01', 'Alfombrilla de escritorio', 21, 34.00, 12),
  T('CUA-03', 'Cuaderno de tapa dura A5', 210, 12.90, 13),
  T('CUA-05', 'Cuaderno de bolsillo A6', 180, 7.90, 14),
  T('BOL-02', 'Bolígrafo de latón', 33, 29.00, 15),
  T('VEL-04', 'Vela de soja 220 g', 38, 26.00, 16),
  T('DIF-01', 'Difusor de aceites esenciales', 7, 49.00, 17),
  T('ANT-99', 'Marco de fotos (descatalogado)', 5, 19.00, 18),
];
