import { prisma } from "../config/prisma.js";

const GOOGLE_DRIVE_SOURCE = "SISMO 2026 VZLA - Google Drive Hospitales";
const corruptNames = [
  "nombre",
  "nombre y apellido",
  "nombres y apellidos",
  "apellido",
  "apellido segundo nombre",
  "apellido segundo nombres",
  "edad",
  "edad actualizada",
  "sexo",
  "estado",
  "hospital",
  "observaciones",
  "condicion",
  "diagnostico",
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    confirm: argv.includes("--confirm"),
    corruptOnly: argv.includes("--corrupt-only"),
  };
}

function isCorruptHeaderRecord(record) {
  const name = normalizeText(record.fullName || record.name || record.publicSafe?.fullName || record.publicSafe?.name);
  return corruptNames.includes(name);
}

export async function cleanupGoogleDriveHospitalizedRecords(options = parseArgs()) {
  const where = {
    deletedAt: null,
    recordType: "hospitalized_person",
    sourceName: GOOGLE_DRIVE_SOURCE,
  };
  const records = await prisma.importedHumanitarianRecord.findMany({
    where,
    select: { id: true, fullName: true, name: true, publicSafe: true },
  });
  const targetIds = options.corruptOnly ? records.filter(isCorruptHeaderRecord).map((record) => record.id) : records.map((record) => record.id);

  if (!options.confirm) {
    return {
      dryRun: true,
      sourceName: GOOGLE_DRIVE_SOURCE,
      mode: options.corruptOnly ? "corrupt-only" : "all-google-drive-hospitalized",
      matched: targetIds.length,
    };
  }

  const result = targetIds.length
    ? await prisma.importedHumanitarianRecord.deleteMany({ where: { id: { in: targetIds } } })
    : { count: 0 };

  return {
    dryRun: false,
    sourceName: GOOGLE_DRIVE_SOURCE,
    mode: options.corruptOnly ? "corrupt-only" : "all-google-drive-hospitalized",
    deleted: result.count,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupGoogleDriveHospitalizedRecords()
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({ status: "FAILED", error: error.message }, null, 2));
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
