# RescueNet Venezuela

Aplicacion web mock para coordinacion humanitaria posterior a terremoto. Incluye dashboard, mapa en vivo, reportes de emergencia, estado seguro, busqueda familiar, registro de rescatados, refugios, hospitales, donaciones auditables, panel gobierno, panel internacional y administracion.

Toda la informacion operacional incluida es simulada y no representa datos oficiales reales.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Stack

- Vite
- React
- React Router
- Tailwind CSS
- Lucide React
- Leaflet / React Leaflet
- Recharts

## Datos

Las ubicaciones mock salen de `src/data/affectedZones.js`. Cualquier zona, refugio, hospital, donacion o reporte visual debe permanecer vinculado a esa lista hasta integrar una fuente oficial.
