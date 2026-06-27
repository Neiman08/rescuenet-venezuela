import { prisma } from "../config/prisma.js";
import { HumanitarianImporter } from "../ingestion/humanitarianImporter.js";
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

export const ingestionController = {
  run: asyncHandler(async (_req, res) => {
    const report = await HumanitarianImporter.run();
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
