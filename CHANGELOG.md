# Changelog

## 2026-06-27

### Added

- Initial RescueNet Venezuela platform baseline with dashboard, map, reports, rescued people, family search, centers, rescatistas, donations, government, international, and admin modules.
- Simulated affected-zone data and future database schema documentation.
- Emergency autonomous plan and changelog tracking.
- Phase 1 operational governance backbone completed.
- Centralized route metadata, role catalog, permission matrix, access-control helpers, role selector, and admin access visibility.
- Phase 2 emergency workflow hardening completed with operations center, incident triage queue, dispatch status, responder teams, zone pressure, and resilient-mode banner.
- Phase 3 humanitarian logistics completed with inventory lots, aid requests, deliveries, logistics summary, route, permissions, and dashboard entry.
- Phase 4 privacy, security, and audit hardening completed with reusable sensitive fields, protected exact coordinates, restricted rescue-location warning, and admin data-protection controls.
- Phase 5 GIS and AI readiness completed with GIS layer registry, logistics corridors, AI pipeline contracts, AI safety rules, route, and validation.
- Phase 6 backend and operational platform completed with Express, Prisma/PostgreSQL schema, JWT auth, permissions, REST API, Socket.IO, upload service, audit service, matching/dispatch engines, AI/GIS service architecture, and backend tests.
- Phase 7 login-free emergency public access completed with explicit public routes, public submission metadata, sanitizer service, anti-spam/rate-limit guards, protected sensitive routes, institutional login messaging, and public UX notices.

### In Progress

- Phase 8 public operations hardening started with official affected-zone seed data, sanitized public zone endpoint, frontend form zone loading, emergency public-location sanitization, and protected raw donation CRUD.
- Added protected humanitarian ingestion foundation with source registry, scrapers/connectors, normalizer, privacy service, deduplication service, importer CLI, Prisma models, protected API routes, public-safe integration, institutional review page, and tests.
- Closed ingestion phase with a Postgres migration, real Excel parsing via `xlsx`, robust CLI flags, no-DB importable reports, initial hospital/shelter seed data, and expanded security/privacy tests.
- Added collection-center and public resource ingestion support for acopio centers, shelters, hospitals, water, food, medicine, volunteer centers, and urgent needs with public-safe privacy and frontend filters.
- Improved humanitarian ingestion reliability with source-connectivity audits, API-aware ReliefWeb/OCHA connector support, per-source success/failure reports, create/update counts, elapsed time, and confidence scoring.
