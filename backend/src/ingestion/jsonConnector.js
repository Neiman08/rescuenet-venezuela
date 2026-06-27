function flatten(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  return [value].filter(Boolean);
}

export async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`JSON source returned ${response.status}`);
  return flatten(await response.json());
}
