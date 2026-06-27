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
];

export function enabledSources() {
  return ingestionSources.filter((source) => source.enabled);
}
