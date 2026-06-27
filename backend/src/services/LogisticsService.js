import { prisma } from "../config/prisma.js";

export class LogisticsService {
  static async overview() {
    const [organizations, shelters, hospitals, expenses] = await Promise.all([
      prisma.organization.findMany({ where: { deletedAt: null }, take: 100 }),
      prisma.shelter.findMany({ where: { deletedAt: null }, take: 100 }),
      prisma.hospital.findMany({ where: { deletedAt: null }, take: 100 }),
      prisma.donationExpense.findMany({ where: { deletedAt: null }, take: 100, orderBy: { createdAt: "desc" } }),
    ]);
    return { organizations, shelters, hospitals, expenses };
  }
}
