import { Server } from "socket.io";
import { env } from "../config/env.js";

export const socketEvents = [
  "emergency_created",
  "emergency_updated",
  "rescued_created",
  "hospital_updated",
  "shelter_updated",
  "donation_received",
  "dashboard_updated",
];

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.emit("connected", { service: "rescuenet-realtime", events: socketEvents });
    socket.on("join_zone", (zoneId) => socket.join(`zone:${zoneId}`));
  });

  return io;
}
