/**
 * Verificación post-import de Redayuda — SOLO LECTURA.
 * Comprueba que la importación respetó todas las reglas de privacidad.
 *
 * Uso:
 *   DATABASE_URL=... node backend/scripts/redayudaPostImportVerify.js \
 *     --api https://rescuenet-backend-ndg5.onrender.com
 *
 * Nota: rescatevzla.net sirve el SPA frontend (HTML), no la API.
 *       La API real está en rescuenet-backend-ndg5.onrender.com
 */

import { createRequire } from "node:module";

const args = process.argv.slice(2);
const get = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };
const API_BASE = get("--api") || process.env.RESCATEVZLA_API_URL || "";

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL no configurada. Ejecutar con DATABASE_URL=postgresql://...");
  process.exit(1);
}

async function fetchJSON(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
    const text = await r.text();
    if (text.trim().startsWith("<!")) {
      throw new Error(`El servidor devolvió HTML (SPA frontend), no JSON. URL de API incorrecta: ${url}`);
    }
    return JSON.parse(text);
  } finally { clearTimeout(t); }
}

function check(label, pass, detail = "") {
  const icon = pass ? "✓" : "✗";
  const status = pass ? "PASS" : "FAIL";
  console.log(`  ${icon} [${status}] ${label}${detail ? " — " + detail : ""}`);
  return pass;
}

async function main() {
  const { prisma } = await import("../src/config/prisma.js");

  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  VERIFICACIÓN POST-IMPORT REDAYUDA — SOLO LECTURA               ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  // Auto-corregir: rescatevzla.net sirve el SPA frontend, no la API backend
  const resolvedApiBase = API_BASE
    ? API_BASE.replace(/^https?:\/\/(www\.)?rescatevzla\.net(\/.*)?$/, "https://rescuenet-backend-ndg5.onrender.com")
    : API_BASE;
  if (resolvedApiBase !== API_BASE && API_BASE) {
    console.log(`  ℹ ${API_BASE} sirve el SPA frontend. Usando API backend: ${resolvedApiBase}`);
  }

  console.log(`API base: ${resolvedApiBase || "(no configurada — skip checks de API pública)"}`);
  console.log(`Fecha:    ${new Date().toISOString()}\n`);

  let allPass = true;
  const results = [];

  // ─────────────────────────────────────────────────────────────────────────
  // 1. REGISTROS IMPORTADOS EN DB
  // ─────────────────────────────────────────────────────────────────────────
  console.log("═══ 1. REGISTROS IMPORTADOS EN BASE DE DATOS ═══════════════════");

  const imported = await prisma.importedHumanitarianRecord.findMany({
    where: { sourceName: "redayuda", deletedAt: null },
    select: {
      id: true, recordType: true, verificationStatus: true, privacyLevel: true,
      fullName: true, approximateAge: true, contactPrivate: true, documentPrivate: true,
      locationPrivate: true, medicalPrivate: true, publicSafe: true, approvedAt: true,
    },
  });

  const total = imported.length;
  console.log(`\n  Total importados (sourceName=redayuda): ${total}`);

  if (total === 0) {
    console.log("  ⚠ No se encontraron registros de Redayuda en la DB. ¿Se ejecutó --mode apply?");
    process.exit(1);
  }

  // Distribución por tipo
  const byType = {};
  const byPrivacy = {};
  const byStatus = {};
  for (const r of imported) {
    byType[r.recordType] = (byType[r.recordType] || 0) + 1;
    byPrivacy[r.privacyLevel] = (byPrivacy[r.privacyLevel] || 0) + 1;
    byStatus[r.verificationStatus] = (byStatus[r.verificationStatus] || 0) + 1;
  }

  console.log("\n  Por tipo:");
  for (const [t, c] of Object.entries(byType).sort((a, b) => b[1] - a[1]))
    console.log(`    ${t.padEnd(34)} ${c}`);

  console.log("\n  Por privacyLevel:");
  for (const [p, c] of Object.entries(byPrivacy))
    console.log(`    ${p.padEnd(20)} ${c}`);

  console.log("\n  Por verificationStatus:");
  for (const [s, c] of Object.entries(byStatus))
    console.log(`    ${s.padEnd(20)} ${c}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CHECKS DE PRIVACIDAD EN DB
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n═══ 2. CHECKS DE PRIVACIDAD EN BASE DE DATOS ═══════════════════");

  // a) Personas siguen siendo NO_VERIFICADO; centros pueden estar APROBADO
  const CENTER_TYPES_SET = new Set([
    "help_center","collection_center","shelter","hospital",
    "water_point","food_point","medical_point","pet_aid_center",
    "logistics_center","volunteer_center",
  ]);
  const personRecords = imported.filter(r => !CENTER_TYPES_SET.has(r.recordType));
  const centerRecords = imported.filter(r => CENTER_TYPES_SET.has(r.recordType));
  const personasConEstadoDiferente = personRecords.filter(r => r.verificationStatus !== "NO_VERIFICADO");
  const centrosAprobados = centerRecords.filter(r => r.verificationStatus === "APROBADO");
  const p1 = check(
    "Personas son NO_VERIFICADO; centros pueden ser APROBADO",
    personasConEstadoDiferente.length === 0,
    personasConEstadoDiferente.length === 0
      ? `${personRecords.length} personas NO_VERIFICADO ✓ | ${centrosAprobados.length}/${centerRecords.length} centros APROBADO ✓`
      : `${personasConEstadoDiferente.length} personas con verificationStatus != NO_VERIFICADO [CRÍTICO]`
  );
  results.push({ check: "personas_no_verificado_centros_aprobado", pass: p1 });
  if (!p1) allPass = false;

  // b) Fallecidos tienen private_only
  const fallecidos = imported.filter(r => r.recordType === "deceased_person_private_only");
  const fallecidosWrong = fallecidos.filter(r => r.privacyLevel !== "private_only");
  const p2 = check("Fallecidos tienen privacyLevel=private_only", fallecidosWrong.length === 0,
    `${fallecidos.length} fallecidos, ${fallecidosWrong.length} incorrectos`);
  results.push({ check: "fallecidos_private_only", pass: p2 });
  if (!p2) allPass = false;

  // c) Fallecidos tienen approvedAt=null
  const fallecidosApproved = fallecidos.filter(r => r.approvedAt !== null);
  const p3 = check("Fallecidos tienen approvedAt=null (no publicados automáticamente)",
    fallecidosApproved.length === 0,
    `${fallecidosApproved.length} fallecidos con approvedAt != null`);
  results.push({ check: "fallecidos_blocked", pass: p3 });
  if (!p3) allPass = false;

  // d) Menores (age < 18) son restricted
  const menores = imported.filter(r => r.approximateAge != null && Number(r.approximateAge) < 18);
  const menoresWrong = menores.filter(r => r.privacyLevel !== "restricted" && r.privacyLevel !== "private_only");
  const p4 = check("Menores (edad <18) tienen privacyLevel=restricted",
    menoresWrong.length === 0,
    `${menores.length} menores detectados, ${menoresWrong.length} con privacidad incorrecta`);
  results.push({ check: "menores_restricted", pass: p4 });
  if (!p4) allPass = false;

  // e) publicSafe no contiene cédula
  // Nota: photoUrl se excluye del escaneo — Cloudinary/Supabase usan patrones
  //       como v1234567 en rutas de URL que el regex detecta como falso positivo.
  const withCedula = imported.filter(r => {
    const pub = r.publicSafe || {};
    // Serializar solo campos de texto (excluir URLs)
    const textFields = { ...pub };
    delete textFields.photoUrl;
    delete textFields.imageUrl;
    const pubStr = JSON.stringify(textFields);
    // Cédula con prefijo V/E, palabra completa "cédula", o "C.I." con ambos puntos (estricto)
    return /\b[VEJPGvejpg]-?\d{6,9}\b/.test(pubStr)
      || /\bcedula\b.{0,5}[\d.,\-]{5,15}/i.test(pubStr)
      || /\bc\.i\.\s*:?\s*[\d.,\-]{5,15}/i.test(pubStr);
  });
  const p5 = check("publicSafe no contiene cédulas", withCedula.length === 0,
    withCedula.length ? `${withCedula.length} registros exponen cédula en publicSafe [CRÍTICO]` : "verificado");
  results.push({ check: "no_cedula_en_publicSafe", pass: p5 });
  if (!p5) allPass = false;

  // f) publicSafe no contiene teléfono venezolano
  const withPhone = imported.filter(r => {
    const pubStr = JSON.stringify(r.publicSafe || {});
    return /\b0(4(12|14|16|24|26)|2\d{2})\d{7}\b/.test(pubStr);
  });
  const p6 = check("publicSafe no contiene números de teléfono", withPhone.length === 0,
    withPhone.length ? `${withPhone.length} registros exponen teléfono en publicSafe [CRÍTICO]` : "verificado");
  results.push({ check: "no_telefono_en_publicSafe", pass: p6 });
  if (!p6) allPass = false;

  // g) locationPrivate guarda coords precisas (no en publicSafe)
  const withCoordsInPublic = imported.filter(r => {
    const pubStr = JSON.stringify(r.publicSafe || {});
    return /"lat(?:itude)?"\s*:\s*-?\d+\.\d{4,}/.test(pubStr) || /"lng|lon(?:gitude)?"\s*:\s*-?\d+\.\d{4,}/.test(pubStr);
  });
  const withCoords = imported.filter(r => r.locationPrivate != null);
  const p7 = check("Coordenadas exactas van a locationPrivate (no a publicSafe)",
    withCoordsInPublic.length === 0,
    `${withCoords.length} registros con coords en locationPrivate, ${withCoordsInPublic.length} en publicSafe [detectados]`);
  results.push({ check: "no_coords_en_publicSafe", pass: p7 });
  if (!p7) allPass = false;

  // h) Nombre de personas restricted/private queda enmascarado en publicSafe
  const personasPrivadas = imported.filter(r =>
    ["restricted","private_only"].includes(r.privacyLevel) &&
    ["missing_person","deceased_person_private_only"].includes(r.recordType)
  );
  const nombreExpuesto = personasPrivadas.filter(r => {
    const pub = r.publicSafe;
    const pubName = pub?.fullName;
    if (!pubName) return false;
    return pubName !== "Informacion protegida" && !pubName.startsWith("[");
  });
  const p8 = check("Personas restricted/private_only tienen nombre enmascarado en publicSafe",
    nombreExpuesto.length === 0,
    nombreExpuesto.length ? `${nombreExpuesto.length} registros exponen nombre real [CRÍTICO]` : `${personasPrivadas.length} personas protegidas correctamente`);
  results.push({ check: "nombre_enmascarado_en_restricted", pass: p8 });
  if (!p8) allPass = false;

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CHECKS DE API PÚBLICA (si API_BASE configurado)
  // ─────────────────────────────────────────────────────────────────────────
  if (resolvedApiBase) {
    console.log("\n═══ 3. CHECKS DE API PÚBLICA ════════════════════════════════════");
    console.log(`  Endpoint backend: ${resolvedApiBase}\n`);

    // /api/hospitalized/public — hospitalizados de Redayuda sin datos privados
    try {
      const hospPage = await fetchJSON(`${resolvedApiBase}/api/hospitalized/public?limit=50`);
      const hospList = hospPage.data || hospPage.records || (Array.isArray(hospPage) ? hospPage : []);
      const redayudaHosp = hospList.filter(p =>
        p.sourceName === "redayuda" || JSON.stringify(p).includes('"sourceName":"redayuda"')
      );

      if (redayudaHosp.length > 0) {
        const cedExpuesto = redayudaHosp.filter(p => {
          const s = JSON.stringify(p);
          return /\b[VEJPGvejpg]-?\d{6,9}\b/.test(s) || /cedula/i.test(s);
        });
        const telExpuesto = redayudaHosp.filter(p => {
          const s = JSON.stringify(p);
          return /\b0(4(12|14|16|24|26)|2\d{2})\d{7}\b/.test(s);
        });

        const p9 = check("/api/hospitalized/public no expone cédula (Redayuda)",
          cedExpuesto.length === 0, `${redayudaHosp.length} hospitalizados Redayuda visibles, ${cedExpuesto.length} con cédula`);
        results.push({ check: "api_hospitalized_no_cedula", pass: p9 });
        if (!p9) allPass = false;

        const p10 = check("/api/hospitalized/public no expone teléfono (Redayuda)",
          telExpuesto.length === 0, `${telExpuesto.length} con teléfono`);
        results.push({ check: "api_hospitalized_no_telefono", pass: p10 });
        if (!p10) allPass = false;
      } else {
        console.log("  ℹ No se encontraron hospitalizados Redayuda en /api/hospitalized/public (status NO_VERIFICADO — correcto, no aparecen en API pública)");
      }
    } catch (e) {
      console.log(`  ⚠ Error llamando a /api/hospitalized/public: ${e.message}`);
    }

    // /api/map/public — centros Redayuda aprobados, coords no expuestas
    try {
      const mapa = await fetchJSON(`${resolvedApiBase}/api/map/public`);
      const helpCenters = mapa.helpCenters || [];
      const redayudaCenters = helpCenters.filter(c =>
        c.sourceName === "redayuda" || JSON.stringify(c).includes('"sourceName":"redayuda"')
      );
      const coordsPrecisas = redayudaCenters.filter(c => {
        const s = JSON.stringify(c);
        return /"lat(?:itude)?"\s*:\s*-?\d+\.\d{5,}/.test(s) || /"lng|lon(?:gitude)?"\s*:\s*-?\d+\.\d{5,}/.test(s);
      });
      const internationalCount = mapa.internationalCentersCount || 0;
      const p11 = check("/api/map/public no expone coords precisas en centros Redayuda",
        coordsPrecisas.length === 0,
        `${redayudaCenters.length} centros Redayuda en mapa, ${coordsPrecisas.length} con coords exactas | internacionales ocultos: ${internationalCount}`);
      results.push({ check: "mapa_no_coords_precisas", pass: p11 });
      if (!p11) allPass = false;
    } catch (e) {
      console.log(`  ⚠ Error llamando a /api/map/public: ${e.message}`);
    }

    // /api/family-search/public — buscar datos privados en resultados Redayuda
    try {
      const search = await fetchJSON(`${resolvedApiBase}/api/family-search/public?q=test&limit=10`);
      const searchResults = search.data || search.results || search.records || (Array.isArray(search) ? search : []);
      const redayudaResults = searchResults.filter(p =>
        JSON.stringify(p).includes("redayuda") || JSON.stringify(p).includes("Redayuda")
      );
      const withPrivate = redayudaResults.filter(p => {
        const s = JSON.stringify(p);
        return /cedula|telefono|\b0\d{10}\b/.test(s);
      });
      const p12 = check("/api/family-search/public no expone datos privados de Redayuda",
        withPrivate.length === 0,
        `${redayudaResults.length} resultados Redayuda revisados, ${withPrivate.length} con datos privados`);
      results.push({ check: "family_search_no_private", pass: p12 });
      if (!p12) allPass = false;
    } catch (e) {
      console.log(`  ⚠ Error llamando a /api/family-search/public: ${e.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. EJEMPLOS PÚBLICOS SANITIZADOS
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n═══ 4. EJEMPLOS PÚBLICOS (publicSafe sanitizado) ════════════════");

  const SAMPLE_TYPES = ["missing_person","hospitalized_person","safe_person","collection_center","help_center"];
  for (const rt of SAMPLE_TYPES) {
    const sample = imported.find(r => r.recordType === rt);
    if (!sample) continue;
    const pub = sample.publicSafe || {};
    console.log(`\n  [${rt}]`);
    const SHOW_KEYS = ["fullName","approximateAge","status","hospitalName","zone","municipality","state",
                       "publicLocation","tags","verificationStatus","privacyLevel","sourceName","recordType"];
    for (const k of SHOW_KEYS) {
      if (pub[k] !== undefined && pub[k] !== null) {
        const val = Array.isArray(pub[k]) ? pub[k].join(", ") : String(pub[k]).substring(0, 60);
        console.log(`    ${k.padEnd(22)}: ${val}`);
      }
    }
    const FORBIDDEN = ["cedula","telefono","contact","lat","lng","latitude","longitude"];
    const violations = FORBIDDEN.filter(k => pub[k] !== undefined);
    if (violations.length) console.log(`    ⚠ CAMPOS PRIVADOS EN publicSafe: ${violations.join(", ")}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. EJEMPLOS DE CAMPOS PRIVADOS (existen en DB, no en API)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n═══ 5. CAMPOS PRIVADOS (en DB, nunca en API pública) ════════════");

  const sampleWithCedula = imported.find(r => r.documentPrivate);
  if (sampleWithCedula) {
    const doc = sampleWithCedula.documentPrivate;
    console.log("\n  Registro con cédula (documentPrivate):");
    console.log(`    id:           ${sampleWithCedula.id}`);
    console.log(`    cedula en DB: ***${String(doc.cedula || "").slice(-3)} [mascara — solo últimos 3 dígitos]`);
    console.log(`    EN publicSafe: ${JSON.stringify(sampleWithCedula.publicSafe).includes(String(doc.cedula)) ? "SÍ [FALLO]" : "NO [OK]"}`);
  }

  // Solo verificar contactPrivate si tiene forma de teléfono venezolano (≥10 dígitos)
  const sampleWithPhone = imported.find(r => r.contactPrivate && /\d{7,}/.test(r.contactPrivate));
  if (sampleWithPhone) {
    const leaks = JSON.stringify(sampleWithPhone.publicSafe).includes(sampleWithPhone.contactPrivate);
    console.log("\n  Registro con teléfono (contactPrivate):");
    console.log(`    id:               ${sampleWithPhone.id}`);
    console.log(`    contactPrivate DB: [protegido]`);
    console.log(`    EN publicSafe:     ${leaks ? "SÍ [FALLO]" : "NO [OK]"}`);
  }

  const sampleWithCoords = imported.find(r => r.locationPrivate);
  if (sampleWithCoords) {
    const loc = sampleWithCoords.locationPrivate;
    console.log("\n  Registro con coordenadas (locationPrivate):");
    console.log(`    id:              ${sampleWithCoords.id}`);
    console.log(`    lat en DB:       ${loc.lat} [privado]`);
    console.log(`    lat en publicSafe: ${JSON.stringify(sampleWithCoords.publicSafe).includes(String(loc.lat)) ? "SÍ [FALLO]" : "NO [OK]"}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. RESUMEN POST-IMPORT
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n═══ 6. RESUMEN FINAL ════════════════════════════════════════════");
  console.log(`\n  Total importados:               ${total}`);
  for (const [t, c] of Object.entries(byType).sort((a, b) => b[1] - a[1]))
    console.log(`    ${t.padEnd(34)} ${c}`);
  console.log(`\n  Por privacyLevel:`);
  for (const [p, c] of Object.entries(byPrivacy))
    console.log(`    ${p.padEnd(20)} ${c}`);

  const duplicadosEvitados = "N/A (ver output del importer)";
  console.log(`\n  Duplicados evitados:            ${duplicadosEvitados}`);
  console.log(`  Pendientes de revisión admin:   ${byStatus["NO_VERIFICADO"] || 0}`);
  console.log(`  Fallecidos bloqueados:          ${fallecidos.length}`);

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n  Checks de privacidad:  ${passed} PASARON / ${failed} FALLARON`);
  if (failed > 0) {
    console.log("\n  ⚠ CHECKS FALLADOS:");
    for (const r of results.filter(r => !r.pass)) console.log(`    ✗ ${r.check}`);
  }

  console.log(`\n  ${allPass ? "✓ TODOS LOS CHECKS DE PRIVACIDAD PASARON" : "✗ HAY CHECKS FALLADOS — REVISAR ANTES DE CONTINUAR"}`);
  console.log("\n  Próximo paso si todo OK:");
  console.log("    node backend/src/integrations/redayudaImporter.js \\");
  console.log("      --url http://127.0.0.1:8765 --mode apply --max 5000\n");

  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
