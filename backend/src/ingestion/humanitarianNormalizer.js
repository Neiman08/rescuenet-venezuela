import { randomUUID } from "node:crypto";
import { CollectionCenterNormalizer } from "./collectionCenterNormalizer.js";
import { IngestionPrivacyService, stripSensitiveText } from "./ingestionPrivacyService.js";

const allowedTypes = new Set([
  "missing_person",
  "hospitalized_person",
  "trapped_person",
  "safe_person",
  "rescued_person",
  "deceased_person_private_only",
  "hospital",
  "shelter",
  "help_center",
  "emergency_phone",
  "damage_report",
  "donation_need",
  "volunteer_offer",
  "pet_missing",
  "collection_center",
  "water_point",
  "food_point",
  "medical_point",
  "volunteer_center",
]);

function pick(raw, keys) {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== "") return raw[key];
  }
  return undefined;
}

function privateObject(raw, keys) {
  const entries = {};
  for (const key of keys) {
    const value = pick(raw, [key]);
    if (value !== undefined) entries[key] = value;
  }
  return Object.keys(entries).length ? entries : undefined;
}

function detectType(raw) {
  if (allowedTypes.has(raw?.recordType)) return raw.recordType;
  const text = JSON.stringify(raw || {}).toLowerCase();
  if (text.includes("fallecid") || text.includes("deceased")) return "deceased_person_private_only";
  if (text.includes("desaparecid") || text.includes("missing")) return "missing_person";
  if (text.includes("hospitaliz") || text.includes("ingreso")) return "hospitalized_person";
  if (text.includes("atrapad")) return "trapped_person";
  if (text.includes("a salvo") || text.includes("safe")) return "safe_person";
  if (text.includes("rescatad")) return "rescued_person";
  if (text.includes("refugio")) return "shelter";
  if (text.includes("acopio") || text.includes("donacion") || text.includes("donación")) return "collection_center";
  if (text.includes("agua")) return "water_point";
  if (text.includes("comida") || text.includes("alimento")) return "food_point";
  if (text.includes("medicina") || text.includes("salud") || text.includes("medico") || text.includes("médico")) return "medical_point";
  if (text.includes("volunt")) return "volunteer_center";
  if (text.includes("hospital")) return "hospital";
  if (text.includes("centro")) return "help_center";
  return raw?.recordType || raw?.type || "damage_report";
}

export class HumanitarianNormalizer {
  static normalize(raw, source) {
    const capturedAt = new Date().toISOString();
    let recordType = detectType(raw);
    const status = pick(raw, ["status", "estado", "condition"]);
    if (String(status || "").toLowerCase().includes("fallecid")) recordType = "deceased_person_private_only";
    if (["collection_center", "shelter", "hospital", "help_center", "water_point", "food_point", "medical_point", "volunteer_center", "donation_need"].includes(recordType)) {
      return CollectionCenterNormalizer.normalize(raw, source);
    }
    const normalized = {
      sourceName: source.name,
      sourceUrl: source.url,
      capturedAt,
      sourceRecordId: String(pick(raw, ["id", "sourceRecordId", "uuid", "code", "registroId", "recordUrl", "url"]) || randomUUID()),
      recordType: allowedTypes.has(recordType) ? recordType : "damage_report",
      fullName: pick(raw, ["fullName", "name", "nombre", "persona"]),
      approximateAge: String(pick(raw, ["approximateAge", "age", "edad"]) || "").trim() || undefined,
      gender: pick(raw, ["gender", "sex", "sexo"]),
      status,
      hospitalName: pick(raw, ["hospitalName", "hospital"]),
      state: pick(raw, ["state", "estado"]),
      municipality: pick(raw, ["municipality", "municipio"]),
      zone: pick(raw, ["zone", "sector", "zona", "parroquia", "edificio"]),
      lastSeenPlace: pick(raw, ["lastSeenPlace", "ultimoLugar", "last_seen"]),
      currentPlace: pick(raw, ["currentPlace", "ubicacion", "current_place"]),
      description: stripSensitiveText(pick(raw, ["description", "descripcion", "details", "observaciones"])),
      photoUrl: pick(raw, ["photoUrl", "photo", "foto", "image"]),
      contactInfoPrivate: pick(raw, ["contactInfoPrivate", "contact", "contacto", "telefono", "telefonos", "teléfonos", "phone"]),
      documentPrivate: privateObject(raw, ["documentPrivate", "cedula", "cédula", "documento", "documentNumber", "documentId"]),
      medicalPrivate: privateObject(raw, ["medicalPrivate", "informacionMedica", "información médica", "medicalInfo", "alergias", "allergies"]),
      locationPrivate: privateObject(raw, ["locationPrivate", "edificio", "piso", "apartamento", "direccion", "dirección", "address"]),
      verificationStatus: "NO_VERIFICADO",
      privacyLevel: pick(raw, ["privacyLevel"]) || "standard",
      possibleDuplicate: false,
      duplicateScore: undefined,
      matchedRecordId: undefined,
      rawPayload: raw,
    };

    return IngestionPrivacyService.apply(normalized);
  }

  static normalizeMany(records, source) {
    return records.map((record) => this.normalize(record, source));
  }
}
