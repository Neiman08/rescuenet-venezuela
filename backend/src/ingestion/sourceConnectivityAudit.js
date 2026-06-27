const dynamicSignals = [
  "__NEXT_DATA__",
  "window.__NUXT__",
  "id=\"root\"",
  "id=\"app\"",
  "data-reactroot",
  "application/ld+json",
];

function detectApiHints(text) {
  const matches = new Set();
  for (const match of String(text || "").matchAll(/https?:\/\/[^"'\s)]+|\/api\/[^"'\s)]+|graphql/gi)) {
    matches.add(match[0]);
  }
  return [...matches].slice(0, 20);
}

export async function auditSourceConnectivity(source, { timeoutMs = 12000 } = {}) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const result = {
    sourceName: source.name,
    sourceUrl: source.url,
    connector: source.connector || "html",
    ok: false,
    status: undefined,
    contentType: undefined,
    elapsedMs: undefined,
    requiresJavaScript: false,
    hasEmbeddedJson: false,
    apiHints: [],
    blockedLikely: false,
    error: undefined,
  };

  try {
    const response = await fetch(source.apiUrl || source.url, {
      headers: {
        accept: "text/html,application/json,application/rss+xml,text/csv,*/*",
        "user-agent": "RescueNetVenezuela-ConnectivityAudit/0.1",
      },
      signal: controller.signal,
    });
    result.status = response.status;
    result.ok = response.ok;
    result.contentType = response.headers.get("content-type") || "";
    result.blockedLikely = [401, 403, 429, 503].includes(response.status);
    const text = await response.text();
    result.requiresJavaScript = dynamicSignals.some((signal) => text.includes(signal)) && text.replace(/<script[\s\S]*?<\/script>/gi, "").trim().length < 2500;
    result.hasEmbeddedJson = /application\/json|application\/ld\+json|__NEXT_DATA__|window\.__NUXT__/i.test(text);
    result.apiHints = detectApiHints(text);
  } catch (error) {
    result.error = error.name === "AbortError" ? `Timeout after ${timeoutMs}ms` : error.message;
  } finally {
    clearTimeout(timeout);
    result.elapsedMs = Date.now() - startedAt;
  }

  return result;
}
