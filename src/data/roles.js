export const roleCatalog = [
  { id: "publico", label: "Publico", group: "Comunidad", clearance: "publico" },
  { id: "victima", label: "Victima", group: "Comunidad", clearance: "publico" },
  { id: "familiar", label: "Familiar", group: "Comunidad", clearance: "publico" },
  { id: "rescatista", label: "Rescatista", group: "Respuesta", clearance: "sensible" },
  { id: "coordinador_rescate", label: "Coordinador de rescate", group: "Respuesta", clearance: "critico" },
  { id: "refugio", label: "Refugio", group: "Salud y albergue", clearance: "sensible" },
  { id: "hospital", label: "Hospital", group: "Salud y albergue", clearance: "sensible" },
  { id: "ong", label: "ONG", group: "Humanitario", clearance: "operativo" },
  { id: "donante", label: "Donante", group: "Transparencia", clearance: "publico" },
  { id: "gobierno", label: "Gobierno", group: "Institucional", clearance: "critico" },
  { id: "organizacion_internacional", label: "Organizacion internacional", group: "Institucional", clearance: "operativo" },
  { id: "administrador", label: "Administrador", group: "Sistema", clearance: "critico" },
];

export const roles = roleCatalog.map((role) => role.label);
