import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.SYSTEM_ADMIN));
router.get("/jobs", (_req, res) => res.json({ data: [], module: "import", status: "protected" }));
router.post("/jobs", (_req, res) => res.status(202).json({ module: "import", status: "queued_placeholder" }));

export default router;
