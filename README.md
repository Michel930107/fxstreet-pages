# FXStreet Data Pages

Catálogo de datasets XML servido por GitHub Pages con una sola plantilla reutilizable.

## Estructura

- `index.html` carga la lista de páginas desde `data/pages.json`.
- `template.html` carga el dataset indicado en `?dataset=...`.
- `assets/template.js` interpreta los elementos XML `Symbol` y ofrece búsqueda, filtros y ordenación.
- `data/*.xml` contiene los datos originales.

## Añadir una página

1. Copiar el nuevo XML a `data/`.
2. Añadir una entrada a `data/pages.json` con un `id` único y la ruta del XML en `source`.

No es necesario duplicar ni modificar la plantilla para cada dataset que mantenga la misma estructura `Result > SymbolList > Symbol`.
