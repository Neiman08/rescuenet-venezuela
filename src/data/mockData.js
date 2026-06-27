import { affectedZones } from "./affectedZones";

export const simulationNotice = "Data mock simulada para prototipo. No representa datos oficiales reales.";

export const stats = {
  activeEmergencies: 1248,
  rescuedPeople: 2579,
  safePeople: 3842,
  activeCenters: 96,
  donationsReceived: 1245780,
  donationsSpent: 872450,
  pendingFunds: 213330,
  verifiedOrganizations: 48,
  confirmedDeaths: 186,
  missingPeople: 913,
};

export const emergencyTypes = [
  { id: "trapped", label: "Persona atrapada", color: "red" },
  { id: "injured", label: "Heridos / Enfermos", color: "red" },
  { id: "missing", label: "Desaparecido", color: "yellow" },
  { id: "water", label: "Falta de agua", color: "blue" },
  { id: "food", label: "Falta de comida", color: "orange" },
  { id: "medicine", label: "Falta de medicinas", color: "purple" },
  { id: "shelter", label: "Refugio necesario", color: "purple" },
  { id: "building", label: "Edificio danado", color: "slate" },
  { id: "road", label: "Carretera bloqueada", color: "orange" },
];

export const mapReports = [
  { id: 1, type: "Emergencia critica", lat: 10.3447, lng: -67.0433, count: 12, color: "red", zone: "Los Teques", status: "Nuevo" },
  { id: 2, type: "Personas rescatadas", lat: 10.3492, lng: -66.9861, count: 8, color: "green", zone: "Carrizal", status: "Confirmado" },
  { id: 3, type: "Hospital", lat: 10.2469, lng: -67.5958, count: 1, color: "blue", zone: "Maracay", status: "Operativo" },
  { id: 4, type: "Refugio", lat: 10.4768, lng: -66.9565, count: 1, color: "purple", zone: "La Vega", status: "Activo" },
  { id: 5, type: "Agua", lat: 10.1579, lng: -67.9972, count: 1, color: "cyan", zone: "Valencia", status: "Necesario" },
];

export const rescuedPeople = [
  {
    id: "RV-000128",
    name: "No identificado",
    age: "Aprox. 8 anos",
    gender: "Masculino",
    status: "En resguardo",
    rescuedAt: "Los Teques, Miranda",
    currentPlace: "Refugio Temporal Los Teques",
    condition: "Estable",
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&auto=format&fit=crop",
    isMinor: true,
    identified: false,
    conscious: "Si",
    injuries: "Contusiones leves",
    signs: "Lunar en mejilla izquierda",
    clothing: "Franela roja y pantalon azul",
    coordinates: "Protegidas",
    rescueDate: "2026-06-26 14:30",
    team: "Brigada Miranda Norte",
    rescuer: "Equipo RN-MIR-02",
    history: ["Ingreso a resguardo", "Revision medica basica", "Busqueda familiar activada"],
  },
  {
    id: "RV-000129",
    name: "Maria Gonzalez",
    age: "35 anos",
    gender: "Femenino",
    status: "En hospital",
    rescuedAt: "Maracay, Aragua",
    currentPlace: "Hospital Central de Maracay",
    condition: "Estable",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop",
    isMinor: false,
    identified: true,
    conscious: "Si",
    injuries: "Fractura inmovilizada",
    signs: "Cicatriz en ceja derecha",
    clothing: "Camisa blanca",
    coordinates: "10.2469, -67.5958",
    rescueDate: "2026-06-26 09:15",
    team: "Brigada Aragua Salud",
    rescuer: "Dra. R. Medina",
    history: ["Rescate en vivienda", "Traslado a hospital", "Familiar notificado"],
  },
  {
    id: "RV-000130",
    name: "Hombre no identificado",
    age: "Aprox. 70 anos",
    gender: "Masculino",
    status: "Identificacion en proceso",
    rescuedAt: "Los Teques, Miranda",
    currentPlace: "Hospital Victorino Santaella",
    condition: "Delicado",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop",
    isMinor: false,
    identified: false,
    conscious: "No",
    injuries: "Trauma craneal moderado",
    signs: "Anillo plateado",
    clothing: "Camisa azul",
    coordinates: "10.3447, -67.0433",
    rescueDate: "2026-06-25 19:45",
    team: "USAR Capital",
    rescuer: "Cmdte. A. Perez",
    history: ["Rescate nocturno", "Ingreso UCI", "Identificacion biometrica pendiente"],
  },
];

export const centers = [
  { name: "Refugio Temporal Los Teques", type: "Refugio", zone: "Los Teques", capacity: 300, occupied: 184, status: "Activo" },
  { name: "Hospital Victorino Santaella", type: "Hospital", zone: "Los Teques", capacity: 220, occupied: 205, status: "Saturado" },
  { name: "Centro de Acopio La Vega", type: "Centro de acopio", zone: "La Vega", capacity: 1000, occupied: 420, status: "Activo" },
  { name: "Hospital Central de Maracay", type: "Hospital", zone: "Maracay", capacity: 350, occupied: 289, status: "Operativo" },
  { name: "Refugio Valencia Norte", type: "Refugio", zone: "Valencia", capacity: 260, occupied: 132, status: "Activo" },
];

export const organizations = [
  { id: "org-1", name: "Fundacion Luz", location: "La Vega, Distrito Capital", country: "Venezuela", category: "Alimentos, Refugios", status: "Verificada", representative: "Ana Torres", zones: "La Vega, Los Teques" },
  { id: "org-2", name: "ONG Esperanza", location: "Valencia, Carabobo", country: "Venezuela", category: "Medicina, Alimentos", status: "Verificada", representative: "Luis Rojas", zones: "Valencia" },
  { id: "org-3", name: "Manos Unidas", location: "Los Teques, Miranda", country: "Venezuela", category: "Agua, Alimentos", status: "Verificada", representative: "Carla Diaz", zones: "Los Teques, Carrizal" },
  { id: "org-4", name: "Cruz Roja Venezolana", location: "Maracay, Aragua", country: "Venezuela", category: "Salud, Emergencias", status: "Pendiente", representative: "Equipo nacional", zones: "Maracay" },
];

export const donations = [
  { id: "DON-0001548", donor: "Anonimo", org: "ONG Esperanza", amount: 100, status: "Entregada", use: "Compra de agua potable", zone: "Los Teques", method: "Tarjeta", date: "2026-06-25", beneficiaries: 80 },
  { id: "DON-0001549", donor: "Luis Fernandez", org: "Fundacion Luz", amount: 250, status: "En proceso", use: "Compra de alimentos", zone: "La Vega", method: "Transferencia", date: "2026-06-26", beneficiaries: 120 },
  { id: "DON-0001550", donor: "Maria Unidos", org: "Manos Unidas", amount: 500, status: "Auditada", use: "Medicinas", zone: "Maracay", method: "Wallet", date: "2026-06-26", beneficiaries: 60 },
  { id: "DON-0001551", donor: "Anonimo", org: "Cruz Roja Venezolana", amount: 900, status: "Auditada", use: "Kits trauma", zone: "Valencia", method: "Transferencia", date: "2026-06-27", beneficiaries: 140 },
];

export const expenses = [
  { date: "2026-06-26", org: "Fundacion Luz", description: "Alimentos no perecederos", category: "Alimentos", amount: 8100, receipt: "Factura validada", status: "Validado", zone: "La Vega" },
  { date: "2026-06-26", org: "Manos Unidas", description: "Tanques y tabletas potabilizadoras", category: "Agua", amount: 5200, receipt: "Comprobante pendiente", status: "En revision", zone: "Los Teques" },
  { date: "2026-06-27", org: "ONG Esperanza", description: "Antibioticos y analgesicos", category: "Medicinas", amount: 12450, receipt: "Factura validada", status: "Validado", zone: "Valencia" },
];

export const matches = [
  { id: "MAT-01", searched: "Carlos Rivas", rescued: "RV-000130", score: 86, zone: "Los Teques", age: "Alta", signs: "Anillo plateado", status: "Solicitar verificacion" },
  { id: "MAT-02", searched: "Nino sin identificar", rescued: "RV-000128", score: 74, zone: "Los Teques", age: "Media", signs: "Lunar", status: "Validacion familiar" },
];

export const auditLogs = [
  { time: "2026-06-27 08:10", actor: "Admin RN", action: "Aprobo ONG Esperanza", level: "Bajo" },
  { time: "2026-06-27 08:25", actor: "Coordinador MIR", action: "Accedio a ubicacion exacta protegida", level: "Alto" },
  { time: "2026-06-27 08:44", actor: "Auditor", action: "Valido gasto DON-0001550", level: "Medio" },
];

export const chartByZone = affectedZones.map((zone, index) => ({
  zone: zone.sector,
  emergencias: [420, 230, 310, 180, 108][index],
  rescatados: [680, 350, 410, 240, 190][index],
}));

export const affectedZonesList = affectedZones;
