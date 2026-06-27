import { prisma } from "../config/prisma.js";

export class DashboardService {
  static async stats() {
    const [activeEmergencies, rescuedPeople, shelters, hospitals, organizations, donations] = await Promise.all([
      prisma.emergencyReport.count({ where: { deletedAt: null, status: { notIn: ["RESUELTO", "CANCELADO"] } } }),
      prisma.rescuedPerson.count({ where: { deletedAt: null } }),
      prisma.shelter.count({ where: { deletedAt: null } }),
      prisma.hospital.count({ where: { deletedAt: null } }),
      prisma.organization.count({ where: { deletedAt: null, status: "VERIFICADA" } }),
      prisma.donation.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
    ]);

    return {
      activeEmergencies,
      rescuedPeople,
      activeCenters: shelters + hospitals,
      verifiedOrganizations: organizations,
      donationsReceived: donations._sum.amount || 0,
    };
  }

  static async overview() {
    const stats = await this.stats();
    const latestEmergencies = await prisma.emergencyReport.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 });
    return { stats, latestEmergencies };
  }
}
