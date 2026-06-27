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
    publicSafe: record.publicSafe,
    rawPayload: record.rawPayload,
    createdAt: record.createdAt,
  };
}

export const ingestionController = {
  run: asyncHandler(async (_req, res) => {
    const report = await HumanitarianImporter.run();
    res.status(202).json({ data: report });
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
    const where = {
      deletedAt: null,
      ...(req.query.sourceName ? { sourceName: String(req.query.sourceName) } : {}),
      ...(req.query.recordType ? { recordType: String(req.query.recordType) } : {}),
      ...(req.query.verificationStatus ? { verificationStatus: String(req.query.verificationStatus) } : {}),
      ...(req.query.possibleDuplicate ? { possibleDuplicate: req.query.possibleDuplicate === "true" } : {}),
    };
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
