import { prisma } from "../config/prisma.js";
import { HumanitarianImporter } from "./humanitarianImporter.js";
import { enabledSources } from "./sourcesRegistry.js";

export function parseCliArgs(argv = process.argv.slice(2)) {
  const options = { dryRun: false, sources: enabledSources(), files: [], writeReport: true };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--no-report") options.writeReport = false;
    else if (arg.startsWith("--source=")) {
      const key = arg.split("=")[1].toLowerCase();
      options.sources = enabledSources().filter((source) => source.name.toLowerCase().replace(/\s+/g, "").includes(key));
    } else if (arg.startsWith("--file=")) {
      options.files.push(arg.slice("--file=".length));
    }
  }
  options.reportDir = "reports/ingestion";
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  HumanitarianImporter.run(parseCliArgs())
  .then((report) => {
    if (!report.databaseAvailable) {
      console.warn("WARNING: Database unavailable or not migrated. Re-run after DATABASE_URL is configured and migrations are applied.");
    }
    console.log(JSON.stringify(report, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({ status: "FAILED", error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
}
