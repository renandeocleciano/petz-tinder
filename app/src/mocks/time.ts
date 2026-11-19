const MINUTE = 60_000;

export const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * MINUTE).toISOString();
export const hoursAgo = (hours: number) => minutesAgo(hours * 60);
export const daysAgo = (days: number) => minutesAgo(days * 24 * 60);

/** Next occurrence of a weekday (0 = Sunday) at the given hour, at least one day ahead. */
export const nextWeekdayAt = (weekday: number, hour: number) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  const delta = (weekday - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date.toISOString();
};
