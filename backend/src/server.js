import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createSocketServer } from "./sockets/index.js";

const server = http.createServer();
const io = createSocketServer(server);
const app = createApp({ io });

server.on("request", app);

server.listen(env.PORT, () => {
  console.log(`RescueNet backend listening on port ${env.PORT}`);
});
