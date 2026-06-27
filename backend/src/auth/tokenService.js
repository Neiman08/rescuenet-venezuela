import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { permissionsForRoles } from "./permissions.js";

export function signAccessToken(user) {
  const roles = user.roles?.map((entry) => entry.role?.name || entry) || [];
  return jwt.sign({ roles, permissions: permissionsForRoles(roles) }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}
