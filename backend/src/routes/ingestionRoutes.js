import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { ingestionController } from "../controllers/ingestionController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.INGESTION_MANAGE));
router.post("/run", ingestionController.run);
router.post("/manual-upload", ingestionController.manualUpload);
router.get("/runs", ingestionController.runs);
router.get("/records", ingestionController.records);
router.post("/records/approve-many", ingestionController.approveMany);
router.post("/records/approve-filtered", ingestionController.approveFiltered);
router.post("/records/:id/approve", ingestionController.approve);
router.post("/records/:id/reject", ingestionController.reject);
router.patch("/records/:id/status", ingestionController.setVerificationStatus);
router.post("/records/:id/mark-duplicate", ingestionController.markDuplicate);
router.post("/records/:id/link-duplicate", ingestionController.linkDuplicate);

export default router;
