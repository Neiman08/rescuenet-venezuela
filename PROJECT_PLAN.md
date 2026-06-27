# RescueNet Venezuela - Emergency Autonomous Plan

This project is managed in emergency autonomous mode. Every phase is evaluated by the AI Council roles: software architecture, React engineering, UI/UX, database, GIS, emergency response, humanitarian operations, security, AI readiness, and QA.

## Guiding Question

Would this help during a national emergency?

If the answer is no, the module must be redesigned before proceeding.

## Phase 0 - Functional Platform Baseline

Status: Complete

- Vite React app scaffolded.
- Dashboard, live map, forms, rescued people, family search, donations, government, international, and admin modules implemented.
- Simulated data centralized.
- Initial build, lint, dev server validation, and local commit completed.

## Phase 1 - Operational Governance Backbone

Status: Complete

- Centralize route metadata and navigation.
- Define role IDs, operational role groups, and permission matrix.
- Add access-control helpers for future backend enforcement.
- Expose role context in the header and admin panel.
- Validate with lint and production build.
- Commit phase changes locally.

## Phase 2 - Emergency Workflow Hardening

Status: Complete

- Add triage queues for emergency reports.
- Add incident severity, SLA, and dispatch status models.
- Improve responder workflow from report intake to assignment.
- Add offline/low-connectivity UI states.

## Phase 3 - Humanitarian Logistics

Status: Complete

- Expand inventory, needs, requests, deliveries, and distribution tracking.
- Add shelter/hospital capacity pressure indicators.
- Add volunteer and organization deployment views.

## Phase 4 - Privacy, Security, and Audit

Status: Complete

- Strengthen sensitive-field masking across person, medical, document, and location views.
- Add mock audit events for every sensitive action.
- Add role-based route banners and blocked-state patterns.

## Phase 5 - GIS and AI Readiness

Status: Complete

- Add map layers, zone filters, report clusters, and logistics corridors.
- Prepare AI contracts for duplicate detection, triage classification, and family/rescued matching.

## Phase 6 - Backend and Operational Platform

Status: Complete

- Add Express backend under `/backend`.
- Configure PostgreSQL Prisma schema from `DATABASE_SCHEMA.md`.
- Implement JWT auth, role and permission middleware.
- Implement REST routes for auth, emergencies, missing people, rescued people, hospitals, shelters, organizations, donations, dashboard, map, logistics, and uploads.
- Add Socket.IO event server.
- Add MatchingEngine and EmergencyDispatchEngine with tests.
- Add audit, file upload, AI placeholder, and GIS service architecture.
- Validate backend and frontend without changing working frontend behavior.

## Phase 7 - Login-Free Emergency Public Access

Status: Complete

- Keep victims, relatives, and citizens free from login requirements for urgent public flows.
- Add explicit public backend routes for emergency reports, safe reports, missing reports, public rescued list, hospitals, shelters, map, dashboard, organizations, donations, and help centers.
- Add public data sanitizers to prevent leaking phone numbers, documents, exact addresses, medical details, internal notes, sensitive evidence, and protected locations.
- Keep sensitive and operational endpoints protected for institutions, verified responders, government, auditors, and administrators.
- Update frontend header, login page, public notices, and critical CTA copy.

## Phase 8 - Public Operations Hardening

Status: In Progress

- Connect public forms to official backend affected-zone records instead of simulated IDs.
- Add public affected-zone endpoint with sanitized approximate coordinates.
- Seed the initial Venezuela affected-zone catalog for critical, high, and medium priority states.
- Harden public emergency location sanitization and keep raw donation CRUD behind authentication.
- Add humanitarian ingestion architecture for public-source discovery, normalization, privacy, deduplication, protected review, and CLI execution.
- Continue with uploads, hospital admissions importers, real database migration review, and production CAPTCHA.

## Validation Policy

After each phase:

- Run `npm run lint`.
- Run `npm run build`.
- Start `npm run dev` when runtime validation is needed.
- Fix failures automatically before proceeding.
- Commit logical phase changes locally.
