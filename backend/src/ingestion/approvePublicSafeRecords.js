import { prisma } from "../config/prisma.js";

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    recordType: "hospitalized_person",
    sourceName: undefined,
    limit: 1000,
    batchSize: 100,
    dryRun: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg.startsWith("--record-type=")) options.recordType = arg.slice("--record-type=".length);
    else if (arg.startsWith("--source=")) options.sourceName = arg.slice("--source=".length);
    else if (arg.startsWith("--limit=")) options.limit = Math.min(Number(arg.slice("--limit=".length)) || options.limit, 10_000);
    else if (arg.startsWith("--batch-size=")) options.batchSize = Math.min(Number(arg.slice("--batch-size=".length)) || options.batchSize, 1000);
  }
  return options;
}

function hasMinimumPublicSafeData(record) {
  const publicSafe = record.publicSafe || {};
  const publicText = JSON.stringify(publicSafe).toLowerCase();
  const hasName = Boolean(publicSafe.fullName || publicSafe.name || record.fullName || record.name);
  const hasHospitalOrZone = Boolean(publicSafe.hospitalName || record.hospitalName || publicSafe.zone || record.zone || publicSafe.publicLocation || record.publicLocation);
  const exposesSensitiveData = /rawpayload|cedula|c[eé]dula|documento|telefono|tel[eé]fono|041[246]|v-\d{5,}/i.test(publicText);
  return hasName && hasHospitalOrZone && !exposesSensitiveData;
}

function isPublicSafeApprovable(record) {
  const statusText = `${record.status || ""} ${record.recordType || ""} ${record.privacyLevel || ""}`.toLowerCase();
  if (statusText.includes("fallecid") || statusText.includes("deceased") || record.privacyLevel === "private_only") return false;
  return hasMinimumPublicSafeData(record);
}

export async function approvePublicSafeRecords(options = parseArgs()) {
  if (!process.env.DATABASE_URL) {
    return {
      databaseAvailable: false,
      approved: 0,
      skipped: 0,
      message: "DATABASE_URL is required to approve imported records.",
    };
  }

  const records = await prisma.importedHumanitarianRecord.findMany({
    where: {
      deletedAt: null,
      verificationStatus: "NO_VERIFICADO",
      recordType: options.recordType,
      privacyLevel: { not: "private_only" },
      ...(options.sourceName ? { sourceName: options.sourceName } : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: options.limit,
  });

  const approvable = records.filter(isPublicSafeApprovable);
  if (options.dryRun) {
    return {
      databaseAvailable: true,
      dryRun: true,
      scanned: records.length,
      approvable: approvable.length,
      skipped: records.length - approvable.length,
      approved: 0,
    };
  }

  let approved = 0;
  for (let offset = 0; offset < approvable.length; offset += options.batchSize) {
    const batch = approvable.slice(offset, offset + options.batchSize);
    const result = await prisma.importedHumanitarianRecord.updateMany({
      where: { id: { in: batch.map((record) => record.id) } },
      data: { verificationStatus: "APROBADO", approvedAt: new Date() },
    });
    approved += result.count;
  }

  return {
    databaseAvailable: true,
    dryRun: false,
    scanned: records.length,
    approvable: approvable.length,
    skipped: records.length - approvable.length,
    approved,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  approvePublicSafeRecords()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({ status: "FAILED", error: error.message }, null, 2));
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
