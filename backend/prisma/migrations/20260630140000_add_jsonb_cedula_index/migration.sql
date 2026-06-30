-- CreateIndex: B-tree functional index on documentPrivate->'cedula' (JSONB type).
-- Prisma generates: WHERE ("documentPrivate"#>ARRAY['cedula']::text[]) = '"11936362"'::jsonb
-- which is JSONB equality, not text equality. This functional index covers that operator.
-- The expression index on (documentPrivate->>'cedula') TEXT added in the first migration
-- covers the text operator but not JSONB — so both indexes are needed.
CREATE INDEX "ImportedHumanitarianRecord_cedula_jsonb_idx" ON "ImportedHumanitarianRecord" (("documentPrivate"->'cedula'));
