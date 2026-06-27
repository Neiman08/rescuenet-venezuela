import { discoverEmbeddedRecords, fetchPublicSource } from "./publicSourceDiscovery.js";

const centerSignal = /(acopio|punto de ayuda|centro de ayuda|refugio|hospital|agua|alimento|comida|medicina|salud|voluntar)/i;

function cleanText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|section|article|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function inferRecordFromLine(line, source) {
  const parts = line.split(/\s[-–—]\s|:/).map((part) => part.trim()).filter(Boolean);
  return {
    sourceRecordId: `${source.name}:${line.slice(0, 80)}`,
    recordType: centerSignal.test(line) ? undefined : "help_center",
    name: parts[0],
    descripcion: line,
    publicLocation: parts.slice(1).join(" - "),
  };
}

export function discoverCollectionCenterRecords(html, source) {
  const embedded = discoverEmbeddedRecords(html);
  const textLines = cleanText(html)
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12 && centerSignal.test(line))
    .slice(0, 250)
    .map((line) => inferRecordFromLine(line, source));
  return [...embedded, ...textLines];
}

export async function fetchCollectionCenterSource(source) {
  const response = await fetch(source.url, { headers: { "user-agent": "RescueNetVenezuela-CollectionCenters/0.1" } });
  if (!response.ok) throw new Error(`Collection center source returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return fetchPublicSource(source);
  const html = await response.text();
  return { kind: "html", records: discoverCollectionCenterRecords(html, source) };
}
