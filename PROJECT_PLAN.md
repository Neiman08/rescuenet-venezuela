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

## Validation Policy

After each phase:

- Run `npm run lint`.
- Run `npm run build`.
- Start `npm run dev` when runtime validation is needed.
- Fix failures automatically before proceeding.
- Commit logical phase changes locally.
