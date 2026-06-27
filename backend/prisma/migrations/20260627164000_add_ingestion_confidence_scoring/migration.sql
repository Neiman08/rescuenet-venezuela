-- Confidence scoring for imported humanitarian records.

ALTER TABLE "ImportedHumanitarianRecord"
  ADD COLUMN "confidenceScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "confidenceLevel" TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN "confidenceFactors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "ImportedHumanitarianRecord_confidenceLevel_confidenceScore_idx"
  ON "ImportedHumanitarianRecord"("confidenceLevel", "confidenceScore");
