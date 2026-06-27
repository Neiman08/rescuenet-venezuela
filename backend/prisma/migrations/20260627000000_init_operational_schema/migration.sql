-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('PUBLICO', 'VICTIMA', 'FAMILIAR', 'RESCATISTA', 'COORDINADOR', 'HOSPITAL', 'REFUGIO', 'ONG', 'DONANTE', 'GOBIERNO', 'ORGANIZACION_INTERNACIONAL', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('SIMULADA', 'PENDIENTE', 'VERIFICADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('RECEPCION', 'TRIAJE', 'ASIGNADO', 'EN_RUTA', 'EN_SITIO', 'RESUELTO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('EN_RESGUARDO', 'EN_HOSPITAL', 'IDENTIFICACION_EN_PROCESO', 'FAMILIAR_LOCALIZADO', 'REUNIFICADO', 'FALLECIDO_CONFIRMADO');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDIENTE', 'VERIFICADA', 'SUSPENDIDA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('RECIBIDA', 'EN_PROCESO', 'ENTREGADA', 'AUDITADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "IngestionSourceType" AS ENUM ('WEBSITE', 'GOOGLE_SHEET', 'CSV', 'EXCEL', 'JSON', 'API', 'MANUAL');

-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportedRecordStatus" AS ENUM ('NO_VERIFICADO', 'APROBADO', 'RECHAZADO', 'DUPLICADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "AffectedZone" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "parish" TEXT,
    "level" "Priority" NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "operationalStatus" TEXT NOT NULL DEFAULT 'MONITOREO',
    "lat" DECIMAL(10,7) NOT NULL,
    "lng" DECIMAL(10,7) NOT NULL,
    "radiusKm" INTEGER NOT NULL,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'SIMULADA',
    "impacts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AffectedZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyReport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterType" TEXT NOT NULL DEFAULT 'authenticated',
    "reporterIp" TEXT,
    "userAgent" TEXT,
    "affectedZoneId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIA',
    "status" "EmergencyStatus" NOT NULL DEFAULT 'RECEPCION',
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending_review',
    "peopleAffected" INTEGER NOT NULL DEFAULT 0,
    "publicLocation" TEXT NOT NULL,
    "exactLocation" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "source" TEXT NOT NULL DEFAULT 'api',
    "assignedTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmergencyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "reporterType" TEXT NOT NULL DEFAULT 'authenticated',
    "reporterIp" TEXT,
    "userAgent" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'self_reported',
    "affectedZoneId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "currentPlace" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SafeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissingPersonReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterType" TEXT NOT NULL DEFAULT 'authenticated',
    "reporterIp" TEXT,
    "userAgent" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending_review',
    "privacyLevel" TEXT NOT NULL DEFAULT 'standard',
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "affectedZoneId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "documentId" TEXT,
    "sex" TEXT,
    "description" TEXT,
    "clothing" TEXT,
    "lastSeenPlace" TEXT,
    "consentPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MissingPersonReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescuedPerson" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "affectedZoneId" TEXT NOT NULL,
    "name" TEXT,
    "identified" BOOLEAN NOT NULL DEFAULT false,
    "approximateAge" TEXT,
    "sex" TEXT,
    "conditionSummary" TEXT,
    "conscious" BOOLEAN,
    "injuriesSummary" TEXT,
    "distinctiveMarks" TEXT,
    "clothing" TEXT,
    "rescueLocationId" TEXT,
    "rescueDate" TIMESTAMP(3),
    "rescueTeamId" TEXT,
    "responsibleName" TEXT,
    "hospitalId" TEXT,
    "shelterId" TEXT,
    "status" "PersonStatus" NOT NULL DEFAULT 'IDENTIFICACION_EN_PROCESO',
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RescuedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueLocation" (
    "id" TEXT NOT NULL,
    "affectedZoneId" TEXT NOT NULL,
    "publicLabel" TEXT NOT NULL,
    "exactAddress" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "accessNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RescueLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelter" (
    "id" TEXT NOT NULL,
    "affectedZoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "occupied" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVO',
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Shelter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "affectedZoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "occupied" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPERATIVO',
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "representative" TEXT,
    "documentRef" TEXT,
    "contact" TEXT,
    "bankAccountRef" TEXT,
    "walletRef" TEXT,
    "categories" TEXT[],
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationZone" (
    "organizationId" TEXT NOT NULL,
    "affectedZoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationZone_pkey" PRIMARY KEY ("organizationId","affectedZoneId")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "donorId" TEXT,
    "organizationId" TEXT NOT NULL,
    "affectedZoneId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'RECIBIDA',
    "publicDonor" BOOLEAN NOT NULL DEFAULT false,
    "intendedUse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationExpense" (
    "id" TEXT NOT NULL,
    "donationId" TEXT,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_REVISION',
    "affectedZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DonationExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEvidence" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "fileId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyClaim" (
    "id" TEXT NOT NULL,
    "rescuedPersonId" TEXT NOT NULL,
    "claimantUserId" TEXT,
    "relationship" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "missingPersonReportId" TEXT NOT NULL,
    "rescuedPersonId" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "factors" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "affectedZoneId" TEXT,
    "skills" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueTeam" (
    "id" TEXT NOT NULL,
    "affectedZoneId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "members" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RescueTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "emergencyReportId" TEXT,
    "missingPersonReportId" TEXT,
    "rescuedPersonId" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'RESTRINGIDA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "ImportedHumanitarianRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "ingestionRunId" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "sourceRecordId" TEXT,
    "recordType" TEXT NOT NULL,
    "name" TEXT,
    "organization" TEXT,
    "fullName" TEXT,
    "approximateAge" TEXT,
    "gender" TEXT,
    "status" TEXT,
    "hospitalName" TEXT,
    "state" TEXT,
    "municipality" TEXT,
    "parish" TEXT,
    "zone" TEXT,
    "addressPrivate" TEXT,
    "publicLocation" TEXT,
    "latitudePrivate" DECIMAL(10,7),
    "longitudePrivate" DECIMAL(10,7),
    "acceptedItems" TEXT[],
    "operatingHours" TEXT,
    "contactPrivate" TEXT,
    "operationalStatus" TEXT,
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
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'low',
    "confidenceFactors" TEXT[],
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AffectedZone_code_key" ON "AffectedZone"("code");

-- CreateIndex
CREATE INDEX "AffectedZone_state_municipality_idx" ON "AffectedZone"("state", "municipality");

-- CreateIndex
CREATE INDEX "AffectedZone_level_deletedAt_idx" ON "AffectedZone"("level", "deletedAt");

-- CreateIndex
CREATE INDEX "AffectedZone_operationalStatus_deletedAt_idx" ON "AffectedZone"("operationalStatus", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyReport_code_key" ON "EmergencyReport"("code");

-- CreateIndex
CREATE INDEX "EmergencyReport_affectedZoneId_status_priority_idx" ON "EmergencyReport"("affectedZoneId", "status", "priority");

-- CreateIndex
CREATE INDEX "EmergencyReport_createdAt_idx" ON "EmergencyReport"("createdAt");

-- CreateIndex
CREATE INDEX "EmergencyReport_deletedAt_idx" ON "EmergencyReport"("deletedAt");

-- CreateIndex
CREATE INDEX "SafeReport_affectedZoneId_createdAt_idx" ON "SafeReport"("affectedZoneId", "createdAt");

-- CreateIndex
CREATE INDEX "MissingPersonReport_affectedZoneId_fullName_idx" ON "MissingPersonReport"("affectedZoneId", "fullName");

-- CreateIndex
CREATE INDEX "MissingPersonReport_createdAt_idx" ON "MissingPersonReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RescuedPerson_code_key" ON "RescuedPerson"("code");

-- CreateIndex
CREATE INDEX "RescuedPerson_affectedZoneId_status_idx" ON "RescuedPerson"("affectedZoneId", "status");

-- CreateIndex
CREATE INDEX "RescuedPerson_isMinor_deletedAt_idx" ON "RescuedPerson"("isMinor", "deletedAt");

-- CreateIndex
CREATE INDEX "RescueLocation_affectedZoneId_idx" ON "RescueLocation"("affectedZoneId");

-- CreateIndex
CREATE INDEX "Shelter_affectedZoneId_status_idx" ON "Shelter"("affectedZoneId", "status");

-- CreateIndex
CREATE INDEX "Hospital_affectedZoneId_status_idx" ON "Hospital"("affectedZoneId", "status");

-- CreateIndex
CREATE INDEX "Organization_status_deletedAt_idx" ON "Organization"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "OrganizationZone_affectedZoneId_idx" ON "OrganizationZone"("affectedZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_code_key" ON "Donation"("code");

-- CreateIndex
CREATE INDEX "Donation_organizationId_status_idx" ON "Donation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Donation_affectedZoneId_idx" ON "Donation"("affectedZoneId");

-- CreateIndex
CREATE INDEX "Donation_createdAt_idx" ON "Donation"("createdAt");

-- CreateIndex
CREATE INDEX "DonationExpense_organizationId_status_idx" ON "DonationExpense"("organizationId", "status");

-- CreateIndex
CREATE INDEX "FamilyClaim_rescuedPersonId_status_idx" ON "FamilyClaim"("rescuedPersonId", "status");

-- CreateIndex
CREATE INDEX "MatchResult_missingPersonReportId_score_idx" ON "MatchResult"("missingPersonReportId", "score");

-- CreateIndex
CREATE INDEX "MatchResult_rescuedPersonId_idx" ON "MatchResult"("rescuedPersonId");

-- CreateIndex
CREATE INDEX "Volunteer_affectedZoneId_status_idx" ON "Volunteer"("affectedZoneId", "status");

-- CreateIndex
CREATE INDEX "RescueTeam_affectedZoneId_status_idx" ON "RescueTeam"("affectedZoneId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_module_createdAt_idx" ON "AuditLog"("module", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedFile_ownerId_createdAt_idx" ON "UploadedFile"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedFile_visibility_idx" ON "UploadedFile"("visibility");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionSource_name_key" ON "IngestionSource"("name");

-- CreateIndex
CREATE INDEX "IngestionSource_enabled_deletedAt_idx" ON "IngestionSource"("enabled", "deletedAt");

-- CreateIndex
CREATE INDEX "IngestionSource_type_trustLevel_idx" ON "IngestionSource"("type", "trustLevel");

-- CreateIndex
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "IngestionRun_sourceId_startedAt_idx" ON "IngestionRun"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "ImportedHumanitarianRecord_recordType_verificationStatus_idx" ON "ImportedHumanitarianRecord"("recordType", "verificationStatus");

-- CreateIndex
CREATE INDEX "ImportedHumanitarianRecord_sourceName_capturedAt_idx" ON "ImportedHumanitarianRecord"("sourceName", "capturedAt");

-- CreateIndex
CREATE INDEX "ImportedHumanitarianRecord_possibleDuplicate_duplicateScore_idx" ON "ImportedHumanitarianRecord"("possibleDuplicate", "duplicateScore");

-- CreateIndex
CREATE INDEX "ImportedHumanitarianRecord_matchedRecordId_idx" ON "ImportedHumanitarianRecord"("matchedRecordId");

-- CreateIndex
CREATE INDEX "ImportedHumanitarianRecord_deletedAt_idx" ON "ImportedHumanitarianRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "IngestionAuditLog_action_createdAt_idx" ON "IngestionAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionAuditLog_ingestionRunId_createdAt_idx" ON "IngestionAuditLog"("ingestionRunId", "createdAt");

-- CreateIndex
CREATE INDEX "HospitalAdmission_hospitalName_patientStatus_idx" ON "HospitalAdmission"("hospitalName", "patientStatus");

-- CreateIndex
CREATE INDEX "HospitalAdmission_fullName_approximateAge_idx" ON "HospitalAdmission"("fullName", "approximateAge");

-- CreateIndex
CREATE INDEX "HospitalAdmission_verified_deletedAt_idx" ON "HospitalAdmission"("verified", "deletedAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyReport" ADD CONSTRAINT "EmergencyReport_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyReport" ADD CONSTRAINT "EmergencyReport_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "RescueTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyReport" ADD CONSTRAINT "EmergencyReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeReport" ADD CONSTRAINT "SafeReport_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeReport" ADD CONSTRAINT "SafeReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingPersonReport" ADD CONSTRAINT "MissingPersonReport_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingPersonReport" ADD CONSTRAINT "MissingPersonReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescuedPerson" ADD CONSTRAINT "RescuedPerson_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescuedPerson" ADD CONSTRAINT "RescuedPerson_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescuedPerson" ADD CONSTRAINT "RescuedPerson_rescueLocationId_fkey" FOREIGN KEY ("rescueLocationId") REFERENCES "RescueLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescuedPerson" ADD CONSTRAINT "RescuedPerson_rescueTeamId_fkey" FOREIGN KEY ("rescueTeamId") REFERENCES "RescueTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescuedPerson" ADD CONSTRAINT "RescuedPerson_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "Shelter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueLocation" ADD CONSTRAINT "RescueLocation_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelter" ADD CONSTRAINT "Shelter_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationZone" ADD CONSTRAINT "OrganizationZone_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationZone" ADD CONSTRAINT "OrganizationZone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationExpense" ADD CONSTRAINT "DonationExpense_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationExpense" ADD CONSTRAINT "DonationExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEvidence" ADD CONSTRAINT "ExpenseEvidence_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "DonationExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEvidence" ADD CONSTRAINT "ExpenseEvidence_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyClaim" ADD CONSTRAINT "FamilyClaim_rescuedPersonId_fkey" FOREIGN KEY ("rescuedPersonId") REFERENCES "RescuedPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyClaim" ADD CONSTRAINT "FamilyClaim_claimantUserId_fkey" FOREIGN KEY ("claimantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_missingPersonReportId_fkey" FOREIGN KEY ("missingPersonReportId") REFERENCES "MissingPersonReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_rescuedPersonId_fkey" FOREIGN KEY ("rescuedPersonId") REFERENCES "RescuedPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueTeam" ADD CONSTRAINT "RescueTeam_affectedZoneId_fkey" FOREIGN KEY ("affectedZoneId") REFERENCES "AffectedZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_emergencyReportId_fkey" FOREIGN KEY ("emergencyReportId") REFERENCES "EmergencyReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_missingPersonReportId_fkey" FOREIGN KEY ("missingPersonReportId") REFERENCES "MissingPersonReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_rescuedPersonId_fkey" FOREIGN KEY ("rescuedPersonId") REFERENCES "RescuedPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedHumanitarianRecord" ADD CONSTRAINT "ImportedHumanitarianRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedHumanitarianRecord" ADD CONSTRAINT "ImportedHumanitarianRecord_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionAuditLog" ADD CONSTRAINT "IngestionAuditLog_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
