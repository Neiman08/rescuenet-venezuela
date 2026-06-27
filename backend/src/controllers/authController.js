import { z } from "zod";
import { AuthService } from "../services/AuthService.js";
import { asyncHandler } from "../utils/AppError.js";

export const authSchemas = {
  register: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(2),
      phone: z.string().optional(),
      role: z.enum(["PUBLICO", "VICTIMA", "FAMILIAR", "DONANTE"]).optional(),
    }),
  }),
  login: z.object({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }),
  refresh: z.object({ body: z.object({ refreshToken: z.string().min(10) }) }),
};

export const authController = {
  register: asyncHandler(async (req, res) => {
    const session = await AuthService.register(req.validated.body);
    res.status(201).json(session);
  }),
  login: asyncHandler(async (req, res) => {
    const session = await AuthService.login(req.validated.body);
    res.json(session);
  }),
  refresh: asyncHandler(async (req, res) => {
    const session = await AuthService.refresh(req.validated.body.refreshToken);
    res.json(session);
  }),
  logout: asyncHandler(async (_req, res) => {
    res.status(204).send();
  }),
  me: asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
};
