# RescueNet Venezuela Backend

Operational backend for RescueNet Venezuela.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run seed
npm run prisma:migrate
npm run prisma:seed
npm run prisma:generate
npm run ingest:humanitarian
```

## Humanitarian Ingestion CLI

```bash
npm run ingest:humanitarian -- --dry-run
npm run ingest:humanitarian -- --source=redayuda
npm run ingest:humanitarian -- --source=vzlayuda
npm run ingest:humanitarian -- --file=/path/to/public-data.csv
npm run ingest:humanitarian -- --file=/path/to/public-data.json
npm run ingest:humanitarian -- --file=/path/to/public-data.xlsx
```

Reports are written to `backend/reports/ingestion/`. If PostgreSQL is unavailable or migrations are not applied, the command keeps running and writes an importable JSON report. Re-run after setting `DATABASE_URL`, then execute `npm run prisma:migrate`, `npm run prisma:seed`, and `npm run ingest:humanitarian`.

## Core Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/emergency`
- `GET /api/emergency`
- `GET /api/emergency/:id`
- `PATCH /api/emergency/:id`
- `DELETE /api/emergency/:id`
- `POST /api/missing`
- `GET /api/missing`
- `GET /api/missing/:id`
- `PATCH /api/missing/:id`
- `POST /api/rescued`
- `GET /api/rescued`
- `GET /api/rescued/:id`
- `PATCH /api/rescued/:id`
- `GET /api/hospitals`
- `POST /api/hospitals`
- `PATCH /api/hospitals/:id`
- `GET /api/shelters`
- `POST /api/shelters`
- `PATCH /api/shelters/:id`
- `GET /api/organizations`
- `POST /api/organizations`
- `PATCH /api/organizations/:id`
- `POST /api/donations`
- `GET /api/donations`
- `GET /api/donations/:id`
- `GET /api/dashboard`
- `GET /api/dashboard/stats`
- `GET /api/map`
- `GET /api/logistics`
- `POST /api/uploads`
- `POST /api/emergency` public, no login
- `GET /api/emergency/public`
- `POST /api/safe` public, no login
- `GET /api/safe/public`
- `POST /api/missing` public, no login
- `GET /api/missing/public`
- `GET /api/rescued/public`
- `GET /api/hospitals/public`
- `GET /api/shelters/public`
- `GET /api/affected-zones/public`
- `GET /api/map/public`
- `GET /api/dashboard/public`
- `GET /api/organizations/public`
- `GET /api/donations/public`
- `GET /api/help-centers/public`
- `POST /api/ingestion/run`
- `GET /api/ingestion/runs`
- `GET /api/ingestion/records`
- `POST /api/ingestion/records/:id/approve`
- `POST /api/ingestion/records/:id/reject`
- `POST /api/ingestion/records/:id/mark-duplicate`
- `POST /api/ingestion/records/:id/link-duplicate`

## Notes

- PostgreSQL is configured through Prisma in `prisma/schema.prisma`.
- `.env.example` contains required environment variables.
- Run `npm run prisma:migrate` against a configured PostgreSQL database, then `npm run prisma:seed` to create roles, permissions, and the initial Venezuela affected-zone catalog.
- Operational roles are enforced through JWT plus `requireRole()` and `requirePermission()`.
- Elevated roles must not be self-registered; they should be assigned by an administrator workflow.
- Victims, families, and citizens can report emergencies, safe status, missing people, and consult public help data without login.
- Public responses must pass through `PublicDataSanitizer` before leaving the API.
- Imported humanitarian records are stored as `NO_VERIFICADO` with `sourceUrl`, `capturedAt`, `rawPayload`, and `publicSafe`; only approved `publicSafe` records can be merged into public endpoints.
