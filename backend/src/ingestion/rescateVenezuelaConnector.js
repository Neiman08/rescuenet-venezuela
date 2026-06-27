const statusMap = new Map([
  ["desaparecido", "missing_person"],
  ["desaparecida", "missing_person"],
  ["rescatado", "rescued_person"],
  ["rescatada", "rescued_person"],
  ["ubicado", "safe_person"],
  ["ubicada", "safe_person"],
  ["hospitalizado", "hospitalized_person"],
  ["hospitalizada", "hospitalized_person"],
  ["atrapado", "trapped_person"],
  ["atrapada", "trapped_person"],
  ["fallecido", "deceased_person_private_only"],
  ["fallecida", "deceased_person_private_only"],
]);

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return text(String(value || "").replace(/<!--\s*-->/g, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeKey(key) {
  return String(key || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function recordTypeForStatus(status) {
  const normalized = normalizeKey(status);
  for (const [key, recordType] of statusMap.entries()) {
    if (normalized.includes(normalizeKey(key))) return recordType;
  }
  return "missing_person";
}

function findValue(object, possibleKeys) {
  if (!object || typeof object !== "object") return undefined;
  const normalizedKeys = new Map(Object.keys(object).map((key) => [normalizeKey(key), key]));
  for (const key of possibleKeys) {
    const realKey = normalizedKeys.get(normalizeKey(key));
    if (realKey && object[realKey] !== undefined && object[realKey] !== null && object[realKey] !== "") return object[realKey];
  }
  return undefined;
}

function collectObjects(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const keys = Object.keys(value).map(normalizeKey);
  const looksLikePerson = ["nombre", "fullname", "cedula", "telefono", "estado", "edad", "municipio", "edificio"].some((key) => keys.includes(key));
  if (looksLikePerson) output.push(value);
  for (const item of Object.values(value)) collectObjects(item, output);
  return output;
}

function parseJsonBlocks(html) {
  const records = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      records.push(...collectObjects(JSON.parse(decodeEntities(match[1]))));
    } catch {
      // Ignore malformed public JSON blocks.
    }
  }
  const nextData = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextData) {
    try {
      records.push(...collectObjects(JSON.parse(decodeEntities(nextData[1]))));
    } catch {
      // Ignore malformed Next payloads.
    }
  }
  return records;
}

function parseLabeledHtml(html) {
  const cards = [
    ...(html.match(/<a[^>]+href=["']\/persona\/[^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || []),
    ...(html.match(/<(?:article|li|div)[^>]*(?:class|id)=["'][^"']*(?:persona|desaparecid|card|registro|post)[^"']*["'][^>]*>[\s\S]*?<\/(?:article|li|div)>/gi) || []),
  ];
  return cards.map((card, index) => {
    const plain = stripHtml(card);
    const href = card.match(/href=["']([^"']+)["']/i)?.[1];
    const imageName = decodeEntities(card.match(/<img[^>]+alt=["']([^"']+)["']/i)?.[1]);
    const title = decodeEntities(card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
    const badge = stripHtml(card.match(/<span[^>]*class=["'][^"']*badge[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]);
    const iconField = (icon) => stripHtml(card.match(new RegExp(`lucide-${icon}[\\s\\S]*?<span[^>]*>([\\s\\S]*?)<\\/span>`, "i"))?.[1]);
    const buildingLine = iconField("building2");
    const document = iconField("id-card") || plain.match(/\b(V|E|J|G)?-?\d{6,10}\b/i)?.[0];
    const ageSex = iconField("calendar").match(/(\d{1,3})\s*años?\s*·\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/i) || plain.match(/(\d{1,3})\s*años?\s*·\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/i);
    const phone = iconField("phone") || plain.match(/\+?\d[\d\s().-]{7,}\d/)?.[0];
    const building = cleanPublicLocationPart(buildingLine);
    const floor = text(buildingLine.match(/Piso\s+([^+]*?)(?=\s+(?:V|E|J|G)?-?\d{6,10}\b|\s+\d{1,3}\s*años|\s+\+?\d[\d\s().-]{7,}\d|$)/i)?.[1]);
    const field = (label) => {
      const match = plain.match(new RegExp(`${label}\\s*:?\\s*([^|\\n\\r]+?)(?=\\s+(?:Nombre|C[eé]dula|Edad|Sexo|Estado|Municipio|Edificio|Piso|Apartamento|Tel[eé]fono|Contacto|Observaciones|Alergias|$))`, "i"));
      return text(match?.[1]);
    };
    return {
      id: href || `html-card-${index}`,
      nombre: field("Nombre") || stripHtml(title) || imageName || plain.split(/\s{2,}| - /)[0],
      cedula: field("C[eé]dula") || document,
      edad: field("Edad") || ageSex?.[1],
      sexo: field("Sexo") || ageSex?.[2],
      status: field("Estado") || badge,
      municipio: field("Municipio"),
      edificio: field("Edificio") || building,
      piso: field("Piso") || floor,
      apartamento: field("Apartamento"),
      telefono: field("Tel[eé]fono") || phone,
      contacto: field("Contacto"),
      observaciones: field("Observaciones"),
      alergias: field("Alergias"),
      url: href,
      rawText: plain,
    };
  }).filter((record) => record.nombre && record.nombre.length > 3);
}

function cleanPublicLocationPart(value) {
  return text(value)
    ?.replace(/^Edificio\s+/i, "")
    .replace(/\s*[·•]\s*(?:Piso|Apartamento|Apto|Casa|#|Nro|Numero|\d).*/i, "")
    .replace(/\s*[·•]\s*$/g, "")
    .trim();
}

function normalizeRawRecord(raw, source, index) {
  const status = findValue(raw, ["estado", "status", "situacion", "situación", "condition"]);
  const recordUrl = findValue(raw, ["url", "recordUrl", "link", "permalink"]);
  return {
    id: findValue(raw, ["id", "uuid", "codigo", "código"]) || recordUrl || `rescate-venezuela-${index}`,
    sourceRecordId: findValue(raw, ["id", "uuid", "codigo", "código"]) || recordUrl || `rescate-venezuela-${index}`,
    recordUrl: recordUrl ? new URL(recordUrl, source.url).toString() : source.url,
    recordType: recordTypeForStatus(status),
    nombre: findValue(raw, ["nombre", "fullName", "name", "persona"]),
    cedula: findValue(raw, ["cedula", "cédula", "documento", "documentNumber"]),
    edad: findValue(raw, ["edad", "age"]),
    sexo: findValue(raw, ["sexo", "sex", "genero", "género"]),
    status,
    state: findValue(raw, ["estadoResidencia", "state", "entidad"]),
    municipio: findValue(raw, ["municipio", "municipality"]),
    zona: findValue(raw, ["zona", "sector", "parroquia"]),
    edificio: findValue(raw, ["edificio", "building"]),
    piso: findValue(raw, ["piso", "floor"]),
    apartamento: findValue(raw, ["apartamento", "apto", "apartment"]),
    telefono: findValue(raw, ["telefono", "teléfono", "telefonos", "teléfonos", "phone"]),
    contacto: findValue(raw, ["contacto", "contact", "contactInfo"]),
    observaciones: findValue(raw, ["observaciones", "observacion", "descripcion", "description", "notes"]),
    informacionMedica: findValue(raw, ["informacionMedica", "información médica", "medicalInfo", "salud"]),
    alergias: findValue(raw, ["alergias", "allergies"]),
    publishedAt: findValue(raw, ["fechaPublicacion", "fecha de publicación", "publishedAt", "createdAt"]),
    updatedAt: findValue(raw, ["fechaActualizacion", "fecha de actualización", "updatedAt", "modifiedAt"]),
    rawPayload: raw,
  };
}

export async function fetchRescateVenezuela(source) {
  const response = await fetch(source.url, {
    headers: {
      accept: "text/html,application/json,*/*",
      "user-agent": "RescueNetVenezuela-HumanitarianIngestion/0.1",
    },
  });
  const html = await response.text();
  if (/recaptcha|g-recaptcha|hcaptcha|cf-challenge|turnstile/i.test(html) || [401, 403, 429].includes(response.status)) {
    return {
      kind: "html",
      records: [],
      blocked: true,
      warning: "Source appears protected. RescueNet did not attempt to bypass CAPTCHA or access controls.",
    };
  }
  const records = [...parseJsonBlocks(html), ...parseLabeledHtml(html)]
    .map((record, index) => normalizeRawRecord(record, source, index))
    .filter((record) => record.nombre || record.cedula || record.telefono || record.observaciones);

  return { kind: "html", records };
}
