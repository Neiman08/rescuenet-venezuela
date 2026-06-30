import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/AppError.js";

const REDAYUDA_SOURCE = "redayuda";

export const adminRedayudaController = {
  list: asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const q = req.query.q ? String(req.query.q).trim() : null;
    const type = req.query.type ? String(req.query.type).trim() : null;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const stateQ = req.query.state ? String(req.query.state).trim() : null;
    const privacyQ = req.query.privacy ? String(req.query.privacy).trim() : null;

    const where = {
      sourceName: REDAYUDA_SOURCE,
      deletedAt: null,
      ...(type ? { recordType: type } : {}),
      ...(status ? { verificationStatus: status } : {}),
      ...(privacyQ ? { privacyLevel: privacyQ } : {}),
      ...(q ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { hospitalName: { contains: q, mode: "insensitive" } },
          { zone: { contains: q, mode: "insensitive" } },
          { municipality: { contains: q, mode: "insensitive" } },
          { state: { contains: q, mode: "insensitive" } },
          { currentPlace: { contains: q, mode: "insensitive" } },
          { lastSeenPlace: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
      ...(stateQ ? { state: { contains: stateQ, mode: "insensitive" } } : {}),
    };

    const [total, typeCounts, records] = await Promise.all([
      prisma.importedHumanitarianRecord.count({ where }),
      prisma.importedHumanitarianRecord.groupBy({
        by: ["recordType"],
        where: { sourceName: REDAYUDA_SOURCE, deletedAt: null },
        _count: { recordType: true },
      }),
      prisma.importedHumanitarianRecord.findMany({
        where,
        orderBy: { capturedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true, recordType: true, verificationStatus: true, privacyLevel: true,
          capturedAt: true, updatedAt: true, sourceName: true, sourceRecordId: true,
          fullName: true, approximateAge: true, gender: true, status: true,
          hospitalName: true, state: true, municipality: true, zone: true,
          currentPlace: true, lastSeenPlace: true, description: true, photoUrl: true,
          publicSafe: true, documentPrivate: true, contactPrivate: true,
          locationPrivate: true, medicalPrivate: true,
        },
      }),
    ]);

    const byType = Object.fromEntries(typeCounts.map(t => [t.recordType, t._count.recordType]));

    res.json({
      data: records,
      meta: { total, page, limit, pages: Math.ceil(total / limit), byType },
    });
  }),

  getOne: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const record = await prisma.importedHumanitarianRecord.findFirst({
      where: { id, sourceName: REDAYUDA_SOURCE, deletedAt: null },
    });
    if (!record) return res.status(404).json({ error: "Registro no encontrado" });
    res.json({ data: record });
  }),

  update: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { verificationStatus, privacyLevel, publicSafe } = req.body;
    const record = await prisma.importedHumanitarianRecord.findFirst({
      where: { id, sourceName: REDAYUDA_SOURCE, deletedAt: null },
    });
    if (!record) return res.status(404).json({ error: "Registro no encontrado" });

    const updateData = {};
    if (verificationStatus) updateData.verificationStatus = verificationStatus;
    if (privacyLevel) updateData.privacyLevel = privacyLevel;
    if (publicSafe) updateData.publicSafe = { ...(record.publicSafe || {}), ...publicSafe };
    if (verificationStatus === "APROBADO") updateData.approvedAt = new Date();
    if (verificationStatus === "RECHAZADO") updateData.approvedAt = null;

    const updated = await prisma.importedHumanitarianRecord.update({
      where: { id },
      data: updateData,
    });
    res.json({ data: updated });
  }),
};
