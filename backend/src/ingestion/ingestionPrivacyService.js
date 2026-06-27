import { sanitizePublicPlaceText } from "../services/PublicDataSanitizer.js";

const sensitiveRecordTypes = new Set(["deceased_person_private_only"]);

function maskName(fullName, privacyLevel) {
  if (!fullName) return undefined;
  if (privacyLevel === "restricted" || privacyLevel === "private_only") return "Informacion protegida";
  return fullName.trim();
}

export function stripSensitiveText(value) {
  if (!value) return undefined;
  const text = String(value)
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[telefono protegido]")
    .replace(/\b(V|E|J|G)?-?\d{6,10}\b/gi, "[documento protegido]")
    .replace(/[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)[,\s]+[-+]?(1[0-7]\d(\.\d+)?|[1-9]?\d(\.\d+)?|180(\.0+)?)/g, "[coordenadas protegidas]")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

export class IngestionPrivacyService {
  static privacyLevelFor(record) {
    const age = Number.parseInt(record.approximateAge, 10);
    if (record.isMinor || (Number.isFinite(age) && age < 18)) return "restricted";
    if (sensitiveRecordTypes.has(record.recordType)) return "private_only";
    if (String(record.status || "").toLowerCase().includes("fallecid")) return "private_only";
    return record.privacyLevel || "standard";
  }

  static publicSafe(record) {
    const privacyLevel = this.privacyLevelFor(record);
    const privateOnly = privacyLevel === "restricted" || privacyLevel === "private_only";
    const zone = [record.zone, record.municipality, record.state].filter(Boolean).join(", ");
    const building = record.locationPrivate?.edificio || record.rawPayload?.edificio;
    const publicBuilding = sanitizePublicPlaceText(building);
    const publicZone = sanitizePublicPlaceText(zone || record.state);

    return {
      sourceName: record.sourceName,
      sourceUrl: record.sourceUrl,
      capturedAt: record.capturedAt,
      sourceRecordId: record.sourceRecordId,
      recordType: record.recordType,
      fullName: maskName(record.fullName, privacyLevel),
      approximateAge: record.approximateAge,
      gender: record.gender,
      status: privateOnly && record.recordType === "deceased_person_private_only" ? "Informacion protegida" : record.status,
      hospitalName: privateOnly ? undefined : record.hospitalName,
      state: record.state,
      municipality: record.municipality,
      building: privateOnly ? undefined : publicBuilding,
      zone: publicZone,
      lastSeenPlace: sanitizePublicPlaceText(record.lastSeenPlace || zone),
      currentPlace: sanitizePublicPlaceText(record.currentPlace || zone),
      description: privateOnly ? undefined : stripSensitiveText(record.description),
      photoUrl: privateOnly ? undefined : record.photoUrl,
      verificationStatus: record.verificationStatus || "NO_VERIFICADO",
      privacyLevel,
      possibleDuplicate: Boolean(record.possibleDuplicate),
      duplicateScore: record.duplicateScore,
      updatedAt: record.capturedAt,
    };
  }

  static apply(record) {
    const privacyLevel = this.privacyLevelFor(record);
    return {
      ...record,
      privacyLevel,
      publicSafe: this.publicSafe({ ...record, privacyLevel }),
    };
  }
}
