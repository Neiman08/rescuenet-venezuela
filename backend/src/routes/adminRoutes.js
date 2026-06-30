import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { adminCitizenReportController } from "../controllers/adminCitizenReportController.js";
import { adminRedayudaController } from "../controllers/adminRedayudaController.js";

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.SYSTEM_ADMIN));
router.get("/status", (_req, res) => res.json({ status: "protected", module: "admin" }));
router.get("/citizen-reports", adminCitizenReportController.listCitizenReports);
router.patch("/citizen-reports/missing/:id", adminCitizenReportController.reviewMissingReport);
router.patch("/citizen-reports/emergency/:id", adminCitizenReportController.reviewEmergencyReport);
router.patch("/citizen-reports/imported/:id", adminCitizenReportController.reviewImportedReport);

router.get("/redayuda", adminRedayudaController.list);
router.get("/redayuda/:id", adminRedayudaController.getOne);
router.patch("/redayuda/:id", adminRedayudaController.update);

export default router;
