ALTER TABLE "ImportedHumanitarianRecord"
ADD COLUMN "documentPrivate" JSONB,
ADD COLUMN "medicalPrivate" JSONB,
ADD COLUMN "locationPrivate" JSONB;
