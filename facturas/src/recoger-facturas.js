// Apunta qué facturas salieron por email y cuáles no (y por qué).
const previstas = $('Preparar envío').all().map((i) => i.json);
const respuestas = $input.all().map((i) => i.json || {});
const enviadas = [];
const fallidas = [];
const sin_email = [];
previstas.forEach((f, i) => {
  if (!f.enviar) { sin_email.push({ numero: f.numero, cliente: f.cliente.nombre }); return; }
  const r = respuestas[i] || {};
  const error = r.error || r.errorMessage;
  if (error) {
    fallidas.push({ numero: f.numero, email: f.cliente.email,
      error: String(typeof error === 'object' ? error.message || JSON.stringify(error) : error).slice(0, 200) });
  } else {
    enviadas.push({ numero: f.numero, email: f.cliente.email, con_pdf: f.con_pdf });
  }
});
return [{ json: { hubo_envios: true, enviadas, fallidas, sin_email,
  sin_pdf: previstas.filter((f) => !f.con_pdf).length } }];
