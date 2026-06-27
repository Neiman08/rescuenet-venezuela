import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { signAccessToken, signRefreshToken } from "../auth/tokenService.js";
import { AppError } from "../utils/AppError.js";

export class AuthService {
  static async register({ email, password, fullName, phone, role = "PUBLICO" }) {
    const passwordHash = await bcrypt.hash(password, 12);
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw new AppError("Role not initialized", 500, "ROLE_NOT_INITIALIZED");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        roles: { create: { roleId: roleRecord.id } },
      },
      include: { roles: { include: { role: true } } },
    });
    return this.sessionForUser(user);
  }

  static async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
    if (!user || user.deletedAt || !user.isActive) throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    return this.sessionForUser(user);
  }

  static async refresh(refreshToken) {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    return this.sessionForUser(user);
  }

  static sessionForUser(user) {
    const publicUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      roles: user.roles.map((entry) => entry.role.name),
    };
    return {
      user: publicUser,
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    };
  }
}
