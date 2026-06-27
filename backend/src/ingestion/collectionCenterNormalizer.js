import { randomUUID } from "node:crypto";
import { sanitizePublicPlaceText } from "../services/PublicDataSanitizer.js";
import { stripSensitiveText } from "./ingestionPrivacyService.js";

const centerTypes = new Set([
  "collection_center",
  "shelter",
  "hospital",
  "help_center",
  "water_point",
  "food_point",
  "medical_point",
  "volunteer_center",
  "donation_need",
]);

function pick(raw, keys) {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== "") return raw[key];
  }
  return undefined;
}

function detectCenterType(raw) {
  const text = JSON.stringify(raw || {}).toLowerCase();
  if (text.includes("acopio") || text.includes("donacion") || text.includes("donación")) return "collection_center";
  if (text.includes("refugio") || text.includes("alojamiento")) return "shelter";
  if (text.includes("hospital")) return "hospital";
  if (text.includes("agua")) return "water_point";
  if (text.includes("comida") || text.includes("alimento")) return "food_point";
  if (text.includes("medicina") || text.includes("salud") || text.includes("medico") || text.includes("médico")) return "medical_point";
  if (text.includes("volunt")) return "volunteer_center";
  if (text.includes("necesita") || text.includes("urgente")) return "donation_need";
  return raw?.recordType || raw?.type || "help_center";
}

function normalizeItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value)
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export class CollectionCenterNormalizer {
  static normalize(raw, source) {
    const recordType = detectCenterType(raw);
    const name = pick(raw, ["name", "nombre", "centerName", "centro", "title", "titulo"]);
    const organization = pick(raw, ["organization", "organizacion", "organización", "ong", "responsable"]);
    const state = pick(raw, ["state", "estado"]);
    const municipality = pick(raw, ["municipality", "municipio"]);
    const parish = pick(raw, ["parish", "parroquia"]);
    const zone = pick(raw, ["zone", "zona", "sector"]);
    const addressPrivate = pick(raw, ["addressPrivate", "address", "direccion", "dirección", "ubicacion", "ubicación"]);
    const publicLocation = sanitizePublicPlaceText(pick(raw, ["publicLocation", "zonaPublica", "zona_publica"]) || [zone, parish, municipality, state].filter(Boolean).join(", ") || addressPrivate);

    const normalized = {
      sourceName: source.name,
      sourceUrl: source.url,
      capturedAt: new Date().toISOString(),
      sourceRecordId: String(pick(raw, ["id", "sourceRecordId", "uuid", "code"]) || randomUUID()),
      recordType: centerTypes.has(recordType) ? recordType : "help_center",
      name: name || organization || "Centro humanitario por verificar",
      organization,
      state,
      municipality,
      parish,
      zone,
      addressPrivate,
      publicLocation,
      latitudePrivate: pick(raw, ["latitudePrivate", "lat", "latitude"]),
      longitudePrivate: pick(raw, ["longitudePrivate", "lng", "lon", "longitude"]),
      acceptedItems: normalizeItems(pick(raw, ["acceptedItems", "items", "recibe", "necesita", "needs"])),
      operatingHours: pick(raw, ["operatingHours", "hours", "horario"]),
      contactPrivate: pick(raw, ["contactPrivate", "contact", "telefono", "phone", "whatsapp"]),
      verificationStatus: "NO_VERIFICADO",
      operationalStatus: pick(raw, ["operationalStatus", "status", "estadoOperativo"]) || "NO_VERIFICADO",
      privacyLevel: "standard",
      possibleDuplicate: false,
      duplicateScore: undefined,
      matchedRecordId: undefined,
      description: stripSensitiveText(pick(raw, ["description", "descripcion", "details", "observaciones"])),
      rawPayload: raw,
    };

    return {
      ...normalized,
      publicSafe: this.publicSafe(normalized),
    };
  }

  static publicSafe(record) {
    return {
      sourceName: record.sourceName,
      sourceUrl: record.sourceUrl,
      capturedAt: record.capturedAt,
      sourceRecordId: record.sourceRecordId,
      recordType: record.recordType,
      name: record.name,
      organization: record.organization,
      state: record.state,
      municipality: record.municipality,
      parish: record.parish,
      zone: record.publicLocation || [record.zone, record.municipality, record.state].filter(Boolean).join(", "),
      publicLocation: record.publicLocation,
      acceptedItems: record.acceptedItems,
      operatingHours: record.operatingHours,
      operationalStatus: record.operationalStatus,
      verificationStatus: record.verificationStatus,
      description: stripSensitiveText(record.description),
      updatedAt: record.capturedAt,
    };
  }

  static normalizeMany(records, source) {
    return records.map((record) => this.normalize(record, source));
  }
}
