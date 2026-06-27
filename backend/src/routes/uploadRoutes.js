import { Router } from "express";
import { PERMISSIONS } from "../auth/permissions.js";
import { prisma } from "../config/prisma.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { audit } from "../middleware/audit.js";
import { FileUploadService, uploadMiddleware } from "../services/FileUploadService.js";
import { asyncHandler } from "../utils/AppError.js";

const router = Router();

const privateUploadHandlers = [
  authenticate,
  requirePermission(PERMISSIONS.EMERGENCY_WRITE),
  uploadMiddleware.array("files", 6),
  audit("upload", "files"),
  asyncHandler(async (req, res) => {
    const files = await Promise.all(
      req.files.map((file) => prisma.uploadedFile.create({ data: { ownerId: req.user.id, ...FileUploadService.toUploadedFile(file) } })),
    );
    res.status(201).json({ data: files });
  }),
];

router.post("/", ...privateUploadHandlers);
router.post("/private", ...privateUploadHandlers);

export default router;
