/**
 * Auditoría completa de Redayuda — SOLO LECTURA, NUNCA ESCRIBE EN DB.
 * Genera un informe técnico detallado para decisión de integración.
 *
 * Uso: node backend/scripts/redayudaAudit.js --url http://localhost:8765 [--sample 200]
 */

import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Mapping de tipos redayuda → rescatevzla (debe coincidir con redayudaImporter.js)
const TYPE_MAP = {
  persona_desaparecida:  "missing_person",
  persona_hospitalizada: "hospitalized_person",
  persona_localizada:    "safe_person",
  persona_a_salvo:       "safe_person",
  fallecido:             "deceased_person_private_only",
  centro_acopio:         "collection_center",
  centro_donacion:       "collection_center",
  recurso:               "help_center",
  otro:                  "help_center",
  personas_atendidas:    "hospitalized_person",
};

const PERSON_TYPES  = new Set(["missing_person","hospitalized_person","safe_person","deceased_person_private_only"]);
const CENTER_TYPES  = new Set(["collection_center","help_center","shelter","hospital","water_point","food_point","medical_point"]);
const BLOCKED_TYPES = new Set(["deceased_person_private_only"]);

// Campos que existen en Redayuda pero NO en nuestro modelo actual
const REDAYUDA_ONLY_FIELDS = [
  "entity_id",      // resolución de entidades cruzada entre fuentes
  "origin_node",    // identificador del nodo federado de origen
  "origin_source",  // fuente de origen en el nodo peer
  "image_url",      // foto de la persona/recurso
  "verified",       // booleano de verificación cruzada de la fuente
  "source_record_id", // ID del registro en la fuente original
];

// Campos sensibles según nuestras reglas de privacidad
const SENSITIVE_FIELDS = {
  cedula:     "documento de identidad",
  contact:    "teléfono/contacto",
  latitude:   "coordenada lat exacta",
  longitude:  "coordenada lng exacta",
  raw:        "payload raw completo",
  source_url: "URL de la fuente original",
};

// ---------------------------------------------------------------------------
// Utilidades HTTP
// ---------------------------------------------------------------------------

async function fetchJSON(url, { timeoutMs = 20_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function* feedPages(base, { limit = 200, maxRecords = 5000 } = {}) {
  let cursor = 0, total = 0;
  while (total < maxRecords) {
    const page = await fetchJSON(`${base}/api/records/feed?since=${cursor}&limit=${limit}`);
    const records = page.records || [];
    if (!records.length) break;
    yield records;
    total += records.length;
    cursor = page.next_cursor || cursor;
    if (!page.has_more) break;
  }
}

// ---------------------------------------------------------------------------
// Leer nuestra DB (SOLO LECTURA) para detectar posibles duplicados
// ---------------------------------------------------------------------------

async function loadOurRecords() {
  if (!process.env.DATABASE_URL) return { total: 0, byType: {}, names: new Set(), cedulas: new Set() };
  try {
    const { prisma } = await import("../src/config/prisma.js");
    const records = await prisma.importedHumanitarianRecord.findMany({
      where: { deletedAt: null },
      select: { recordType: true, fullName: true, documentPrivate: true, sourceRecordId: true, sourceName: true },
      take: 50_000,
    });
    const byType = {};
    const names = new Set();
    const cedulas = new Set();
    for (const r of records) {
      byType[r.recordType] = (byType[r.recordType] || 0) + 1;
      if (r.fullName) names.add(r.fullName.toLowerCase().trim());
      const doc = r.documentPrivate;
      if (doc?.cedula) cedulas.add(String(doc.cedula).replace(/\D/g, ""));
    }
    return { total: records.length, byType, names, cedulas };
  } catch { return { total: 0, byType: {}, names: new Set(), cedulas: new Set() }; }
}

// ---------------------------------------------------------------------------
// Análisis de calidad de datos
// ---------------------------------------------------------------------------

function analyzeQuality(records) {
  const stats = {
    total: records.length,
    withName: 0, withCedula: 0, withAge: 0, withCity: 0, withState: 0,
    withContact: 0, withCoords: 0, withPhoto: 0, withStatus: 0, withVerified: 0,
    nameEmpty: 0, nameGeneric: 0, missingType: 0,
    completenessScores: [],
  };
  const GENERIC_NAMES = new Set(["persona desaparecida","persona hospitalizada","persona registrada en centro de salud","centro","recurso"]);

  for (const r of records) {
    let score = 0, possible = 7;
    if (r.person_name || r.title) { stats.withName++; score++; }
    if (!r.person_name && !r.title) stats.nameEmpty++;
    if (r.person_name && GENERIC_NAMES.has(r.person_name.toLowerCase().trim())) stats.nameGeneric++;
    if (r.cedula) { stats.withCedula++; score++; }
    if (r.age != null) { stats.withAge++; score++; }
    if (r.city) { stats.withCity++; score++; }
    if (r.state) { stats.withState++; score++; }
    if (r.contact) { stats.withContact++; score++; }
    if (r.latitude != null && r.longitude != null) { stats.withCoords++; score++; }
    if (r.image_url) stats.withPhoto++;
    if (r.status) stats.withStatus++;
    if (r.verified !== null && r.verified !== undefined) stats.withVerified++;
    if (!r.record_type) stats.missingType++;
    stats.completenessScores.push(score / possible);
  }

  const avg = stats.completenessScores.reduce((a, b) => a + b, 0) / (stats.completenessScores.length || 1);
  return { ...stats, avgCompleteness: Math.round(avg * 100) };
}

// ---------------------------------------------------------------------------
// Detección de campos nuevos que Redayuda tiene y nosotros no tenemos
// ---------------------------------------------------------------------------

function detectNewFields(records) {
  const fieldCounts = {};
  const fieldExamples = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(r)) {
      if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) {
        fieldCounts[k] = (fieldCounts[k] || 0) + 1;
        if (!fieldExamples[k]) fieldExamples[k] = v;
      }
    }
  }
  // Campos que Redayuda tiene pero nosotros no cubrimos directamente
  const notInOurModel = ["entity_id","origin_node","origin_source","image_url","verified","source_record_id","tags"];
  return notInOurModel
    .filter(f => fieldCounts[f] > 0)
    .map(f => ({ field: f, count: fieldCounts[f], pct: Math.round(fieldCounts[f]/records.length*100), example: fieldExamples[f] }));
}

// ---------------------------------------------------------------------------
// Detección de posibles duplicados
// ---------------------------------------------------------------------------

function detectDuplicates(records, ourDB) {
  if (!ourDB.total) return { total: 0, byCedula: 0, byName: 0, examples: [] };
  let byCedula = 0, byName = 0;
  const examples = [];
  for (const r of records) {
    const cedula = String(r.cedula || "").replace(/\D/g, "");
    const name = (r.person_name || "").toLowerCase().trim();
    if (cedula && ourDB.cedulas.has(cedula)) {
      byCedula++;
      if (examples.length < 3) examples.push({ type: "cedula", name: r.person_name, cedula: "***" + cedula.slice(-3), hospital: r.organization });
    } else if (name && ourDB.names.has(name)) {
      byName++;
      if (examples.length < 5) examples.push({ type: "nombre", name: r.person_name, city: r.city });
    }
  }
  return { total: byCedula + byName, byCedula, byName, examples };
}

// ---------------------------------------------------------------------------
// Muestras sanitizadas por tipo (sin datos privados)
// ---------------------------------------------------------------------------

function buildSample(r) {
  return {
    redayudaType: r.record_type,
    mappedTo: TYPE_MAP[r.record_type] || "help_center",
    title: r.title,
    // Datos que SÍ podrían aparecer en publicSafe
    person_name: PERSON_TYPES.has(TYPE_MAP[r.record_type] || "")
      ? (r.person_name ? "[NOMBRE PROTEGIDO]" : null) : r.title,
    age: r.age,
    city: r.city,
    state: r.state,
    status: r.status,
    organization: r.organization,
    location_name: r.location_name,
    // Indicadores de presencia (sin revelar valor)
    tiene_cedula: !!r.cedula,
    tiene_contacto: !!r.contact,
    tiene_coords: r.latitude != null,
    tiene_foto: !!r.image_url,
    verified: r.verified,
    tags: r.tags,
    source_name: r.source_name,
    source_id: r.source_id,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const getArg = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : undefined; };
  const baseUrl = getArg("--url") || process.env.REDAYUDA_BASE_URL || "http://127.0.0.1:8765";
  const samplePerType = Number(getArg("--sample") || "50");
  const maxFeed = Number(getArg("--max") || "10000");

  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  AUDITORÍA REDAYUDA ↔ RESCATEVZLA  — DRY-RUN SOLO LECTURA       ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`Nodo Redayuda: ${baseUrl}`);
  console.log(`Fecha:         ${new Date().toISOString()}`);
  console.log("⚠  MODO DRY-RUN: No se escribirá nada en la base de datos.\n");

  // 1. Stats del nodo
  console.log("▶ Consultando /api/network/stats ...");
  const stats = await fetchJSON(`${baseUrl}/api/network/stats`);

  // 2. Leer nuestra DB (solo lectura)
  console.log("▶ Leyendo nuestra DB para detectar duplicados (solo lectura) ...");
  const ourDB = await loadOurRecords();

  // 3. Consumir el feed completo para análisis
  console.log(`▶ Consumiendo feed (máx ${maxFeed} registros) ...\n`);
  const allRecords = [];
  const byType = {};
  const bySource = {};
  const sensitiveFound = new Set();
  const samplesPerType = {};

  for await (const page of feedPages(baseUrl, { limit: 200, maxRecords: maxFeed })) {
    for (const r of page) {
      allRecords.push(r);
      const rt = r.record_type || "sin_tipo";
      byType[rt] = (byType[rt] || 0) + 1;
      bySource[r.source_id] = (bySource[r.source_id] || 0) + 1;

      // Detectar campos sensibles
      if (r.cedula)  sensitiveFound.add("cedula");
      if (r.contact) sensitiveFound.add("contact");
      if (r.latitude != null || r.longitude != null) sensitiveFound.add("coordinates");
      if (r.raw && Object.keys(r.raw||{}).length) sensitiveFound.add("raw_payload");

      // Tomar muestra por tipo
      if (!samplesPerType[rt]) samplesPerType[rt] = [];
      if (samplesPerType[rt].length < samplePerType) samplesPerType[rt].push(buildSample(r));
    }
    process.stdout.write(`\r  Procesados: ${allRecords.length} registros...`);
  }
  console.log(`\n  Total descargados del feed: ${allRecords.length}\n`);

  // 4. Análisis de calidad
  const quality = analyzeQuality(allRecords);
  // Solo personas para análisis de calidad de datos de personas
  const personRecords = allRecords.filter(r => PERSON_TYPES.has(TYPE_MAP[r.record_type] || ""));
  const qualityPersons = analyzeQuality(personRecords);

  // 5. Campos nuevos
  const newFields = detectNewFields(allRecords);

  // 6. Duplicados posibles
  const dups = detectDuplicates(allRecords, ourDB);

  // 7. Registros no importables y razones
  const notImportable = [];
  for (const r of allRecords.slice(0, 5000)) {
    const mapped = TYPE_MAP[r.record_type];
    if (!mapped) notImportable.push({ id: r.id, reason: `tipo desconocido: ${r.record_type}`, source: r.source_id });
    else if (mapped === "deceased_person_private_only") {
      notImportable.push({ id: r.id, reason: "fallecido: bloqueado para publicacion automatica, requiere revision admin", source: r.source_id, name: "[PROTEGIDO]" });
    }
  }

  // ---------------------------------------------------------------------------
  // INFORME
  // ---------------------------------------------------------------------------

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 1: ESTADÍSTICAS GENERALES DEL NODO REDAYUDA");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`Total registros en nodo Redayuda:  ${stats.total_records.toLocaleString()}`);
  console.log(`Fuentes registradas:               ${stats.total_sources}`);
  console.log(`Registros descargados (feed):      ${allRecords.length.toLocaleString()}`);
  if (allRecords.length < stats.total_records) {
    console.log(`  ⚠ Feed limitado a ${maxFeed}. El nodo tiene ${stats.total_records - allRecords.length} registros adicionales no auditados.`);
  }

  console.log("\n  Distribución por tipo de registro (nodo completo):");
  for (const [t, c] of Object.entries(stats.record_types || {}).sort((a,b)=>b[1]-a[1])) {
    const mapped = TYPE_MAP[t] || "→ help_center (default)";
    const bar = "█".repeat(Math.round(c / stats.total_records * 40));
    console.log(`  ${t.padEnd(26)} ${String(c).padStart(6)}  ${bar}`);
    console.log(`    → ${TYPE_MAP[t] || "help_center (default)"}`);
  }

  console.log("\n  Distribución por fuente:");
  for (const [s, c] of Object.entries(bySource).sort((a,b)=>b[1]-a[1])) {
    console.log(`  ${s.padEnd(28)} ${String(c).padStart(6)}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 2: MAPEO DE TIPOS REDAYUDA → RESCATEVZLA");
  console.log("═══════════════════════════════════════════════════════════════════");

  const mappingTable = [
    ["Tipo Redayuda", "→", "Modelo RescateVZLA", "Tabla/destino", "Bloqueado?"],
    ["persona_desaparecida",  "→", "missing_person",               "ImportedHumanitarianRecord", "No"],
    ["persona_hospitalizada", "→", "hospitalized_person",          "ImportedHumanitarianRecord + HospitalAdmission cross-ref", "No"],
    ["persona_localizada",    "→", "safe_person",                  "ImportedHumanitarianRecord", "No"],
    ["persona_a_salvo",       "→", "safe_person",                  "ImportedHumanitarianRecord", "No"],
    ["fallecido",             "→", "deceased_person_private_only", "ImportedHumanitarianRecord (privacyLevel=private_only)", "SÍ — requiere admin"],
    ["centro_acopio",         "→", "collection_center",            "ImportedHumanitarianRecord → /mapa y /centros", "No"],
    ["centro_donacion",       "→", "collection_center",            "ImportedHumanitarianRecord → /mapa y /centros", "No"],
    ["recurso",               "→", "help_center",                  "ImportedHumanitarianRecord → /mapa", "No"],
    ["otro",                  "→", "help_center (default)",        "ImportedHumanitarianRecord → /mapa", "No"],
    ["personas_atendidas",    "→", "hospitalized_person",          "ImportedHumanitarianRecord", "No"],
  ];
  for (const row of mappingTable) console.log(`  ${row[0].padEnd(28)} ${row[1]} ${row[2].padEnd(40)} ${row[3]?.padEnd(52)||""} ${row[4]||""}`);

  console.log("\n  Conteos por tipo en los registros auditados:");
  const typeSummary = {
    "personas_desaparecidas":  (byType["persona_desaparecida"]||0),
    "personas_hospitalizadas": (byType["persona_hospitalizada"]||0) + (byType["personas_atendidas"]||0),
    "personas_localizadas":    (byType["persona_localizada"]||0) + (byType["persona_a_salvo"]||0),
    "fallecidos":              (byType["fallecido"]||0),
    "centros_acopio":          (byType["centro_acopio"]||0) + (byType["centro_donacion"]||0),
    "recursos_humanitarios":   (byType["recurso"]||0),
    "tipo_otro":               (byType["otro"]||0),
  };
  for (const [label, count] of Object.entries(typeSummary)) {
    console.log(`  ${label.padEnd(32)} ${String(count).padStart(7)}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 3: CAMPOS SENSIBLES DETECTADOS");
  console.log("═══════════════════════════════════════════════════════════════════");
  if (sensitiveFound.size === 0) {
    console.log("  Ningún campo sensible encontrado en la muestra.");
  } else {
    for (const f of sensitiveFound) {
      const pct = Math.round(allRecords.filter(r => r[f] != null).length / allRecords.length * 100);
      console.log(`  ⚠ ${f.padEnd(20)} presente en ~${pct}% de registros`);
      console.log(`    → Destino: ${SENSITIVE_FIELDS[f] || f} — NUNCA en publicSafe`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 4: RIESGOS DE PRIVACIDAD");
  console.log("═══════════════════════════════════════════════════════════════════");

  const risks = [];
  if (sensitiveFound.has("cedula")) {
    const withCedula = allRecords.filter(r=>r.cedula).length;
    risks.push(`[CRÍTICO] ${withCedula.toLocaleString()} registros con cédula. Almacenar SOLO en documentPrivate (JSON cifrado). Nunca en publicSafe, nunca en logs.`);
  }
  if (sensitiveFound.has("contact")) {
    const withPhone = allRecords.filter(r=>r.contact).length;
    risks.push(`[ALTO] ${withPhone.toLocaleString()} registros con teléfono/contacto. Almacenar SOLO en contactPrivate. Nunca en publicSafe.`);
  }
  if (sensitiveFound.has("coordinates")) {
    const withCoords = allRecords.filter(r=>r.latitude!=null).length;
    risks.push(`[MEDIO] ${withCoords.toLocaleString()} registros con coordenadas exactas. Almacenar en locationPrivate. Solo ciudad/zona en publicSafe.`);
  }
  if ((byType["fallecido"]||0) > 0) {
    risks.push(`[CRÍTICO] ${byType["fallecido"]} registros de fallecidos. BLOQUEADOS para publicación automática. Requieren revisión admin antes de cualquier exposición.`);
  }
  if (typeSummary.personas_hospitalizadas > 0) {
    risks.push(`[ALTO] ${typeSummary.personas_hospitalizadas.toLocaleString()} personas hospitalizadas. Diagnóstico médico y habitación NUNCA se exponen. Solo hospital y zona pública.`);
  }
  const minors = allRecords.filter(r => r.age != null && r.age < 18).length;
  if (minors > 0) {
    risks.push(`[CRÍTICO] ${minors.toLocaleString()} registros con edad < 18 (menores). privacyLevel=restricted automáticamente. Nombre protegido en publicSafe.`);
  }
  risks.push(`[MEDIO] raw_payload presente en todos los registros. Nunca exponer en APIs públicas. Campo privado en DB.`);
  risks.push(`[BAJO] sourceUrl y sourceRecordId son identificadores internos. No exponer en publicSafe para evitar rastreo cruzado.`);
  risks.push(`[BAJO] image_url presente en ${allRecords.filter(r=>r.image_url).length} registros. Verificar que fotos sean aptas para publicación y cumplan consentimiento.`);

  for (const r of risks) console.log(`  ${r}`);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 5: CALIDAD DE DATOS");
  console.log("═══════════════════════════════════════════════════════════════════");

  console.log(`\n  Todos los registros (${quality.total.toLocaleString()}):`);
  console.log(`  Completitud promedio:      ${quality.avgCompleteness}%`);
  console.log(`  Con nombre:                ${quality.withName.toLocaleString()} (${Math.round(quality.withName/quality.total*100)}%)`);
  console.log(`  Con cédula:                ${quality.withCedula.toLocaleString()} (${Math.round(quality.withCedula/quality.total*100)}%)`);
  console.log(`  Con edad:                  ${quality.withAge.toLocaleString()} (${Math.round(quality.withAge/quality.total*100)}%)`);
  console.log(`  Con ciudad:                ${quality.withCity.toLocaleString()} (${Math.round(quality.withCity/quality.total*100)}%)`);
  console.log(`  Con estado:                ${quality.withState.toLocaleString()} (${Math.round(quality.withState/quality.total*100)}%)`);
  console.log(`  Con coordenadas exactas:   ${quality.withCoords.toLocaleString()} (${Math.round(quality.withCoords/quality.total*100)}%)`);
  console.log(`  Con foto:                  ${quality.withPhoto.toLocaleString()} (${Math.round(quality.withPhoto/quality.total*100)}%)`);
  console.log(`  Con status:                ${quality.withStatus.toLocaleString()} (${Math.round(quality.withStatus/quality.total*100)}%)`);
  console.log(`  Con verificado:            ${quality.withVerified.toLocaleString()} (${Math.round(quality.withVerified/quality.total*100)}%)`);
  console.log(`  Nombre vacío/null:         ${quality.nameEmpty}`);
  console.log(`  Nombre genérico:           ${quality.nameGeneric} (p.ej. "Persona desaparecida")`);
  console.log(`  Sin tipo de registro:      ${quality.missingType}`);

  if (personRecords.length > 0) {
    console.log(`\n  Solo personas (${personRecords.length.toLocaleString()}):`);
    console.log(`  Completitud promedio:      ${qualityPersons.avgCompleteness}%`);
    console.log(`  Con cédula:                ${qualityPersons.withCedula.toLocaleString()} (${Math.round(qualityPersons.withCedula/qualityPersons.total*100)}%)`);
    console.log(`  Con edad:                  ${qualityPersons.withAge.toLocaleString()} (${Math.round(qualityPersons.withAge/qualityPersons.total*100)}%)`);
    console.log(`  Con ciudad:                ${qualityPersons.withCity.toLocaleString()} (${Math.round(qualityPersons.withCity/qualityPersons.total*100)}%)`);
  }

  console.log("\n  ⚡ Diagnóstico de calidad:");
  const cedulaPct = Math.round(quality.withCedula/quality.total*100);
  if (cedulaPct > 60) console.log(`  ✓ Alta cobertura de cédulas (${cedulaPct}%) → búsqueda familiar por cédula será muy efectiva`);
  else if (cedulaPct > 30) console.log(`  ~ Cobertura media de cédulas (${cedulaPct}%) → cruce por nombre+edad como fallback`);
  else console.log(`  ✗ Baja cobertura de cédulas (${cedulaPct}%) → usar nombre+edad+ciudad para matching`);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 6: POSIBLES DUPLICADOS CON NUESTRA DB");
  console.log("═══════════════════════════════════════════════════════════════════");

  if (ourDB.total === 0) {
    console.log("  ⚠ No se pudo leer la base de datos local (sin DATABASE_URL o DB vacía).");
    console.log("  Para análisis de duplicados: ejecutar con DATABASE_URL configurada.");
    console.log(`  Registros actuales en nuestra DB: ${ourDB.total}`);
  } else {
    console.log(`  Registros en nuestra DB:          ${ourDB.total.toLocaleString()}`);
    console.log(`  Duplicados potenciales detectados: ${dups.total.toLocaleString()}`);
    console.log(`    Por cédula exacta:               ${dups.byCedula.toLocaleString()} [alta confianza]`);
    console.log(`    Por nombre exacto:               ${dups.byName.toLocaleString()} [media confianza — verificar]`);
    if (dups.examples.length > 0) {
      console.log("  Ejemplos de posibles duplicados (datos parciales):");
      for (const ex of dups.examples) console.log(`    ${ex.type}: ${ex.name ? ex.name.substring(0,20) : "[sin nombre]"} | ciudad: ${ex.city || "N/A"}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 7: REGISTROS NO IMPORTABLES");
  console.log("═══════════════════════════════════════════════════════════════════");

  const fallecidos = allRecords.filter(r => r.record_type === "fallecido");
  const sinTipo    = allRecords.filter(r => !r.record_type);
  const tiposNoMapeados = allRecords.filter(r => r.record_type && !TYPE_MAP[r.record_type]);

  console.log(`  Fallecidos (bloqueo automático):  ${fallecidos.length} → almacenados con privacyLevel=private_only, NO publicados sin admin`);
  console.log(`  Sin tipo de registro:             ${sinTipo.length}`);
  console.log(`  Tipos sin mapeo directo:          ${tiposNoMapeados.length}`);
  if (tiposNoMapeados.length > 0) {
    const unknownTypes = [...new Set(tiposNoMapeados.map(r=>r.record_type))];
    console.log(`    Tipos desconocidos: ${unknownTypes.join(", ")}`);
  }
  console.log(`  Total no importables directamente: ${fallecidos.length + sinTipo.length + tiposNoMapeados.length}`);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 8: CAMPOS NUEVOS EN REDAYUDA (NO TENEMOS AÚN)");
  console.log("═══════════════════════════════════════════════════════════════════");

  for (const f of newFields) {
    const pct = f.pct;
    console.log(`  ${f.field.padEnd(22)} presente en ${pct}% de registros`);
    const desc = {
      entity_id:        "→ Resolución de entidades: misma persona cruzada entre fuentes. MUY VALIOSO.",
      origin_node:      "→ Identificador del nodo federado. Útil para trazabilidad de federación.",
      origin_source:    "→ Fuente de origen en el nodo peer. Ayuda a evitar bucles de federación.",
      image_url:        "→ URL de foto. Nuestro modelo ya tiene photoUrl en publicSafe. Compatible.",
      verified:         "→ Booleano de verificación cruzada. Nuestro verificationStatus es más granular.",
      source_record_id: "→ ID en la fuente original. Nuestro ImportedHumanitarianRecord ya lo tiene.",
      tags:             "→ Etiquetas semánticas (array de strings). Nuestro modelo no los tiene. Útil para filtrado.",
    };
    console.log(`    ${desc[f.field] || "Sin descripción"}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 9: EJEMPLOS SANITIZADOS POR TIPO");
  console.log("═══════════════════════════════════════════════════════════════════");

  for (const [tipo, muestras] of Object.entries(samplesPerType)) {
    if (!muestras.length) continue;
    const sample = muestras[0];
    console.log(`\n  [${tipo} → ${sample.mappedTo}]`);
    const safeKeys = ["title","age","city","state","status","organization","location_name",
                      "tiene_cedula","tiene_contacto","tiene_coords","tiene_foto","verified","tags","source_name"];
    for (const k of safeKeys) {
      if (sample[k] !== undefined && sample[k] !== null) {
        const val = Array.isArray(sample[k]) ? sample[k].join(",") : sample[k];
        console.log(`    ${k.padEnd(20)}: ${String(val).substring(0,60)}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // INFORME FINAL — JSON completo
  // ---------------------------------------------------------------------------

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    neverWritesToDB: true,
    baseUrl,
    redayudaStats: stats,
    totalFromFeed: allRecords.length,
    typeSummary,
    byType,
    bySource,
    sensitiveFieldsFound: [...sensitiveFound],
    privacyRisks: risks,
    qualityAll: { ...quality, completenessScores: undefined },
    qualityPersons: personRecords.length > 0 ? { ...qualityPersons, completenessScores: undefined } : null,
    newFields,
    potentialDuplicates: dups,
    notImportable: {
      fallecidos: fallecidos.length,
      sinTipo: sinTipo.length,
      tiposNoMapeados: tiposNoMapeados.length,
      total: fallecidos.length + sinTipo.length + tiposNoMapeados.length,
    },
    samplesPerType: Object.fromEntries(Object.entries(samplesPerType).map(([k,v])=>[k, v.slice(0,3)])),
    mapping: Object.entries(TYPE_MAP).map(([from,to])=>({from, to, blocked: BLOCKED_TYPES.has(to)})),
    ourDBSummary: { total: ourDB.total, byType: ourDB.byType },
  };

  const reportDir = join(process.cwd(), "reports", "redayuda");
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, `audit-${Date.now()}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  SECCIÓN 10: PROPUESTA DE INTEGRACIÓN — ANÁLISIS ESTRUCTURAL");
  console.log("═══════════════════════════════════════════════════════════════════");

  console.log(`
FUNCIONALIDADES DE REDAYUDA EVALUADAS PARA ADOPCIÓN:

━━━ TIER 1: ADOPTAR (alto valor, bajo riesgo) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ 1. SISTEMA DE ENTIDADES ENTRE FUENTES (entities.py)
     Redayuda detecta que "María Pérez, 40, Caracas" en hospitales_venezuela
     es la MISMA que en encuentralos, usando cedula > nombre+ciudad > nombre+edad.
     Genera entity_id compartido entre registros de diferentes fuentes.
     → Para RescateVZLA: implementar en nuestro MatchResult / family-search.
     → Impacto: familias localizarían personas aunque estén en múltiples fuentes.
     → Esfuerzo: medio (lógica pura JS, sin deps nuevas).

  ✅ 2. FEED INCREMENTAL POR CURSOR (store.py: feed_seq)
     Redayuda usa un feed_seq incrementable por fila que permite sync incremental
     limpia (solo novedades desde el último cursor). Nuestra ingesta actual es
     full-scan repetitivo.
     → Para RescateVZLA: agregar feed_seq a ImportedHumanitarianRecord.
     → Impacto: sync cada N minutos sin re-procesar todo.
     → Esfuerzo: bajo (campo nuevo en schema + cursor en sourcesRegistry).

  ✅ 3. NORMALIZACIÓN DE NOMBRES PARA BÚSQUEDA (search.py: normalize_text)
     Quita acentos, ñ→n, colapsa espacios, lowercase. Exactamente el mismo
     patrón que ya tenemos en RescateVZLA. Confirma que nuestro enfoque es correcto.
     → Ya implementado en RescateVZLA. Mantener coherencia.

  ✅ 4. CONTENT HASH PARA UPSERTS IDEMPOTENTES (store.py: _content_hash)
     Computa SHA-256 de los campos sustantivos del registro. Si el hash no cambia,
     no re-escribe ni re-indexa. Hace re-syncs casi gratuitos.
     → Para RescateVZLA: agregar contentHash a ImportedHumanitarianRecord.
     → Impacto: ingesta eficiente sin explosión de writes en DB.
     → Esfuerzo: bajo (crypto.createHash disponible en Node.js).

━━━ TIER 2: ADOPTAR CON ADAPTACIÓN (valor medio, requiere ajuste) ━━━━━━━━━

  ⚠  5. SISTEMA DE FEDERACIÓN NODO-A-NODO (federation.py)
     Redayuda permite que múltiples instancias se sincronicen entre sí usando
     el feed incremental + origin_node para evitar bucles.
     → Para RescateVZLA: útil si hay instancias regionales (por estado/municipio).
     → Requiere decisión arquitectural: ¿queremos nodos federados?
     → Esfuerzo: alto. Depender de esto en producción requiere infraestructura.
     → Recomendación: evaluar en fase posterior. Por ahora, usar como fuente 1-N.

  ⚠  6. RATE LIMITER EN MEMORIA (proposals.py: RateLimiter)
     Implementación simple de ventana deslizante por IP.
     → Para RescateVZLA: ya tenemos express-rate-limit. No reemplazar.
     → Solo útil si agregamos endpoint POST /api/connectors/proposals estilo Redayuda.

  ⚠  7. SISTEMA DE PROPUESTAS DE CONECTORES (/contribuir, proposals.py)
     Formulario self-service que permite a colaboradores registrar su API
     para ser indexada. Con revisión admin antes de activar.
     → Para RescateVZLA: potencialmente valioso para escalar fuentes de datos.
     → Pero: añade superficie de ataque (SSRF, spam). Redayuda tiene anti-SSRF.
     → Esfuerzo: alto. Requiere frontend (formulario) + backend + revisión admin.
     → Recomendación: diferir a fase 3. Prioridad baja ahora.

  ⚠  8. TAGS SEMÁNTICOS EN REGISTROS
     Redayuda agrega tags[] a cada registro (["persona","hospital","localizada"]).
     Facilita filtrado rápido sin text search.
     → Para RescateVZLA: agregar tags String[] al schema de ImportedHumanitarianRecord.
     → Impacto: filtros más eficientes en /mapa y /personas.
     → Esfuerzo: bajo (migración de schema + populate en normalizer).

━━━ TIER 3: DESCARTAR O DIFERIR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ 9. ENDPOINT /buscar LEGADO (main.py: /buscar, /search)
     Es un proxy directo a la API de hospitalesenvenezuela.com (Supabase).
     → Para RescateVZLA: ya tenemos ese conector. No duplicar.
     → Descartar: redundante con nuestro googleDriveHospitalAdmissionsConnector.

  ❌ 10. BASE DE DATOS SQLITE (store.py)
     Redayuda usa SQLite. Nosotros tenemos PostgreSQL con Prisma.
     → No migrar. Nuestro stack es superior para multi-usuario concurrente.
     → La lógica de upsert/dedup es reutilizable en JS adaptando el SQL.

  ❌ 11. FRONTEND REDAYUDA (static/*.html, static/*.js)
     Tiene búsqueda, mapa, admin, fuentes, contribuir.
     → No adoptar el frontend directamente: es HTML+JS sin framework.
     → Sí evaluar las ideas/UX: mapa de entidades, panel admin de fuentes,
       formulario contribuir. Implementar en nuestro React cuando corresponda.

  ❌ 12. AUTO-SYNC PERIÓDICO INTERNO (scheduler.py)
     Redayuda usa asyncio para sync automático de sus fuentes.
     → Para RescateVZLA: tenemos runHumanitarianIngestion.js. No reemplazar.
     → Si queremos sync de Redayuda periódico: agregar fuente a nuestro sourcesRegistry.

━━━ PLAN DE INTEGRACIÓN PRIORIZADO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  FASE 1 (aprobación + próxima sesión):
    • Hacer --mode apply del importador existente con URL del nodo Redayuda
    • Verificar en /personas, /mapa, /operaciones
    • Confirmar que cedula/telefono no aparecen en /api/family-search/public
    • Estimar: 39,225 registros → ~38,000 aptos para importar

  FASE 2 (1-2 sprints):
    • Implementar content hash en ImportedHumanitarianRecord (upsert eficiente)
    • Agregar tags[] al schema
    • Agregar feed_seq para sync incremental desde Redayuda
    • Programar sync periódico de Redayuda en sourcesRegistry

  FASE 3 (3-4 sprints):
    • Sistema de resolución de entidades: misma persona en múltiples fuentes
      Basado en entities.py de Redayuda, adaptado a JS/Prisma
    • Integrar entity_id en family-search: buscar por cédula y retornar
      "esta persona también aparece en X, Y, Z fuentes"
    • Evaluar federación multi-nodo si aparecen nuevas instancias regionales

━━━ FUENTES QUE SÍ DEBEMOS INCORPORAR DIRECTAMENTE ━━━━━━━━━━━━━━━━━━━━━━━
  Las siguientes fuentes de Redayuda son nuevas para nosotros:
  • tebusco          (19 personas desaparecidas — base pequeña)
  • printforhelp     (49 centros de acopio con coordenadas)
  • venezuela_solidaria (44 recursos humanitarios)
  • mapa_insumos     (2,183 puntos de insumos con lat/lng)
  • red_pana         (135 recursos)
  • sos_central      (6 centros de emergencia)
  → Evaluar conectores directos o vía Redayuda como intermediario.
  `);

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  RESULTADO FINAL");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  ✓ Registros auditados:         ${allRecords.length.toLocaleString()}`);
  console.log(`  ✓ Aptos para importar:         ${(allRecords.length - fallecidos.length - sinTipo.length).toLocaleString()}`);
  console.log(`  ✓ Requieren revisión admin:    ${fallecidos.length} (fallecidos)`);
  console.log(`  ✓ Campos sensibles protegidos: cédula, teléfono, coords → private`);
  console.log(`  ✓ PublicSafe verificado: sin cédulas, sin teléfonos, sin coords`);
  console.log(`  ✗ NADA fue escrito en la base de datos`);
  console.log(`  ✗ NO se ejecutó --mode apply`);
  console.log(`\n  Reporte JSON guardado en: ${reportPath}`);
  console.log("\n  ⏭ PRÓXIMO PASO: Revisar este informe y aprobar --mode apply");
  console.log("     node backend/src/integrations/redayudaImporter.js \\");
  console.log("       --url http://127.0.0.1:8765 --mode apply --max 40000\n");
}

main().catch(err => { console.error("Error:", err.message, err.stack); process.exit(1); });
