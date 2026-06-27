import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { DashboardService } from "../services/DashboardService.js";
import { MapService } from "../services/MapService.js";
import { PublicDataSanitizer } from "../services/PublicDataSanitizer.js";
import { AuditService } from "../services/AuditService.js";
import { AppError, asyncHandler } from "../utils/AppError.js";

const publicMeta = (req) => ({
  reporterType: "public",
  reporterIp: req.ip,
  userAgent: req.get("user-agent"),
});

function makeCode(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function withoutAntiSpamFields(payload) {
  const body = { ...payload };
  delete body.website;
  delete body.url;
  return body;
}

async function ensureActiveAffectedZone(id) {
  const zone = await prisma.affectedZone.findFirst({ where: { id, deletedAt: null } });
  if (!zone) throw new AppError("Affected zone is not available for public reporting", 400, "INVALID_AFFECTED_ZONE");
  return zone;
}

async function approvedImportedRecords(recordTypes) {
  try {
    const records = await prisma.importedHumanitarianRecord.findMany({
      where: { deletedAt: null, verificationStatus: "APROBADO", recordType: { in: recordTypes } },
      orderBy: { capturedAt: "desc" },
      take: 100,
    });
    return records.map((record) => ({ id: record.id, ...record.publicSafe }));
  } catch {
    return [];
  }
}

const publicCenterTypes = ["collection_center", "shelter", "hospital", "help_center", "water_point", "food_point", "medical_point", "volunteer_center", "donation_need"];
const familySearchTypes = ["missing_person", "hospitalized_person", "trapped_person", "safe_person", "rescued_person"];

function queryText(value) {
  return String(value || "").trim();
}

function containsFilter(value) {
  const text = queryText(value);
  return text ? { contains: text, mode: "insensitive" } : undefined;
}

function affectedZoneFilter(state, municipality) {
  if (!state && !municipality) return undefined;
  return {
    is: {
      ...(state ? { state } : {}),
      ...(municipality ? { municipality } : {}),
    },
  };
}

function familyResult(base) {
  return {
    id: base.id,
    type: base.type,
    code: base.code,
    name: base.name || "Informacion protegida",
    age: base.age || "No indicada",
    sex: base.sex,
    status: base.status || "Por verificar",
    publicLocation: base.publicLocation || "Zona no indicada",
    hospital: base.hospital,
    source: base.source || "RescueNet",
    privacyLevel: base.privacyLevel || "standard",
    verificationStatus: base.verificationStatus,
    updatedAt: base.updatedAt || base.createdAt,
  };
}

export const publicSchemas = {
  emergency: z.object({
    body: z.object({
      affectedZoneId: z.string().min(1),
      type: z.string().min(2),
      description: z.string().min(5),
      peopleAffected: z.coerce.number().int().min(0).default(0),
      publicLocation: z.string().min(2),
      exactLocation: z.string().optional(),
      lat: z.coerce.number().optional(),
      lng: z.coerce.number().optional(),
      website: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
  safe: z.object({
    body: z.object({
      affectedZoneId: z.string().min(1),
      fullName: z.string().min(2),
      phone: z.string().optional(),
      currentPlace: z.string().min(2),
      message: z.string().optional(),
      website: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
  missing: z.object({
    body: z.object({
      affectedZoneId: z.string().min(1),
      fullName: z.string().min(2),
      age: z.coerce.number().int().min(0).max(130).optional(),
      documentId: z.string().optional(),
      sex: z.string().optional(),
      description: z.string().optional(),
      clothing: z.string().optional(),
      lastSeenPlace: z.string().optional(),
      consentPublic: z.boolean().default(false),
      isMinor: z.boolean().default(false),
      website: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
};

export const publicController = {
  createEmergency: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    await ensureActiveAffectedZone(body.affectedZoneId);
    const emergency = await prisma.emergencyReport.create({
      data: {
        ...body,
        ...publicMeta(req),
        code: makeCode("EMG"),
        source: "public_web_form",
        verificationStatus: "pending_review",
        priority: "MEDIA",
      },
      include: { affectedZone: true },
    });
    await AuditService.record({
      action: "public_submission",
      module: "emergency",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { code: emergency.code, captcha: req.captcha },
    });
    req.app.get("io")?.emit("emergency_created", PublicDataSanitizer.emergency(emergency));
    res.status(201).json({ data: PublicDataSanitizer.emergency(emergency) });
  }),

  listPublicEmergencies: asyncHandler(async (_req, res) => {
    const records = await prisma.emergencyReport.findMany({
      where: { deletedAt: null },
      include: { affectedZone: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ data: records.map(PublicDataSanitizer.emergency) });
  }),

  createSafeReport: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    await ensureActiveAffectedZone(body.affectedZoneId);
    const safeReport = await prisma.safeReport.create({
      data: {
        ...body,
        ...publicMeta(req),
        verificationStatus: "self_reported",
      },
      include: { affectedZone: true },
    });
    await AuditService.record({
      action: "public_submission",
      module: "safe",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id: safeReport.id, captcha: req.captcha },
    });
    res.status(201).json({ data: PublicDataSanitizer.safeReport(safeReport) });
  }),

  listPublicSafeReports: asyncHandler(async (_req, res) => {
    const records = await prisma.safeReport.findMany({
      where: { deletedAt: null },
      include: { affectedZone: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const imported = await approvedImportedRecords(["safe_person"]);
    res.json({ data: [...records.map(PublicDataSanitizer.safeReport), ...imported] });
  }),

  createMissingReport: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    await ensureActiveAffectedZone(body.affectedZoneId);
    const missing = await prisma.missingPersonReport.create({
      data: {
        ...body,
        ...publicMeta(req),
        verificationStatus: "pending_review",
        privacyLevel: body.isMinor ? "restricted" : "standard",
      },
      include: { affectedZone: true },
    });
    await AuditService.record({
      action: "public_submission",
      module: "missing",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id: missing.id, privacyLevel: missing.privacyLevel, captcha: req.captcha },
    });
    res.status(201).json({ data: PublicDataSanitizer.missing(missing) });
  }),

  listPublicMissing: asyncHandler(async (_req, res) => {
    const records = await prisma.missingPersonReport.findMany({
      where: { deletedAt: null },
      include: { affectedZone: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const imported = await approvedImportedRecords(["missing_person", "hospitalized_person", "trapped_person"]);
    res.json({ data: [...records.map(PublicDataSanitizer.missing), ...imported] });
  }),

  listPublicRescued: asyncHandler(async (_req, res) => {
    const records = await prisma.rescuedPerson.findMany({
      where: { deletedAt: null },
      include: { affectedZone: true, hospital: true, shelter: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const imported = await approvedImportedRecords(["rescued_person"]);
    res.json({ data: [...records.map(PublicDataSanitizer.rescued), ...imported] });
  }),

  listPublicHospitals: asyncHandler(async (_req, res) => {
    const records = await prisma.hospital.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 });
    const imported = await approvedImportedRecords(["hospital", "hospitalized_person"]);
    res.json({ data: [...records.map(PublicDataSanitizer.hospital), ...imported] });
  }),

  listPublicShelters: asyncHandler(async (_req, res) => {
    const records = await prisma.shelter.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 });
    const imported = await approvedImportedRecords(["shelter"]);
    res.json({ data: [...records.map(PublicDataSanitizer.shelter), ...imported] });
  }),

  publicDashboard: asyncHandler(async (_req, res) => {
    const overview = await DashboardService.overview();
    const helpCenters = await approvedImportedRecords(publicCenterTypes);
    res.json({
      stats: overview.stats,
      latestEmergencies: overview.latestEmergencies.map(PublicDataSanitizer.emergency),
      helpCenters: helpCenters.slice(0, 12),
    });
  }),

  publicMap: asyncHandler(async (_req, res) => {
    const map = await MapService.liveMap();
    res.json({
      zones: map.zones.map(PublicDataSanitizer.affectedZone),
      reports: map.reports.map(PublicDataSanitizer.emergency),
      shelters: map.shelters.map(PublicDataSanitizer.shelter),
      hospitals: map.hospitals.map(PublicDataSanitizer.hospital),
      helpCenters: await approvedImportedRecords(publicCenterTypes),
    });
  }),

  listPublicAffectedZones: asyncHandler(async (_req, res) => {
    const zones = await prisma.affectedZone.findMany({
      where: { deletedAt: null },
      orderBy: [{ level: "asc" }, { state: "asc" }, { municipality: "asc" }, { sector: "asc" }],
    });
    res.json({ data: zones.map(PublicDataSanitizer.affectedZone) });
  }),

  listPublicOrganizations: asyncHandler(async (_req, res) => {
    const records = await prisma.organization.findMany({ where: { deletedAt: null, status: "VERIFICADA" }, take: 100 });
    res.json({ data: records.map(PublicDataSanitizer.organization) });
  }),

  listPublicDonations: asyncHandler(async (_req, res) => {
    const records = await prisma.donation.findMany({
      where: { deletedAt: null },
      include: { organization: true, affectedZone: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ data: records.map(PublicDataSanitizer.donation) });
  }),

  helpCenters: asyncHandler(async (_req, res) => {
    const [hospitals, shelters] = await Promise.all([
      prisma.hospital.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 }),
      prisma.shelter.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 }),
    ]);
    res.json({
      hospitals: hospitals.map(PublicDataSanitizer.hospital),
      shelters: shelters.map(PublicDataSanitizer.shelter),
      imported: await approvedImportedRecords(publicCenterTypes),
    });
  }),

  familySearch: asyncHandler(async (req, res) => {
    const q = queryText(req.query.q);
    const state = containsFilter(req.query.state);
    const municipality = containsFilter(req.query.municipality);
    const hospital = containsFilter(req.query.hospital);
    const status = containsFilter(req.query.status);
    const take = Math.min(Number(req.query.take) || 100, 200);

    const zoneFilter = affectedZoneFilter(state, municipality);

    const [missing, safe, rescued, hospitalAdmissions, imported] = await Promise.all([
      prisma.missingPersonReport.findMany({
        where: {
          deletedAt: null,
          ...(q ? { OR: [{ fullName: containsFilter(q) }, { description: containsFilter(q) }, { clothing: containsFilter(q) }, { lastSeenPlace: containsFilter(q) }] } : {}),
          ...(status ? { verificationStatus: status } : {}),
          ...(zoneFilter ? { affectedZone: zoneFilter } : {}),
        },
        include: { affectedZone: true },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.safeReport.findMany({
        where: {
          deletedAt: null,
          ...(q ? { OR: [{ fullName: containsFilter(q) }, { currentPlace: containsFilter(q) }, { message: containsFilter(q) }] } : {}),
          ...(status ? { verificationStatus: status } : {}),
          ...(zoneFilter ? { affectedZone: zoneFilter } : {}),
        },
        include: { affectedZone: true },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.rescuedPerson.findMany({
        where: {
          deletedAt: null,
          ...(q ? { OR: [{ name: containsFilter(q) }, { distinctiveMarks: containsFilter(q) }, { clothing: containsFilter(q) }, { conditionSummary: containsFilter(q) }] } : {}),
          ...(status ? { status: String(req.query.status) } : {}),
          ...(hospital ? { hospital: { name: hospital } } : {}),
          ...(zoneFilter ? { affectedZone: zoneFilter } : {}),
        },
        include: { affectedZone: true, hospital: true, shelter: true },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.hospitalAdmission.findMany({
        where: {
          deletedAt: null,
          verified: true,
          ...(q ? { OR: [{ fullName: containsFilter(q) }, { patientStatus: containsFilter(q) }, { hospitalName: containsFilter(q) }] } : {}),
          ...(state ? { state } : {}),
          ...(municipality ? { municipality } : {}),
          ...(hospital ? { hospitalName: hospital } : {}),
          ...(status ? { patientStatus: status } : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.importedHumanitarianRecord.findMany({
        where: {
          deletedAt: null,
          verificationStatus: "APROBADO",
          recordType: { in: familySearchTypes },
          ...(q ? { OR: [{ fullName: containsFilter(q) }, { name: containsFilter(q) }, { description: containsFilter(q) }, { hospitalName: containsFilter(q) }, { zone: containsFilter(q) }] } : {}),
          ...(state ? { state } : {}),
          ...(municipality ? { municipality } : {}),
          ...(hospital ? { hospitalName: hospital } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { capturedAt: "desc" },
        take,
      }),
    ]);

    const results = [
      ...missing.map((record) => {
        const item = PublicDataSanitizer.missing(record);
        return familyResult({
          id: item.id,
          type: "missing_person",
          name: item.fullName,
          age: item.age,
          sex: item.sex,
          status: item.verificationStatus,
          publicLocation: item.lastSeenPlace,
          source: "Reporte publico",
          privacyLevel: item.privacyLevel,
          createdAt: item.createdAt,
        });
      }),
      ...safe.map((record) => {
        const item = PublicDataSanitizer.safeReport(record);
        return familyResult({
          id: item.id,
          type: "safe_person",
          name: item.fullName,
          age: "Reportado a salvo",
          status: item.verificationStatus,
          publicLocation: item.currentPlace,
          source: "Reporte publico",
          privacyLevel: "standard",
          createdAt: item.createdAt,
        });
      }),
      ...rescued.map((record) => {
        const item = PublicDataSanitizer.rescued(record);
        return familyResult({
          id: item.id,
          code: item.code,
          type: "rescued_person",
          name: item.name,
          age: item.approximateAge,
          sex: item.sex,
          status: item.status,
          publicLocation: item.affectedZone ? [item.affectedZone.sector, item.affectedZone.municipality, item.affectedZone.state].filter(Boolean).join(", ") : undefined,
          hospital: item.hospital,
          source: "Equipo de rescate",
          privacyLevel: item.privacyLevel,
          createdAt: item.createdAt,
        });
      }),
      ...hospitalAdmissions.map((record) => familyResult({
        id: record.id,
        type: "hospitalized_person",
        name: record.publicSafe?.fullName || record.publicSafe?.name || "Informacion protegida",
        age: record.publicSafe?.approximateAge || record.approximateAge,
        sex: record.publicSafe?.gender || record.gender,
        status: record.publicSafe?.patientStatus || record.patientStatus || "Hospitalizado",
        publicLocation: [record.municipality, record.state].filter(Boolean).join(", "),
        hospital: record.publicSafe?.hospitalName || record.hospitalName,
        source: record.source,
        privacyLevel: "standard",
        createdAt: record.createdAt,
      })),
      ...imported.map((record) => familyResult({
        id: record.id,
        type: record.recordType,
        name: record.publicSafe?.fullName || record.publicSafe?.name || record.fullName,
        age: record.publicSafe?.approximateAge || record.approximateAge,
        sex: record.publicSafe?.gender || record.gender,
        status: record.publicSafe?.status || record.status,
        publicLocation: record.publicSafe?.currentPlace || record.publicSafe?.lastSeenPlace || record.publicSafe?.zone || record.zone,
        hospital: record.publicSafe?.hospitalName || record.hospitalName,
        source: record.sourceName,
        privacyLevel: record.privacyLevel,
        verificationStatus: record.verificationStatus,
        updatedAt: record.updatedAt,
      })),
    ].slice(0, take);

    res.json({ data: results, meta: { total: results.length } });
  }),
};
