export const supplyCategories = ["Agua", "Alimentos", "Medicina", "Refugio", "Higiene", "Energia"];

export const inventoryLots = [
  { id: "INV-AGU-001", item: "Agua potable 1L", category: "Agua", quantity: 18400, unit: "botellas", zone: "La Vega", center: "Centro de Acopio La Vega", status: "Disponible" },
  { id: "INV-MED-014", item: "Kits trauma", category: "Medicina", quantity: 420, unit: "kits", zone: "Maracay", center: "Hospital Central de Maracay", status: "Reservado" },
  { id: "INV-ALI-033", item: "Raciones 24h", category: "Alimentos", quantity: 7200, unit: "raciones", zone: "Los Teques", center: "Refugio Temporal Los Teques", status: "Disponible" },
  { id: "INV-REF-009", item: "Mantas termicas", category: "Refugio", quantity: 3100, unit: "unidades", zone: "Valencia", center: "Refugio Valencia Norte", status: "En transito" },
];

export const aidRequests = [
  { id: "REQ-00071", requester: "Hospital Victorino Santaella", zone: "Los Teques", category: "Medicina", priority: "Critica", requested: "Oxigeno, analgesicos, antibioticos", people: 205, status: "Asignada" },
  { id: "REQ-00072", requester: "Refugio Temporal Los Teques", zone: "Los Teques", category: "Alimentos", priority: "Alta", requested: "Raciones 24h y agua", people: 184, status: "En preparacion" },
  { id: "REQ-00073", requester: "Centro de Acopio La Vega", zone: "La Vega", category: "Agua", priority: "Alta", requested: "Reposicion para refugios cercanos", people: 420, status: "Despachada" },
  { id: "REQ-00074", requester: "Refugio Valencia Norte", zone: "Valencia", category: "Higiene", priority: "Media", requested: "Kits de higiene familiar", people: 132, status: "Pendiente" },
];

export const deliveries = [
  { id: "DEL-0901", requestId: "REQ-00073", origin: "Centro de Acopio La Vega", destination: "Refugios La Vega", carrier: "Logistica DC 4", eta: "35 min", status: "En ruta", evidence: "GPS mock activo" },
  { id: "DEL-0902", requestId: "REQ-00071", origin: "Deposito Maracay", destination: "Hospital Victorino Santaella", carrier: "Salud Aragua 1", eta: "52 min", status: "Preparando", evidence: "Guia pendiente" },
  { id: "DEL-0903", requestId: "REQ-00072", origin: "Refugio Temporal Los Teques", destination: "Puntos comunitarios", carrier: "Voluntarios Miranda", eta: "15 min", status: "Entregado", evidence: "Foto y firma mock" },
];

export const logisticsSummary = {
  availableLots: inventoryLots.filter((lot) => lot.status === "Disponible").length,
  criticalRequests: aidRequests.filter((request) => request.priority === "Critica").length,
  activeDeliveries: deliveries.filter((delivery) => delivery.status !== "Entregado").length,
  peopleCovered: aidRequests.reduce((total, request) => total + request.people, 0),
};
