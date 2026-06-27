import { randomUUID } from "node:crypto";
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
]);

function pick(raw, keys) {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== "") return raw[key];
  }
  return undefined;
}

function detectType(raw) {
  const text = JSON.stringify(raw || {}).toLowerCase();
  if (text.includes("fallecid") || text.includes("deceased")) return "deceased_person_private_only";
  if (text.includes("desaparecid") || text.includes("missing")) return "missing_person";
  if (text.includes("hospitaliz") || text.includes("ingreso")) return "hospitalized_person";
  if (text.includes("atrapad")) return "trapped_person";
  if (text.includes("a salvo") || text.includes("safe")) return "safe_person";
  if (text.includes("rescatad")) return "rescued_person";
  if (text.includes("refugio")) return "shelter";
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
    const normalized = {
      sourceName: source.name,
      sourceUrl: source.url,
      capturedAt,
      sourceRecordId: String(pick(raw, ["id", "sourceRecordId", "uuid", "code"]) || randomUUID()),
      recordType: allowedTypes.has(recordType) ? recordType : "damage_report",
      fullName: pick(raw, ["fullName", "name", "nombre", "persona"]),
      approximateAge: String(pick(raw, ["approximateAge", "age", "edad"]) || "").trim() || undefined,
      gender: pick(raw, ["gender", "sex", "sexo"]),
      status,
      hospitalName: pick(raw, ["hospitalName", "hospital"]),
      state: pick(raw, ["state", "estado"]),
      municipality: pick(raw, ["municipality", "municipio"]),
      zone: pick(raw, ["zone", "sector", "zona", "parroquia"]),
      lastSeenPlace: pick(raw, ["lastSeenPlace", "ultimoLugar", "last_seen"]),
      currentPlace: pick(raw, ["currentPlace", "ubicacion", "current_place"]),
      description: stripSensitiveText(pick(raw, ["description", "descripcion", "details", "observaciones"])),
      photoUrl: pick(raw, ["photoUrl", "photo", "foto", "image"]),
      contactInfoPrivate: pick(raw, ["contactInfoPrivate", "contact", "telefono", "phone"]),
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
