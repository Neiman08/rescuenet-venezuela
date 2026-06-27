export async function fetchReliefWeb(source) {
  const response = await fetch(source.apiUrl || source.url, {
    headers: {
      accept: "application/json",
      "user-agent": "RescueNetVenezuela-ReliefWeb/0.1",
    },
  });
  if (!response.ok) throw new Error(`ReliefWeb API returned ${response.status}`);
  const payload = await response.json();
  const records = (payload.data || []).map((entry) => {
    const fields = entry.fields || {};
    return {
      sourceRecordId: entry.id,
      recordType: source.priority?.[0] || "damage_report",
      title: fields.title,
      name: fields.title,
      descripcion: fields.body || fields.title,
      status: fields.status,
      state: "Venezuela",
      country: fields.country?.[0]?.name || "Venezuela",
      date: fields.date?.created || fields.date?.changed,
      organization: fields.source?.map((item) => item.name).join(", "),
      url: fields.url || entry.href,
      rawReliefWeb: fields,
    };
  });
  return { kind: "reliefweb_api", records };
}
