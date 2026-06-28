export const gisLayers = [
  { id: "affected_zones", label: "Zonas afectadas", type: "polygon-circle", source: "affectedZones.js", status: "simulada", visible: true },
  { id: "incident_markers", label: "Reportes e incidentes", type: "point", source: "api/emergency/public", status: "activa", visible: true },
  { id: "shelters_hospitals", label: "Refugios y hospitales", type: "point", source: "api/help-centers/public", status: "activa", visible: true },
  { id: "logistics_routes", label: "Rutas logisticas", type: "line", source: "humanitarianLogistics.deliveries", status: "preparada", visible: false },
  { id: "restricted_locations", label: "Ubicaciones sensibles", type: "secure-point", source: "rescuedPeople.coordinates", status: "restringida", visible: false },
];

export const logisticsCorridors = [
  { id: "COR-DC-001", origin: "Centro de Acopio La Vega", destination: "Refugios La Vega", zone: "La Vega", status: "Abierto", risk: "Medio" },
  { id: "COR-MIR-002", origin: "Los Teques", destination: "Carrizal", zone: "Los Teques", status: "Parcial", risk: "Alto" },
  { id: "COR-ARA-003", origin: "Maracay", destination: "Valencia", zone: "Maracay", status: "Abierto", risk: "Medio" },
];
