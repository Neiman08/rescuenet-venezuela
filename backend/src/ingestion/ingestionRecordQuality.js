const noisePattern = /(@font-face|font-family|unicode-range|box-sizing|technical storage|anonymous statistical|without a subpoena|cookie|consent|googletagmanager|stripe\.com|mui-|wp-content\/cache|xmlrpc\.php|yoast\.com|__next_data__)/i;
const locationPattern = /(caracas|miranda|vargas|la guaira|zulia|táchira|tachira|mérida|merida|barinas|lara|valencia|maracay|municipio|parroquia|sector|zona|hospital|refugio|centro|acopio)/i;
const humanitarianPattern = /(desaparecid|hospitaliz|atrapad|rescatad|a salvo|refugio|acopio|ayuda|agua|alimento|comida|medicina|voluntar|donaci[oó]n|emergencia|damnificad|herid)/i;

function asText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function compactPayload(record) {
  return asText(JSON.stringify(record || {}));
}

export function containsIngestionNoise(value) {
  return noisePattern.test(asText(value));
}

export function isUsefulRawRecord(record) {
  const payload = compactPayload(record);
  if (!payload || containsIngestionNoise(payload)) return false;

  const structuredKeys = [
    "fullName",
    "name",
    "nombre",
    "persona",
    "hospital",
    "hospitalName",
    "estado",
    "state",
    "municipio",
    "municipality",
    "zona",
    "zone",
    "sector",
    "status",
    "currentPlace",
    "lastSeenPlace",
    "publicLocation",
    "direccion",
    "address",
    "organization",
    "organizacion",
    "acceptedItems",
    "recibe",
    "needs",
  ];
  const keyMatches = structuredKeys.filter((key) => record?.[key] !== undefined && record?.[key] !== null && String(record[key]).trim() !== "").length;
  if (keyMatches >= 2) return true;

  const description = asText(record?.description || record?.descripcion || record?.details);
  if (!description || description.length > 800) return false;
  return humanitarianPattern.test(description) && locationPattern.test(description);
}

export function isUsefulLine(line) {
  const text = asText(line);
  if (text.length < 12 || text.length > 260 || containsIngestionNoise(text)) return false;
  return humanitarianPattern.test(text) && locationPattern.test(text);
}

export function isImportableHumanitarianRecord(record) {
  const payload = compactPayload(record);
  if (!payload || containsIngestionNoise(payload)) return false;

  const name = asText(record.fullName || record.name);
  if (name.length > 180 || containsIngestionNoise(name)) return false;

  const description = asText(record.description);
  if (description.length > 1200 || containsIngestionNoise(description)) return false;

  const location = asText([
    record.state,
    record.municipality,
    record.zone,
    record.hospitalName,
    record.currentPlace,
    record.lastSeenPlace,
    record.publicLocation,
  ].filter(Boolean).join(" "));
  const hasOperationalLocation = Boolean(location && !/^["“”'`]/.test(location) && locationPattern.test(location));
  const hasOperationalDetails = Boolean(record.organization || record.operatingHours || record.acceptedItems?.length);

  const centerTypes = new Set(["collection_center", "shelter", "hospital", "help_center", "water_point", "food_point", "medical_point", "volunteer_center", "donation_need"]);
  if (centerTypes.has(record.recordType)) {
    return Boolean(name && (hasOperationalDetails || hasOperationalLocation || record.recordType === "hospital"));
  }

  const personTypes = new Set(["missing_person", "hospitalized_person", "trapped_person", "safe_person", "rescued_person", "deceased_person_private_only"]);
  if (personTypes.has(record.recordType)) {
    return Boolean(name || record.hospitalName || ((record.status || description) && location));
  }

  if (record.recordType === "damage_report") {
    return Boolean(description && locationPattern.test(`${description} ${location}`));
  }

  return Boolean(name || location);
}
