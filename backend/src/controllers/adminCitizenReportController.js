import { prisma } from "../config/prisma.js";
import { AuditService } from "../services/AuditService.js";
import { asyncHandler } from "../utils/AppError.js";

function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""));
}

export const adminCitizenReportController = {
  listCitizenReports: asyncHandler(async (_req, res) => {
    const [missing, emergencies, safe, imported] = await Promise.all([
      prisma.missingPersonReport.findMany({
        where: { deletedAt: null, verificationStatus: "pending_review" },
        include: { affectedZone: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.emergencyReport.findMany({
        where: { deletedAt: null, verificationStatus: "pending_review", source: "public_web_form" },
        include: { affectedZone: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.safeReport.findMany({
        where: { deletedAt: null, verificationStatus: "self_reported" },
        include: { affectedZone: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.importedHumanitarianRecord.findMany({
        where: { deletedAt: null, sourceUrl: "public_web_form", verificationStatus: "NO_VERIFICADO" },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    res.json({
      data: { missing, emergencies, safe, imported },
      meta: { totalPending: missing.length + emergencies.length + imported.length },
    });
  }),

  reviewMissingReport: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { verificationStatus, privacyLevel } = req.body;
    const updated = await prisma.missingPersonReport.update({
      where: { id },
      data: compact({ verificationStatus, privacyLevel }),
    });
    await AuditService.record({
      userId: req.user?.id,
      action: "admin_review",
      module: "missing",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id, verificationStatus },
    });
    res.json({ data: { id: updated.id, verificationStatus: updated.verificationStatus } });
  }),

  reviewEmergencyReport: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { verificationStatus, status, priority } = req.body;
    const updated = await prisma.emergencyReport.update({
      where: { id },
      data: compact({ verificationStatus, status, priority }),
    });
    await AuditService.record({
      userId: req.user?.id,
      action: "admin_review",
      module: "emergency",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id, verificationStatus, status },
    });
    res.json({ data: { id: updated.id, verificationStatus: updated.verificationStatus } });
  }),

  reviewImportedReport: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { verificationStatus } = req.body;
    const updated = await prisma.importedHumanitarianRecord.update({
      where: { id },
      data: compact({ verificationStatus }),
    });
    await AuditService.record({
      userId: req.user?.id,
      action: "admin_review",
      module: "imported",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id, verificationStatus },
    });
    res.json({ data: { id: updated.id, verificationStatus: updated.verificationStatus } });
  }),
};
