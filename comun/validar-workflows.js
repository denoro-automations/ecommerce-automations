// Comprueba que los workflow.json generados son coherentes antes de importarlos en n8n:
// nodos sin entrada, conexiones a nodos que no existen, referencias $('Nodo') rotas y
// expresiones {{ }} mal escritas. Uso: node comun/validar-workflows.js
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const ficheros = [
  ['fichas-producto', 'workflow.json'], ['stock-proveedor', 'workflow.json'], ['carritos', 'workflow.json'],
  ['resenas', 'workflow.json'], ['facturas', 'workflow.json'], ['comun', 'avisos-de-error.workflow.json'],
];
let problemas = 0;
const aviso = (m) => { console.log('  ⚠ ' + m); problemas++; };

for (const [carpeta, fichero] of ficheros) {
  const wf = JSON.parse(fs.readFileSync(path.join(RAIZ, carpeta, fichero), 'utf8'));
  const nombres = wf.nodes.map((n) => n.name);
  const set = new Set(nombres);
  console.log(`${wf.name} — ${wf.nodes.length} nodos`);
  if (set.size !== nombres.length) aviso('nombres de nodo repetidos');
  const ids = new Set(wf.nodes.map((n) => n.id));
  if (ids.size !== wf.nodes.length) aviso('ids repetidos');

  // conexiones que apuntan a nodos inexistentes
  for (const [origen, salidas] of Object.entries(wf.connections)) {
    if (!set.has(origen)) aviso(`conexión desde un nodo que no existe: ${origen}`);
    for (const rama of salidas.main || []) for (const c of rama || []) {
      if (!set.has(c.node)) aviso(`conexión hacia un nodo que no existe: ${c.node}`);
    }
  }
  // nodos sueltos (sin entrada ni salida), salvo triggers y notas
  const conEntrada = new Set();
  for (const salidas of Object.values(wf.connections)) {
    for (const rama of salidas.main || []) for (const c of rama || []) conEntrada.add(c.node);
  }
  for (const n of wf.nodes) {
    const esNota = n.type.endsWith('stickyNote');
    const esTrigger = /Trigger|trigger/.test(n.type);
    if (esNota) continue;
    if (!esTrigger && !conEntrada.has(n.name)) aviso(`nodo sin entrada: ${n.name}`);
    if (n.type.endsWith('.code')) {
      const js = n.parameters.jsCode || '';
      if (js.trim().length < 20) aviso(`nodo Code vacío: ${n.name}`);
      // referencias $('Otro nodo') que tienen que existir
      for (const m of js.matchAll(/\$\('([^']+)'\)/g)) {
        if (!set.has(m[1])) aviso(`${n.name} usa $('${m[1]}') y ese nodo no está en el workflow`);
      }
    }
    // expresiones {{ }} mal cerradas: solo dentro de cada cadena, no en las llaves del JSON
    const revisarCadenas = (v) => {
      if (typeof v === 'string') {
        if (!v.includes('{{')) return;
        const abre = (v.match(/\{\{/g) || []).length;
        const cierra = (v.match(/\}\}/g) || []).length;
        if (abre !== cierra) aviso(`expresión mal cerrada en ${n.name}: ${v.slice(0, 60)}`);
        if (!v.startsWith('=')) aviso(`expresión sin "=" delante en ${n.name}: ${v.slice(0, 60)}`);
      } else if (v && typeof v === 'object') Object.values(v).forEach(revisarCadenas);
    };
    revisarCadenas(n.parameters);
  }
}
console.log(problemas ? `\n${problemas} problema(s)` : '\nLos seis workflows son coherentes: nodos, conexiones y referencias entre nodos.');
process.exit(problemas ? 1 : 0);
