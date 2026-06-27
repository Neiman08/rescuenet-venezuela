import { prisma } from "../config/prisma.js";
import { HumanitarianImporter } from "./humanitarianImporter.js";
import { enabledSources } from "./sourcesRegistry.js";

function sourceMatches(source, key) {
  const normalizedName = source.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = (source.aliases || []).map((alias) => String(alias).toLowerCase().replace(/[^a-z0-9-]/g, ""));
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (normalizedKey === "all") return true;
  return normalizedName.includes(normalizedKey.replace(/-/g, "")) || aliases.includes(normalizedKey);
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  const options = { dryRun: false, sources: enabledSources(), files: [], writeReport: true };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--audit-only") options.auditOnly = true;
    else if (arg === "--no-report") options.writeReport = false;
    else if (arg.startsWith("--source=")) {
      const key = arg.split("=")[1].toLowerCase();
      options.sources = enabledSources().filter((source) => sourceMatches(source, key));
    } else if (arg.startsWith("--file=")) {
      options.files.push(arg.slice("--file=".length));
    } else if (arg.startsWith("--max-files=")) {
      options.maxFiles = Number(arg.slice("--max-files=".length));
    } else if (arg.startsWith("--max-records=")) {
      options.maxRecords = Number(arg.slice("--max-records=".length));
    } else if (arg.startsWith("--batch-size=")) {
      options.batchSize = Number(arg.slice("--batch-size=".length));
    } else if (arg.startsWith("--timeout-ms=")) {
      options.timeoutMs = Number(arg.slice("--timeout-ms=".length));
    }
  }
  options.reportDir = "reports/ingestion";
  return options;
}

function summarizeReportForConsole(report) {
  const summarizeUnparseable = (items = []) => {
    const byReason = items.reduce((acc, item) => {
      const key = item.reason || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { count: items.length, byReason };
  };

  return {
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    dryRun: report.dryRun,
    auditOnly: report.auditOnly,
    databaseAvailable: report.databaseAvailable,
    warnings: report.warnings,
    recordsExtracted: report.recordsExtracted,
    recordsNormalized: report.recordsNormalized,
    recordsImported: report.recordsImported,
    recordsUpdated: report.recordsUpdated,
    recordsBlockedByPrivacy: report.recordsBlockedByPrivacy,
    possibleDuplicates: report.possibleDuplicates,
    sourcesConsulted: report.sourcesConsulted,
    sourcesSuccessful: report.sourcesSuccessful,
    sourcesFailed: report.sourcesFailed,
    elapsedMs: report.elapsedMs,
    importableReportPath: report.importableReportPath,
    sources: report.sources.map((source) => ({
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      connector: source.connector,
      filesDetected: source.filesDetected,
      extracted: source.extracted,
      normalized: source.normalized,
      imported: source.imported,
      updated: source.updated,
      filteredOut: source.filteredOut,
      possibleDuplicates: source.possibleDuplicates,
      elapsedMs: source.elapsedMs,
      errors: source.errors,
      unparseable: source.unparseable?.length ? summarizeUnparseable(source.unparseable) : undefined,
      connectivity: source.connectivity ? {
        ok: source.connectivity.ok,
        status: source.connectivity.status,
        contentType: source.connectivity.contentType,
        requiresJavaScript: source.connectivity.requiresJavaScript,
        blockedLikely: source.connectivity.blockedLikely,
      } : undefined,
    })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  HumanitarianImporter.run(parseCliArgs())
  .then((report) => {
    if (!report.databaseAvailable) {
      console.warn("WARNING: Database unavailable or not migrated. Re-run after DATABASE_URL is configured and migrations are applied.");
    }
    console.log(JSON.stringify(summarizeReportForConsole(report), null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({ status: "FAILED", error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
}
