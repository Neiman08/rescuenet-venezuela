# RescueNet Venezuela - Future Database Schema

All current application data is mock and marked as simulated. A production database should include:

- users
- roles
- affected_zones
- emergency_reports
- safe_reports
- missing_person_reports
- rescued_people
- rescue_locations
- shelters
- hospitals
- organizations
- donations
- donation_expenses
- expense_evidence
- family_claims
- match_results
- volunteers
- rescue_teams
- audit_logs
- uploaded_files
- notifications

Sensitive access rules to enforce server-side:

- Protect exact coordinates for minors and rescued people unless the viewer has rescuer, government, or admin permissions.
- Never expose identity documents publicly.
- Store medical details privately and publish only summaries.
- Log every sensitive access in audit_logs.
- Mark all non-official emergency data as simulated or unverified until validated.
