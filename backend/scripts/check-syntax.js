import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "test"].filter((path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
});

function listJsFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return listJsFiles(fullPath);
    return fullPath.endsWith(".js") ? [fullPath] : [];
  });
}

const files = roots.flatMap(listJsFiles);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status);
}

console.log(`Syntax check passed for ${files.length} files.`);
