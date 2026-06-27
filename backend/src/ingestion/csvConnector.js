function parseLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += char;
  }
  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, ""));
}

export function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

export async function fetchCsv(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CSV source returned ${response.status}`);
  return parseCsv(await response.text());
}
