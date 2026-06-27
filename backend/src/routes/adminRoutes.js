import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.SYSTEM_ADMIN));
router.get("/status", (_req, res) => res.json({ status: "protected", module: "admin" }));

export default router;
