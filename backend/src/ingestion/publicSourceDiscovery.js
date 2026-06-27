import { isUsefulRawRecord } from "./ingestionRecordQuality.js";

const jsonScriptPattern = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
const nextDataPattern = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function flattenObjects(value, output = []) {
  if (!value || output.length > 500) return output;
  if (Array.isArray(value)) {
    for (const entry of value) flattenObjects(entry, output);
    return output;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    const hasHumanitarianSignal = keys.some((key) => /name|nombre|estado|status|hospital|telefono|phone|zona|sector|descripcion|description/i.test(key));
    if (hasHumanitarianSignal && isUsefulRawRecord(value)) output.push(value);
    for (const entry of Object.values(value)) flattenObjects(entry, output);
  }
  return output;
}

export function discoverEmbeddedRecords(html) {
  const records = [];
  const nextData = html.match(nextDataPattern)?.[1];
  if (nextData) records.push(...flattenObjects(safeJsonParse(nextData)));

  for (const match of html.matchAll(jsonScriptPattern)) {
    records.push(...flattenObjects(safeJsonParse(match[1])));
  }

  return records;
}

export async function fetchPublicSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const response = await fetch(source.url, { headers: { "user-agent": "RescueNetVenezuela-Ingestion/0.1" }, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return { kind: "json", records: flattenObjects(await response.json()) };
  const html = await response.text();
  return { kind: "html", records: discoverEmbeddedRecords(html) };
}
