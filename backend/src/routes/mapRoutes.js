import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { mapController } from "../controllers/mapController.js";
import { optionalAuthenticate, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get("/", optionalAuthenticate, requirePermission(PERMISSIONS.MAP_READ), mapController.live);

export default router;
