import { discoverEmbeddedRecords, discoverLinks, flattenObjects } from "./publicSourceDiscovery.js";

const jsonEndpointPattern = /(api|json|sheet|supabase|firebase|firestore|person|persona|missing|desaparecid|safe|salvo|hospital|report|reporte)/i;
const personSignal = /(nombre|name|persona|desaparecid|missing|localizad|a salvo|safe|hospitaliz|atrapad|rescatad)/i;

async function fetchText(url, { accept = "text/html,application/json,*/*" } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: {
        accept,
        "user-agent": "RescueNetVenezuela-RealPersonsIngestion/0.2",
      },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    return { ok: response.ok, status: response.status, contentType, text, url };
  } finally {
    clearTimeout(timeout);
  }
}

function sourceRecordId(source, raw, index) {
  return raw.id || raw.uuid || raw.code || raw.sourceRecordId || `${source.name}:${index}:${JSON.stringify(raw).slice(0, 80)}`;
}

function classifyRecordType(raw, fallback = "missing_person") {
  const text = JSON.stringify(raw || {}).toLowerCase();
  if (/facilitytype|hospital_ivss|hospital|maternidad|clinica|clínica/.test(text) && (raw.facilityType || raw.totalPatients !== undefined || raw.activePatients !== undefined)) return "hospital";
  if (/fallecid|deceased/.test(text)) return "deceased_person_private_only";
  if (/hospitaliz|hospital/.test(text)) return "hospitalized_person";
  if (/atrapad|trapped/.test(text)) return "trapped_person";
  if (/rescatad|rescued/.test(text)) return "rescued_person";
  if (/a salvo|safe|localizad|found/.test(text)) return "safe_person";
  if (/desaparecid|missing/.test(text)) return "missing_person";
  return fallback;
}

function normalizeCandidate(raw, source, index) {
  const record = { ...raw };
  record.sourceRecordId = String(sourceRecordId(source, raw, index));
  record.recordType = record.recordType || classifyRecordType(record, source.priority?.[0]);
  record.nombre = record.nombre || record.fullName || record.name || record.persona || record.personName || record.displayName;
  record.edad = record.edad || record.age || record.approximateAge;
  record.estado = record.estado || record.state || record.status || record.condition;
  record.zona = record.zona || record.zone || record.sector || record.location || record.ubicacion;
  record.descripcion = record.descripcion || record.description || record.details || record.observaciones || record.notes;
  record.municipio = record.municipio || record.municipality;
  record.direccion = record.direccion || record.address;
  record.publicLocation = record.publicLocation || record.ubicacion || record.location || [record.municipality, record.state].filter(Boolean).join(", ");
  return record;
}

function usefulCandidate(raw) {
  const text = JSON.stringify(raw || "");
  return text.length >= 20 && text.length <= 12000 && personSignal.test(text);
}

function recordsFromJsonText(text) {
  try {
    return flattenObjects(JSON.parse(text));
  } catch {
    return [];
  }
}

function endpointHintsFromScript(scriptText, baseUrl) {
  const hints = new Set();
  for (const match of scriptText.matchAll(/["'`](\/[^"'`]*(?:api|json|person|persona|missing|desaparecid|safe|salvo|hospital|report|reporte)[^"'`]*)["'`]/gi)) {
    try {
      hints.add(new URL(match[1], baseUrl).toString());
    } catch {
      // Ignore malformed bundle strings.
    }
  }
  for (const match of scriptText.matchAll(/https?:\/\/[^"'`\s)]+/gi)) {
    if (jsonEndpointPattern.test(match[0])) hints.add(match[0]);
  }
  return [...hints].slice(0, 30);
}

export async function fetchDynamicHumanitarianApp(source) {
  const root = await fetchText(source.url);
  if (!root.ok) throw new Error(`Source returned ${root.status}`);

  const records = [...discoverEmbeddedRecords(root.text)];
  const links = discoverLinks(root.text, source.url);
  const scriptLinks = links.filter((link) => link.includes(".js")).slice(0, 12);
  const directJsonLinks = links.filter((link) => jsonEndpointPattern.test(link) && !link.includes(".css")).slice(0, 20);
  const endpointHints = new Set(directJsonLinks);

  for (const scriptUrl of scriptLinks) {
    try {
      const script = await fetchText(scriptUrl, { accept: "application/javascript,text/javascript,*/*" });
      if (script.ok) endpointHintsFromScript(script.text, source.url).forEach((hint) => endpointHints.add(hint));
    } catch {
      // Bundles are best-effort discovery only.
    }
  }

  for (const endpoint of [...endpointHints].slice(0, 24)) {
    try {
      const response = await fetchText(endpoint, { accept: "application/json,text/plain,*/*" });
      if (response.ok && response.contentType.includes("json")) records.push(...recordsFromJsonText(response.text));
    } catch {
      // Endpoint probes must not fail the full source.
    }
  }

  return {
    kind: "dynamic_humanitarian_app",
    records: records.filter(usefulCandidate).map((record, index) => normalizeCandidate(record, source, index)),
    discovery: {
      scriptsChecked: scriptLinks.length,
      endpointsChecked: Math.min(endpointHints.size, 24),
      endpointHints: [...endpointHints].slice(0, 12),
    },
  };
}
