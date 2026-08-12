export function ageFromDateOfBirth(date: Date, now = new Date()) {
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function ageBand(date: Date) {
  const age = ageFromDateOfBirth(date);
  return age < 18 ? "teen_16_17" : age < 25 ? "adult_18_24" : "adult_25_plus";
}
