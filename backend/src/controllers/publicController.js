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
  delete safeRecord.sourceUrl;
  delete safeRecord.sourceRecordId;
  delete safeRecord.possibleDuplicate;
  delete safeRecord.building;
  delete safeRecord.capturedAt;
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

// Venezuela bounding box (lat, lng)
const VZ_LAT = [0.6, 12.3];
const VZ_LNG = [-73.4, -59.8];

function isInternationalCenter(record) {
  // Coords are stored as locationPrivate JSON { lat, lng }, not as flat fields
  const loc = record.locationPrivate || {};
  const lat = loc.lat != null ? Number(loc.lat) : null;
  const lng = loc.lng != null ? Number(loc.lng) : null;
  if (lat != null && lng != null) {
    return lat < VZ_LAT[0] || lat > VZ_LAT[1] || lng < VZ_LNG[0] || lng > VZ_LNG[1];
  }
  // Fallback: check all text fields for non-VZ place indicators
  const stateRaw = record.publicSafe?.state || record.state || "";
  const allText = `${stateRaw} ${record.publicSafe?.municipality || ""} ${record.publicSafe?.publicLocation || ""}`;
  // US address pattern: "City, ST 12345"
  if (/,\s*[A-Z]{2}\s+\d{5}\b/.test(allText)) return true;
  // Known non-VZ country/state/city names
  const knownNonVZ = /\b(florida|texas|new york|california|madrid|colombia|peru|chile|argentina|michigan|ohio|virginia|georgia|illinois|new jersey|doral|miami|houston|bogota|lima|santiago|dallas|chicago|atlanta|orlando|tampa|quito|guayaquil|bogotá)\b/i.test(allText);
  if (knownNonVZ) return true;
  if (!stateRaw) return false;
  const stateNorm = normalizePublicText(stateRaw);
  // If state is clearly a valid VZ state, it's local
  if (validPublicStates.has(stateNorm)) return false;
  return false;
}

function looksLikeMedicalText(value) {
  return /politraumat|trauma|fractur|quemadur|herid|lesion|lesión|diagnost|dolor|sangr|uci|grave|critico|crítico|estable|shock|contus|hematoma|paro|insuficiencia|neumon|diabet|hipertensi|embaraz|fallecid|muert|cadaver|cadáver|triaje|triage|medicina interna|emergencia medica|sala de/i.test(String(value || ""));
}

function looksLikeAgeField(value) {
  return /^\(?(edad|age|años)\b/i.test(String(value || "").trim());
}

function normalizePublicText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// State aliases: old names \u2192 current official name
const STATE_ALIASES = { vargas: "la guaira" };
function normalizeState(str) {
  const base = String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return STATE_ALIASES[base] ?? base;
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
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const endsWithPreposition = /\b(de|del|de la|de las|de los|y)$/i.test(fullName);
  if ((nameParts.length === 1 || endsWithPreposition) && looksLikeMisplacedSurname(misplacedSurname)) {
    const repairedName = `${fullName} ${misplacedSurname}`;
    return {
      ...record,
      fullName: repairedName,
      name: repairedName,
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
    if (safeRecord.zone && (looksLikeMedicalText(safeRecord.zone) || looksLikeAgeField(safeRecord.zone))) {
      safeRecord.zone = "Zona general protegida";
    }
    if (safeRecord.currentPlace && (looksLikeMedicalText(safeRecord.currentPlace) || looksLikeAgeField(safeRecord.currentPlace))) {
      delete safeRecord.currentPlace;
    }
    delete safeRecord.condition;
    delete safeRecord.diagnosis;
    delete safeRecord.room;
    delete safeRecord.bed;
    delete safeRecord.floor;
  }
  return safeRecord;
}

function buildPublicRecord(record) {
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
  if (operationalResourceTypes.has(record.recordType)) {
    // Intenta clasificar en una zona operacional. Si el centro está fuera de las zonas
    // registradas (p.ej. centros de Redayuda en otras regiones), lo incluye sin zona
    // para que igual aparezca en el mapa.
    const classified = withOperationalClassification(safePublicRecord, record.recordType);
    return classified ?? { ...safePublicRecord, recordType: record.recordType, operationalType: classifyOperationalResource(record.recordType), earthquakeRelated: false };
  }
  return safePublicRecord;
}

// Build a rich public result for Redayuda records (and fallback for APROBADO records).
// Redayuda: full disclosure per humanitarian authorization — no masking regardless of privacyLevel.
// Non-Redayuda restricted/private_only records: mask name, hide cedula/phone/description.
function buildRedayudaPublicResult(record) {
  const pub = record.publicSafe || {};
  const isRedayuda = record.sourceName === REDAYUDA_SOURCE;
  // Redayuda has humanitarian authorization: never restrict name or sensitive fields.
  const isRestricted = !isRedayuda && ["restricted", "private_only"].includes(record.privacyLevel);
  // Use the top-level fullName first — for Redayuda restricted records publicSafe.fullName
  // was set to "Informacion protegida" during import, but record.fullName holds the real name.
  const displayName = isRestricted ? "Informacion protegida" : (record.fullName || pub.fullName);
  return {
    id: record.id,
    type: record.recordType,
    recordType: record.recordType,
    sourceName: pub.sourceName || record.sourceName,
    source: isRedayuda ? "Redayuda" : (pub.sourceName || record.sourceName),
    isRedayuda,
    verificationStatus: record.verificationStatus,
    privacyLevel: record.privacyLevel,
    capturedAt: record.capturedAt,
    updatedAt: record.updatedAt,
    // Person — prefer top-level fields (more complete for restricted records)
    fullName: displayName,
    name: displayName,
    approximateAge: record.approximateAge || pub.approximateAge,
    age: record.approximateAge || pub.approximateAge,
    gender: record.gender || pub.gender,
    sex: record.gender || pub.gender,
    status: pub.status || record.status,
    // Location — top-level fields carry the data for restricted records
    state: record.state || pub.state,
    municipality: record.municipality || pub.municipality,
    zone: record.zone || pub.zone,
    publicLocation: record.currentPlace || record.lastSeenPlace || record.zone || pub.currentPlace || pub.lastSeenPlace || pub.zone,
    lastSeenPlace: record.lastSeenPlace || pub.lastSeenPlace,
    currentPlace: record.currentPlace || pub.currentPlace,
    // Medical/institution
    hospital: record.hospitalName || pub.hospitalName,
    hospitalName: record.hospitalName || pub.hospitalName,
    // Content
    description: isRestricted ? undefined : (record.description || pub.description),
    photoUrl: pub.photoUrl,
    tags: pub.tags,
    // Sensitive: Redayuda records expose cedula and phone (humanitarian authorization)
    cedula: isRedayuda ? (record.documentPrivate?.cedula || undefined) : undefined,
    phone: (isRedayuda && record.contactPrivate) ? record.contactPrivate : undefined,
  };
}

// Like approvedImportedRecords but also includes NO_VERIFICADO records from Redayuda.
// Used for person-type endpoints (missing, hospitalized, safe).
async function publicPersonRecords(recordTypes, take = 300, stateFilter = null) {
  try {
    const normFilter = stateFilter ? normalizeState(stateFilter) : null;
    const records = await prisma.importedHumanitarianRecord.findMany({
      where: {
        deletedAt: null,
        recordType: { in: recordTypes },
        AND: [{ OR: [{ verificationStatus: "APROBADO" }, { sourceName: REDAYUDA_SOURCE }] }],
      },
      orderBy: { capturedAt: "desc" },
      ...(normFilter ? {} : { take }),
    });
    const filtered = normFilter
      ? records.filter(r => normalizeState(r.publicSafe?.state ?? r.state ?? "") === normFilter)
      : records;
    return filtered.map(buildRedayudaPublicResult).filter(Boolean);
  } catch {
    return [];
  }
}

async function approvedImportedRecords(recordTypes, take = 500, stateFilter = null) {
  try {
    const normFilter = stateFilter ? normalizeState(stateFilter) : null;
    const records = await prisma.importedHumanitarianRecord.findMany({
      where: { deletedAt: null, verificationStatus: "APROBADO", recordType: { in: recordTypes } },
      orderBy: { capturedAt: "desc" },
      // Remove take limit when filtering by state to ensure all matching records are returned
      ...(normFilter ? {} : { take }),
    });
    const filtered = normFilter
      ? records.filter(r => normalizeState(r.publicSafe?.state ?? "") === normFilter)
      : records;
    return filtered.map(buildPublicRecord).filter(Boolean).map(stripInternalPublicFields);
  } catch {
    return [];
  }
}

// Variant that tags centers as _isInternational before stripping coords
async function approvedImportedRecordsWithRaw(recordTypes, take = 1000, stateFilter = null) {
  try {
    const normFilter = stateFilter ? normalizeState(stateFilter) : null;
    const records = await prisma.importedHumanitarianRecord.findMany({
      where: { deletedAt: null, verificationStatus: "APROBADO", recordType: { in: recordTypes } },
      orderBy: { capturedAt: "desc" },
      ...(normFilter ? {} : { take }),
    });
    const filtered = normFilter
      ? records.filter(r => normalizeState(r.publicSafe?.state ?? "") === normFilter)
      : records;
    return filtered
      .map((record) => {
        const built = buildPublicRecord(record);
        if (!built) return null;
        return { ...built, _isInternational: isInternationalCenter(record) };
      })
      .filter(Boolean)
      .map(stripInternalPublicFields);
  } catch {
    return [];
  }
}

const REDAYUDA_SOURCE = "redayuda";

// Columns needed by buildRedayudaPublicResult. Excluding rawPayload (large), private coord/medical
// fields, and ingestion metadata cuts fetched data by ~70% and speeds up all person queries.
const PERSON_SELECT = {
  id: true, sourceName: true, recordType: true, capturedAt: true, updatedAt: true,
  verificationStatus: true, privacyLevel: true,
  fullName: true, approximateAge: true, gender: true, status: true, hospitalName: true,
  state: true, municipality: true, zone: true, lastSeenPlace: true, currentPlace: true,
  description: true, publicSafe: true, documentPrivate: true, contactPrivate: true,
};

// In-memory count cache for listPublicPersons — avoids repeated COUNT+GROUP BY on 189k rows.
// TTL: 30 minutes. Data changes only on imports; stale count for 30 min is acceptable.
const _personCountCache = new Map();
const _COUNT_TTL = 30 * 60 * 1000;
function _getCountCache(k) {
  const e = _personCountCache.get(k);
  if (!e || Date.now() - e.ts > _COUNT_TTL) { _personCountCache.delete(k); return null; }
  return e.val;
}
function _setCountCache(k, v) { _personCountCache.set(k, { val: v, ts: Date.now() }); }

const publicCenterTypes = ["collection_center", "shelter", "hospital", "help_center", "water_point", "food_point", "medical_point", "volunteer_center", "pet_aid_center", "logistics_center", "donation_need"];
const familySearchTypes = ["missing_person", "hospitalized_person", "trapped_person", "safe_person", "rescued_person", "deceased_person"];
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
    source: base.source || "RescateVZLA",
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
  hospitalizedReport: z.object({
    body: z.object({
      affectedZoneId: z.string().min(1),
      fullName: z.string().min(2),
      approximateAge: z.string().optional(),
      sex: z.string().optional(),
      hospitalName: z.string().optional(),
      publicLocation: z.string().min(2),
      website: z.string().optional(),
      url: z.string().optional(),
    }),
  }),
  deceasedReport: z.object({
    body: z.object({
      affectedZoneId: z.string().min(1),
      fullName: z.string().min(2),
      approximateAge: z.string().optional(),
      sex: z.string().optional(),
      publicLocation: z.string().min(2),
      sourceReference: z.string().optional(),
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
    const imported = await publicPersonRecords(["safe_person"], 300);
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
    const imported = await publicPersonRecords(["missing_person"], 300);
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
        sourceName: body.source || "Reporte publico RescateVZLA",
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
          sourceName: body.source || "Reporte publico RescateVZLA",
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
    const imported = await publicPersonRecords(["hospitalized_person"], 300);
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

  publicMap: asyncHandler(async (req, res) => {
    const includeInternational = req.query.includeInternational === "true";
    const stateFilter = req.query.state ? String(req.query.state).trim() : null;
    const normFilter = stateFilter ? normalizeState(stateFilter) : null;

    const map = await MapService.liveMap();
    const hospitals = map.hospitals
      .filter(isInAffectedOperationalZone)
      .filter(r => !normFilter || normalizeState(r.affectedZone?.state ?? "") === normFilter)
      .map(PublicDataSanitizer.hospital)
      .map((record) => withOperationalClassification(record, "hospital"))
      .filter(Boolean);
    const shelters = map.shelters
      .filter(isInAffectedOperationalZone)
      .filter(r => !normFilter || normalizeState(r.affectedZone?.state ?? "") === normFilter)
      .map(PublicDataSanitizer.shelter)
      .map((record) => withOperationalClassification(record, "shelter"))
      .filter(Boolean);
    const importedPeople = await approvedImportedRecords(familySearchTypes, 500);
    const allCenters = await approvedImportedRecordsWithRaw(publicCenterTypes, 1000, stateFilter);
    const localCenters = allCenters.filter((c) => !c._isInternational).map(({ _isInternational, ...r }) => r);
    const internationalCenters = allCenters.filter((c) => c._isInternational).map(({ _isInternational, ...r }) => ({ ...r, isInternational: true }));
    // Never mix international centers with a specific-state filter
    const helpCenters = (includeInternational && !stateFilter)
      ? [...localCenters, ...internationalCenters]
      : localCenters;
    res.json({
      zones: affectedOperationalZones.map(publicOperationalZone),
      reports: [
        ...map.reports.map(PublicDataSanitizer.emergency),
        ...importedPeople.map(personMapReport).filter(Boolean),
      ],
      shelters,
      hospitals,
      helpCenters,
      internationalCentersCount: internationalCenters.length,
      ...(stateFilter ? { filteredByState: stateFilter } : {}),
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

  helpCenters: asyncHandler(async (req, res) => {
    const stateFilter = req.query.state ? String(req.query.state).trim() : null;
    const normFilter = stateFilter ? normalizeState(stateFilter) : null;
    const [hospitals, shelters] = await Promise.all([
      prisma.hospital.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 }),
      prisma.shelter.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 100 }),
    ]);
    const publicHospitals = hospitals
      .filter(isInAffectedOperationalZone)
      .filter(r => !normFilter || normalizeState(r.affectedZone?.state ?? "") === normFilter)
      .map(PublicDataSanitizer.hospital)
      .map((record) => withOperationalClassification(record, "hospital"))
      .filter(Boolean);
    const publicShelters = shelters
      .filter(isInAffectedOperationalZone)
      .filter(r => !normFilter || normalizeState(r.affectedZone?.state ?? "") === normFilter)
      .map(PublicDataSanitizer.shelter)
      .map((record) => withOperationalClassification(record, "shelter"))
      .filter(Boolean);
    res.json({
      hospitals: publicHospitals,
      shelters: publicShelters,
      imported: await approvedImportedRecords(publicCenterTypes, 500, stateFilter),
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
    const documentQuery = req.query.documentNumber || req.query.cedula || req.query.documentId || req.query.passport || req.query.phone || req.query.telefono;
    const take = Math.min(Number(req.query.take) || 200, 500);
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * take;

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
        take: 100,
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
        take: 100,
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
        take: 100,
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
        take: 100,
      }),
      prisma.importedHumanitarianRecord.findMany({
        where: {
          deletedAt: null,
          recordType: { in: familySearchTypes },
          AND: [
            { OR: [{ verificationStatus: "APROBADO" }, { sourceName: REDAYUDA_SOURCE }] },
            ...(documentQuery ? [{
              OR: [
                { documentPrivate: { path: ["cedula"], string_contains: normalizeDocument(documentQuery) } },
                { contactPrivate: { contains: normalizeDocument(documentQuery) } },
              ],
            }] : []),
            ...(q ? [{
              OR: [
                { fullName: containsFilter(q) },
                { name: containsFilter(q) },
                { description: containsFilter(q) },
                { hospitalName: containsFilter(q) },
                { zone: containsFilter(q) },
                { municipality: containsFilter(q) },
                { state: containsFilter(q) },
                { currentPlace: containsFilter(q) },
                { lastSeenPlace: containsFilter(q) },
              ],
            }] : []),
          ],
          ...(state ? { state } : {}),
          ...(municipality ? { municipality } : {}),
          ...(hospital ? { hospitalName: hospital } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { capturedAt: "desc" },
        skip: documentQuery ? 0 : skip,
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
      ...imported.map((record) => buildRedayudaPublicResult(record)).filter(Boolean),
    ];

    res.json({ data: results, meta: { total: results.length, page, take } });
  }),

  listPublicPersons: asyncHandler(async (req, res) => {
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || req.query.take) || 50));
    const skip  = (page - 1) * limit;
    // counts=false skips expensive COUNT + GROUP BY on load-more requests
    const skipCounts = req.query.counts === "false";

    const typeParam    = req.query.type;
    const types        = typeParam ? [typeParam] : familySearchTypes;
    const q            = req.query.q ? String(req.query.q).trim() : null;
    const stateQ       = req.query.state ? String(req.query.state).trim() : null;
    const municipalityQ = req.query.municipality ? String(req.query.municipality).trim() : null;
    const sourceQ      = req.query.source ? String(req.query.source).trim() : null;
    const documentQ    = req.query.cedula || req.query.documentNumber || req.query.phone;
    // ?cedula= fast path: raw SQL uses (documentPrivate->>'cedula') which matches the
    // expression index directly, bypassing Prisma's #> operator that doesn't match the index.
    const isCedulaExact = !!req.query.cedula && !req.query.documentNumber && !req.query.phone;

    // For exact cedula lookups, resolve IDs via raw SQL that uses the expression index,
    // then filter the main query with id IN (...). This avoids the 16s full scan.
    let cedulaIdFilter = null;
    if (isCedulaExact && documentQ) {
      const cedula = normalizeDocument(documentQ);
      const rows = await prisma.$queryRaw`
        SELECT id FROM "ImportedHumanitarianRecord"
        WHERE ("documentPrivate"->>'cedula') = ${cedula}
           OR "contactPrivate" = ${cedula}
        LIMIT 20
      `;
      cedulaIdFilter = rows.map(r => r.id);
    }

    const where = {
      deletedAt: null,
      recordType: { in: types },
      ...(cedulaIdFilter ? { id: { in: cedulaIdFilter } } : {}),
      AND: [
        { OR: [{ verificationStatus: "APROBADO" }, { sourceName: REDAYUDA_SOURCE }] },
        ...(sourceQ ? [{ sourceName: { contains: sourceQ, mode: "insensitive" } }] : []),
        ...(!cedulaIdFilter && documentQ ? [{
          OR: [
            { documentPrivate: { path: ["cedula"], string_contains: normalizeDocument(documentQ) } },
            { contactPrivate: { contains: normalizeDocument(documentQ) } },
          ],
        }] : []),
        // Only search name columns — both have GIN trigram indexes.
        // Unindexed ILIKE on description/hospitalName/zone would force a full 189k-row scan.
        // State/municipality filtering uses the ?state= / ?municipality= params instead.
        ...(q ? [{
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }] : []),
        ...(stateQ ? [{ OR: [
          { state: { contains: stateQ, mode: "insensitive" } },
          { zone: { contains: stateQ, mode: "insensitive" } },
          { municipality: { contains: stateQ, mode: "insensitive" } },
        ] }] : []),
        ...(municipalityQ ? [{ OR: [
          { municipality: { contains: municipalityQ, mode: "insensitive" } },
          { zone: { contains: municipalityQ, mode: "insensitive" } },
        ] }] : []),
      ],
    };

    let total = null, byType = null, records;

    const findOpts = { where, select: PERSON_SELECT, orderBy: { capturedAt: "desc" }, skip, take: limit };

    if (skipCounts) {
      // Load-more path: only fetch the page, skip expensive aggregations
      records = await prisma.importedHumanitarianRecord.findMany(findOpts);
    } else {
      const cacheKey = JSON.stringify(where);
      const cached = _getCountCache(cacheKey);

      if (cached) {
        // Count cache hit: only run the page query (1 query instead of 3)
        total   = cached.total;
        byType  = cached.byType;
        records = await prisma.importedHumanitarianRecord.findMany(findOpts);
      } else {
        // Cache miss: return records immediately while populating cache in background.
        // The first response has total=null (frontend shows "Cargando..."); all subsequent
        // requests within 30 min return the cached count and are instant.
        records = await prisma.importedHumanitarianRecord.findMany(findOpts);
        Promise.all([
          prisma.importedHumanitarianRecord.count({ where }),
          prisma.importedHumanitarianRecord.groupBy({
            by: ["recordType"], where, _count: { recordType: true },
          }),
        ]).then(([cnt, grp]) => {
          _setCountCache(cacheKey, {
            total: cnt,
            byType: Object.fromEntries(grp.map(t => [t.recordType, t._count.recordType])),
          });
        }).catch(() => {}); // background — don't fail the request
      }
    }

    res.json({
      data: records.map(buildRedayudaPublicResult).filter(Boolean),
      meta: {
        total,
        page,
        limit,
        pages: total !== null ? Math.ceil(total / limit) : null,
        byType,
      },
    });
  }),

  createHospitalizedReport: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    const zone = await ensureActiveAffectedZone(body.affectedZoneId);
    const record = await prisma.importedHumanitarianRecord.create({
      data: {
        sourceName: "Reporte publico ciudadano",
        sourceUrl: "public_web_form",
        capturedAt: new Date(),
        sourceRecordId: makeCode("HSP-PUBLIC"),
        recordType: "hospitalized_person",
        fullName: body.fullName,
        approximateAge: body.approximateAge,
        gender: body.sex,
        state: zone.state,
        municipality: zone.municipality,
        zone: body.publicLocation,
        publicLocation: body.publicLocation,
        currentPlace: body.publicLocation,
        verificationStatus: "NO_VERIFICADO",
        privacyLevel: "standard",
        confidenceScore: 15,
        confidenceLevel: "low",
        confidenceFactors: ["public_submission", "requires_institutional_review"],
        publicSafe: compactObject({
          recordType: "hospitalized_person",
          fullName: body.fullName,
          approximateAge: body.approximateAge,
          gender: body.sex,
          hospitalName: body.hospitalName,
          status: "Pendiente de revision",
          zone: body.publicLocation,
          currentPlace: body.publicLocation,
          sourceName: "Reporte publico ciudadano",
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
      module: "hospitalized",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id: record.id, recordType: "hospitalized_person", captcha: req.captcha },
    });
    res.status(201).json({ data: { id: record.id, status: "pending_review" } });
  }),

  createDeceasedReport: asyncHandler(async (req, res) => {
    const body = withoutAntiSpamFields(req.validated.body);
    const zone = await ensureActiveAffectedZone(body.affectedZoneId);
    const record = await prisma.importedHumanitarianRecord.create({
      data: {
        sourceName: body.sourceReference || "Reporte publico ciudadano",
        sourceUrl: "public_web_form",
        capturedAt: new Date(),
        sourceRecordId: makeCode("DCD-PUBLIC"),
        recordType: "deceased_person",
        fullName: body.fullName,
        approximateAge: body.approximateAge,
        gender: body.sex,
        state: zone.state,
        municipality: zone.municipality,
        zone: body.publicLocation,
        publicLocation: body.publicLocation,
        verificationStatus: "NO_VERIFICADO",
        privacyLevel: "restricted",
        confidenceScore: 5,
        confidenceLevel: "low",
        confidenceFactors: ["public_submission", "requires_official_verification", "sensitive_type"],
        publicSafe: compactObject({
          recordType: "deceased_person",
          approximateAge: body.approximateAge,
          gender: body.sex,
          status: "Pendiente verificacion oficial",
          zone: body.publicLocation,
          sourceName: body.sourceReference || "Reporte publico ciudadano",
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
      module: "deceased",
      result: "SUCCESS",
      ip: req.ip,
      metadata: { id: record.id, recordType: "deceased_person", captcha: req.captcha },
    });
    res.status(201).json({ data: { id: record.id, status: "pending_review" } });
  }),
};
