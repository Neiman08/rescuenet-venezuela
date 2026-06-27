import { Router } from "express";
import { publicController, publicSchemas } from "../controllers/publicController.js";
import { antiSpam, publicSubmissionRateLimit } from "../middleware/publicGuards.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/emergency", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.emergency), publicController.createEmergency);
router.get("/emergency/public", publicController.listPublicEmergencies);
router.post("/safe", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.safe), publicController.createSafeReport);
router.get("/safe/public", publicController.listPublicSafeReports);
router.post("/missing", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.missing), publicController.createMissingReport);
router.get("/missing/public", publicController.listPublicMissing);
router.get("/rescued/public", publicController.listPublicRescued);
router.get("/hospitals/public", publicController.listPublicHospitals);
router.get("/shelters/public", publicController.listPublicShelters);
router.get("/map/public", publicController.publicMap);
router.get("/dashboard/public", publicController.publicDashboard);
router.get("/organizations/public", publicController.listPublicOrganizations);
router.get("/donations/public", publicController.listPublicDonations);
router.get("/help-centers/public", publicController.helpCenters);

export default router;
