-- EnableExtension: pg_trgm for ILIKE text-search indexes on fullName
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex: compound for recordType IN (...) ORDER BY capturedAt DESC (main query fast path)
CREATE INDEX "ImportedHumanitarianRecord_recordType_capturedAt_idx" ON "ImportedHumanitarianRecord"("recordType", "capturedAt" DESC);

-- CreateIndex: GIN trigram on fullName — makes ILIKE '%q%' searches use the index instead of full scan
CREATE INDEX "ImportedHumanitarianRecord_fullName_trgm_idx" ON "ImportedHumanitarianRecord" USING GIN ("fullName" gin_trgm_ops);

-- CreateIndex: GIN trigram on name (same field searched separately in the query)
CREATE INDEX "ImportedHumanitarianRecord_name_trgm_idx" ON "ImportedHumanitarianRecord" USING GIN ("name" gin_trgm_ops);

-- CreateIndex: expression index on cedula extracted from documentPrivate JSON — fast exact cedula lookup
CREATE INDEX "ImportedHumanitarianRecord_cedula_expr_idx" ON "ImportedHumanitarianRecord" (("documentPrivate"->>'cedula'));
