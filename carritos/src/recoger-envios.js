// Apunta qué avisos salieron de verdad. Solo lo que se envió se marca como enviado:
// si el SMTP falla, ese carrito volverá a intentarlo en la siguiente pasada.
const cfg = $('Configuración').first().json;
const previstos = $('Preparar avisos').all().map((i) => i.json);
const respuestas = $input.all().map((i) => i.json || {});
const estado = $getWorkflowStaticData('global');
estado.carritos = estado.carritos || {};
estado.historico = estado.historico || { enviados: 0, recuperados: 0, valor_recuperado: 0 };

const enviados = [];
const fallidos = [];
previstos.forEach((p, i) => {
  const r = respuestas[i] || {};
  const error = r.error || r.errorMessage;
  if (error) {
    fallidos.push({ id: p.id, email: p.email, paso: p.paso,
      error: String(typeof error === 'object' ? error.message || JSON.stringify(error) : error).slice(0, 200) });
    return;
  }
  const previo = estado.carritos[p.id] || { pasos: [] };
  const pasos = [...new Set([...previo.pasos, ...(p.saltados || []), p.paso])].sort((a, b) => a - b);
  estado.carritos[p.id] = { pasos, ultimo_envio: cfg.ahora, total: p.total, email: p.email };
  estado.historico.enviados += 1;
  enviados.push({ id: p.id, email: p.email, paso: p.paso, total: p.total });
});

return [{ json: { hubo_envios: true, enviados, fallidos, historico: { ...estado.historico } } }];
