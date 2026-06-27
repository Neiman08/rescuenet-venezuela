import { Router } from "express";
import { crudController } from "../controllers/crudController.js";
import { PERMISSIONS } from "../auth/permissions.js";
import { authenticate, optionalAuthenticate, requirePermission } from "../middleware/auth.js";
import { audit } from "../middleware/audit.js";
import { CrudService } from "../services/CrudService.js";

function withEvent(eventName) {
  return (req, _res, next) => {
    req.socketEventCreated = eventName.created;
    req.socketEventUpdated = eventName.updated;
    next();
  };
}

export function createResourceRouter({ model, readPermission, writePermission, module, events, allowPublicRead = false }) {
  const router = Router();
  const controller = crudController(new CrudService(model));
  const readAuth = allowPublicRead ? optionalAuthenticate : authenticate;

  router.get("/", readAuth, requirePermission(readPermission), controller.list);
  router.get("/:id/full", authenticate, requirePermission(readPermission), controller.get);
  router.get("/:id", readAuth, requirePermission(readPermission), controller.get);
  router.post("/", authenticate, requirePermission(writePermission), audit("create", module), withEvent(events || {}), controller.create);
  router.patch("/:id", authenticate, requirePermission(writePermission), audit("update", module), withEvent(events || {}), controller.update);
  router.delete("/:id", authenticate, requirePermission(writePermission), audit("delete", module), controller.remove);

  return router;
}

export const emergencyRoutes = createResourceRouter({
  model: "emergencyReport",
  readPermission: PERMISSIONS.EMERGENCY_READ,
  writePermission: PERMISSIONS.EMERGENCY_WRITE,
  module: "emergency",
  events: { created: "emergency_created", updated: "emergency_updated" },
});

export const missingRoutes = createResourceRouter({
  model: "missingPersonReport",
  readPermission: PERMISSIONS.MISSING_READ,
  writePermission: PERMISSIONS.MISSING_WRITE,
  module: "missing",
});

export const rescuedRoutes = createResourceRouter({
  model: "rescuedPerson",
  readPermission: PERMISSIONS.RESCUED_READ,
  writePermission: PERMISSIONS.RESCUED_WRITE,
  module: "rescued",
  events: { created: "rescued_created", updated: "rescued_updated" },
});

export const hospitalRoutes = createResourceRouter({
  model: "hospital",
  readPermission: PERMISSIONS.HOSPITALS_MANAGE,
  writePermission: PERMISSIONS.HOSPITALS_MANAGE,
  module: "hospitals",
  events: { updated: "hospital_updated" },
});

export const shelterRoutes = createResourceRouter({
  model: "shelter",
  readPermission: PERMISSIONS.SHELTERS_MANAGE,
  writePermission: PERMISSIONS.SHELTERS_MANAGE,
  module: "shelters",
  events: { updated: "shelter_updated" },
});

export const organizationRoutes = createResourceRouter({
  model: "organization",
  readPermission: PERMISSIONS.ORGANIZATIONS_MANAGE,
  writePermission: PERMISSIONS.ORGANIZATIONS_MANAGE,
  module: "organizations",
});

export const donationRoutes = createResourceRouter({
  model: "donation",
  readPermission: PERMISSIONS.DONATIONS_READ,
  writePermission: PERMISSIONS.DONATIONS_WRITE,
  module: "donations",
  events: { created: "donation_received", updated: "donation_updated" },
  allowPublicRead: true,
});

const donationController = crudController(new CrudService("donation"));
donationRoutes.post(
  "/verified",
  authenticate,
  requirePermission(PERMISSIONS.DONATIONS_WRITE),
  audit("create_verified", "donations"),
  withEvent({ created: "donation_received" }),
  donationController.create,
);
