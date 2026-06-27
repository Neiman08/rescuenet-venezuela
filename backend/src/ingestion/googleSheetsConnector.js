function toCsvExportUrl(url) {
  const id = String(url).match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
  if (!id) return url;
  const gid = String(url).match(/[?&]gid=(\d+)/)?.[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

export async function fetchGoogleSheet(url, parseCsv) {
  return parseCsv(await (await fetch(toCsvExportUrl(url))).text());
}
