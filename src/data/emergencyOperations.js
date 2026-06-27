import { affectedZones } from "./affectedZones";

export const incidentSeverity = {
  critical: { label: "Critica", className: "bg-red-100 text-red-700" },
  high: { label: "Alta", className: "bg-orange-100 text-orange-700" },
  medium: { label: "Media", className: "bg-yellow-100 text-yellow-700" },
  low: { label: "Baja", className: "bg-slate-100 text-slate-700" },
};

export const dispatchStatuses = {
  intake: "Recepcion",
  triage: "Triaje",
  assigned: "Asignado",
  enroute: "En ruta",
  onsite: "En sitio",
  resolved: "Resuelto",
};

export const incidentQueue = [
  {
    id: "INC-2026-00091",
    zoneId: "az-001",
    type: "Persona atrapada",
    severity: "critical",
    status: "triage",
    reportedAt: "08:42",
    slaMinutes: 12,
    peopleAtRisk: 4,
    channel: "WhatsApp mock",
    locationPublic: "Los Teques, Miranda",
    locationSensitive: "Sector El Vigia, coordenadas protegidas",
    assignedTeam: "USAR Miranda 2",
    needs: ["extricacion", "ambulancia", "oxigeno"],
  },
  {
    id: "INC-2026-00092",
    zoneId: "az-003",
    type: "Falta de agua",
    severity: "high",
    status: "assigned",
    reportedAt: "08:49",
    slaMinutes: 24,
    peopleAtRisk: 180,
    channel: "Formulario web",
    locationPublic: "La Vega, Distrito Capital",
    locationSensitive: "Refugio activo, entrada norte",
    assignedTeam: "Logistica DC 4",
    needs: ["agua potable", "tabletas potabilizadoras"],
  },
  {
    id: "INC-2026-00093",
    zoneId: "az-004",
    type: "Hospital saturado",
    severity: "high",
    status: "enroute",
    reportedAt: "09:02",
    slaMinutes: 18,
    peopleAtRisk: 62,
    channel: "Hospital",
    locationPublic: "Maracay, Aragua",
    locationSensitive: "Emergencia pediatrica",
    assignedTeam: "Salud Aragua 1",
    needs: ["traslado", "camas", "medicinas"],
  },
  {
    id: "INC-2026-00094",
    zoneId: "az-002",
    type: "Via bloqueada",
    severity: "medium",
    status: "intake",
    reportedAt: "09:08",
    slaMinutes: 40,
    peopleAtRisk: 25,
    channel: "Radio",
    locationPublic: "Carrizal, Miranda",
    locationSensitive: "Acceso sur hacia centro de acopio",
    assignedTeam: "Pendiente",
    needs: ["maquinaria", "seguridad vial"],
  },
];

export const responderTeams = [
  { id: "TEAM-USAR-MIR-02", name: "USAR Miranda 2", type: "Busqueda y rescate", zoneId: "az-001", members: 14, status: "En sitio", eta: "0 min" },
  { id: "TEAM-LOG-DC-04", name: "Logistica DC 4", type: "Distribucion", zoneId: "az-003", members: 8, status: "Cargando", eta: "18 min" },
  { id: "TEAM-SAL-ARA-01", name: "Salud Aragua 1", type: "Medico", zoneId: "az-004", members: 6, status: "En ruta", eta: "9 min" },
  { id: "TEAM-VOL-CAR-03", name: "Voluntarios Valencia 3", type: "Apoyo refugio", zoneId: "az-005", members: 22, status: "Disponible", eta: "25 min" },
];

export const operationalZones = affectedZones.map((zone) => ({
  ...zone,
  openIncidents: incidentQueue.filter((incident) => incident.zoneId === zone.id).length,
  teams: responderTeams.filter((team) => team.zoneId === zone.id).length,
}));
