import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import routes from "./routes/index.js";

export function createApp({ io } = {}) {
  const app = express();

  app.set("trust proxy", 1);
  app.set("io", io);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === "test" ? "tiny" : "combined"));
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "rescuenet-backend" });
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "rescuenet-backend" });
  });

  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
