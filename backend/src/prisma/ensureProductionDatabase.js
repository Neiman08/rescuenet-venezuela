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
  await bootstrapExistingPublicRecords();
}

async function bootstrapExistingPublicRecords() {
  if (process.env.ENABLE_PRODUCTION_BOOTSTRAP !== "true") return;

  try {
    const maxRecords = Math.min(Number(process.env.MAX_BOOTSTRAP_RECORDS) || 200, 200);
    const records = await prisma.importedHumanitarianRecord.findMany({
      where: {
        deletedAt: null,
        verificationStatus: "NO_VERIFICADO",
        recordType: { in: ["missing_person", "safe_person", "rescued_person", "trapped_person"] },
        privacyLevel: { not: "private_only" },
      },
      select: { id: true },
      orderBy: { capturedAt: "desc" },
      take: maxRecords,
    });
    if (!records.length) return;
    const approved = await prisma.importedHumanitarianRecord.updateMany({
      where: {
        id: { in: records.map((record) => record.id) },
      },
      data: { verificationStatus: "APROBADO" },
    });

    console.log(JSON.stringify({
      message: "Light production bootstrap approved existing public-safe records",
      maxRecords,
      approvedForPublicSafeDisplay: approved.count,
    }));
  } catch (error) {
    console.warn(`Light production bootstrap skipped: ${error.message}`);
  }
}
