import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export class CrudService {
  constructor(modelName, defaultInclude = undefined) {
    this.modelName = modelName;
    this.defaultInclude = defaultInclude;
  }

  get model() {
    return prisma[this.modelName];
  }

  async list({ where = {}, take = 50, skip = 0, orderBy = { createdAt: "desc" } } = {}) {
    return this.model.findMany({
      where: { ...where, deletedAt: null },
      take: Math.min(Number(take) || 50, 200),
      skip: Number(skip) || 0,
      orderBy,
      include: this.defaultInclude,
    });
  }

  async get(id) {
    const record = await this.model.findFirst({ where: { id, deletedAt: null }, include: this.defaultInclude });
    if (!record) throw new AppError("Record not found", 404, "RECORD_NOT_FOUND");
    return record;
  }

  async create(data) {
    return this.model.create({ data, include: this.defaultInclude });
  }

  async update(id, data) {
    await this.get(id);
    return this.model.update({ where: { id }, data, include: this.defaultInclude });
  }

  async softDelete(id) {
    await this.get(id);
    return this.model.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
