import { spawnSync } from "node:child_process";
import { prisma } from "../config/prisma.js";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Startup database command failed: ${command} ${args.join(" ")}`);
  }
}

export async function ensureProductionDatabase() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.SKIP_STARTUP_DB_SYNC === "true") return;

  console.log("Ensuring production database schema and minimum operational seed are ready");
  run("npx", ["prisma", "migrate", "deploy"]);
  run("npm", ["run", "prisma:seed"]);
  await bootstrapPublicPersonRegistry();
}

async function bootstrapPublicPersonRegistry() {
  if (process.env.SKIP_PUBLIC_PERSON_BOOTSTRAP === "true") return;

  try {
    const [{ HumanitarianImporter }, { ingestionSources }] = await Promise.all([
      import("../ingestion/humanitarianImporter.js"),
      import("../ingestion/sourcesRegistry.js"),
    ]);
    const sources = ingestionSources.filter((source) => source.name === "Rescate Venezuela");
    if (!sources.length) return;

    const report = await HumanitarianImporter.run({ sources, writeReport: false });
    const approved = await prisma.importedHumanitarianRecord.updateMany({
      where: {
        sourceName: "Rescate Venezuela",
        deletedAt: null,
        recordType: { in: ["missing_person", "hospitalized_person", "safe_person", "rescued_person", "trapped_person"] },
        privacyLevel: { not: "private_only" },
      },
      data: { verificationStatus: "APROBADO" },
    });

    console.log(JSON.stringify({
      message: "Public person registry bootstrap completed",
      sourceName: "Rescate Venezuela",
      extracted: report.recordsExtracted,
      imported: report.recordsImported,
      updated: report.recordsUpdated,
      approvedForPublicSafeDisplay: approved.count,
    }));
  } catch (error) {
    console.warn(`Public person registry bootstrap skipped: ${error.message}`);
  }
}
