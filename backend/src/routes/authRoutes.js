import { Router } from "express";
import { authController, authSchemas } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { audit } from "../middleware/audit.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/register", validate(authSchemas.register), audit("register", "auth"), authController.register);
router.post("/login", validate(authSchemas.login), audit("login", "auth"), authController.login);
router.post("/refresh", validate(authSchemas.refresh), audit("refresh", "auth"), authController.refresh);
router.post("/logout", authenticate, audit("logout", "auth"), authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
