// Un item por cambio, con lo que necesita cada tienda para aplicarlo.
const c = $('Comparar con la tienda').first().json;
if (!c.aplicar) return [];
return c.cambios.map((x) => ({ json: {
  ...x,
  destino: c.destino,
  dominio_shopify: c.dominio_shopify,
  location_id: c.location_id,
} }));
