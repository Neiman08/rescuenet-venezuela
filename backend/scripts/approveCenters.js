/**
 * Aprueba automáticamente los centros de ayuda y acopio de Redayuda
 * (help_center, collection_center) que tienen publicSafe limpio.
 * Los registros de personas (missing_person, hospitalized_person, safe_person)
 * permanecen como NO_VERIFICADO — requieren revisión admin.
 *
 * Uso:
 *   DATABASE_URL=... node backend/scripts/approveCenters.js [--source=redayuda] [--dry-run]
 */

import { prisma } from "../src/config/prisma.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const sourceArg = args.find((a) => a.startsWith("--source="));
const sourceName = sourceArg ? sourceArg.slice("--source=".length) : "redayuda";

const CENTER_TYPES = ["help_center", "collection_center", "shelter", "hospital",
                      "water_point", "food_point", "medical_point", "pet_aid_center",
                      "logistics_center", "volunteer_center"];

function isApprovableCenter(record) {
  const pub = record.publicSafe || {};
  const pubStr = JSON.stringify(pub).toLowerCase();
  // Must have a name/location
  const hasIdentifier = Boolean(pub.name || pub.publicLocation || pub.zone);
  // Must not expose private data
  const exposesSensitive = /cedula|telefono|041[246]\d{7}|rawpayload|v-\d{5,}/i.test(pubStr);
  // Must not be private_only
  const isPrivate = record.privacyLevel === "private_only";
  return hasIdentifier && !exposesSensitive && !isPrivate;
}

async function main() {
  const records = await prisma.importedHumanitarianRecord.findMany({
    where: {
      deletedAt: null,
      verificationStatus: "NO_VERIFICADO",
      sourceName,
      recordType: { in: CENTER_TYPES },
    },
    select: { id: true, recordType: true, privacyLevel: true, publicSafe: true, sourceName: true },
  });

  console.log(`Centros NO_VERIFICADO de "${sourceName}": ${records.length}`);

  const approvable = records.filter(isApprovableCenter);
  const blocked = records.length - approvable.length;

  console.log(`Aprobables: ${approvable.length}`);
  console.log(`Bloqueados (sin datos mínimos o datos privados): ${blocked}`);

  const byType = {};
  for (const r of approvable) byType[r.recordType] = (byType[r.recordType] || 0) + 1;
  console.log("Por tipo:", JSON.stringify(byType));

  if (dryRun) {
    console.log("[DRY-RUN] No se escribió nada.");
    await prisma.$disconnect();
    return;
  }

  const ids = approvable.map((r) => r.id);
  const BATCH = 500;
  let approved = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const result = await prisma.importedHumanitarianRecord.updateMany({
      where: { id: { in: batch } },
      data: { verificationStatus: "APROBADO", approvedAt: new Date() },
    });
    approved += result.count;
    process.stdout.write(`\r  Aprobados: ${approved}/${ids.length}...`);
  }
  console.log(`\nListo. ${approved} centros aprobados.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
