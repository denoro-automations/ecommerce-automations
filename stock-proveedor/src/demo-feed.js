// Feed de ejemplo del proveedor: sirve para probar la sincronización sin conectar nada.
// Está pensado para que aparezcan todos los casos: subidas, bajadas, agotados,
// reposiciones, cambios de precio, una alta nueva y una referencia que el proveedor ya no lista.
const F = (sku, stock, precio) => ({ json: { _lado: 'feed', sku, stock, precio, proveedor: $('Configuración').first().json.proveedor } });
return [
  F('MES-01', 4, 289.00),   // baja de stock
  F('SIL-04', 40, 54.00),   // sube de stock
  F('EST-02', 0, 79.00),    // se agota
  F('BAN-07', 0, 119.00),   // se agota
  F('PER-01', 18, 47.00),   // vuelve a haber (en tienda está a 0)
  F('LAM-06', 12, 29.50),   // sube de precio, mismo stock
  F('LAM-09', 3, 61.00),    // baja de precio, mismo stock
  F('TAZ-01', 64, 8.70),    // sin cambios
  F('TAZ-03', 9, 29.40),    // sin cambios
  F('SAR-05', 27, 23.90),   // sin cambios
  F('CUC-02', 6, 38.40),    // sin cambios
  F('ALF-01', 21, 20.40),   // sin cambios
  F('CUA-03', 150, 7.70),   // baja de stock
  F('CUA-05', 180, 4.70),   // sin cambios
  F('BOL-02', 33, 17.40),   // sin cambios
  F('VEL-04', 25, 15.60),   // baja de stock
  F('DIF-01', 7, 29.40),    // sin cambios
  F('ESP-12', 30, 22.00),   // alta nueva: el proveedor lo lista y la tienda no lo tiene
];
