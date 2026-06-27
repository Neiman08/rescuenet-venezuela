import { prisma } from "../config/prisma.js";
import { HumanitarianImporter } from "../ingestion/humanitarianImporter.js";
import { enabledSources } from "../ingestion/sourcesRegistry.js";
import { asyncHandler } from "../utils/AppError.js";

function publicRecord(record) {
  return {
    id: record.id,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    capturedAt: record.capturedAt,
    recordType: record.recordType,
    fullName: record.fullName,
    status: record.status,
    verificationStatus: record.verificationStatus,
    privacyLevel: record.privacyLevel,
    possibleDuplicate: record.possibleDuplicate,
    duplicateScore: record.duplicateScore,
    matchedRecordId: record.matchedRecordId,
    confidenceScore: record.confidenceScore,
    confidenceLevel: record.confidenceLevel,
    confidenceFactors: record.confidenceFactors,
    publicSafe: record.publicSafe,
    rawPayload: record.rawPayload,
    createdAt: record.createdAt,
  };
}

const approvalResourceTypes = new Set([
  "hospital",
  "shelter",
  "help_center",
  "collection_center",
  "water_point",
  "food_point",
  "medical_point",
  "volunteer_center",
  "donation_need",
]);

function buildRecordWhere(filters = {}) {
  return {
    deletedAt: null,
    ...(filters.sourceName ? { sourceName: String(filters.sourceName) } : {}),
    ...(filters.recordType ? { recordType: String(filters.recordType) } : {}),
    ...(filters.verificationStatus ? { verificationStatus: String(filters.verificationStatus) } : {}),
    ...(filters.possibleDuplicate ? { possibleDuplicate: filters.possibleDuplicate === "true" } : {}),
  };
}

function normalizedSourceKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function sourceMatches(source, key) {
  const normalizedName = source.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = (source.aliases || []).map(normalizedSourceKey);
  const normalizedKey = normalizedSourceKey(key);
  if (normalizedKey === "all") return true;
  return normalizedName.includes(normalizedKey.replace(/-/g, "")) || aliases.includes(normalizedKey);
}

function productionSources(sourceKey) {
  const key = sourceKey || "google-drive-hospitales";
  return enabledSources().filter((source) => sourceMatches(source, key));
}

export const ingestionController = {
  run: asyncHandler(async (_req, res) => {
    const report = await HumanitarianImporter.run();
    res.status(202).json({ data: report });
  }),

  runProduction: asyncHandler(async (req, res) => {
    const sources = productionSources(req.body?.source || req.query?.source);
    if (!sources.length) {
      res.status(400).json({ error: { message: "No ingestion source matched the requested production source." } });
      return;
    }
    const maxRecords = Math.min(Number(req.body?.maxRecords || req.query?.maxRecords || process.env.GOOGLE_DRIVE_MAX_RECORDS || 10_000), 10_000);
    const maxFiles = Math.min(Number(req.body?.maxFiles || req.query?.maxFiles || process.env.GOOGLE_DRIVE_MAX_FILES || 250), 250);
    const timeoutMs = Math.min(Number(req.body?.timeoutMs || req.query?.timeoutMs || process.env.GOOGLE_DRIVE_FETCH_TIMEOUT_MS || 12_000), 30_000);
    const report = await HumanitarianImporter.run({
      sources: sources.map((source) => ({ ...source, maxRecords, maxFiles, timeoutMs })),
      dryRun: req.body?.dryRun === true,
      writeReport: true,
    });
    res.status(202).json({ data: report });
  }),

  manualUpload: asyncHandler(async (req, res) => {
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    if (!records.length) {
      res.status(400).json({ error: { message: "Manual upload requires a non-empty records array." } });
      return;
    }
    if (records.length > 1000) {
      res.status(400).json({ error: { message: "Manual upload accepts up to 1000 records per request." } });
      return;
    }
    const report = await HumanitarianImporter.run({
      sources: [],
      manualRecords: records,
      manualSourceName: req.body?.sourceName || "Manual protected upload",
      dryRun: req.body?.dryRun !== false,
      writeReport: true,
    });
    res.status(req.body?.dryRun === false ? 201 : 200).json({ data: report });
  }),

  runs: asyncHandler(async (req, res) => {
    const runs = await prisma.ingestionRun.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(Number(req.query.take) || 50, 100),
      include: { source: true },
    });
    res.json({ data: runs });
  }),

  records: asyncHandler(async (req, res) => {
    const where = buildRecordWhere(req.query);
    const records = await prisma.importedHumanitarianRecord.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      take: Math.min(Number(req.query.take) || 100, 200),
    });
    res.json({ data: records.map(publicRecord) });
  }),

  approve: asyncHandler(async (req, res) => {
    const record = await prisma.importedHumanitarianRecord.update({
      where: { id: req.params.id },
      data: { verificationStatus: "APROBADO", approvedAt: new Date(), reviewedById: req.user?.id },
    });
    res.json({ data: publicRecord(record) });
  }),

  approveMany: asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean).slice(0, 200) : [];
    if (!ids.length) {
      res.status(400).json({ error: { message: "approve-many requires at least one record id." } });
      return;
    }
    const result = await prisma.importedHumanitarianRecord.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { verificationStatus: "APROBADO", approvedAt: new Date(), reviewedById: req.user?.id },
    });
    res.json({ data: { approved: result.count } });
  }),

  approveFiltered: asyncHandler(async (req, res) => {
    const filters = req.body?.filters || {};
    const where = buildRecordWhere(filters);
    const isResourceApproval = filters.recordType && approvalResourceTypes.has(filters.recordType);

    if (!filters.recordType) {
      res.status(400).json({
        error: { message: "approve-filtered requires a resource recordType filter." },
      });
      return;
    }

    if (filters.recordType && !isResourceApproval) {
      res.status(400).json({
        error: { message: "Filtered bulk approval is limited to hospitals, shelters and resource records." },
      });
      return;
    }

    const result = await prisma.importedHumanitarianRecord.updateMany({
      where,
      data: { verificationStatus: "APROBADO", approvedAt: new Date(), reviewedById: req.user?.id },
    });
    res.json({ data: { approved: result.count } });
  }),

  reject: asyncHandler(async (req, res) => {
    const record = await prisma.importedHumanitarianRecord.update({
      where: { id: req.params.id },
      data: { verificationStatus: "RECHAZADO", rejectedAt: new Date(), reviewedById: req.user?.id },
    });
    res.json({ data: publicRecord(record) });
  }),

  setVerificationStatus: asyncHandler(async (req, res) => {
    const allowed = new Set(["NO_VERIFICADO", "APROBADO", "RECHAZADO", "DUPLICADO"]);
    const verificationStatus = String(req.body?.verificationStatus || "");
    if (!allowed.has(verificationStatus)) {
      res.status(400).json({ error: { message: "Unsupported verification status." } });
      return;
    }
    const record = await prisma.importedHumanitarianRecord.update({
      where: { id: req.params.id },
      data: {
        verificationStatus,
        reviewedById: req.user?.id,
        approvedAt: verificationStatus === "APROBADO" ? new Date() : undefined,
        rejectedAt: verificationStatus === "RECHAZADO" ? new Date() : undefined,
      },
    });
    res.json({ data: publicRecord(record) });
  }),

  markDuplicate: asyncHandler(async (req, res) => {
    const record = await prisma.importedHumanitarianRecord.update({
      where: { id: req.params.id },
      data: { verificationStatus: "DUPLICADO", possibleDuplicate: true, reviewedById: req.user?.id },
    });
    res.json({ data: publicRecord(record) });
  }),

  linkDuplicate: asyncHandler(async (req, res) => {
    const record = await prisma.importedHumanitarianRecord.update({
      where: { id: req.params.id },
      data: { possibleDuplicate: true, matchedRecordId: req.body?.matchedRecordId, reviewedById: req.user?.id },
    });
    res.json({ data: publicRecord(record) });
  }),
};
