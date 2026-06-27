import test from "node:test";
import assert from "node:assert/strict";
import { MatchingEngine } from "../src/services/MatchingEngine.js";
import { EmergencyDispatchEngine } from "../src/services/EmergencyDispatchEngine.js";

test("MatchingEngine scores strong zone and identity factors", () => {
  const engine = new MatchingEngine();
  const result = engine.compare(
    { fullName: "Maria Gonzalez", age: 35, sex: "Femenino", clothing: "Camisa blanca", description: "Cicatriz ceja", affectedZoneId: "az-004" },
    { name: "Maria Gonzalez", approximateAge: "35 anos", sex: "Femenino", clothing: "Camisa blanca", distinctiveMarks: "Cicatriz en ceja derecha", affectedZoneId: "az-004" },
  );

  assert.ok(result.score >= 70);
  assert.equal(result.factors.zone, 1);
});

test("EmergencyDispatchEngine prioritizes trapped people as critical", () => {
  const engine = new EmergencyDispatchEngine();
  const assignment = engine.assign({
    emergency: { type: "Persona atrapada", description: "edificio colapsado", peopleAffected: 4 },
    teams: [{ name: "USAR 1", status: "DISPONIBLE", members: 10 }],
    hospitals: [{ name: "Hospital", status: "OPERATIVO" }],
    shelters: [{ name: "Refugio", occupied: 10, capacity: 100 }],
  });

  assert.equal(assignment.priority, "CRITICA");
  assert.equal(assignment.team.name, "USAR 1");
  assert.ok(assignment.etaMinutes <= 8);
});
