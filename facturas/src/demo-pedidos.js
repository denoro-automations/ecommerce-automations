// Pedidos de ejemplo: uno de particular, uno de empresa con NIF, uno con dos tipos de IVA,
// uno sin email y uno ya facturado en una pasada anterior.
const cfg = $('Configuración').first().json;
const ahora = new Date(cfg.ahora).getTime();
const hace = (h) => new Date(ahora - h * 3600000).toISOString();
const L = (titulo, unidades, precio, iva) => ({ titulo, unidades, precio, iva });

const P = (id, numero, nombre, email, lineas, extra = {}) => ({ json: {
  id, numero_pedido: numero, fecha: hace(2),
  cliente: { nombre, email, nif: extra.nif || '', direccion: extra.direccion || 'Calle Falsa 1',
    cp_poblacion: extra.cp_poblacion || '28001 Madrid', pais: 'España' },
  lineas, envio: extra.envio ?? 4.95, descuento: extra.descuento ?? 0,
  moneda: cfg.moneda, pagado: extra.pagado ?? true,
} });

return [
  P('p-9001', 1001, 'Ana Ruiz', 'ana@ejemplo.test', [
    L('Botella térmica 750 ml', 2, 24.90), L('Taza de cerámica 350 ml', 1, 14.50)]),
  P('p-9002', 1002, 'Muebles Nord, S.L.', 'compras@nord.test', [
    L('Mesa de comedor extensible', 1, 449.00)], { nif: 'B12345678', direccion: 'Avinguda Diagonal 200', cp_poblacion: '08018 Barcelona', envio: 0 }),
  P('p-9003', 1003, 'Luis Sáez', 'luis@ejemplo.test', [
    L('Cuaderno de tapa dura A5', 3, 12.90, 21), L('Libro de recetas', 1, 19.90, 4)], { descuento: 5 }),
  P('p-9004', 1004, 'Marta Gil', '', [L('Vela de soja 220 g', 1, 26.00)]),
  P('p-9005', 1005, 'Pedro Lima', 'pedro@ejemplo.test', [L('Alfombrilla de escritorio', 1, 34.00)]),
  P('p-9006', 1006, 'Sara Vega', 'sara@ejemplo.test', [L('Sartén 28 cm', 1, 39.90)], { pagado: false }),
];
