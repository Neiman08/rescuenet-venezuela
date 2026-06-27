import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { prisma } from "../config/prisma.js";
import { fetchCollectionCenterSource } from "./collectionCentersConnector.js";
import { parseCsv } from "./csvConnector.js";
import { DataQualityScoringService } from "./dataQualityScoringService.js";
import { parseExcelFile } from "./excelConnector.js";
import { enabledSources } from "./sourcesRegistry.js";
import { HumanitarianNormalizer } from "./humanitarianNormalizer.js";
import { HumanitarianDeduplicationService } from "./humanitarianDeduplicationService.js";
import { IngestionAuditService } from "./ingestionAuditService.js";
import { isImportableHumanitarianRecord } from "./ingestionRecordQuality.js";
import { fetchDesaparecidosTerremoto } from "./desaparecidosTerremotoConnector.js";
import { fetchEncuentralos } from "./encuentralosConnector.js";
import { fetchGoogleDriveHospitalAdmissions } from "./googleDriveHospitalAdmissionsConnector.js";
import { fetchReliefWeb } from "./reliefWebConnector.js";
import { fetchRescateVenezuela } from "./rescateVenezuelaConnector.js";
import { scrapeRedAyudaVenezuela } from "./redAyudaVenezuelaScraper.js";
import { fetchTerremotoVenezuela } from "./terremotoVenezuelaConnector.js";
import { fetchVenezuelaTeBusca } from "./venezuelaTeBuscaConnector.js";
import { scrapeVzlAyuda } from "./vzlAyudaScraper.js";
import { auditSourceConnectivity } from "./sourceConnectivityAudit.js";

function scraperFor(source) {
  if (source.connector === "venezuela_te_busca") return fetchVenezuelaTeBusca;
  if (source.connector === "desaparecidos_terremoto") return fetchDesaparecidosTerremoto;
  if (source.connector === "encuentralos") return fetchEncuentralos;
  if (source.connector === "terremoto_venezuela") return fetchTerremotoVenezuela;
  if (source.connector === "rescate_venezuela") return fetchRescateVenezuela;
  if (source.connector === "google_drive_hospital_admissions") return fetchGoogleDriveHospitalAdmissions;
  if (source.connector === "reliefweb_api") return fetchReliefWeb;
  if ((source.priority || []).some((type) => ["collection_center", "help_center", "water_point", "food_point", "medical_point", "volunteer_center"].includes(type))) {
    return fetchCollectionCenterSource;
  }
  if (/red ayuda/i.test(source.name)) return scrapeRedAyudaVenezuela;
  if (/vzl/i.test(source.name)) return scrapeVzlAyuda;
  return scrapeVzlAyuda;
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

async function recordsFromFile(file) {
  const extension = extname(file).toLowerCase();
  if (extension === ".csv") return parseCsv(await readFile(file, "utf8"));
  if (extension === ".json") {
    const payload = JSON.parse(await readFile(file, "utf8"));
    if (Array.isArray(payload)) return payload;
    return payload.records || payload.data || [payload];
  }
  if (extension === ".xlsx" || extension === ".xls") return parseExcelFile(file);
  throw new Error(`Unsupported ingestion file type: ${extension || "unknown"}`);
}

function sourceTypeFromFile(file) {
  const extension = extname(file).toLowerCase();
  if (extension === ".xlsx" || extension === ".xls") return "EXCEL";
  if (extension === ".csv") return "CSV";
  if (extension === ".json") return "JSON";
  return "MANUAL";
}

async function safeCreateRun(source) {
  try {
    const dbSource = await prisma.ingestionSource.upsert({
      where: { name: source.name },
      update: { url: source.url, type: source.type, trustLevel: source.trustLevel, enabled: source.enabled, lastFetchedAt: new Date() },
      create: { name: source.name, url: source.url, type: source.type, trustLevel: source.trustLevel, enabled: source.enabled, lastFetchedAt: new Date() },
    });
    const run = await prisma.ingestionRun.create({ data: { sourceId: dbSource.id, status: "RUNNING" } });
    return { dbSource, run };
  } catch {
    return { dbSource: undefined, run: undefined };
  }
}

async function existingPeople() {
  if (!hasDatabaseUrl()) return [];
  try {
    return await prisma.importedHumanitarianRecord.findMany({
      where: {
        deletedAt: null,
        recordType: {
          in: [
            "missing_person",
            "hospitalized_person",
            "safe_person",
            "rescued_person",
            "trapped_person",
            "collection_center",
            "shelter",
            "hospital",
            "help_center",
            "water_point",
            "food_point",
            "medical_point",
            "volunteer_center",
            "donation_need",
          ],
        },
      },
      take: 1000,
    });
  } catch {
    return [];
  }
}

async function persist(records, source, run, { dryRun = false, batchSize = 100 } = {}) {
  if (dryRun) return { imported: 0, updated: 0 };
  if (!hasDatabaseUrl() || !source || !run) return { imported: 0, updated: 0 };
  let updated = 0;
  let imported = 0;
  for (let offset = 0; offset < records.length; offset += batchSize) {
    const batch = records.slice(offset, offset + batchSize);
    for (const record of batch) {
      try {
        const existing = record.sourceRecordId
          ? await prisma.importedHumanitarianRecord.findFirst({
            where: { sourceName: record.sourceName, sourceRecordId: record.sourceRecordId, deletedAt: null },
          })
          : null;
        const data = {
          ...record,
          sourceId: source?.id,
          ingestionRunId: run?.id,
          capturedAt: new Date(record.capturedAt),
          duplicateScore: record.duplicateScore,
        };
        if (existing) {
          await prisma.importedHumanitarianRecord.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await prisma.importedHumanitarianRecord.create({ data });
          imported += 1;
        }
      } catch {
        break;
      }
    }
  }
  return { imported, updated };
}

async function writeImportableReport(report, reportDir = join(process.cwd(), "reports", "ingestion")) {
  const dir = reportDir;
  await mkdir(dir, { recursive: true });
  const path = join(dir, `humanitarian-ingestion-${Date.now()}.json`);
  await writeFile(path, JSON.stringify(report, null, 2));
  return path;
}

function boundedPositiveInteger(value, fallback, max = 10_000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.floor(number), max);
}

export class HumanitarianImporter {
  static async run({ sources = enabledSources(), files = [], manualRecords = [], manualSourceName = "Manual protected upload", dryRun = false, auditOnly = false, writeReport = true, reportDir, maxFiles, maxRecords, batchSize, timeoutMs } = {}) {
    const finalReport = {
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
      dryRun,
      auditOnly,
      databaseAvailable: true,
      warnings: [],
      sources: [],
      recordsExtracted: 0,
      recordsNormalized: 0,
      recordsImported: 0,
      recordsUpdated: 0,
      recordsBlockedByPrivacy: 0,
      possibleDuplicates: 0,
      sourcesConsulted: 0,
      sourcesSuccessful: 0,
      sourcesFailed: 0,
      elapsedMs: undefined,
      importableReportPath: undefined,
    };

    const existing = dryRun || auditOnly ? [] : await existingPeople();
    const databaseConfigured = hasDatabaseUrl();
    const recordLimit = boundedPositiveInteger(maxRecords, undefined);
    const fileLimit = boundedPositiveInteger(maxFiles, undefined);
    const writeBatchSize = boundedPositiveInteger(batchSize, 100, 1000);
    const fetchTimeoutMs = boundedPositiveInteger(timeoutMs, undefined, 60_000);

    if (dryRun) finalReport.warnings.push("Dry-run enabled: no database writes were attempted.");
    if (auditOnly) finalReport.warnings.push("Audit-only enabled: sources were checked but records were not imported.");
    if (!dryRun && !auditOnly && !databaseConfigured) {
      finalReport.databaseAvailable = false;
      finalReport.warnings.push("DATABASE_URL is not configured. Generated JSON report can be imported later.");
    }

    const fileSources = files.map((file) => ({
      name: `Local file: ${basename(file)}`,
      url: file,
      type: sourceTypeFromFile(file),
      trustLevel: "manual_review_required",
      enabled: true,
      file,
    }));
    const inlineSources = manualRecords.length ? [{
      name: manualSourceName,
      url: "manual-upload",
      type: "MANUAL",
      trustLevel: "manual_review_required",
      enabled: true,
      records: manualRecords,
    }] : [];

    for (const source of [...sources, ...fileSources, ...inlineSources].map((source) => ({
      ...source,
      ...(recordLimit ? { maxRecords: source.maxRecords || recordLimit } : {}),
      ...(fileLimit ? { maxFiles: source.maxFiles || fileLimit } : {}),
      ...(fetchTimeoutMs ? { timeoutMs: source.timeoutMs || fetchTimeoutMs } : {}),
    }))) {
      const sourceStartedAt = Date.now();
      finalReport.sourcesConsulted += 1;
      const sourceReport = {
        sourceName: source.name,
        sourceUrl: source.url,
        connector: source.connector || (source.file ? "file" : "html"),
        extracted: 0,
        normalized: 0,
        imported: 0,
        updated: 0,
        possibleDuplicates: 0,
        connectivity: source.file || source.records ? { ok: true, connector: source.file ? "file" : "manual-upload" } : undefined,
        elapsedMs: undefined,
        errors: [],
      };
      const { dbSource, run } = dryRun || auditOnly || !databaseConfigured ? { dbSource: undefined, run: undefined } : await safeCreateRun(source);
      if (!dryRun && !auditOnly && !run) {
        finalReport.databaseAvailable = false;
        if (!finalReport.warnings.includes("Database is unavailable or not migrated. Generated JSON report can be imported later.")) {
          finalReport.warnings.push("Database is unavailable or not migrated. Generated JSON report can be imported later.");
        }
      }
      try {
        if (!source.file) sourceReport.connectivity = await auditSourceConnectivity(source);
        if (auditOnly) {
          finalReport.sourcesSuccessful += sourceReport.connectivity?.ok ? 1 : 0;
          finalReport.sourcesFailed += sourceReport.connectivity?.ok ? 0 : 1;
          sourceReport.elapsedMs = Date.now() - sourceStartedAt;
          finalReport.sources.push(sourceReport);
          continue;
        }
        const scrape = source.records
          ? { kind: "manual-upload", records: source.records }
          : source.file
          ? { kind: "file", records: await recordsFromFile(source.file) }
          : await scraperFor(source)(source);
        sourceReport.extracted = scrape.records.length;
        sourceReport.filesDetected = scrape.files?.length || undefined;
        sourceReport.unparseable = scrape.unparseable || undefined;
        const rawRecords = recordLimit ? scrape.records.slice(0, recordLimit) : scrape.records;
        const normalized = HumanitarianNormalizer.normalizeMany(rawRecords, source).filter(isImportableHumanitarianRecord);
        sourceReport.filteredOut = sourceReport.extracted - normalized.length;
        const deduped = HumanitarianDeduplicationService.mark(normalized, existing);
        const scored = DataQualityScoringService.scoreMany(deduped, source, existing);
        sourceReport.normalized = scored.length;
        const persisted = await persist(scored, dbSource, run, { dryRun, batchSize: writeBatchSize });
        sourceReport.imported = persisted.imported;
        sourceReport.updated = persisted.updated;
        sourceReport.possibleDuplicates = scored.filter((record) => record.possibleDuplicate).length;
        finalReport.recordsExtracted += sourceReport.extracted;
        finalReport.recordsNormalized += sourceReport.normalized;
        finalReport.recordsImported += sourceReport.imported;
        finalReport.recordsUpdated += sourceReport.updated;
        finalReport.possibleDuplicates += sourceReport.possibleDuplicates;
        finalReport.recordsBlockedByPrivacy += scored.filter((record) => ["restricted", "private_only"].includes(record.privacyLevel)).length;
        sourceReport.records = scored;
        finalReport.sourcesSuccessful += 1;
        if (run?.id) {
          await IngestionAuditService.record({ ingestionRunId: run.id, action: "source_ingested", sourceName: source.name, result: "SUCCESS", metadata: sourceReport });
        }
      } catch (error) {
        sourceReport.errors.push(error.message);
        finalReport.sourcesFailed += 1;
        if (run?.id) {
          await IngestionAuditService.record({ ingestionRunId: run.id, action: "source_ingested", sourceName: source.name, result: "ERROR", metadata: { error: error.message } });
        }
      }

      try {
        await prisma.ingestionRun.update({
          where: { id: run.id },
          data: {
            status: sourceReport.errors.length ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
            finishedAt: new Date(),
            recordsExtracted: sourceReport.extracted,
            recordsNormalized: sourceReport.normalized,
            recordsImported: sourceReport.imported,
            recordsBlockedByPrivacy: sourceReport.records?.filter((record) => ["restricted", "private_only"].includes(record.privacyLevel)).length || 0,
            duplicatesFound: sourceReport.possibleDuplicates || 0,
            errorSummary: sourceReport.errors.join("; ") || undefined,
            report: sourceReport,
          },
        });
      } catch {
        // Database may not be migrated yet. The importable report below remains the fallback.
      }

      sourceReport.elapsedMs = Date.now() - sourceStartedAt;
      finalReport.sources.push(sourceReport);
    }

    finalReport.finishedAt = new Date().toISOString();
    finalReport.elapsedMs = new Date(finalReport.finishedAt).getTime() - new Date(finalReport.startedAt).getTime();
    if (writeReport || finalReport.recordsImported < finalReport.recordsNormalized) {
      finalReport.importableReportPath = await writeImportableReport(finalReport, reportDir);
    }
    return finalReport;
  }
}
