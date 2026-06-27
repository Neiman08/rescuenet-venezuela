import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { ROLE_PERMISSIONS } from "../auth/permissions.js";
import { AppError } from "../utils/AppError.js";

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));

  try {
    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return next(new AppError("Invalid session", 401, "INVALID_SESSION"));

    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles.map((entry) => entry.role.name),
    };
    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401, "INVALID_TOKEN"));
  }
}

export function optionalAuthenticate(req, res, next) {
  if (!req.headers.authorization) {
    req.user = { id: null, email: null, roles: ["PUBLICO"] };
    return next();
  }
  return authenticate(req, res, next);
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
    if (!req.user.roles.some((role) => roles.includes(role))) return next(new AppError("Insufficient role", 403, "ROLE_FORBIDDEN"));
    return next();
  };
}

export function requirePermission(permission) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError("Authentication required", 401, "AUTH_REQUIRED"));
    const allowed = req.user.roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
    if (!allowed) return next(new AppError("Insufficient permission", 403, "PERMISSION_FORBIDDEN"));
    return next();
  };
}
