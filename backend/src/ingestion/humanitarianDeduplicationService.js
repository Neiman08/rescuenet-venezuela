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

export class HumanitarianDeduplicationService {
  static score(candidate, existing) {
    let score = 0;
    score += tokenScore(candidate.fullName, existing.fullName) * 40;
    if (sameish(candidate.approximateAge, existing.approximateAge)) score += 10;
    if (sameish(candidate.zone, existing.zone) || sameish(candidate.municipality, existing.municipality)) score += 15;
    if (sameish(candidate.hospitalName, existing.hospitalName)) score += 15;
    if (sameish(candidate.status, existing.status)) score += 5;
    score += tokenScore(candidate.description, existing.description) * 10;
    if (candidate.photoUrl && sameish(candidate.photoUrl, existing.photoUrl)) score += 5;
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
