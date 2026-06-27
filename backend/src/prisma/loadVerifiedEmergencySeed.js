import { prisma } from "../config/prisma.js";
import { verifiedEmergencySeed } from "../data/verifiedEmergencySeed.js";

async function main() {
  const counts = Object.fromEntries(Object.entries(verifiedEmergencySeed).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]));
  console.log(JSON.stringify({
    status: "ok",
    message: "Verified emergency seed template loaded. No records are inserted unless verifiedEmergencySeed contains reviewed data.",
    counts,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
