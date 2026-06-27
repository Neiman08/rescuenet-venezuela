import { prisma } from "../config/prisma.js";

export class MapService {
  static async liveMap() {
    const [zones, reports, shelters, hospitals] = await Promise.all([
      prisma.affectedZone.findMany({ where: { deletedAt: null } }),
      prisma.emergencyReport.findMany({ where: { deletedAt: null }, include: { affectedZone: true }, take: 250, orderBy: { createdAt: "desc" } }),
      prisma.shelter.findMany({ where: { deletedAt: null }, include: { affectedZone: true } }),
      prisma.hospital.findMany({ where: { deletedAt: null }, include: { affectedZone: true } }),
    ]);
    return { zones, reports, shelters, hospitals };
  }
}
