// Rama en la que no había a quién escribir.
const estado = $getWorkflowStaticData('global');
return [{ json: { hubo_envios: false, enviados: [], fallidos: [],
  historico: estado.historico || { enviados: 0, recuperados: 0, valor_recuperado: 0 } } }];
