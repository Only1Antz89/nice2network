export function getUkDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function birthdayMatches(dateOfBirth: Date, year: number, month: number, day: number) {
  const birthMonth = dateOfBirth.getUTCMonth() + 1;
  const birthDay = dateOfBirth.getUTCDate();
  if (birthMonth === month && birthDay === day) return true;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return !leapYear && month === 2 && day === 28 && birthMonth === 2 && birthDay === 29;
}
