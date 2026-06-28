import { parseCsv } from "./csvConnector.js";
import { fetchExcel } from "./excelConnector.js";

const DEFAULT_FOLDER_URL = "https://drive.google.com/drive/mobile/folders/1o36ifaRz45kAs5rKzci49aD0mP5JB_YI";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PDF_MIME = "application/pdf";
const IMAGE_MIME_PREFIX = "image/";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_FILES = 250;
const DEFAULT_MAX_RECORDS = 10_000;

function numericOption(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return undefined;
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function fileUrl(id) {
  return `https://drive.google.com/file/d/${id}/view`;
}

function folderUrl(id) {
  return `https://drive.google.com/drive/mobile/folders/${id}`;
}

function documentExportUrl(id) {
  return `https://docs.google.com/document/d/${id}/export?format=txt`;
}

function sheetExportUrl(id, format = "csv") {
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=${format}`;
}

function downloadUrl(id) {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

async function fetchText(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 RescueNet public humanitarian ingestion" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Google Drive source returned ${response.status}`);
  return response.text();
}

function inferMime(label = "", context = "") {
  const text = `${label} ${context}`.toLowerCase();
  if (text.includes("shared folder")) return FOLDER_MIME;
  if (text.includes("google docs")) return DOC_MIME;
  if (text.includes("google sheets")) return SHEET_MIME;
  if (text.includes("pdf")) return PDF_MIME;
  if (/\.(csv)\b/i.test(label)) return "text/csv";
  if (/\.(xlsx|xls)\b/i.test(label)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.(json)\b/i.test(label)) return "application/json";
  if (/\.(png|jpe?g|webp)\b/i.test(label)) return "image/*";
  return undefined;
}

export function extractDriveItems(html) {
  const cards = String(html || "").match(/<div class="JxSEve"[\s\S]*?(?=<div class="JxSEve"|<\/body>|$)/g) || [];
  const items = cards.map((card) => {
    const id = card.match(/data-id="([^"]+)"/)?.[1];
    const name = decodeHtml(card.match(/<strong class="DNoYtb">([\s\S]*?)<\/strong>/)?.[1]);
    const aria = decodeHtml(card.match(/aria-label="([^"]+)"/)?.[1]);
    const tooltip = decodeHtml(card.match(/data-tooltip="([^"]+)"/)?.[1]);
    const context = decodeHtml(card);
    const mimeType = inferMime(`${name} ${aria} ${tooltip}`, context);
    return id && name ? { id, name, aria, tooltip, mimeType, url: mimeType === FOLDER_MIME ? folderUrl(id) : fileUrl(id) } : null;
  }).filter(Boolean);

  const tupleMatches = [...String(html || "").matchAll(/\\x5b\\x22([^"\\]+)\\x22,\s*\\x5b\\x22[^"\\]+\\x22\\x5d,\s*\\x22([^"\\]+)\\x22,\s*\\x22([^"\\]+)\\x22/g)];
  for (const match of tupleMatches) {
    const [, id, encodedName, encodedMime] = match;
    if (items.some((item) => item.id === id)) continue;
    const name = decodeHtml(encodedName);
    const mimeType = decodeHtml(encodedMime).replace("\\/", "/");
    if (id && name) items.push({ id, name, mimeType, url: mimeType === FOLDER_MIME ? folderUrl(id) : fileUrl(id) });
  }

  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const headerAliases = {
  fullName: ["nombreyapellido", "nombresyapellidos", "apellidosynombres", "apellidonombre", "nombrecompleto", "paciente", "fullname"],
  firstName: ["nombre", "nombres", "primernombre"],
  lastName: ["apellido", "apellidos", "segundonombre", "apellidosegundonombre", "apellidosegundonombres"],
  age: ["edad", "edadactualizada", "age"],
  gender: ["sexo", "genero", "gender"],
  hospital: ["hospital", "centro", "centromedico", "centrodesalud"],
  municipality: ["municipio", "municipality"],
  city: ["ciudad", "city"],
  state: ["estado", "entidad", "state"],
  zone: ["zona", "sector", "ubicacion", "ubicacionpublica"],
  condition: ["condicion", "condition", "diagnostico", "diagnosticoobservacion"],
  status: ["estatus", "status", "situacion"],
  cedula: ["cedula", "documento", "documentnumber", "identificacion"],
  room: ["habitacion", "room"],
  bed: ["cama", "bed"],
  floor: ["piso", "floor"],
  observations: ["observaciones", "observacion", "observations", "nota", "notas"],
};

const normalizedHeaderTokens = new Set([
  "nombre",
  "nombres",
  "nombre apellido",
  "nombre y apellido",
  "nombres y apellidos",
  "apellido",
  "apellidos",
  "segundo nombre",
  "apellido segundo nombre",
  "apellido segundo nombres",
  "apellido nombre",
  "edad",
  "edad actualizada",
  "sexo",
  "estado",
  "hospital",
  "municipio",
  "ciudad",
  "observaciones",
  "observacion",
  "condicion",
  "diagnostico",
  "estatus",
  "zona",
  "sector",
].map(normalizeText));

function isHeaderText(value) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (normalizedHeaderTokens.has(normalized)) return true;
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => normalizedHeaderTokens.has(word));
}

function meaningful(value) {
  const text = String(value ?? "").trim();
  return text && !isHeaderText(text) ? text : undefined;
}

function headerKeyFor(header) {
  const normalized = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(headerAliases)) {
    if (aliases.includes(normalized)) return field;
  }
  return undefined;
}

function mapRow(row) {
  const mapped = {};
  for (const [header, value] of Object.entries(row || {})) {
    const field = headerKeyFor(header);
    const clean = meaningful(value);
    if (field && clean && !mapped[field]) mapped[field] = clean;
  }
  return mapped;
}

function compactName(...parts) {
  return parts
    .map((part) => meaningful(part))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmptyRow(row) {
  return Object.values(row || {}).every((value) => String(value ?? "").trim() === "");
}

function duplicateKey(record) {
  return normalizeText([record.fullName, record.hospitalName, record.approximateAge].filter(Boolean).join("|"));
}

function recordFromRow(row, file, index) {
  if (isEmptyRow(row)) return null;
  const mapped = mapRow(row);
  const fullName = compactName(mapped.firstName, mapped.lastName) || meaningful(mapped.fullName);
  if (!fullName || fullName.length < 2 || isHeaderText(fullName)) return null;
  const publicZone = compactName(mapped.municipality, mapped.city, mapped.state) || "Zona general protegida";
  return {
    id: `${file.id}-${index}`,
    sourceRecordId: `${file.id}-${index}`,
    recordUrl: file.url,
    recordType: "hospitalized_person",
    fullName,
    approximateAge: mapped.age,
    gender: mapped.gender,
    cedula: mapped.cedula,
    hospitalName: mapped.hospital,
    condition: mapped.condition,
    status: mapped.status || "Hospitalizado",
    state: mapped.state,
    municipality: mapped.municipality,
    zone: publicZone,
    room: mapped.room,
    bed: mapped.bed,
    floor: mapped.floor,
    observations: mapped.observations,
    sourceFileName: file.name,
    sourceUrl: file.url,
    rawPayload: row,
  };
}

export function parseHospitalAdmissionText(text, file = { id: "text", name: "source", url: undefined }, { maxRecords = DEFAULT_MAX_RECORDS } = {}) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const records = [];
  const headerWords = new Set(["n°", "nº", "no", "hospital", "apellidos y nombres", "apellidos", "nombres", "edad"]);

  for (let index = 0; index < lines.length; index += 1) {
    if (records.length >= maxRecords) break;
    const line = lines[index];
    if (!/^\d{1,5}\b/.test(line)) continue;
    const previousLine = lines[index - 1] || "";
    if (index > 0 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(previousLine) && !/hospital|nombre|edad/i.test(previousLine) && Number(line) <= 130) continue;

    const afterNumber = line.replace(/^\d{1,5}\s*/, "").trim();
    let hospitalName;
    let fullName;
    let approximateAge;

    const sameLine = afterNumber.match(/^(Hospital|Cl[ií]nica|Centro|Ambulatorio)\s+(.+?)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ' -]{3,})\s+(\d{1,3})$/i);
    if (sameLine) {
      hospitalName = `${sameLine[1]} ${sameLine[2]}`.trim();
      fullName = sameLine[3].trim();
      approximateAge = sameLine[4];
    } else {
      const chunk = [];
      for (let cursor = index + 1; cursor < Math.min(lines.length, index + 8); cursor += 1) {
        if (/^\d{1,5}\b/.test(lines[cursor]) && !(Number(lines[cursor]) <= 130 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(lines[cursor - 1] || ""))) break;
        if (!headerWords.has(lines[cursor].toLowerCase())) chunk.push(lines[cursor]);
      }
      hospitalName = chunk.find((item) => /^(Hospital|Cl[ií]nica|Centro|Ambulatorio)\b/i.test(item));
      approximateAge = chunk.find((item) => /^\d{1,3}$/.test(item));
      fullName = chunk.find((item) => item !== hospitalName && item !== approximateAge && /[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}/.test(item));
    }

    if (!fullName) continue;
    records.push({
      id: `${file.id}-${records.length + 1}`,
      sourceRecordId: `${file.id}-${records.length + 1}`,
      recordUrl: file.url,
      recordType: "hospitalized_person",
      fullName,
      approximateAge,
      hospitalName,
      status: "Hospitalizado",
      sourceFileName: file.name,
      sourceUrl: file.url,
      rawPayload: { line, nearbyLines: lines.slice(index, index + 8), sourceFileName: file.name },
    });
  }

  return records;
}

export function parseHospitalAdmissionRows(rows, file = { id: "rows", name: "source", url: undefined }, { maxRecords = DEFAULT_MAX_RECORDS } = {}) {
  const seen = new Set();
  const records = [];
  for (let index = 0; index < rows.length && records.length < maxRecords; index += 1) {
    const record = recordFromRow(rows[index], file, index + 1);
    if (!record) continue;
    const key = duplicateKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    records.push(record);
  }
  return records;
}

async function parseTabularFile(file, rows, { maxRecords = DEFAULT_MAX_RECORDS } = {}) {
  return parseHospitalAdmissionRows(rows, file, { maxRecords });
}

async function parseDriveFile(file, { timeoutMs = DEFAULT_TIMEOUT_MS, maxRecords = DEFAULT_MAX_RECORDS } = {}) {
  const mime = file.mimeType || "";
  if (mime === FOLDER_MIME) return { records: [], unparseable: [] };
  if (mime === DOC_MIME) {
    const text = await fetchText(documentExportUrl(file.id), { timeoutMs });
    return { records: parseHospitalAdmissionText(text, { ...file, url: documentExportUrl(file.id) }, { maxRecords }), unparseable: [] };
  }
  if (mime === SHEET_MIME) {
    const rows = parseCsv(await fetchText(sheetExportUrl(file.id, "csv"), { timeoutMs }));
    return { records: await parseTabularFile({ ...file, url: sheetExportUrl(file.id, "csv") }, rows, { maxRecords }), unparseable: [] };
  }
  if (mime.includes("spreadsheet") || /\.xlsx?$/i.test(file.name)) {
    const rows = await fetchExcel(downloadUrl(file.id));
    return { records: await parseTabularFile({ ...file, url: downloadUrl(file.id) }, rows, { maxRecords }), unparseable: [] };
  }
  if (mime.includes("csv") || /\.csv$/i.test(file.name)) {
    const rows = parseCsv(await fetchText(downloadUrl(file.id), { timeoutMs }));
    return { records: await parseTabularFile({ ...file, url: downloadUrl(file.id) }, rows, { maxRecords }), unparseable: [] };
  }
  if (mime.includes("json") || /\.json$/i.test(file.name)) {
    const payload = JSON.parse(await fetchText(downloadUrl(file.id), { timeoutMs }));
    const rows = Array.isArray(payload) ? payload : payload.records || payload.data || [];
    return { records: await parseTabularFile({ ...file, url: downloadUrl(file.id) }, rows, { maxRecords }), unparseable: [] };
  }
  if (mime === PDF_MIME || mime.startsWith(IMAGE_MIME_PREFIX) || /\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
    return { records: [], unparseable: [{ ...file, reason: "PDF/image detected; OCR is intentionally not performed automatically." }] };
  }
  return { records: [], unparseable: [{ ...file, reason: `Unsupported Google Drive file type: ${mime || "unknown"}` }] };
}

async function listDriveFolder(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}, depth = 0, seen = new Set()) {
  if (depth > 3 || seen.has(url)) return [];
  seen.add(url);
  const html = await fetchText(url, { timeoutMs });
  const items = extractDriveItems(html);
  const nested = [];
  for (const item of items.filter((entry) => entry.mimeType === FOLDER_MIME)) {
    nested.push(...await listDriveFolder(folderUrl(item.id), { timeoutMs }, depth + 1, seen));
  }
  return [...items, ...nested];
}

export async function fetchGoogleDriveHospitalAdmissions(source) {
  const rootUrl = source.url || DEFAULT_FOLDER_URL;
  const timeoutMs = numericOption(source.timeoutMs, process.env.GOOGLE_DRIVE_FETCH_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const maxFiles = numericOption(source.maxFiles, process.env.GOOGLE_DRIVE_MAX_FILES, DEFAULT_MAX_FILES);
  const maxRecords = numericOption(source.maxRecords, process.env.GOOGLE_DRIVE_MAX_RECORDS, DEFAULT_MAX_RECORDS);
  const files = (await listDriveFolder(rootUrl, { timeoutMs })).slice(0, maxFiles);
  const records = [];
  const unparseable = [];
  const seenRecords = new Set();

  for (const file of files) {
    if (records.length >= maxRecords) break;
    if (file.mimeType === FOLDER_MIME) continue;
    try {
      const parsed = await parseDriveFile(file, { timeoutMs, maxRecords: maxRecords - records.length });
      for (const record of parsed.records) {
        const key = duplicateKey(record);
        if (seenRecords.has(key)) continue;
        seenRecords.add(key);
        records.push(record);
        if (records.length >= maxRecords) break;
      }
      unparseable.push(...parsed.unparseable);
    } catch (error) {
      unparseable.push({ ...file, reason: error.message });
    }
  }

  return {
    kind: "google-drive-hospital-admissions",
    records,
    files,
    unparseable,
  };
}
