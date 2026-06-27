import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { dashboardController } from "../controllers/dashboardController.js";
import { optionalAuthenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", optionalAuthenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), dashboardController.overview);
router.get("/stats", optionalAuthenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), dashboardController.stats);

export default router;
