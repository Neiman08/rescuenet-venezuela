import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { prisma } from "../config/prisma.js";
import { fetchCollectionCenterSource } from "./collectionCentersConnector.js";
import { parseCsv } from "./csvConnector.js";
import { parseExcelFile } from "./excelConnector.js";
import { enabledSources } from "./sourcesRegistry.js";
import { HumanitarianNormalizer } from "./humanitarianNormalizer.js";
import { HumanitarianDeduplicationService } from "./humanitarianDeduplicationService.js";
import { IngestionAuditService } from "./ingestionAuditService.js";
import { scrapeRedAyudaVenezuela } from "./redAyudaVenezuelaScraper.js";
import { scrapeVzlAyuda } from "./vzlAyudaScraper.js";

function scraperFor(source) {
  if ((source.priority || []).some((type) => ["collection_center", "help_center", "water_point", "food_point", "medical_point", "volunteer_center"].includes(type))) {
    return fetchCollectionCenterSource;
  }
  if (/red ayuda/i.test(source.name)) return scrapeRedAyudaVenezuela;
  if (/vzl/i.test(source.name)) return scrapeVzlAyuda;
  return scrapeVzlAyuda;
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

async function persist(records, source, run, { dryRun = false } = {}) {
  if (dryRun) return 0;
  let imported = 0;
  for (const record of records) {
    try {
      await prisma.importedHumanitarianRecord.create({
        data: {
          ...record,
          sourceId: source?.id,
          ingestionRunId: run?.id,
          capturedAt: new Date(record.capturedAt),
          duplicateScore: record.duplicateScore,
        },
      });
      imported += 1;
    } catch {
      break;
    }
  }
  return imported;
}

async function writeImportableReport(report, reportDir = join(process.cwd(), "reports", "ingestion")) {
  const dir = reportDir;
  await mkdir(dir, { recursive: true });
  const path = join(dir, `humanitarian-ingestion-${Date.now()}.json`);
  await writeFile(path, JSON.stringify(report, null, 2));
  return path;
}

export class HumanitarianImporter {
  static async run({ sources = enabledSources(), files = [], dryRun = false, writeReport = true, reportDir } = {}) {
    const finalReport = {
      startedAt: new Date().toISOString(),
      finishedAt: undefined,
      dryRun,
      databaseAvailable: true,
      warnings: [],
      sources: [],
      recordsExtracted: 0,
      recordsNormalized: 0,
      recordsImported: 0,
      recordsBlockedByPrivacy: 0,
      possibleDuplicates: 0,
      importableReportPath: undefined,
    };

    const existing = dryRun ? [] : await existingPeople();

    if (dryRun) finalReport.warnings.push("Dry-run enabled: no database writes were attempted.");

    const fileSources = files.map((file) => ({
      name: `Local file: ${basename(file)}`,
      url: file,
      type: sourceTypeFromFile(file),
      trustLevel: "manual_review_required",
      enabled: true,
      file,
    }));

    for (const source of [...sources, ...fileSources]) {
      const sourceReport = { sourceName: source.name, sourceUrl: source.url, extracted: 0, normalized: 0, imported: 0, errors: [] };
      const { dbSource, run } = dryRun ? { dbSource: undefined, run: undefined } : await safeCreateRun(source);
      if (!dryRun && !run) {
        finalReport.databaseAvailable = false;
        if (!finalReport.warnings.includes("Database is unavailable or not migrated. Generated JSON report can be imported later.")) {
          finalReport.warnings.push("Database is unavailable or not migrated. Generated JSON report can be imported later.");
        }
      }
      try {
        const scrape = source.file
          ? { kind: "file", records: await recordsFromFile(source.file) }
          : await scraperFor(source)(source);
        sourceReport.extracted = scrape.records.length;
        const normalized = HumanitarianNormalizer.normalizeMany(scrape.records, source);
        const deduped = HumanitarianDeduplicationService.mark(normalized, existing);
        sourceReport.normalized = deduped.length;
        sourceReport.imported = await persist(deduped, dbSource, run, { dryRun });
        sourceReport.possibleDuplicates = deduped.filter((record) => record.possibleDuplicate).length;
        finalReport.recordsExtracted += sourceReport.extracted;
        finalReport.recordsNormalized += sourceReport.normalized;
        finalReport.recordsImported += sourceReport.imported;
        finalReport.possibleDuplicates += sourceReport.possibleDuplicates;
        finalReport.recordsBlockedByPrivacy += deduped.filter((record) => record.privacyLevel === "restricted").length;
        sourceReport.records = deduped;
        if (run?.id) {
          await IngestionAuditService.record({ ingestionRunId: run.id, action: "source_ingested", sourceName: source.name, result: "SUCCESS", metadata: sourceReport });
        }
      } catch (error) {
        sourceReport.errors.push(error.message);
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
            recordsBlockedByPrivacy: sourceReport.records?.filter((record) => record.privacyLevel === "restricted").length || 0,
            duplicatesFound: sourceReport.possibleDuplicates || 0,
            errorSummary: sourceReport.errors.join("; ") || undefined,
            report: sourceReport,
          },
        });
      } catch {
        // Database may not be migrated yet. The importable report below remains the fallback.
      }

      finalReport.sources.push(sourceReport);
    }

    finalReport.finishedAt = new Date().toISOString();
    if (writeReport || finalReport.recordsImported < finalReport.recordsNormalized) {
      finalReport.importableReportPath = await writeImportableReport(finalReport, reportDir);
    }
    return finalReport;
  }
}
