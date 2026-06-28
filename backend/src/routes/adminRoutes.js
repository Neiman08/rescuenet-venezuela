import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { adminCitizenReportController } from "../controllers/adminCitizenReportController.js";

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.SYSTEM_ADMIN));
router.get("/status", (_req, res) => res.json({ status: "protected", module: "admin" }));
router.get("/citizen-reports", adminCitizenReportController.listCitizenReports);
router.patch("/citizen-reports/missing/:id", adminCitizenReportController.reviewMissingReport);
router.patch("/citizen-reports/emergency/:id", adminCitizenReportController.reviewEmergencyReport);
router.patch("/citizen-reports/imported/:id", adminCitizenReportController.reviewImportedReport);

export default router;
