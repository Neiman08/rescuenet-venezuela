-- Collection centers and public humanitarian resource ingestion fields.

ALTER TABLE "ImportedHumanitarianRecord"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "organization" TEXT,
  ADD COLUMN "parish" TEXT,
  ADD COLUMN "addressPrivate" TEXT,
  ADD COLUMN "publicLocation" TEXT,
  ADD COLUMN "latitudePrivate" DECIMAL(10,7),
  ADD COLUMN "longitudePrivate" DECIMAL(10,7),
  ADD COLUMN "acceptedItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "operatingHours" TEXT,
  ADD COLUMN "contactPrivate" TEXT,
  ADD COLUMN "operationalStatus" TEXT;

CREATE INDEX "ImportedHumanitarianRecord_name_organization_idx" ON "ImportedHumanitarianRecord"("name", "organization");
CREATE INDEX "ImportedHumanitarianRecord_state_municipality_zone_idx" ON "ImportedHumanitarianRecord"("state", "municipality", "zone");
CREATE INDEX "ImportedHumanitarianRecord_operationalStatus_idx" ON "ImportedHumanitarianRecord"("operationalStatus");
