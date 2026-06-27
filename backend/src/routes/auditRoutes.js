import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { prisma } from "../config/prisma.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../utils/AppError.js";

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.AUDIT_READ));
router.get("/", asyncHandler(async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ data: logs });
}));

export default router;
