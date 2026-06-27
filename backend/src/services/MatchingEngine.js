export class MatchingEngine {
  compare(missingPerson, rescuedPerson) {
    const factors = {
      name: this.textScore(missingPerson.fullName, rescuedPerson.name),
      age: this.ageScore(missingPerson.age, rescuedPerson.approximateAge),
      sex: this.exactScore(missingPerson.sex, rescuedPerson.sex),
      clothing: this.textScore(missingPerson.clothing, rescuedPerson.clothing),
      marks: this.textScore(missingPerson.description, rescuedPerson.distinctiveMarks),
      zone: this.exactScore(missingPerson.affectedZoneId, rescuedPerson.affectedZoneId),
      shelter: this.exactScore(missingPerson.shelterId, rescuedPerson.shelterId),
      hospital: this.exactScore(missingPerson.hospitalId, rescuedPerson.hospitalId),
    };
    const score = Object.values(factors).reduce((sum, value) => sum + value, 0) / Object.keys(factors).length;
    return { score: Math.round(score * 100), factors };
  }

  textScore(left, right) {
    if (!left || !right) return 0;
    const a = String(left).toLowerCase();
    const b = String(right).toLowerCase();
    if (a === b) return 1;
    return a.split(/\s+/).some((token) => token.length > 2 && b.includes(token)) ? 0.7 : 0;
  }

  exactScore(left, right) {
    if (!left || !right) return 0;
    return String(left).toLowerCase() === String(right).toLowerCase() ? 1 : 0;
  }

  ageScore(age, approximateAge) {
    if (!age || !approximateAge) return 0;
    return String(approximateAge).includes(String(age)) ? 1 : 0.3;
  }
}
