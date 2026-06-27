# RescueNet Venezuela

Plataforma operativa para coordinacion humanitaria, reunificacion familiar, refugios, hospitales, centros de ayuda, ingesta institucional y revision protegida de datos sensibles.

El frontend no debe mostrar datos demo salvo que `VITE_ENABLE_DEMO_DATA=true`. Si no hay backend o datos reales disponibles, las pantallas publicas deben mostrar `Sin conexion con datos reales`.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

Backend:

```bash
cd backend
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run start
```

Ingesta humanitaria:

```bash
cd backend
npm run ingest:humanitarian -- --audit-only
npm run ingest:humanitarian -- --dry-run
npm run ingest:humanitarian -- --source=all-persons
npm run ingest:humanitarian -- --source=venezuelatebusca
npm run ingest:humanitarian -- --source=desaparecidos
npm run ingest:humanitarian -- --source=encuentralos
npm run ingest:humanitarian -- --source=terremotovenezuela
```

Carga manual protegida:

- Panel: `/admin/ingesta`
- Endpoint: `POST /api/ingestion/manual-upload`
- Requiere login institucional y permiso `ingestion:manage`.
- Por defecto ejecuta preview con `dryRun: true`.
- Todo registro importado queda `NO_VERIFICADO` hasta aprobacion institucional.
- Plantillas: `backend/templates/*.csv`.

Busqueda familiar publica:

- Endpoint: `GET /api/family-search/public`
- Consolida `MissingPersonReport`, `SafeReport`, `RescuedPerson`, `HospitalAdmission` verificado e `ImportedHumanitarianRecord` aprobado.
- Nunca expone `rawPayload`, telefonos completos, documentos, direcciones exactas, fallecidos privados ni menores identificables.

Render readiness:

- `render.yaml` esta preparado pero no desplegado.
- Backend usa `process.env.PORT`.
- Healthcheck: `/api/health`.
- Variables esperadas: `DATABASE_URL`, `NODE_ENV`, `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `VITE_API_URL`, `VITE_API_BASE_URL`, `VITE_ENABLE_DEMO_DATA=false`.

## Stack

- Vite
- React
- React Router
- Tailwind CSS
- Lucide React
- Leaflet / React Leaflet
- Recharts

## Datos

No inventar nombres ni personas. Los datos reales pueden entrar por conectores publicos o carga institucional manual. Los registros importados se guardan como `NO_VERIFICADO`; solo los aprobados se exponen publicamente mediante `publicSafe`.
