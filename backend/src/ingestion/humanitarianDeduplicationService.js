function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(a, b) {
  const left = new Set(normalize(a).split(" ").filter(Boolean));
  const right = new Set(normalize(b).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  const common = [...left].filter((token) => right.has(token)).length;
  return common / Math.max(left.size, right.size);
}

function sameish(a, b) {
  return normalize(a) && normalize(a) === normalize(b);
}

function privateToken(value) {
  return normalize(typeof value === "object" ? JSON.stringify(value) : value);
}

export class HumanitarianDeduplicationService {
  static centerTypes = new Set(["collection_center", "shelter", "hospital", "help_center", "water_point", "food_point", "medical_point", "volunteer_center", "pet_aid_center", "logistics_center", "donation_need"]);

  static score(candidate, existing) {
    if (this.centerTypes.has(candidate.recordType) || this.centerTypes.has(existing.recordType)) {
      return this.centerScore(candidate, existing);
    }
    let score = 0;
    score += tokenScore(candidate.fullName, existing.fullName) * 40;
    if (sameish(candidate.approximateAge, existing.approximateAge)) score += 10;
    if (sameish(candidate.zone, existing.zone) || sameish(candidate.municipality, existing.municipality)) score += 15;
    if (sameish(candidate.hospitalName, existing.hospitalName)) score += 15;
    if (sameish(candidate.status, existing.status)) score += 5;
    score += tokenScore(candidate.description, existing.description) * 10;
    if (candidate.photoUrl && sameish(candidate.photoUrl, existing.photoUrl)) score += 5;
    if (privateToken(candidate.documentPrivate) && privateToken(candidate.documentPrivate) === privateToken(existing.documentPrivate)) score += 35;
    if (privateToken(candidate.locationPrivate?.edificio) && sameish(candidate.locationPrivate?.edificio, existing.locationPrivate?.edificio)) score += 8;
    if (privateToken(candidate.locationPrivate?.piso) && sameish(candidate.locationPrivate?.piso, existing.locationPrivate?.piso)) score += 6;
    if (privateToken(candidate.locationPrivate?.apartamento) && sameish(candidate.locationPrivate?.apartamento, existing.locationPrivate?.apartamento)) score += 6;
    if (sameish(candidate.sourceName, existing.sourceName) && sameish(candidate.sourceRecordId, existing.sourceRecordId)) score += 40;
    return Math.min(100, Math.round(score));
  }

  static centerScore(candidate, existing) {
    let score = 0;
    score += tokenScore(candidate.name, existing.name) * 35;
    score += tokenScore(candidate.organization, existing.organization) * 20;
    if (sameish(candidate.state, existing.state)) score += 10;
    if (sameish(candidate.municipality, existing.municipality)) score += 10;
    if (sameish(candidate.zone, existing.zone) || sameish(candidate.publicLocation, existing.publicLocation)) score += 15;
    if (sameish(candidate.sourceName, existing.sourceName)) score += 5;
    score += tokenScore((candidate.acceptedItems || []).join(" "), (existing.acceptedItems || []).join(" ")) * 5;
    return Math.min(100, Math.round(score));
  }

  static mark(records, existing = []) {
    const accepted = [...existing];

    return records.map((record) => {
      const best = accepted
        .map((other) => ({ other, score: this.score(record, other) }))
        .sort((a, b) => b.score - a.score)[0];
      const duplicate = best?.score >= 72;
      const marked = {
        ...record,
        possibleDuplicate: duplicate,
        duplicateScore: best?.score || 0,
        matchedRecordId: duplicate ? best.other.id || best.other.sourceRecordId : undefined,
      };
      accepted.push(marked);
      return marked;
    });
  }
}
