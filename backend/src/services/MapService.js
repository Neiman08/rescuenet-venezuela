import { prisma } from "../config/prisma.js";

export class MapService {
  static async liveMap() {
    const [zones, reports, shelters, hospitals] = await Promise.all([
      prisma.affectedZone.findMany({ where: { deletedAt: null } }),
      prisma.emergencyReport.findMany({ where: { deletedAt: null }, take: 250, orderBy: { createdAt: "desc" } }),
      prisma.shelter.findMany({ where: { deletedAt: null } }),
      prisma.hospital.findMany({ where: { deletedAt: null } }),
    ]);
    return { zones, reports, shelters, hospitals };
  }
}
