// Modo demo: no hay tienda que tocar, así que se devuelve el cambio como aplicado.
return $input.all().map((i) => ({ json: { ...i.json, simulado: true } }));
