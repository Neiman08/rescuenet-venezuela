import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Startup database command failed: ${command} ${args.join(" ")}`);
  }
}

export async function ensureProductionDatabase() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.SKIP_STARTUP_DB_SYNC === "true") return;

  console.log("Ensuring production database schema and minimum operational seed are ready");
  run("npx", ["prisma", "migrate", "deploy"]);
  run("npm", ["run", "prisma:seed"]);
}
