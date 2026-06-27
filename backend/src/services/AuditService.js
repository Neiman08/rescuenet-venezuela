import { prisma } from "../config/prisma.js";

export class AuditService {
  static async record({ userId, action, module, result = "SUCCESS", ip, metadata }) {
    try {
      return await prisma.auditLog.create({ data: { userId, action, module, result, ip, metadata } });
    } catch (error) {
      console.error("Audit log failed", error);
      return null;
    }
  }
}
