import { AuditService } from "../services/AuditService.js";

export function audit(action, module) {
  return async (req, res, next) => {
    res.on("finish", () => {
      AuditService.record({
        userId: req.user?.id,
        action,
        module,
        result: res.statusCode >= 400 ? "FAILURE" : "SUCCESS",
        ip: req.ip,
        metadata: { method: req.method, path: req.originalUrl, statusCode: res.statusCode },
      });
    });
    next();
  };
}
