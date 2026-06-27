import { fetchDynamicHumanitarianApp } from "./dynamicHumanitarianAppConnector.js";

export async function fetchDesaparecidosTerremoto(source) {
  const apiBase = source.apiBase || process.env.DESAPARECIDOS_TERREMOTO_API_BASE;
  const recaptchaToken = process.env.DESAPARECIDOS_TERREMOTO_RECAPTCHA_TOKEN;
  if (apiBase && recaptchaToken) {
    const records = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/personas?page=${page}&pageSize=100`, {
        headers: {
          "x-recaptcha-token": recaptchaToken,
          "user-agent": "RescueNetVenezuela-DesaparecidosTerremoto/0.2",
        },
      });
      if (!response.ok) throw new Error(`Desaparecidos Terremoto API returned ${response.status}`);
      const payload = await response.json();
      records.push(...(payload.items || []).map((person) => ({
        ...person,
        sourceRecordId: person.id,
        recordType: person.estado === "localizado" ? "safe_person" : "missing_person",
        nombre: person.nombre,
        edad: person.edad,
        estado: person.estado,
        ubicacion: person.ubicacion,
        descripcion: person.descripcion,
        contacto: person.contacto,
        foto: person.foto,
      })));
      totalPages = Number(payload.totalPages || 1);
      page += 1;
    } while (page <= totalPages && page <= 100);

    return { kind: "desaparecidos_terremoto_api", records };
  }

  const discovered = await fetchDynamicHumanitarianApp(source);
  discovered.discovery = {
    ...(discovered.discovery || {}),
    protectedApi: "https://desaparecidos-terremoto-api.theempire.tech/api",
    apiRequiresRecaptcha: true,
  };
  return discovered;
}
