-- CreateIndex: standalone capturedAt DESC — allows ORDER BY capturedAt DESC LIMIT N
-- to scan rows in order and stop early, without needing a full sort of 189k rows.
-- This fixes the 8s all-types load (6-type IN list couldn't efficiently use the compound index).
CREATE INDEX "ImportedHumanitarianRecord_capturedAt_idx" ON "ImportedHumanitarianRecord"("capturedAt" DESC);
