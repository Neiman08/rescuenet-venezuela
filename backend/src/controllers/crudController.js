import { asyncHandler } from "../utils/AppError.js";

export function crudController(service) {
  return {
    list: asyncHandler(async (req, res) => {
      const records = await service.list({ take: req.query.take, skip: req.query.skip });
      res.json({ data: records });
    }),
    get: asyncHandler(async (req, res) => {
      const record = await service.get(req.params.id);
      res.json({ data: record });
    }),
    create: asyncHandler(async (req, res) => {
      const record = await service.create(req.body);
      req.app.get("io")?.emit(req.socketEventCreated || "record_created", record);
      res.status(201).json({ data: record });
    }),
    update: asyncHandler(async (req, res) => {
      const record = await service.update(req.params.id, req.body);
      req.app.get("io")?.emit(req.socketEventUpdated || "record_updated", record);
      res.json({ data: record });
    }),
    remove: asyncHandler(async (req, res) => {
      await service.softDelete(req.params.id);
      res.status(204).send();
    }),
  };
}
