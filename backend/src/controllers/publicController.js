import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { DashboardService } from "../services/DashboardService.js";
import { MapService } from "../services/MapService.js";
import { PublicDataSanitizer } from "../services/PublicDataSanitizer.js";
import { AuditService } from "../services/AuditService.js";
import { AppError, asyncHandler } from "../utils/AppError.js";
import {
  affectedOperationalZones,
  classifyOperationalResource,
  findAffectedOperationalZone,
  isInAffectedOperationalZone,
} from "../data/affectedOperationalZones.js";

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

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== ""));
}

async function ensureActiveAffectedZone(id) {
  const zone = await prisma.affectedZone.findFirst({ where: { id, deletedAt: null } });
  if (!zone) throw new AppError("Affected zone is not available for public reporting", 400, "INVALID_AFFECTED_ZONE");
  return zone;
}

function publicOperationalZone(zone) {
  return {
    ...zone,
    id: `${zone.state}-${zone.municipality}-${zone.sector}`.replace(/\s+/g, "-").toLowerCase(),
    code: `${zone.priority}-${zone.state}-${zone.sector}`.replace(/\s+/g, "-").toUpperCase(),
    level: zone.priority,
    color: zone.priority === "CRITICA" ? "#dc2626" : zone.priority === "ALTA" ? "#f97316" : "#eab308",
    operationalStatus: "RESPUESTA_OPERATIVA",
    verification: "CATALOGO_OPERATIVO",
  };
}

function withOperationalClassification(resource, recordType) {
  const affectedZone = findAffectedOperationalZone(resource);
  if (!affectedZone) return null;
  return {
    ...resource,
    recordType,
    operationalType: classifyOperationalResource(recordType),
    earthquakeRelated: true,
    affectedOperationalZone: publicOperationalZone(affectedZone),
    operationalPriority: affectedZone.priority,
  };
}

function stripInternalPublicFields(record) {
  if (!record) return record;
  const safeRecord = { ...record };
  delete safeRecord.latitudePrivate;
  delete safeRecord.longitudePrivate;
  delete safeRecord.addressPrivate;
  delete safeRecord.contactPrivate;
  delete safeRecord.rawPayload;
  delete safeRecord.documentPrivate;
  delete safeRecord.medicalPrivate;
  delete safeRecord.locationPrivate;
  return safeRecord;
}

const validPublicStates = new Set([
  "amazonas",
  "anzoategui",
  "anzoátegui",
  "apure",
  "aragua",
  "barinas",
  "bolivar",
  "bolívar",
  "carabobo",
  "cojedes",
  "delta amacuro",
  "distrito capital",
  "falcon",
  "falcón",
  "guarico",
  "guárico",
  "la guaira",
  "lara",
  "merida",
  "mérida",
  "miranda",
  "monagas",
  "nueva esparta",
  "portuguesa",
  "sucre",
  "tachira",
  "táchira",
  "trujillo",
  "yaracuy",
  "zulia",
]);

function looksLikeMedicalText(value) {
  return /politraumat|trauma|fractur|quemadur|herid|lesion|lesión|diagnost|dolor|sangr|uci|grave|critico|crítico|estable|shock|contus|hematoma|paro|insuficiencia|neumon|diabet|hipertensi|embaraz|fallecid|muert|cadaver|cadáver/i.test(String(value || ""));
}

function normalizePublicText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const publicHeaderPersonNames = new Set([
  "nombre",
  "nombre y apellido",
  "nombres y apellidos",
  "apellido",
  "apellido segundo nombre",
  "apellido segundo nombres",
  "edad",
  "edad actualizada",
  "sexo",
  "estado",
  "hospital",
  "observaciones",
  "condicion",
  "diagnostico",
].map(normalizePublicText));

function isHeaderPersonRecord(record) {
  const name = normalizePublicText(record.fullName || record.name);
  if (!name) return false;
  if (publicHeaderPersonNames.has(name)) return true;
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => publicHeaderPersonNames.has(word));
}

function looksLikeMisplacedSurname(value) {
  const text = String(value || "").trim();
  if (!text || text.length < 2 || text.length > 40) return false;
  if (/[0-9,.;:/\\]/.test(text)) return false;
  if (/zona|municipio|hospital|refugio|centro|general|protegida|caracas|miranda|guaira|vargas|libertador|guaicaipuro/i.test(text)) return false;
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(text);
}

function repairLegacyGoogleDriveHospitalizedPublicRecord(record, sourceName) {
  if (record.recordType !== "hospitalized_person" || !/google drive hospitales/i.test(sourceName || "")) return record;
  const fullName = String(record.fullName || record.name || "").trim();
  const misplacedSurname = String(record.zone || "").trim();
  if (fullName.split(/\s+/).filter(Boolean).length === 1 && looksLikeMisplacedSurname(misplacedSurname)) {
    return {
      ...record,
      fullName: `${fullName} ${misplacedSurname}`,
      name: `${fullName} ${misplacedSurname}`,
      zone: "Zona general protegida",
      currentPlace: record.currentPlace === misplacedSurname ? "Zona general protegida" : record.currentPlace,
      lastSeenPlace: record.lastSeenPlace === misplacedSurname ? "Zona general protegida" : record.lastSeenPlace,
    };
  }
  return record;
}

function publicPersonStatus(recordType, status) {
  if (recordType === "hospitalized_person") return "Hospitalizado";
  if (looksLikeMedicalText(status)) return "Informacion protegida";
  return status;
}

function normalizeImportedPersonPublicFields(publicRecord, recordType) {
  const safeRecord = { ...publicRecord };
  if (familySearchTypes.includes(recordType)) {
    safeRecord.status = publicPersonStatus(recordType, safeRecord.status);
    if (safeRecord.patientStatus) safeRecord.patientStatus = publicPersonStatus(recordType, safeRecord.patientStatus);
    if (safeRecord.state && (!validPublicStates.has(String(safeRecord.state).trim().toLowerCase()) || looksLikeMedicalText(safeRecord.state))) {
      delete safeRecord.state;
    }
    delete safeRecord.condition;
    delete safeRecord.diagnosis;
    delete safeRecord.room;
    delete safeRecord.bed;
    delete safeRecord.floor;
  }
  return safeRecord;
}

async function approvedImportedRecords(recordTypes, take = 500) {
  try {
    const records = await prisma.importedHumanitarianRecord.findMany({
      where: { deletedAt: null, verificationStatus: "APROBADO", recordType: { in: recordTypes } },
      orderBy: { capturedAt: "desc" },
      take,
    });
    return records
      .map((record) => {
        const publicRecord = {
        id: record.id,
        ...record.publicSafe,
        recordType: record.publicSafe?.recordType || record.recordType,
        state: record.publicSafe?.state || record.state,
        municipality: record.publicSafe?.municipality || record.municipality,
        publicLocation: record.publicSafe?.publicLocation || record.publicLocation,
        zone: record.publicSafe?.zone || record.zone,
        latitudePrivate: record.latitudePrivate,
        longitudePrivate: record.longitudePrivate,
        verificationStatus: record.verificationStatus,
        };
        const safePublicRecord = repairLegacyGoogleDriveHospitalizedPublicRecord(
          normalizeImportedPersonPublicFields(publicRecord, record.recordType),
          record.sourceName,
        );
        if (familySearchTypes.includes(record.recordType) && isHeaderPersonRecord(safePublicRecord)) return null;
        return stripInternalPublicFields(operationalResourceTypes.has(record.recordType)
          ? withOperationalClassification(safePublicRecord, record.recordType)
          : safePublicRecord);
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

const publicCenterTypes = ["collection_center", "shelter", "hospital", "help_center", "water_point", "food_point", "medical_point", "volunteer_center", "pet_aid_center", "logistics_center", "donation_need"];
const familySearchTypes = ["missing_person", "hospitalized_person", "trapped_person", "safe_person", "rescued_person"];
const operationalResourceTypes = new Set([...publicCenterTypes, "hospital"]);
const centerTypes = new Set(["hospital", "shelter", "collection_center", "medical_point", "water_point", "food_point", "pet_aid_center", "logistics_center", "help_center"]);
const logisticsTypes = new Set(["water", "food", "medicine", "fuel", "transport", "generator", "mattress", "medical_supply"]);

function queryText(value) {
  return String(value || "").trim();
}

function containsFilter(value) {
  const text = queryText(value);
  return text ? { contains: text, mode: "insensitive" } : undefined;
}

function normalizeDocument(value) {
  return String(value || "").replace(/\D/g, "");
}

function recordDocumentMatches(record, documentQuery) {
  if (!documentQuery) return true;
  const normalizedQuery = normalizeDocument(documentQuery);
  const privateText = JSON.stringify(record.documentPrivate || record.rawPayload || {});
  return normalizeDocument(privateText).includes(normalizedQuery);
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

function personMapReport(record, index) {
  const affectedZone = findAffectedOperationalZone(record);
  if (!affectedZone) return null;
  const typeLabels = {
    missing_person: "Desaparecidos",
    hospitalized_person: "Hospitalizados",
    trapped_person: "Atrapados",
    safe_person: "A salvo",
    rescued_person: "Rescatados",
  };
  return {
    id: `person-${record.id || index}`,
    type: typeLabels[record.recordType] || "Personas",
    status: record.status || record.verificationStatus || "APROBADO",
    zone: affectedZone.sector,
    count: 1,
    color: record.recordType === "hospitalized_person" ? "blue" : record.recordType === "rescued_person" ? "green" : "red",
    affectedZone: publicOperationalZone(affectedZone),
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
  rescuedReport: z.object({
    body: z.object({
      name: z.string().min(2),
      approximateAge: z.string().optional(),
      sex: z.string().optional(),
      state: z.string().optional(),
      municipality: z.string().optional(),
      publicLocation: z.string().min(2),
      currentPlace: z.string().optional(),
      conditionSummary: z.string().optional(),
      observations: z.string().optional(),
      reporterName: z.string().optional(),
      contactPrivate: z.string().optional(),
      source: z.string().optional(),
      website: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
  helpCenter: z.object({
    body: z.object({
      recordType: z.enum(["hospital", "shelter", "collection_center", "medical_point", "water_point", "food_point", "pet_aid_center", "logistics_center", "help_center"]),
      name: z.string().min(2),
      organization: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      municipality: z.string().optional(),
      city: z.string().optional(),
      publicLocation: z.string().min(2),
      addressPrivate: z.string().optional(),
      contactPrivate: z.string().optional(),
      operatingHours: z.string().optional(),
      acceptedItems: z.array(z.string()).default([]),
      capacity: z.coerce.number().int().min(0).optional(),
      occupied: z.coerce.number().int().min(0).optional(),
      operationalStatus: z.string().default("PENDIENTE_VERIFICACION"),
      observations: z.string().optional(),
      website: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
  logisticsRequest: z.object({
    body: z.object({
      itemType: z.enum(["water", "food", "medicine", "fuel", "transport", "generator", "mattress", "medical_supply"]),
      requester: z.string().min(2),
      organization: z.string().optional(),
      state: z.string().optional(),
      municipality: z.string().optional(),
      publicLocation: z.string().min(2),
      quantity: z.string().optional(),
      priority: z.string().default("PENDIENTE"),
      notes: z.string().optional(),
      contactPrivate: z.string().optional(),
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
    const imported = await approvedImportedRecords(["missing_person"]);
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

  createRescuedReport: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    const record = await prisma.importedHumanitarianRecord.create({
      data: {
        sourceName: body.source || "Reporte publico RescueNet",
        sourceUrl: "public_web_form",
        capturedAt: new Date(),
        sourceRecordId: makeCode("RSC-PUBLIC"),
        recordType: "rescued_person",
        fullName: body.name,
        approximateAge: body.approximateAge,
        gender: body.sex,
        status: "PENDIENTE_REVISION",
        state: body.state,
        municipality: body.municipality,
        zone: body.publicLocation,
        publicLocation: body.publicLocation,
        currentPlace: body.publicLocation,
        description: body.observations,
        contactPrivate: body.contactPrivate,
        contactInfoPrivate: body.contactPrivate,
        medicalPrivate: compactObject({
          conditionSummary: body.conditionSummary,
          observations: body.observations,
        }),
        locationPrivate: compactObject({
          currentPlace: body.currentPlace,
          state: body.state,
          municipality: body.municipality,
        }),
        verificationStatus: "NO_VERIFICADO",
        privacyLevel: "standard",
        confidenceScore: 20,
        confidenceLevel: "low",
        confidenceFactors: ["public_submission", "requires_institutional_review"],
        publicSafe: compactObject({
          recordType: "rescued_person",
          fullName: body.name,
          approximateAge: body.approximateAge,
          gender: body.sex,
          status: "Pendiente de revision",
          state: body.state,
          municipality: body.municipality,
          zone: body.publicLocation,
          currentPlace: body.publicLocation,
          sourceName: body.source || "Reporte publico RescueNet",
        }),
        rawPayload: compactObject({
          ...body,
          reporterIp: req.ip,
          userAgent: req.get("user-agent"),
        }),
      },
    });
    await AuditService.record({
      action: "public_submission",
      module: "rescued",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id: record.id, recordType: "rescued_person", captcha: req.captcha },
    });
    res.status(201).json({ data: { id: record.id, status: "pending_review", publicSafe: record.publicSafe } });
  }),

  listPublicHospitalized: asyncHandler(async (_req, res) => {
    const records = await prisma.hospitalAdmission.findMany({
      where: { deletedAt: null, verified: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const imported = await approvedImportedRecords(["hospitalized_person"]);
    res.json({
      data: [
        ...records.map((record) => familyResult({
          id: record.id,
          type: "hospitalized_person",
          name: record.fullName,
          status: record.patientStatus || "Hospitalizado",
          publicLocation: [record.hospitalName, record.municipality, record.state].filter(Boolean).join(", "),
          hospital: record.hospitalName,
          source: "Registro hospitalario verificado",
          privacyLevel: "standard",
          updatedAt: record.updatedAt || record.createdAt,
        })),
        ...imported,
      ],
    });
  }),

  listPublicHospitals: asyncHandler(async (_req, res) => {
    const records = await prisma.hospital.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 });
    const imported = await approvedImportedRecords(["hospital"]);
    const hospitals = records
      .filter(isInAffectedOperationalZone)
      .map(PublicDataSanitizer.hospital)
      .map((record) => withOperationalClassification(record, "hospital"))
      .filter(Boolean);
    res.json({ data: [...hospitals, ...imported] });
  }),

  listPublicShelters: asyncHandler(async (_req, res) => {
    const records = await prisma.shelter.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 });
    const imported = await approvedImportedRecords(["shelter"]);
    const shelters = records
      .filter(isInAffectedOperationalZone)
      .map(PublicDataSanitizer.shelter)
      .map((record) => withOperationalClassification(record, "shelter"))
      .filter(Boolean);
    res.json({ data: [...shelters, ...imported] });
  }),

  publicDashboard: asyncHandler(async (_req, res) => {
    const overview = await DashboardService.overview();
    const helpCenters = await approvedImportedRecords(publicCenterTypes);
    const [hospitals, shelters, missing, safe, rescued, admissions, pendingEmergencies, criticalEmergencies, importedMissing, importedSafe, importedRescued, importedHospitalized, importedTrapped] = await Promise.all([
      prisma.hospital.findMany({ where: { deletedAt: null }, include: { affectedZone: true } }),
      prisma.shelter.findMany({ where: { deletedAt: null }, include: { affectedZone: true } }),
      prisma.missingPersonReport.count({ where: { deletedAt: null } }),
      prisma.safeReport.count({ where: { deletedAt: null } }),
      prisma.rescuedPerson.count({ where: { deletedAt: null } }),
      prisma.hospitalAdmission.count({ where: { deletedAt: null, verified: true } }),
      prisma.emergencyReport.count({ where: { deletedAt: null, verificationStatus: "pending_review" } }),
      prisma.emergencyReport.count({ where: { deletedAt: null, OR: [{ priority: "CRITICA" }, { type: { contains: "atrap", mode: "insensitive" } }, { type: { contains: "colaps", mode: "insensitive" } }] } }),
      prisma.importedHumanitarianRecord.count({ where: { deletedAt: null, verificationStatus: "APROBADO", recordType: "missing_person" } }),
      prisma.importedHumanitarianRecord.count({ where: { deletedAt: null, verificationStatus: "APROBADO", recordType: "safe_person" } }),
      prisma.importedHumanitarianRecord.count({ where: { deletedAt: null, verificationStatus: "APROBADO", recordType: "rescued_person" } }),
      prisma.importedHumanitarianRecord.count({ where: { deletedAt: null, verificationStatus: "APROBADO", recordType: "hospitalized_person" } }),
      prisma.importedHumanitarianRecord.count({ where: { deletedAt: null, verificationStatus: "APROBADO", recordType: "trapped_person" } }),
    ]);
    const missingPeople = missing + importedMissing;
    const rescuedPeople = rescued + importedRescued;
    const hospitalizedPeople = admissions + importedHospitalized;
    const safePeople = safe + importedSafe;
    const trappedPeople = importedTrapped;
    const affectedHospitals = hospitals.filter(isInAffectedOperationalZone).length + helpCenters.filter((item) => item.operationalType === "hospital_near_disaster").length;
    const affectedShelters = shelters.filter(isInAffectedOperationalZone).length + helpCenters.filter((item) => item.operationalType === "shelter").length;
    const collectionCenters = helpCenters.filter((item) => item.operationalType === "collection_center").length;
    res.json({
      stats: {
        ...overview.stats,
        criticalZones: affectedOperationalZones.filter((zone) => zone.priority === "CRITICA").length,
        nearbyHospitals: affectedHospitals,
        activeShelters: affectedShelters,
        collectionCenters,
        missingPeople,
        rescuedPeople,
        hospitalizedPeople,
        safePeople,
        trappedPeople,
        publicPeopleTotal: missingPeople + rescuedPeople + hospitalizedPeople + safePeople + trappedPeople,
        registeredPeople: missingPeople + safePeople + rescuedPeople + hospitalizedPeople + trappedPeople,
        pendingReports: pendingEmergencies,
        criticalIncidents: criticalEmergencies,
        activeCenters: affectedHospitals + affectedShelters + collectionCenters + helpCenters.filter((item) => !["hospital_near_disaster", "shelter", "collection_center"].includes(item.operationalType)).length,
      },
      latestEmergencies: overview.latestEmergencies.map(PublicDataSanitizer.emergency),
      helpCenters: helpCenters.slice(0, 12),
    });
  }),

  publicMap: asyncHandler(async (_req, res) => {
    const map = await MapService.liveMap();
    const hospitals = map.hospitals
      .filter(isInAffectedOperationalZone)
      .map(PublicDataSanitizer.hospital)
      .map((record) => withOperationalClassification(record, "hospital"))
      .filter(Boolean);
    const shelters = map.shelters
      .filter(isInAffectedOperationalZone)
      .map(PublicDataSanitizer.shelter)
      .map((record) => withOperationalClassification(record, "shelter"))
      .filter(Boolean);
    const importedPeople = await approvedImportedRecords(familySearchTypes, 500);
    res.json({
      zones: affectedOperationalZones.map(publicOperationalZone),
      reports: [
        ...map.reports.map(PublicDataSanitizer.emergency),
        ...importedPeople.map(personMapReport).filter(Boolean),
      ],
      shelters,
      hospitals,
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
    const publicHospitals = hospitals
      .filter(isInAffectedOperationalZone)
      .map(PublicDataSanitizer.hospital)
      .map((record) => withOperationalClassification(record, "hospital"))
      .filter(Boolean);
    const publicShelters = shelters
      .filter(isInAffectedOperationalZone)
      .map(PublicDataSanitizer.shelter)
      .map((record) => withOperationalClassification(record, "shelter"))
      .filter(Boolean);
    res.json({
      hospitals: publicHospitals,
      shelters: publicShelters,
      imported: await approvedImportedRecords(publicCenterTypes),
    });
  }),

  createHelpCenter: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    if (!centerTypes.has(body.recordType)) throw new AppError("Unsupported center type", 400, "UNSUPPORTED_CENTER_TYPE");
    const record = await prisma.importedHumanitarianRecord.create({
      data: {
        sourceName: "Public center submission",
        sourceUrl: "public_web_form",
        capturedAt: new Date(),
        sourceRecordId: makeCode("CENTER"),
        recordType: body.recordType,
        name: body.name,
        organization: body.organization,
        state: body.state,
        municipality: body.municipality,
        publicLocation: body.publicLocation,
        addressPrivate: body.addressPrivate,
        contactPrivate: body.contactPrivate,
        acceptedItems: body.acceptedItems || [],
        operatingHours: body.operatingHours,
        operationalStatus: body.operationalStatus || "PENDIENTE_VERIFICACION",
        description: body.observations,
        verificationStatus: "NO_VERIFICADO",
        privacyLevel: "standard",
        publicSafe: compactObject({
          recordType: body.recordType,
          name: body.name,
          organization: body.organization,
          country: body.country,
          state: body.state,
          municipality: body.municipality,
          city: body.city,
          publicLocation: body.publicLocation,
          acceptedItems: body.acceptedItems || [],
          operatingHours: body.operatingHours,
          operationalStatus: "PENDIENTE_VERIFICACION",
          observations: body.observations,
        }),
        rawPayload: compactObject({
          ...body,
          contactPrivate: body.contactPrivate ? "[protected]" : undefined,
          addressPrivate: body.addressPrivate ? "[protected]" : undefined,
        }),
      },
    });
    await AuditService.record({ action: "public_submission", module: "help_centers", result: "SUCCESS", ip: req.ip, metadata: { id: record.id, recordType: record.recordType, captcha: req.captcha } });
    res.status(201).json({ data: { id: record.id, status: "pending_review", publicSafe: record.publicSafe } });
  }),

  createLogisticsRequest: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    if (!logisticsTypes.has(body.itemType)) throw new AppError("Unsupported logistics item type", 400, "UNSUPPORTED_LOGISTICS_TYPE");
    const record = await prisma.importedHumanitarianRecord.create({
      data: {
        sourceName: "Public logistics request",
        sourceUrl: "public_web_form",
        capturedAt: new Date(),
        sourceRecordId: makeCode("LOG"),
        recordType: "donation_need",
        name: body.itemType,
        organization: body.organization || body.requester,
        state: body.state,
        municipality: body.municipality,
        publicLocation: body.publicLocation,
        contactPrivate: body.contactPrivate,
        acceptedItems: [body.itemType, body.quantity].filter(Boolean),
        operationalStatus: body.priority || "PENDIENTE",
        description: body.notes,
        verificationStatus: "NO_VERIFICADO",
        privacyLevel: "standard",
        publicSafe: compactObject({
          recordType: "donation_need",
          itemType: body.itemType,
          requester: body.requester,
          organization: body.organization,
          state: body.state,
          municipality: body.municipality,
          publicLocation: body.publicLocation,
          quantity: body.quantity,
          priority: body.priority,
          operationalStatus: "PENDIENTE_VERIFICACION",
        }),
        rawPayload: compactObject({ ...body, contactPrivate: body.contactPrivate ? "[protected]" : undefined }),
      },
    });
    await AuditService.record({ action: "public_submission", module: "logistics", result: "SUCCESS", ip: req.ip, metadata: { id: record.id, itemType: body.itemType, captcha: req.captcha } });
    res.status(201).json({ data: { id: record.id, status: "pending_review", publicSafe: record.publicSafe } });
  }),

  familySearch: asyncHandler(async (req, res) => {
    const q = queryText(req.query.q);
    const state = containsFilter(req.query.state);
    const municipality = containsFilter(req.query.municipality);
    const hospital = containsFilter(req.query.hospital);
    const status = containsFilter(req.query.status);
    const documentQuery = req.query.documentNumber || req.query.cedula;
    const take = Math.min(Number(req.query.take) || 100, 200);

    const zoneFilter = affectedZoneFilter(state, municipality);

    const [missing, safe, rescued, hospitalAdmissions, imported] = await Promise.all([
      documentQuery ? Promise.resolve([]) : prisma.missingPersonReport.findMany({
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
      documentQuery ? Promise.resolve([]) : prisma.safeReport.findMany({
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
      documentQuery ? Promise.resolve([]) : prisma.rescuedPerson.findMany({
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
      documentQuery ? Promise.resolve([]) : prisma.hospitalAdmission.findMany({
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
        take: documentQuery ? 1000 : take,
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
      ...imported.filter((record) => recordDocumentMatches(record, documentQuery)).map((record) => familyResult({
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
