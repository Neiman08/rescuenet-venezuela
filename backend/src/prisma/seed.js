import { prisma } from "../config/prisma.js";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../auth/permissions.js";

const roleLabels = {
  PUBLICO: "Publico",
  VICTIMA: "Victima",
  FAMILIAR: "Familiar",
  RESCATISTA: "Rescatista",
  COORDINADOR: "Coordinador",
  HOSPITAL: "Hospital",
  REFUGIO: "Refugio",
  ONG: "ONG",
  DONANTE: "Donante",
  GOBIERNO: "Gobierno",
  ORGANIZACION_INTERNACIONAL: "Organizacion Internacional",
  ADMINISTRADOR: "Administrador",
};

export async function seedAccessControl() {
  for (const key of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key, label: key } });
  }

  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { label: roleLabels[roleName] },
      create: { name: roleName, label: roleLabels[roleName] },
    });

    for (const permissionKey of permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedAccessControl()
    .then(() => console.log("Access control seeded"))
    .finally(() => prisma.$disconnect());
}
