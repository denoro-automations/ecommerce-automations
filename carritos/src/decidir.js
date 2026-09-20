// Decide a quién le toca un aviso ahora mismo, y lleva la cuenta de lo recuperado.
// El estado vive en el propio workflow (staticData), así que no hace falta base de datos.
const cfg = $('Configuración').first().json;
const ahora = new Date(cfg.ahora).getTime();
const estado = $getWorkflowStaticData('global');
estado.carritos = estado.carritos || {};
estado.historico = estado.historico || { enviados: 0, recuperados: 0, valor_recuperado: 0 };

const carritos = $input.all().map((i) => i.json).filter((c) => c && c.id);
const envios = [];
const recuperados = [];
const omitidos = { sin_email: 0, sin_consentimiento: 0, importe_bajo: 0, caducados: 0, al_dia: 0 };

for (const c of carritos) {
  const previo = estado.carritos[c.id];
  const enviados = (previo && previo.pasos) || [];

  if (c.completado_en) {
    // Solo se apunta como recuperado si antes le habíamos escrito: si no, es una compra normal.
    if (enviados.length) {
      recuperados.push({ id: c.id, email: c.email, nombre: c.nombre, total: c.total,
        pasos: enviados.length, completado_en: c.completado_en });
      estado.historico.recuperados += 1;
      estado.historico.valor_recuperado = Math.round((estado.historico.valor_recuperado + c.total) * 100) / 100;
    }
    delete estado.carritos[c.id];
    continue;
  }

  const horas = (ahora - Date.parse(c.actualizado_en)) / 3600000;
  if (!(horas >= 0)) continue;
  if (horas > cfg.horas_limite) { omitidos.caducados += 1; delete estado.carritos[c.id]; continue; }
  if (!c.email) { omitidos.sin_email += 1; continue; }
  if (cfg.solo_con_consentimiento && !c.acepta_marketing) { omitidos.sin_consentimiento += 1; continue; }
  if (c.total < cfg.minimo_total) { omitidos.importe_bajo += 1; continue; }

  // Pasos que ya tocaban por tiempo. Si hay varios pendientes se manda el último:
  // a un carrito de hace tres días no se le escribe "¿te ayudamos a terminar?".
  const tocan = cfg.pasos.map((p, i) => (horas >= p.horas ? i + 1 : 0)).filter(Boolean);
  const pendientes = tocan.filter((p) => !enviados.includes(p));
  if (!pendientes.length) { omitidos.al_dia += 1; continue; }
  const paso = pendientes[pendientes.length - 1];

  envios.push({
    ...c,
    paso,
    saltados: pendientes.slice(0, -1),   // los anteriores se dan por pasados, no se enviarán luego
    asunto: cfg.pasos[paso - 1].asunto,
    cupon: cfg.pasos[paso - 1].cupon || '',
    horas_abandonado: Math.round(horas),
  });
}

// Los carritos grandes primero: si hay tope, que se aproveche en lo que más vale.
envios.sort((a, b) => b.total - a.total);
const aEnviar = envios.slice(0, cfg.max_envios_por_ejecucion);

return [{ json: {
  ...cfg,
  hay_envios: aEnviar.length > 0,
  envios: aEnviar,
  en_espera: envios.length - aEnviar.length,
  recuperados,
  omitidos,
  resumen: {
    carritos_vistos: carritos.length,
    avisos: aEnviar.length,
    valor_en_juego: Math.round(aEnviar.reduce((s, e) => s + e.total, 0) * 100) / 100,
    recuperados: recuperados.length,
    valor_recuperado: Math.round(recuperados.reduce((s, e) => s + e.total, 0) * 100) / 100,
    historico: { ...estado.historico },
  },
} }];
