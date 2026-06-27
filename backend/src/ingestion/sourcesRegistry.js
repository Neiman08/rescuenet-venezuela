export const ingestionSources = [
  {
    name: "Red Ayuda Venezuela",
    url: "https://redayudavenezuela.com",
    type: "WEBSITE",
    trustLevel: "medium",
    enabled: true,
    priority: ["missing_person", "hospitalized_person", "trapped_person", "safe_person"],
  },
  {
    name: "VzlAyuda",
    url: "https://vzlayuda.com",
    type: "WEBSITE",
    trustLevel: "medium",
    enabled: true,
    priority: ["missing_person", "hospitalized_person", "safe_person", "help_center"],
  },
  {
    name: "Red Ayuda Venezuela - Puntos de ayuda",
    url: "https://redayudavenezuela.com/puntos-de-ayuda/",
    type: "WEBSITE",
    trustLevel: "medium",
    enabled: true,
    priority: ["collection_center", "help_center", "shelter", "medical_point"],
  },
  {
    name: "VzlAyuda - Centros y ofrecimientos",
    url: "https://vzlayuda.com",
    type: "WEBSITE",
    trustLevel: "medium",
    enabled: true,
    priority: ["collection_center", "water_point", "food_point", "medical_point", "volunteer_center"],
  },
  {
    name: "ReliefWeb Venezuela",
    url: "https://reliefweb.int/country/ven",
    type: "WEBSITE",
    trustLevel: "high",
    enabled: true,
    priority: ["help_center", "donation_need", "medical_point"],
  },
];

export function enabledSources() {
  return ingestionSources.filter((source) => source.enabled);
}
