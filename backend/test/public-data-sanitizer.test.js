import test from "node:test";
import assert from "node:assert/strict";
import { PublicDataSanitizer } from "../src/services/PublicDataSanitizer.js";

test("PublicDataSanitizer hides exact and medical details from rescued minors", () => {
  const sanitized = PublicDataSanitizer.rescued({
    id: "id-1",
    code: "RV-001",
    name: "Protected Child",
    approximateAge: "Aprox. 8 anos",
    sex: "Masculino",
    conditionSummary: "Estable",
    injuriesSummary: "Dato medico completo",
    status: "EN_RESGUARDO",
    isMinor: true,
    affectedZone: { id: "az-1", code: "az-001", state: "Miranda", municipality: "Guaicaipuro", sector: "Los Teques" },
    hospital: { name: "Hospital privado" },
  });

  assert.equal(sanitized.name, "Informacion protegida");
  assert.equal(sanitized.privacyLevel, "restricted");
  assert.equal(sanitized.hospital, undefined);
  assert.equal(sanitized.injuriesSummary, undefined);
});

test("PublicDataSanitizer masks safe-report phone numbers", () => {
  const sanitized = PublicDataSanitizer.safeReport({
    id: "safe-1",
    fullName: "Maria",
    phone: "+58 412 123 4567",
    currentPlace: "Refugio",
    verificationStatus: "self_reported",
  });

  assert.equal(sanitized.phone.endsWith("4567"), true);
  assert.equal(sanitized.phone.includes("412"), false);
});
