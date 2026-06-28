import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma.js";

const email = process.argv[2] || process.env.ADMIN_EMAIL;
const password = process.argv[3] || process.env.ADMIN_PASSWORD;
const fullName = process.argv[4] || process.env.ADMIN_FULL_NAME || "Administrador";

if (!email || !password) {
  console.error("Usage: node scripts/createAdmin.js <email> <password> [fullName]");
  console.error("  or set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_FULL_NAME env vars");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

const adminRole = await prisma.role.findUnique({ where: { name: "ADMINISTRADOR" } });
if (!adminRole) {
  console.error("ADMINISTRADOR role not found — run seed first");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash, fullName, isActive: true, deletedAt: null },
  create: { email, passwordHash, fullName, isActive: true },
  include: { roles: { include: { role: true } } },
});

await prisma.userRole.upsert({
  where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
  update: {},
  create: { userId: user.id, roleId: adminRole.id },
});

const finalRoles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } });

console.log(`Admin user ready:`);
console.log(`  id:    ${user.id}`);
console.log(`  email: ${user.email}`);
console.log(`  name:  ${user.fullName}`);
console.log(`  roles: ${finalRoles.map((r) => r.role.name).join(", ")}`);

await prisma.$disconnect();
