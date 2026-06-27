-- Humanitarian ingestion platform for RescueNet Venezuela.
-- This migration assumes the Phase 6/7 operational schema already exists.

CREATE TYPE "IngestionSourceType" AS ENUM ('WEBSITE', 'GOOGLE_SHEET', 'CSV', 'EXCEL', 'JSON', 'API', 'MANUAL');
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');
CREATE TYPE "ImportedRecordStatus" AS ENUM ('NO_VERIFICADO', 'APROBADO', 'RECHAZADO', 'DUPLICADO');

ALTER TABLE "AffectedZone"
  ADD COLUMN "parish" TEXT,
  ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748b',
  ADD COLUMN "operationalStatus" TEXT NOT NULL DEFAULT 'MONITOREO';

CREATE INDEX "AffectedZone_operationalStatus_deletedAt_idx" ON "AffectedZone"("operationalStatus", "deletedAt");

CREATE TABLE "IngestionSource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" "IngestionSourceType" NOT NULL DEFAULT 'WEBSITE',
  "trustLevel" TEXT NOT NULL DEFAULT 'medium',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastFetchedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "IngestionSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngestionSource_name_key" ON "IngestionSource"("name");
CREATE INDEX "IngestionSource_enabled_deletedAt_idx" ON "IngestionSource"("enabled", "deletedAt");
CREATE INDEX "IngestionSource_type_trustLevel_idx" ON "IngestionSource"("type", "trustLevel");

CREATE TABLE "IngestionRun" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT,
  "status" "IngestionRunStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "recordsExtracted" INTEGER NOT NULL DEFAULT 0,
  "recordsNormalized" INTEGER NOT NULL DEFAULT 0,
  "recordsImported" INTEGER NOT NULL DEFAULT 0,
  "recordsBlockedByPrivacy" INTEGER NOT NULL DEFAULT 0,
  "duplicatesFound" INTEGER NOT NULL DEFAULT 0,
  "errorSummary" TEXT,
  "report" JSONB,
  CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");
CREATE INDEX "IngestionRun_sourceId_startedAt_idx" ON "IngestionRun"("sourceId", "startedAt");

CREATE TABLE "ImportedHumanitarianRecord" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT,
  "ingestionRunId" TEXT,
  "sourceName" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "sourceRecordId" TEXT,
  "recordType" TEXT NOT NULL,
  "fullName" TEXT,
  "approximateAge" TEXT,
  "gender" TEXT,
  "status" TEXT,
  "hospitalName" TEXT,
  "state" TEXT,
  "municipality" TEXT,
  "zone" TEXT,
  "lastSeenPlace" TEXT,
  "currentPlace" TEXT,
  "description" TEXT,
  "photoUrl" TEXT,
  "contactInfoPrivate" TEXT,
  "verificationStatus" "ImportedRecordStatus" NOT NULL DEFAULT 'NO_VERIFICADO',
  "privacyLevel" TEXT NOT NULL DEFAULT 'standard',
  "possibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
  "duplicateScore" DECIMAL(5,2),
  "matchedRecordId" TEXT,
  "publicSafe" JSONB NOT NULL,
  "rawPayload" JSONB NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ImportedHumanitarianRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportedHumanitarianRecord_recordType_verificationStatus_idx" ON "ImportedHumanitarianRecord"("recordType", "verificationStatus");
CREATE INDEX "ImportedHumanitarianRecord_sourceName_capturedAt_idx" ON "ImportedHumanitarianRecord"("sourceName", "capturedAt");
CREATE INDEX "ImportedHumanitarianRecord_possibleDuplicate_duplicateScore_idx" ON "ImportedHumanitarianRecord"("possibleDuplicate", "duplicateScore");
CREATE INDEX "ImportedHumanitarianRecord_matchedRecordId_idx" ON "ImportedHumanitarianRecord"("matchedRecordId");
CREATE INDEX "ImportedHumanitarianRecord_deletedAt_idx" ON "ImportedHumanitarianRecord"("deletedAt");

CREATE TABLE "IngestionAuditLog" (
  "id" TEXT NOT NULL,
  "ingestionRunId" TEXT,
  "action" TEXT NOT NULL,
  "sourceName" TEXT,
  "result" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngestionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngestionAuditLog_action_createdAt_idx" ON "IngestionAuditLog"("action", "createdAt");
CREATE INDEX "IngestionAuditLog_ingestionRunId_createdAt_idx" ON "IngestionAuditLog"("ingestionRunId", "createdAt");

CREATE TABLE "HospitalAdmission" (
  "id" TEXT NOT NULL,
  "importedRecordId" TEXT,
  "fullName" TEXT,
  "approximateAge" TEXT,
  "gender" TEXT,
  "hospitalName" TEXT NOT NULL,
  "state" TEXT,
  "municipality" TEXT,
  "patientStatus" TEXT,
  "admittedAt" TIMESTAMP(3),
  "source" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "sensitiveProtected" BOOLEAN NOT NULL DEFAULT true,
  "internalNotes" TEXT,
  "publicSafe" JSONB NOT NULL,
  "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "HospitalAdmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HospitalAdmission_hospitalName_patientStatus_idx" ON "HospitalAdmission"("hospitalName", "patientStatus");
CREATE INDEX "HospitalAdmission_fullName_approximateAge_idx" ON "HospitalAdmission"("fullName", "approximateAge");
CREATE INDEX "HospitalAdmission_verified_deletedAt_idx" ON "HospitalAdmission"("verified", "deletedAt");

ALTER TABLE "IngestionRun"
  ADD CONSTRAINT "IngestionRun_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportedHumanitarianRecord"
  ADD CONSTRAINT "ImportedHumanitarianRecord_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportedHumanitarianRecord"
  ADD CONSTRAINT "ImportedHumanitarianRecord_ingestionRunId_fkey"
  FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IngestionAuditLog"
  ADD CONSTRAINT "IngestionAuditLog_ingestionRunId_fkey"
  FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
