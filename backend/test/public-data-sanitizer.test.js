import test from "node:test";
import assert from "node:assert/strict";
import { PublicDataSanitizer, sanitizePublicPlaceText } from "../src/services/PublicDataSanitizer.js";

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

test("PublicDataSanitizer degrades emergency publicLocation and removes exact details", () => {
  const sanitized = PublicDataSanitizer.emergency({
    id: "emg-1",
    code: "EMG-1",
    type: "Derrumbe",
    priority: "MEDIA",
    status: "RECEPCION",
    peopleAffected: 3,
    publicLocation: "Calle 12 casa 34, 10.3447, -67.0433, telefono 04121234567",
    source: "public_web_form",
    verificationStatus: "pending_review",
    affectedZone: { sector: "Los Teques", municipality: "Guaicaipuro", state: "Miranda" },
  });

  assert.equal(sanitized.publicLocation, "Los Teques, Guaicaipuro, Miranda");
  assert.equal(sanitized.publicLocation.includes("Calle 12"), false);
  assert.equal(sanitized.publicLocation.includes("0412"), false);
  assert.equal(sanitized.publicLocation.includes("-67"), false);
});

test("PublicDataSanitizer degrades currentPlace and removes exact address details", () => {
  const sanitized = PublicDataSanitizer.safeReport({
    id: "safe-2",
    fullName: "Luis",
    phone: "04121234567",
    currentPlace: "Calle 12, Edificio Sol, piso 4, apto 2B, Los Teques, Miranda, 0412-1234567",
    verificationStatus: "self_reported",
    affectedZone: { sector: "Los Teques", municipality: "Guaicaipuro", state: "Miranda" },
  });

  assert.equal(sanitized.currentPlace, "Los Teques, Guaicaipuro, Miranda");
  assert.equal(sanitized.currentPlace.includes("Calle 12"), false);
  assert.equal(sanitized.currentPlace.includes("0412"), false);
});

test("PublicDataSanitizer degrades lastSeenPlace and removes exact address details", () => {
  const sanitized = PublicDataSanitizer.missing({
    id: "missing-1",
    fullName: "Carlos",
    age: 30,
    sex: "Masculino",
    lastSeenPlace: "Avenida Principal #45, Torre Norte, Piso 2, La Vega, Distrito Capital",
    privacyLevel: "standard",
    isMinor: false,
    verificationStatus: "pending_review",
  });

  assert.equal(sanitized.lastSeenPlace.includes("#45"), false);
  assert.equal(sanitized.lastSeenPlace.includes("Piso"), false);
});

test("sanitizePublicPlaceText strips coordinates, documents and phone numbers", () => {
  const value = sanitizePublicPlaceText("10.3447, -67.0433 casa 12 cedula V-12345678 telefono 04121234567");
  assert.equal(value, "Zona general protegida");
});
