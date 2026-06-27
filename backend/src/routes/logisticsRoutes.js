import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { logisticsController } from "../controllers/logisticsController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, requirePermission(PERMISSIONS.LOGISTICS_READ), logisticsController.overview);

export default router;
