import { Router } from "express";
import publicRoutes from "./publicRoutes.js";
import authRoutes from "./authRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import mapRoutes from "./mapRoutes.js";
import logisticsRoutes from "./logisticsRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import adminRoutes from "./adminRoutes.js";
import auditRoutes from "./auditRoutes.js";
import importRoutes from "./importRoutes.js";
import ingestionRoutes from "./ingestionRoutes.js";
import {
  donationRoutes,
  emergencyRoutes,
  hospitalRoutes,
  missingRoutes,
  organizationRoutes,
  rescuedRoutes,
  shelterRoutes,
} from "./resourceRoutes.js";

const router = Router();

router.use(publicRoutes);
router.use("/auth", authRoutes);
router.use("/emergency", emergencyRoutes);
router.use("/missing", missingRoutes);
router.use("/rescued", rescuedRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/shelters", shelterRoutes);
router.use("/organizations", organizationRoutes);
router.use("/donations", donationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/map", mapRoutes);
router.use("/logistics", logisticsRoutes);
router.use("/uploads", uploadRoutes);
router.use("/admin", adminRoutes);
router.use("/audit", auditRoutes);
router.use("/import", importRoutes);
router.use("/ingestion", ingestionRoutes);

export default router;
