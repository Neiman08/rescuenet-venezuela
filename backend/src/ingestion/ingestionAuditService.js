import { prisma } from "../config/prisma.js";

export class IngestionAuditService {
  static async record({ ingestionRunId, action, sourceName, result, metadata }) {
    try {
      return await prisma.ingestionAuditLog.create({
        data: { ingestionRunId, action, sourceName, result, metadata },
      });
    } catch {
      return undefined;
    }
  }
}
