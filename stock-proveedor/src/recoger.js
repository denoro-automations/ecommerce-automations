// Cuenta qué cambios se aplicaron y cuáles fallaron (los nodos de tienda siguen aunque uno falle).
const pedidos = $('Preparar actualizaciones').all().map((i) => i.json);
const respuestas = $input.all().map((i) => i.json);
const aplicados = [];
const fallidos = [];
pedidos.forEach((p, i) => {
  const r = respuestas[i] || {};
  const error = r.error || r.errorMessage || (r.errors && JSON.stringify(r.errors));
  if (error) fallidos.push({ ...p, error: String(typeof error === 'object' ? error.message || JSON.stringify(error) : error).slice(0, 200) });
  else aplicados.push(p);
});
return [{ json: { aplicado: true, aplicados, fallidos } }];
