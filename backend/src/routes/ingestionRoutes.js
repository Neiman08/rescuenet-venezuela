import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { ingestionController } from "../controllers/ingestionController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.INGESTION_MANAGE));
router.post("/run", ingestionController.run);
router.get("/runs", ingestionController.runs);
router.get("/records", ingestionController.records);
router.post("/records/:id/approve", ingestionController.approve);
router.post("/records/:id/reject", ingestionController.reject);
router.post("/records/:id/mark-duplicate", ingestionController.markDuplicate);
router.post("/records/:id/link-duplicate", ingestionController.linkDuplicate);

export default router;
