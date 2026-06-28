import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { parseExcelFile } from "../src/ingestion/excelConnector.js";
import { CollectionCenterNormalizer } from "../src/ingestion/collectionCenterNormalizer.js";
import { DataQualityScoringService } from "../src/ingestion/dataQualityScoringService.js";
import { HumanitarianImporter } from "../src/ingestion/humanitarianImporter.js";
import { HumanitarianNormalizer } from "../src/ingestion/humanitarianNormalizer.js";
import { HumanitarianDeduplicationService } from "../src/ingestion/humanitarianDeduplicationService.js";
import { IngestionPrivacyService } from "../src/ingestion/ingestionPrivacyService.js";
import { isImportableHumanitarianRecord, isUsefulRawRecord } from "../src/ingestion/ingestionRecordQuality.js";
import { extractDriveItems, parseHospitalAdmissionRows, parseHospitalAdmissionText } from "../src/ingestion/googleDriveHospitalAdmissionsConnector.js";
import { approvePublicSafeRecords } from "../src/ingestion/approvePublicSafeRecords.js";
import { fetchRescateVenezuela } from "../src/ingestion/rescateVenezuelaConnector.js";
import { parseCliArgs } from "../src/ingestion/runHumanitarianIngestion.js";
import { prisma } from "../src/config/prisma.js";

const source = { name: "Fuente publica", url: "https://example.org" };

test("HumanitarianNormalizer keeps imported records unverified and stores raw payload", () => {
  const raw = { nombre: "Ana Perez", edad: 28, estado: "Miranda", telefono: "04121234567", descripcion: "Vista en zona afectada" };
  const record = HumanitarianNormalizer.normalize(raw, source);

  assert.equal(record.verificationStatus, "NO_VERIFICADO");
  assert.equal(record.sourceName, source.name);
  assert.deepEqual(record.rawPayload, raw);
  assert.equal(record.publicSafe.contact, undefined);
});

test("HumanitarianNormalizer stores document, medical and exact location data privately", () => {
  const record = HumanitarianNormalizer.normalize({
    nombre: "Ana Perez",
    cedula: "V-12345678",
    telefono: "0412-1234567",
    informacionMedica: "Requiere insulina",
    alergias: "Penicilina",
    edificio: "Torre Norte",
    piso: "8",
    apartamento: "8B",
    estado: "Desaparecido",
  }, source);

  assert.equal(record.recordType, "missing_person");
  assert.equal(record.documentPrivate.cedula, "V-12345678");
  assert.equal(record.medicalPrivate.informacionMedica, "Requiere insulina");
  assert.equal(record.locationPrivate.apartamento, "8B");
  assert.equal(JSON.stringify(record.publicSafe).includes("12345678"), false);
  assert.equal(JSON.stringify(record.publicSafe).includes("0412"), false);
  assert.equal(JSON.stringify(record.publicSafe).includes("8B"), false);
});

test("Rescate Venezuela connector parses public embedded JSON without exposing bypass behavior", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    status: 200,
    text: async () => "<script type=\"application/json\">{\"records\":[{\"nombre\":\"Persona Publica\",\"cedula\":\"V-12345678\",\"estado\":\"Desaparecido\",\"edificio\":\"Torre A\"}]}</script>",
  });

  try {
    const result = await fetchRescateVenezuela({ name: "Rescate Venezuela", url: "https://desaparecidovenezuela.com/" });
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].recordType, "missing_person");
    assert.equal(result.records[0].cedula, "V-12345678");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Google Drive hospital connector extracts Drive items and parses hospital admission text", () => {
  const html = `
    <div class="JxSEve" aria-label="Listado Google Docs Shared" data-id="doc-12345678901234567890" data-tooltip="Listado Google Docs">
      <strong class="DNoYtb">Listado</strong>
    </div>
    <div class="JxSEve" aria-label="INGRESOS HOSPITALARIOS.pdf PDF Shared" data-id="pdf-12345678901234567890" data-tooltip="INGRESOS HOSPITALARIOS.pdf PDF">
      <strong class="DNoYtb">INGRESOS HOSPITALARIOS.pdf</strong>
    </div>`;
  const items = extractDriveItems(html);
  assert.equal(items.length, 2);
  assert.equal(items[0].mimeType, "application/vnd.google-apps.document");
  assert.equal(items[1].mimeType, "application/pdf");

  const records = parseHospitalAdmissionText(`
    N°\tHOSPITAL\tAPELLIDOS Y NOMBRES\tEDAD
    1
    Hospital Universitario de Caracas
    PERSONA HOSPITALIZADA
    35
  `, { id: "doc-1", name: "Listado", url: "https://docs.google.com/document/d/doc-1/export?format=txt" });

  assert.equal(records.length, 1);
  assert.equal(records[0].recordType, "hospitalized_person");
  assert.equal(records[0].hospitalName, "Hospital Universitario de Caracas");
  assert.equal(records[0].fullName, "PERSONA HOSPITALIZADA");
  assert.equal(records[0].approximateAge, "35");
});

test("Hospitalized records keep clinical/location details private and publicSafe safe", () => {
  const record = HumanitarianNormalizer.normalize({
    recordType: "hospitalized_person",
    fullName: "Persona Hospitalizada",
    approximateAge: "35",
    hospitalName: "Hospital Universitario de Caracas",
    cedula: "V-87654321",
    condition: "Diagnostico sensible",
    room: "402",
    bed: "B",
    floor: "4",
    status: "Hospitalizado",
  }, { name: "SISMO 2026 VZLA - Google Drive Hospitales", url: "https://drive.google.com" });

  assert.equal(record.recordType, "hospitalized_person");
  assert.equal(record.documentPrivate.cedula, "V-87654321");
  assert.equal(record.medicalPrivate.condition, "Diagnostico sensible");
  assert.equal(record.locationPrivate.room, "402");
  assert.equal(record.publicSafe.hospitalName, "Hospital Universitario de Caracas");
  assert.equal(JSON.stringify(record.publicSafe).includes("87654321"), false);
  assert.equal(JSON.stringify(record.publicSafe).includes("Diagnostico sensible"), false);
  assert.equal(JSON.stringify(record.publicSafe).includes("402"), false);
});

test("Google Drive hospital tabular parser skips headers and maps shuffled columns", () => {
  const rows = [
    { Nombre: "Nombre", "Apellido / Segundo Nombre": "Apellido / Segundo Nombre", Edad: "Edad", Municipio: "Municipio", Hospital: "Hospital" },
    { Edad: "34", Hospital: "Hospital Central", Nombre: "Rafael", "Apellido / Segundo Nombre": "González", Municipio: "Libertador", Estado: "Distrito Capital" },
    { Edad: "41", Hospital: "Hospital Vargas", Nombre: "José", Apellido: "Ramírez", Municipio: "La Guaira", Estado: "La Guaira" },
    { Edad: "39", Hospital: "Hospital Victorino Santaella", Nombre: "Carla", Apellido: "Cardozo", Municipio: "Guaicaipuro", Estado: "Miranda" },
    { Edad: "Edad Actualizada", Hospital: "", Nombre: "Edad Actualizada", Apellido: "", Municipio: "", Estado: "" },
    { Edad: "34", Hospital: "Hospital Central", Nombre: "Rafael", "Apellido / Segundo Nombre": "González", Municipio: "Libertador", Estado: "Distrito Capital" },
    { Edad: "", Hospital: "", Nombre: "", Apellido: "", Municipio: "", Estado: "" },
  ];

  const records = parseHospitalAdmissionRows(rows, { id: "sheet-1", name: "Hospitalizados", url: "https://example.org/sheet.csv" });

  assert.equal(records.length, 3);
  assert.deepEqual(records.map((record) => record.fullName), ["Rafael González", "José Ramírez", "Carla Cardozo"]);
  assert.equal(records[0].zone, "Libertador Distrito Capital");
  assert.equal(records[0].zone.includes("González"), false);
  assert.equal(records.some((record) => ["Nombre", "Edad", "Edad Actualizada"].includes(record.fullName)), false);
});

test("HumanitarianNormalizer marks deceased records as private-only", () => {
  const record = HumanitarianNormalizer.normalize({ nombre: "Persona", estado: "fallecido confirmado" }, source);

  assert.equal(record.recordType, "deceased_person_private_only");
  assert.equal(record.privacyLevel, "private_only");
  assert.equal(record.publicSafe.fullName, "Informacion protegida");
});

test("IngestionPrivacyService protects minors and deceased records publicly", () => {
  const minor = IngestionPrivacyService.apply({
    sourceName: source.name,
    sourceUrl: source.url,
    capturedAt: new Date().toISOString(),
    recordType: "missing_person",
    fullName: "Nina Protegida",
    approximateAge: "12",
    status: "desaparecida",
    rawPayload: {},
  });
  const deceased = IngestionPrivacyService.apply({
    sourceName: source.name,
    sourceUrl: source.url,
    capturedAt: new Date().toISOString(),
    recordType: "deceased_person_private_only",
    fullName: "Persona Fallecida",
    approximateAge: "40",
    status: "fallecido confirmado",
    rawPayload: {},
  });

  assert.equal(minor.privacyLevel, "restricted");
  assert.equal(minor.publicSafe.fullName, "Informacion protegida");
  assert.equal(deceased.publicSafe.status, "Informacion protegida");
  assert.equal(deceased.privacyLevel, "private_only");
  assert.equal(deceased.publicSafe.fullName, "Informacion protegida");
});

test("HumanitarianDeduplicationService marks likely duplicates without blocking", () => {
  const [record] = HumanitarianDeduplicationService.mark([
    { sourceRecordId: "new", fullName: "Maria Gonzalez", approximateAge: "31", zone: "Los Teques", hospitalName: "Hospital Central", status: "hospitalizada", description: "camisa azul" },
  ], [
    { id: "existing", fullName: "María González", approximateAge: "31", zone: "Los Teques", hospitalName: "Hospital Central", status: "hospitalizada", description: "camisa azul" },
  ]);

  assert.equal(record.possibleDuplicate, true);
  assert.equal(record.matchedRecordId, "existing");
  assert.equal(record.duplicateScore >= 72, true);
});

test("CollectionCenterNormalizer creates publicSafe without private address, phone or exact coordinates", () => {
  const record = CollectionCenterNormalizer.normalize({
    nombre: "Centro de Acopio Los Teques",
    organizacion: "ONG Local",
    estado: "Miranda",
    municipio: "Guaicaipuro",
    direccion: "Calle 12 casa 4, piso 2, Los Teques",
    telefono: "0412-1234567",
    lat: "10.3447000",
    lng: "-67.0433000",
    recibe: "agua, alimentos, medicinas",
    horario: "8:00 AM - 6:00 PM",
  }, source);

  assert.equal(record.recordType, "collection_center");
  assert.equal(record.verificationStatus, "NO_VERIFICADO");
  assert.equal(record.publicSafe.name, "Centro de Acopio Los Teques");
  assert.equal(record.publicSafe.acceptedItems.includes("agua"), true);
  assert.equal(record.publicSafe.telefono, undefined);
  assert.equal(record.publicSafe.contactPrivate, undefined);
  assert.equal(record.publicSafe.addressPrivate, undefined);
  assert.equal(record.publicSafe.latitudePrivate, undefined);
  assert.equal(record.publicSafe.longitudePrivate, undefined);
  assert.equal(JSON.stringify(record.publicSafe).includes("0412"), false);
  assert.equal(JSON.stringify(record.publicSafe).includes("Calle 12"), false);
});

test("HumanitarianDeduplicationService marks likely collection center duplicates", () => {
  const [record] = HumanitarianDeduplicationService.mark([
    { sourceRecordId: "new-center", recordType: "collection_center", name: "Centro de Acopio Los Teques", organization: "ONG Local", state: "Miranda", municipality: "Guaicaipuro", zone: "Los Teques", acceptedItems: ["agua", "alimentos"] },
  ], [
    { id: "existing-center", recordType: "collection_center", name: "Centro Acopio Los Teques", organization: "ONG Local", state: "Miranda", municipality: "Guaicaipuro", zone: "Los Teques", acceptedItems: ["agua", "alimentos"] },
  ]);

  assert.equal(record.possibleDuplicate, true);
  assert.equal(record.matchedRecordId, "existing-center");
});

test("DataQualityScoringService scores source trust and duplicate factors", () => {
  const scored = DataQualityScoringService.score({
    recordType: "missing_person",
    fullName: "Ana Perez",
    sourceName: "ReliefWeb Venezuela",
    possibleDuplicate: true,
    publicSafe: {},
  }, { trustLevel: "high" });

  assert.equal(scored.confidenceLevel, "medium");
  assert.equal(scored.confidenceFactors.includes("official_or_humanitarian_source"), true);
  assert.equal(scored.confidenceFactors.includes("possible_duplicate"), true);
});

test("ingestion quality rejects full-page CSS and consent text noise", () => {
  assert.equal(isUsefulRawRecord({
    name: "The technical storage or access that is used exclusively for statistical purposes.",
    descripcion: "Without a subpoena, voluntary compliance cannot usually identify you.",
  }), false);
  assert.equal(isImportableHumanitarianRecord({
    recordType: "volunteer_center",
    name: "The technical storage or access that is used exclusively for statistical purposes.",
    description: "@font-face{font-family:Encode Sans Condensed;unicode-range:U+0100}",
  }), false);
});

test("ingestion quality accepts structured humanitarian records", () => {
  assert.equal(isUsefulRawRecord({
    nombre: "Centro de Acopio Los Teques",
    estado: "Miranda",
    municipio: "Guaicaipuro",
    recibe: "agua, alimentos",
  }), true);
  assert.equal(isImportableHumanitarianRecord({
    recordType: "missing_person",
    fullName: "Ana Perez",
    status: "desaparecida",
    state: "Miranda",
    zone: "Los Teques",
  }), true);
});

test("ingestion quality rejects news headlines that are not operational aid points", () => {
  assert.equal(isImportableHumanitarianRecord({
    recordType: "food_point",
    name: "Ciudadanos hacen colas para comprar alimentos en el centro y oeste de Caracas",
    publicLocation: "“Desde la pandemia no veía esto”",
    acceptedItems: [],
    description: "Ciudadanos hacen colas para comprar alimentos en el centro y oeste de Caracas: “Desde la pandemia no veía esto”",
  }), false);
});

test("Excel connector parses xlsx rows", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rescuenet-xlsx-"));
  const file = join(dir, "admissions.xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([{ nombre: "Luis Perez", edad: 44, hospital: "Hospital Central", estado: "hospitalizado" }]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Ingresos");
  XLSX.writeFile(workbook, file);

  const rows = await parseExcelFile(file);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nombre, "Luis Perez");
  assert.equal(rows[0].sourceSheet, "Ingresos");
});

test("CLI parser supports dry-run, audit-only, source and file filters", () => {
  const options = parseCliArgs(["--dry-run", "--audit-only", "--source=vzlayuda", "--file=/tmp/sample.xlsx", "--max-files=50", "--max-records=1000", "--batch-size=100", "--timeout-ms=12000"]);

  assert.equal(options.dryRun, true);
  assert.equal(options.auditOnly, true);
  assert.equal(options.files[0], "/tmp/sample.xlsx");
  assert.equal(options.maxFiles, 50);
  assert.equal(options.maxRecords, 1000);
  assert.equal(options.batchSize, 100);
  assert.equal(options.timeoutMs, 12000);
  assert.equal(options.sources.length, 2);
  assert.equal(options.sources[0].name, "VzlAyuda");
});

test("CLI parser supports all-persons real source group", () => {
  const options = parseCliArgs(["--source=all-persons"]);
  const names = options.sources.map((item) => item.name);

  assert.equal(names.includes("SISMO 2026 VZLA - Google Drive Hospitales"), true);
  assert.equal(names.includes("Rescate Venezuela"), true);
  assert.equal(names.includes("Venezuela Te Busca"), true);
  assert.equal(names.includes("Desaparecidos Terremoto Venezuela"), true);
  assert.equal(names.includes("Encuentralos"), true);
  assert.equal(names.includes("TerremotoVenezuela.app"), true);
  assert.equal(names.includes("Red Ayuda Venezuela"), true);
  assert.equal(names.includes("VzlAyuda"), true);
});

test("CLI parser supports Rescate Venezuela source filter", () => {
  const options = parseCliArgs(["--source=rescatevenezuela"]);

  assert.equal(options.sources.length, 1);
  assert.equal(options.sources[0].name, "Rescate Venezuela");
});

test("CLI parser supports Google Drive hospital source filter", () => {
  const options = parseCliArgs(["--source=google-drive-hospitales"]);

  assert.equal(options.sources.length, 1);
  assert.equal(options.sources[0].name, "SISMO 2026 VZLA - Google Drive Hospitales");
});

test("approvePublicSafeRecords does not touch Prisma without DATABASE_URL", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const report = await approvePublicSafeRecords({ dryRun: true });
    assert.equal(report.databaseAvailable, false);
    assert.equal(report.approved, 0);
  } finally {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

test("HumanitarianImporter dry-run reads local files and writes report without DB writes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rescuenet-ingestion-"));
  const file = join(dir, "records.json");
  const reportDir = join(dir, "reports");
  await writeFile(file, JSON.stringify([{ nombre: "Maria Lopez", edad: 12, estado: "desaparecida", zona: "Los Teques" }]));

  const report = await HumanitarianImporter.run({ sources: [], files: [file], dryRun: true, reportDir });
  const saved = JSON.parse(await readFile(report.importableReportPath, "utf8"));

  assert.equal(report.dryRun, true);
  assert.equal(report.recordsNormalized, 1);
  assert.equal(report.recordsImported, 0);
  assert.equal(report.recordsUpdated, 0);
  assert.equal(report.sourcesConsulted, 1);
  assert.equal(report.sourcesSuccessful, 1);
  assert.equal(report.sourcesFailed, 0);
  assert.equal(typeof report.elapsedMs, "number");
  assert.equal(saved.sources[0].records[0].privacyLevel, "restricted");
});

test("HumanitarianImporter previews manual records without DB writes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rescuenet-manual-preview-"));
  const report = await HumanitarianImporter.run({
    sources: [],
    manualRecords: [{ nombre: "Persona Reportada", edad: 33, estado: "desaparecida", zona: "Caracas" }],
    manualSourceName: "Carga manual prueba",
    dryRun: true,
    reportDir: dir,
  });

  assert.equal(report.recordsExtracted, 1);
  assert.equal(report.recordsNormalized, 1);
  assert.equal(report.recordsImported, 0);
  assert.equal(report.sources[0].sourceName, "Carga manual prueba");
  assert.equal(report.sources[0].records[0].verificationStatus, "NO_VERIFICADO");
});

test("HumanitarianImporter no-DB mode produces importable report and warning", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rescuenet-nodb-"));
  const file = join(dir, "records.json");
  const reportDir = join(dir, "reports");
  await writeFile(file, JSON.stringify([{ nombre: "Carlos Rojas", edad: 36, estado: "a salvo", zona: "Caracas" }]));

  const originalUpsert = prisma.ingestionSource.upsert;
  const originalFindMany = prisma.importedHumanitarianRecord.findMany;
  const originalFindFirst = prisma.importedHumanitarianRecord.findFirst;
  const originalCreate = prisma.importedHumanitarianRecord.create;
  prisma.ingestionSource.upsert = async () => { throw new Error("DB unavailable"); };
  prisma.importedHumanitarianRecord.findMany = async () => { throw new Error("DB unavailable"); };
  prisma.importedHumanitarianRecord.findFirst = async () => { throw new Error("DB unavailable"); };
  prisma.importedHumanitarianRecord.create = async () => { throw new Error("DB unavailable"); };

  try {
    const report = await HumanitarianImporter.run({ sources: [], files: [file], reportDir });
    assert.equal(report.databaseAvailable, false);
    assert.equal(report.recordsNormalized, 1);
    assert.equal(report.recordsImported, 0);
    assert.equal(report.warnings.some((warning) => warning.includes("Database is unavailable")), true);
    assert.equal(typeof report.importableReportPath, "string");
  } finally {
    prisma.ingestionSource.upsert = originalUpsert;
    prisma.importedHumanitarianRecord.findMany = originalFindMany;
    prisma.importedHumanitarianRecord.findFirst = originalFindFirst;
    prisma.importedHumanitarianRecord.create = originalCreate;
  }
});
