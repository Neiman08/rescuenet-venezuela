export class EmergencyDispatchEngine {
  calculatePriority(emergency) {
    const people = Number(emergency.peopleAffected || 0);
    const text = `${emergency.type || ""} ${emergency.description || ""}`.toLowerCase();
    if (people >= 10 || text.includes("atrap") || text.includes("crit")) return "CRITICA";
    if (people >= 3 || text.includes("herid") || text.includes("hospital")) return "ALTA";
    if (text.includes("agua") || text.includes("alimento")) return "MEDIA";
    return "BAJA";
  }

  assign({ emergency, teams = [], hospitals = [], shelters = [] }) {
    const priority = this.calculatePriority(emergency);
    const team = teams.find((item) => item.status === "DISPONIBLE") || teams[0] || null;
    const hospital = hospitals.find((item) => item.status !== "SATURADO") || hospitals[0] || null;
    const shelter = shelters.find((item) => item.occupied < item.capacity) || shelters[0] || null;
    return {
      priority,
      team,
      hospital,
      shelter,
      etaMinutes: this.calculateEta(priority, team),
      dashboardShouldUpdate: true,
    };
  }

  calculateEta(priority, team) {
    if (!team) return null;
    const base = priority === "CRITICA" ? 8 : priority === "ALTA" ? 15 : 30;
    return Math.max(base, Math.round(60 / Math.max(Number(team.members || 1), 1)));
  }
}
