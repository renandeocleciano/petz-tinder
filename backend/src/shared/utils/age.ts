const pad = (value: number) => String(value).padStart(2, '0');

export const toIsoDate = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** Full years between an ISO date (YYYY-MM-DD) and `today`. */
export const ageInYears = (birthDate: string, today: Date): number => {
  const [year, month, day] = birthDate.split('-').map(Number) as [number, number, number];
  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() + 1 < month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
};

/** Turns "idade aproximada" into an estimated birth date, so the age keeps advancing. */
export const estimatedBirthDate = (ageYears: number, today: Date): string => {
  const estimate = new Date(today);
  estimate.setUTCFullYear(today.getUTCFullYear() - ageYears);
  return toIsoDate(estimate);
};
