/**
 * Importador federado de Redayuda (eriktaveras/redayuda).
 *
 * Consume la API pública de Redayuda como fuente externa y mapea sus registros
 * al modelo ImportedHumanitarianRecord de RescateVZLA.
 *
 * Modos:
 *   dry-run  — analiza registros y genera reporte sin escribir en la DB.
 *   apply    — escribe registros en la DB con deduplicación por sourceRecordId.
 *
 * Privacidad obligatoria (nunca exponer en publicSafe):
 *   cedula, contacto, dirección exacta, coordenadas precisas, diagnóstico,
 *   rawPayload, sourceUrl interno, sourceRecordId, datos médicos.
 *
 * Uso CLI:
 *   node redayudaImporter.js --url http://localhost:8000 --mode dry-run
 *   node redayudaImporter.js --url http://localhost:8000 --mode apply --max 1000
 *   REDAYUDA_BASE_URL=http://... node redayudaImporter.js
 */

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const SOURCE_NAME = "redayuda";
const SOURCE_DISPLAY_NAME = "Redayuda (Red Humanitaria Federada)";

// Mapeo de record_type de Redayuda → recordType de RescateVZLA
const TYPE_MAP = {
  persona_desaparecida: "missing_person",
  persona_hospitalizada: "hospitalized_person",
  persona_localizada: "safe_person",
  persona_a_salvo: "safe_person",
  fallecido: "deceased_person_private_only",
  centro_acopio: "collection_center",
  centro_donacion: "collection_center",
  recurso: "help_center",
  otro: "help_center",
  // tipos del conector Encuentralos/Hospitales que pueden aparecer federados
  personas_atendidas: "hospitalized_person",
};

// Tipos que implican un registro de persona
const PERSON_TYPES = new Set(["missing_person", "hospitalized_person", "safe_person", "deceased_person_private_only"]);

// Tipos que implican un centro/recurso
const CENTER_TYPES = new Set(["collection_center", "help_center", "shelter", "hospital", "water_point", "food_point", "medical_point"]);

// Tipos que NUNCA se publican automáticamente (requieren revisión manual admin)
const BLOCKED_AUTO_PUBLISH = new Set(["deceased_person_private_only"]);

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function mapRecordType(redayudaType) {
  return TYPE_MAP[redayudaType] || "help_center";
}

function privacyLevelFor(recordType, tags = [], age = null) {
  if (recordType === "deceased_person_private_only") return "private_only";
  if (recordType === "missing_person") return "restricted";
  if (age != null && Number(age) < 18) return "restricted";
  if (tags.some((t) => String(t).toLowerCase().includes("menor"))) return "restricted";
  return "standard";
}

function sanitizeName(fullName, privacyLevel) {
  if (!fullName) return undefined;
  if (privacyLevel === "restricted" || privacyLevel === "private_only") return "Informacion protegida";
  // Strip cedulas or phones appended to the name by the source (e.g. "Nombre C.I. 12345678")
  return sanitizePublicText(String(fullName)) || undefined;
}

// Patrones de teléfono venezolano en texto libre (0412, 0414, 0416, 0424, 0426, 02XX)
const PHONE_PATTERN = /\b0(4(12|14|16|24|26)|2\d{2})\d{7}\b/g;
// Prefijos que anuncian un teléfono en texto descriptivo
const PHONE_PREFIX = /(?:tel[eé]fono|tel\.?|contactar?\s+al?|llam[ae]\s+al?|whatsapp|ws|cel\.?)\s*:?\s*/gi;

// Cédulas venezolanas:
// 1. Prefijo V/E/J/P/G + dígitos: V-12345678
// 2. Palabra completa "cedula" + número (puede tener puntos como sep. de miles): cedula:25.964.449
// 3. Abreviatura estricta "C.I." (ambos puntos obligatorios) + número: C.I. 12345678
const CEDULA_PREFIX_PATTERN = /\b[VEJPGvejpg]-?\d{6,9}\b/g;
// Allow up to 8 non-digit chars between "cedula" and the number to catch
// constructions like "cedula es V-23.152.490" or "cedula de: 12345678"
const CEDULA_BARE_PATTERN = /(?:\bcedula(?:\s+de\s+identidad)?[^\d\n]{0,8}[\d.,\-]{5,15}|\bc\.i\.\s*:?\s*[\d.,\-]{5,15})/gi;

function sanitizePublicText(text) {
  if (!text) return undefined;
  const cleaned = String(text)
    .replace(PHONE_PREFIX, "")
    .replace(PHONE_PATTERN, "[contacto omitido]")
    .replace(CEDULA_BARE_PATTERN, "[información omitida]")
    .replace(CEDULA_PREFIX_PATTERN, "[información omitida]")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || undefined;
}

/**
 * Detecta campos sensibles presentes en un registro de Redayuda.
 * Devuelve lista de nombres de campo con datos.
 */
function detectSensitiveFields(record) {
  const found = [];
  if (record.cedula) found.push("cedula");
  if (record.contact) found.push("contact");
  if (record.latitude != null || record.longitude != null) found.push("coordinates");
  if (record.raw && Object.keys(record.raw || {}).length > 0) found.push("raw");
  if (record.source_url) found.push("source_url");
  return found;
}

/**
 * Convierte un IndexedRecord de Redayuda al formato de ImportedHumanitarianRecord
 * de RescateVZLA, aplicando las reglas de privacidad.
 */
function mapRecord(redayudaRecord, { capturedAt } = {}) {
  const recordType = mapRecordType(redayudaRecord.record_type);
  const privacyLevel = privacyLevelFor(recordType, redayudaRecord.tags || [], redayudaRecord.age);
  const isPrivate = privacyLevel === "private_only" || privacyLevel === "restricted";
  const captured = capturedAt || redayudaRecord.updated_at || redayudaRecord.observed_at || new Date().toISOString();

  // Campos sensibles → siempre privados
  const documentPrivate = redayudaRecord.cedula
    ? { cedula: redayudaRecord.cedula, cedula_valida: redayudaRecord.raw?.cedula_valida ?? null }
    : null;

  // contactPrivate es String? en el schema — almacenar el valor directamente
  const contactPrivate = redayudaRecord.contact ? String(redayudaRecord.contact) : null;

  const locationPrivate =
    redayudaRecord.latitude != null || redayudaRecord.longitude != null
      ? { lat: redayudaRecord.latitude, lng: redayudaRecord.longitude, exacta: redayudaRecord.location_name }
      : null;

  const medicalPrivate =
    recordType === "hospitalized_person"
      ? { hospital: redayudaRecord.organization || redayudaRecord.location_name, nota: redayudaRecord.summary }
      : null;

  // publicSafe: lo que puede mostrarse sin revelar datos privados
  const publicSafe = {
    sourceName: SOURCE_DISPLAY_NAME,
    capturedAt: captured,
    recordType,
    fullName: PERSON_TYPES.has(recordType) ? sanitizeName(redayudaRecord.person_name, privacyLevel) : undefined,
    approximateAge: redayudaRecord.age != null ? String(redayudaRecord.age) : undefined,
    gender: redayudaRecord.raw?.sexo || undefined,
    status: isPrivate && recordType === "deceased_person_private_only" ? "Informacion protegida" : redayudaRecord.status || undefined,
    // hospital: solo si no es privado y es hospitalizado
    hospitalName: isPrivate ? undefined : recordType === "hospitalized_person" ? redayudaRecord.organization || undefined : undefined,
    state: redayudaRecord.state || undefined,
    municipality: sanitizePublicText(redayudaRecord.city) || undefined,
    zone: sanitizePublicText(redayudaRecord.city || redayudaRecord.state) || undefined,
    lastSeenPlace: isPrivate ? undefined : PERSON_TYPES.has(recordType) ? sanitizePublicText(redayudaRecord.location_name || redayudaRecord.city) : undefined,
    currentPlace: isPrivate ? undefined : PERSON_TYPES.has(recordType) ? sanitizePublicText(redayudaRecord.location_name || redayudaRecord.city) : undefined,
    description: isPrivate ? undefined : sanitizePublicText(redayudaRecord.summary),
    photoUrl: isPrivate ? undefined : redayudaRecord.image_url || undefined,
    tags: redayudaRecord.tags || [],
    verificationStatus: "NO_VERIFICADO",
    privacyLevel,
  };

  // Para centros/recursos: incluir datos operativos (sin datos personales)
  if (CENTER_TYPES.has(recordType)) {
    publicSafe.fullName = undefined;
    publicSafe.name = sanitizePublicText(redayudaRecord.title || redayudaRecord.organization);
    publicSafe.publicLocation = sanitizePublicText(redayudaRecord.location_name || redayudaRecord.city);
    publicSafe.operationalStatus = redayudaRecord.status;
    publicSafe.operatingHours = redayudaRecord.raw?.horario || undefined;
  }

  return {
    sourceName: SOURCE_NAME,
    // sourceUrl y sourceRecordId son internos — NUNCA en publicSafe
    sourceUrl: redayudaRecord.source_url || `redayuda://${redayudaRecord.source_id}`,
    sourceRecordId: redayudaRecord.id,
    capturedAt: new Date(captured),
    recordType,
    // Datos personales (nombre solo para personas y solo si no es privado)
    fullName: PERSON_TYPES.has(recordType) ? redayudaRecord.person_name || undefined : undefined,
    approximateAge: redayudaRecord.age != null ? String(redayudaRecord.age) : undefined,
    gender: redayudaRecord.raw?.sexo || undefined,
    status: redayudaRecord.status || undefined,
    // Hospital (solo para hospitalizados, campo interno)
    hospitalName: recordType === "hospitalized_person" ? redayudaRecord.organization || undefined : undefined,
    state: redayudaRecord.state || undefined,
    municipality: redayudaRecord.city || undefined,
    zone: redayudaRecord.city || redayudaRecord.state || undefined,
    publicLocation: CENTER_TYPES.has(recordType) ? redayudaRecord.location_name || redayudaRecord.city || undefined : undefined,
    lastSeenPlace: PERSON_TYPES.has(recordType) ? redayudaRecord.location_name || redayudaRecord.city || undefined : undefined,
    currentPlace: PERSON_TYPES.has(recordType) ? redayudaRecord.location_name || redayudaRecord.city || undefined : undefined,
    description: redayudaRecord.summary || undefined,
    photoUrl: redayudaRecord.image_url || undefined,
    // Campos sensibles — NUNCA expuestos públicamente
    contactPrivate,
    documentPrivate,
    medicalPrivate,
    locationPrivate,
    // rawPayload es SIEMPRE privado
    rawPayload: redayudaRecord,
    // Control de verificación y privacidad
    verificationStatus: "NO_VERIFICADO",
    privacyLevel,
    publicSafe,
    // Fallecidos: approvedAt nulo = bloqueados de publicación automática
    ...(BLOCKED_AUTO_PUBLISH.has(recordType) ? { approvedAt: null } : {}),
  };
}

// ---------------------------------------------------------------------------
// Cliente HTTP de Redayuda
// ---------------------------------------------------------------------------

async function fetchJson(url, { timeoutMs = 15_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStats(baseUrl, opts) {
  return fetchJson(`${baseUrl}/api/network/stats`, opts);
}

/**
 * Recupera registros del feed de Redayuda con paginación por cursor.
 * Devuelve un iterador asíncrono de páginas.
 */
async function* feedPages(baseUrl, { since = 0, limit = 200, maxRecords = Infinity, timeoutMs = 15_000, delayMs = 300 } = {}) {
  let cursor = since;
  let fetched = 0;
  while (fetched < maxRecords) {
    const url = `${baseUrl}/api/records/feed?since=${cursor}&limit=${limit}`;
    let page;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        page = await fetchJson(url, { timeoutMs });
        break;
      } catch (err) {
        if (attempt === 5) throw err;
        const wait = delayMs * attempt * 2;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    const records = page.records || [];
    if (records.length === 0) break;
    yield records;
    fetched += records.length;
    cursor = page.next_cursor || cursor;
    if (!page.has_more) break;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

// ---------------------------------------------------------------------------
// Deduplicación liviana (compara sourceRecordId contra set en memoria)
// ---------------------------------------------------------------------------

function buildSeenSet(existing) {
  const set = new Set();
  for (const r of existing) {
    if (r.sourceName === SOURCE_NAME && r.sourceRecordId) set.add(r.sourceRecordId);
  }
  return set;
}

// ---------------------------------------------------------------------------
// API principal
// ---------------------------------------------------------------------------

/**
 * Ejecuta la auditoría y/o importación desde Redayuda.
 *
 * @param {Object} options
 * @param {string} options.baseUrl - URL base del nodo Redayuda
 * @param {"dry-run"|"apply"} [options.mode="dry-run"] - Modo de operación
 * @param {number} [options.maxRecords=500] - Máximo de registros a procesar
 * @param {number} [options.since=0] - Cursor del feed (para sync incremental)
 * @param {number} [options.pageSize=200] - Tamaño de página al paginar
 * @param {number} [options.timeoutMs=15000] - Timeout por request HTTP
 * @param {any} [options.prismaClient] - Cliente Prisma (inyectado para tests)
 * @returns {Promise<Object>} - Reporte completo de la operación
 */
export async function runRedayudaImport({
  baseUrl,
  mode = "dry-run",
  maxRecords = 500,
  since = 0,
  pageSize = 200,
  timeoutMs = 15_000,
  prismaClient,
} = {}) {
  if (!baseUrl) throw new Error("baseUrl es requerido (URL del nodo Redayuda)");

  const dryRun = mode !== "apply";
  const capturedAt = new Date().toISOString();

  // 1. Estadísticas del nodo Redayuda (opcional — no bloquear si hay rate limit)
  let stats = {};
  try {
    stats = await fetchStats(baseUrl, { timeoutMs });
  } catch {
    stats = { total_records: null, total_sources: null, record_types: {} };
  }

  // 2. Cargar registros existentes en DB para deduplicar (solo en apply)
  let existingSet = new Set();
  if (!dryRun && prismaClient) {
    const existing = await prismaClient.importedHumanitarianRecord.findMany({
      where: { sourceName: SOURCE_NAME, deletedAt: null },
      select: { sourceName: true, sourceRecordId: true },
    });
    existingSet = buildSeenSet(existing);
  }

  // Tamaño de lote para inserts en bloque (reduce round-trips a la DB remota)
  const BATCH_SIZE = 200;

  async function flushBatch(client, batch) {
    let imported = 0;
    let errors = 0;
    try {
      await client.$transaction(batch.map((data) => client.importedHumanitarianRecord.create({ data })));
      imported = batch.length;
    } catch {
      // Si falla el lote, intentar uno por uno para aislar errores
      for (const data of batch) {
        try {
          await client.importedHumanitarianRecord.create({ data });
          imported += 1;
        } catch {
          errors += 1;
        }
      }
    }
    return { imported, errors };
  }

  // 3. Consumir el feed y procesar registros
  let pendingBatch = [];
  const counts = {
    total: 0,
    byType: {},
    personas: 0,
    centros: 0,
    operaciones: 0,
    blockedAutoPublish: 0,
    skippedDuplicates: 0,
    imported: 0,
    errors: 0,
  };
  const sensitiveFieldsDetected = new Set();
  const privacyRisks = [];
  const examples = [];
  const MAX_EXAMPLES = 5;

  for await (const page of feedPages(baseUrl, { since, limit: pageSize, maxRecords, timeoutMs })) {
    for (const raw of page) {
      counts.total += 1;

      // Detectar campos sensibles en la muestra
      for (const f of detectSensitiveFields(raw)) sensitiveFieldsDetected.add(f);

      // Mapear al modelo de RescateVZLA
      const mapped = mapRecord(raw, { capturedAt });
      const rt = mapped.recordType;

      // Contadores por tipo
      counts.byType[rt] = (counts.byType[rt] || 0) + 1;
      if (PERSON_TYPES.has(rt)) counts.personas += 1;
      else if (CENTER_TYPES.has(rt)) counts.centros += 1;
      else counts.operaciones += 1;

      if (BLOCKED_AUTO_PUBLISH.has(rt)) counts.blockedAutoPublish += 1;

      // Ejemplos sanitizados (solo publicSafe, sin datos privados)
      if (examples.length < MAX_EXAMPLES) {
        examples.push({
          redayudaType: raw.record_type,
          mappedType: rt,
          publicSafe: mapped.publicSafe,
        });
      }

      // En modo apply: acumular en lote para flush por transacción
      if (!dryRun && prismaClient) {
        if (existingSet.has(mapped.sourceRecordId)) {
          counts.skippedDuplicates += 1;
          continue;
        }
        pendingBatch.push(mapped);
        existingSet.add(mapped.sourceRecordId);
        if (pendingBatch.length >= BATCH_SIZE) {
          const { imported, errors } = await flushBatch(prismaClient, pendingBatch);
          counts.imported += imported;
          counts.errors += errors;
          pendingBatch = [];
        }
      }
    }
  }

  // Flush registros restantes en el lote parcial
  if (!dryRun && prismaClient && pendingBatch.length > 0) {
    const { imported, errors } = await flushBatch(prismaClient, pendingBatch);
    counts.imported += imported;
    counts.errors += errors;
  }

  // 4. Riesgos de privacidad detectados
  if (sensitiveFieldsDetected.has("cedula")) {
    privacyRisks.push("cedula presente en registros: almacenar solo en documentPrivate, NUNCA en publicSafe");
  }
  if (sensitiveFieldsDetected.has("contact")) {
    privacyRisks.push("telefono/contacto presente: almacenar solo en contactPrivate, NUNCA en publicSafe");
  }
  if (sensitiveFieldsDetected.has("coordinates")) {
    privacyRisks.push("coordenadas precisas presentes: almacenar solo en locationPrivate, NUNCA en publicSafe");
  }
  if (counts.blockedAutoPublish > 0) {
    privacyRisks.push(`${counts.blockedAutoPublish} registro(s) tipo fallecido: BLOQUEADOS para publicacion automatica, requieren revision admin`);
  }
  if (counts.personas > 0) {
    privacyRisks.push(`${counts.personas} registro(s) de personas: verificar que cedula/telefono no aparezcan en /api/family-search/public`);
  }

  return {
    dryRun,
    baseUrl,
    stats,
    counts,
    sensitiveFieldsDetected: [...sensitiveFieldsDetected],
    privacyRisks,
    examples,
    imported: dryRun ? 0 : counts.imported,
    skippedDuplicates: counts.skippedDuplicates,
    blockedAutoPublish: counts.blockedAutoPublish,
    finishedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Exports de utilidades (usadas en tests)
// ---------------------------------------------------------------------------
export { mapRecord, mapRecordType, detectSensitiveFields, BLOCKED_AUTO_PUBLISH, PERSON_TYPES, CENTER_TYPES, SOURCE_NAME };

// ---------------------------------------------------------------------------
// CLI: node redayudaImporter.js [--mode dry-run|apply] [--url URL] [--max N]
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const baseUrl = get("--url") || process.env.REDAYUDA_BASE_URL;
  const mode = get("--mode") || "dry-run";
  const maxRecords = Number(get("--max") || "500");
  const since = Number(get("--since") || "0");

  if (!baseUrl) {
    console.error("Error: se requiere --url <URL_REDAYUDA> o la variable de entorno REDAYUDA_BASE_URL");
    process.exit(1);
  }

  console.log(`\n=== Redayuda Importer — modo: ${mode} ===`);
  console.log(`Nodo: ${baseUrl}`);
  console.log(`Max registros: ${maxRecords}`);
  if (since > 0) console.log(`Feed desde cursor: ${since}`);
  console.log("");

  let prismaClient;
  if (mode === "apply") {
    const { prisma } = await import("../config/prisma.js");
    prismaClient = prisma;
  }

  const result = await runRedayudaImport({ baseUrl, mode, maxRecords, since, prismaClient });

  console.log("--- Estadísticas del nodo Redayuda ---");
  console.log(`Total registros en nodo: ${result.stats.total_records ?? "N/A"}`);
  console.log(`Fuentes en nodo: ${result.stats.total_sources ?? "N/A"}`);
  if (result.stats.record_types) {
    for (const [type, count] of Object.entries(result.stats.record_types)) {
      console.log(`  ${type}: ${count}`);
    }
  }

  console.log("\n--- Registros procesados ---");
  console.log(`Total procesados: ${result.counts.total}`);
  console.log(`→ Personas (missing/hospitalized/safe): ${result.counts.personas}`);
  console.log(`→ Centros/recursos: ${result.counts.centros}`);
  console.log(`→ Operaciones/mapa: ${result.counts.operaciones}`);
  console.log(`Bloqueados (fallecidos): ${result.blockedAutoPublish}`);
  console.log(`Duplicados omitidos: ${result.skippedDuplicates}`);
  if (!result.dryRun) console.log(`Importados a DB: ${result.imported}`);

  console.log("\n--- Tipos detectados ---");
  for (const [type, count] of Object.entries(result.counts.byType)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\n--- Campos sensibles detectados ---");
  if (result.sensitiveFieldsDetected.length === 0) {
    console.log("  Ninguno");
  } else {
    for (const f of result.sensitiveFieldsDetected) console.log(`  [!] ${f}`);
  }

  console.log("\n--- Riesgos de privacidad ---");
  if (result.privacyRisks.length === 0) {
    console.log("  Ninguno");
  } else {
    for (const r of result.privacyRisks) console.log(`  [!] ${r}`);
  }

  console.log("\n--- Ejemplos sanitizados (publicSafe) ---");
  for (const ex of result.examples) {
    console.log(`  [${ex.redayudaType} -> ${ex.mappedType}]`);
    console.log(JSON.stringify(ex.publicSafe, null, 2).split("\n").map((l) => "    " + l).join("\n"));
  }

  if (result.dryRun) {
    console.log("\n[!] DRY-RUN: No se escribio nada en la base de datos.");
    console.log("    Para importar: node redayudaImporter.js --mode apply --url <URL>");
  } else {
    console.log(`\n[OK] Importacion completa. ${result.imported} registros nuevos en DB.`);
  }
}

if (process.argv[1]?.endsWith("redayudaImporter.js")) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
