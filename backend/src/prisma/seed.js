import { prisma } from "../config/prisma.js";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../auth/permissions.js";
import { initialHospitals, initialShelters } from "../data/initialHelpCenters.js";
import { venezuelaAffectedZones } from "../data/venezuelaAffectedZones.js";
import { ingestionSources } from "../ingestion/sourcesRegistry.js";

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

export async function seedAffectedZones() {
  for (const zone of venezuelaAffectedZones) {
    await prisma.affectedZone.upsert({
      where: { code: zone.code },
      update: {
        state: zone.state,
        municipality: zone.municipality,
        parish: zone.parish,
        sector: zone.sector,
        level: zone.level,
        color: zone.color,
        operationalStatus: zone.operationalStatus,
        lat: zone.lat,
        lng: zone.lng,
        radiusKm: zone.radiusKm,
        impacts: zone.impacts,
        verification: "VERIFICADA",
        deletedAt: null,
      },
      create: {
        ...zone,
        verification: "VERIFICADA",
      },
    });
  }
}

export async function seedIngestionSources() {
  for (const source of ingestionSources) {
    await prisma.ingestionSource.upsert({
      where: { name: source.name },
      update: { url: source.url, type: source.type, trustLevel: source.trustLevel, enabled: source.enabled, deletedAt: null },
      create: { name: source.name, url: source.url, type: source.type, trustLevel: source.trustLevel, enabled: source.enabled },
    });
  }
}

export async function seedInitialHelpCenters() {
  for (const hospital of initialHospitals) {
    const affectedZone = await prisma.affectedZone.findUnique({ where: { code: hospital.zoneCode } });
    if (!affectedZone) continue;
    const existing = await prisma.hospital.findFirst({ where: { name: hospital.name, affectedZoneId: affectedZone.id, deletedAt: null } });
    if (existing) {
      await prisma.hospital.update({ where: { id: existing.id }, data: { capacity: hospital.capacity, occupied: hospital.occupied, status: hospital.status } });
    } else {
      await prisma.hospital.create({ data: { affectedZoneId: affectedZone.id, name: hospital.name, capacity: hospital.capacity, occupied: hospital.occupied, status: hospital.status } });
    }
  }

  for (const shelter of initialShelters) {
    const affectedZone = await prisma.affectedZone.findUnique({ where: { code: shelter.zoneCode } });
    if (!affectedZone) continue;
    const existing = await prisma.shelter.findFirst({ where: { name: shelter.name, affectedZoneId: affectedZone.id, deletedAt: null } });
    if (existing) {
      await prisma.shelter.update({ where: { id: existing.id }, data: { capacity: shelter.capacity, occupied: shelter.occupied, status: shelter.status } });
    } else {
      await prisma.shelter.create({ data: { affectedZoneId: affectedZone.id, name: shelter.name, capacity: shelter.capacity, occupied: shelter.occupied, status: shelter.status } });
    }
  }
}

export async function seedMinimumOperationalData() {
  await seedAccessControl();
  await seedAffectedZones();
  await seedIngestionSources();
  await seedInitialHelpCenters();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMinimumOperationalData()
    .then(() => console.log("Minimum operational data seeded"))
    .finally(() => prisma.$disconnect());
}
