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
npm run ingest:humanitarian -- --audit-only
npm run ingest:humanitarian -- --source=redayuda
npm run ingest:humanitarian -- --source=vzlayuda
npm run ingest:humanitarian -- --file=/path/to/public-data.csv
npm run ingest:humanitarian -- --file=/path/to/public-data.json
npm run ingest:humanitarian -- --file=/path/to/public-data.xlsx
```

Reports are written to `backend/reports/ingestion/`. If PostgreSQL is unavailable or migrations are not applied, the command keeps running and writes an importable JSON report. Re-run after setting `DATABASE_URL`, then execute `npm run prisma:migrate`, `npm run prisma:seed`, and `npm run ingest:humanitarian`.

Collection-center ingestion supports `collection_center`, `shelter`, `hospital`, `help_center`, `water_point`, `food_point`, `medical_point`, `volunteer_center`, and `donation_need`. Public endpoints only merge approved `publicSafe` records and must not expose `rawPayload`, personal phone numbers, exact private addresses, protected coordinates, or internal contacts.

Ingestion reports include consulted, successful, and failed sources; extracted, normalized, imported, updated, duplicate, and privacy-blocked records; elapsed time; per-source connectivity diagnostics; and confidence scores for reviewer prioritization.

To add a source, edit `src/ingestion/sourcesRegistry.js` with `name`, `url`, `type`, `trustLevel`, `connector`, and `priority`. Use `connector: "reliefweb_api"` with `apiUrl` for ReliefWeb/OCHA API sources; use `connector: "html"` for HTML pages; use `--file` for public CSV/JSON/XLSX/Google Sheet exports. After adding a source, run `npm run ingest:humanitarian -- --audit-only --source=<name-fragment>` to verify status code, content type, dynamic-JavaScript signals, embedded JSON, API hints, bot blocking, and elapsed time.

If a source returns zero records, check the report for: network failure, timeout, `401/403/429/503` blocking, JavaScript-rendered content, missing embedded JSON, changed HTML labels, or unavailable database. For dynamic sites, identify an API/JSON/CSV/Google Sheet endpoint and register that endpoint instead of scraping the rendered page.

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
