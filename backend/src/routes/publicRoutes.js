import { Router } from "express";
import { publicController, publicSchemas } from "../controllers/publicController.js";
import { authenticate } from "../middleware/auth.js";
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
router.post("/rescued/report", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.rescuedReport), publicController.createRescuedReport);
router.post("/hospitalized/report", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.hospitalizedReport), publicController.createHospitalizedReport);
router.post("/deceased/report", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.deceasedReport), publicController.createDeceasedReport);
router.get("/hospitalized/public", publicController.listPublicHospitalized);
router.get("/hospitals/public", publicController.listPublicHospitals);
router.get("/shelters/public", publicController.listPublicShelters);
router.get("/affected-zones/public", publicController.listPublicAffectedZones);
router.get("/persons", publicController.familySearch);
router.get("/map", publicController.publicMap);
router.get("/map/public", publicController.publicMap);
router.get("/dashboard/public", publicController.publicDashboard);
router.get("/organizations/public", authenticate, publicController.listPublicOrganizations);
router.get("/donations/public", authenticate, publicController.listPublicDonations);
router.get("/centers", publicController.helpCenters);
router.get("/help-centers/public", publicController.helpCenters);
router.post("/help-centers", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.helpCenter), publicController.createHelpCenter);
router.post("/logistics/public", publicSubmissionRateLimit, antiSpam, validate(publicSchemas.logisticsRequest), publicController.createLogisticsRequest);
router.get("/family-search/public", publicController.familySearch);

export default router;
