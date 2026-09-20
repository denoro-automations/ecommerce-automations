#!/usr/bin/env node
// Pasa los tests de las cinco automatizaciones. Uso: node probar.js
const { execFileSync } = require('child_process');
const path = require('path');

const SUITES = [
  ['fichas-producto', 'test_fichas.js'],
  ['stock-proveedor', 'test_stock.js'],
  ['carritos', 'test_carritos.js'],
  ['resenas', 'test_resenas.js'],
  ['facturas', 'test_facturas.js'],
];
let fallos = 0;
try {
  process.stdout.write(execFileSync('node', [path.join(__dirname, 'comun', 'validar-workflows.js')], { encoding: 'utf8' }).split('\n').pop() + '\n');
} catch (e) {
  process.stdout.write(`workflows: FALLA\n${e.stdout || ''}`);
  fallos += 1;
}
for (const [carpeta, fichero] of SUITES) {
  try {
    const salida = execFileSync('node', [path.join(__dirname, carpeta, 'test', fichero)], { encoding: 'utf8' });
    process.stdout.write(salida);
  } catch (e) {
    process.stdout.write(`${carpeta}: FALLA\n${e.stdout || ''}${e.stderr || ''}`);
    fallos += 1;
  }
}
console.log(fallos ? `\n${fallos} paquete(s) con fallos` : '\nTodo en verde');
process.exit(fallos ? 1 : 0);
