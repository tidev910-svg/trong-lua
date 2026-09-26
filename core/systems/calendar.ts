import { DAYS_IN_MONTH, type CalendarData, type MonthKey, type SeasonId } from "../../data/schemas";

export interface CalendarDate {
  /** 1–12 */
  month: number;
  /** 1–31 */
  dayOfMonth: number;
}

export function daysInMonth(month: number): number {
  const days = DAYS_IN_MONTH[month - 1];
  if (days === undefined) throw new RangeError(`month must be 1–12, got ${month}`);
  return days;
}

/**
 * Calendar date of a game day (day 0 = calendar.startMonth/startDayOfMonth).
 * Days past the last game day keep counting (the weather queue looks up to 2 days ahead).
 */
export function dateOfDay(day: number, calendar: CalendarData): CalendarDate {
  if (!Number.isInteger(day) || day < 0) throw new RangeError(`day must be a non-negative integer, got ${day}`);
  let month = calendar.startMonth;
  let dayOfMonth = calendar.startDayOfMonth + day;
  while (dayOfMonth > daysInMonth(month)) {
    dayOfMonth -= daysInMonth(month);
    month = month === 12 ? 1 : month + 1;
  }
  return { month, dayOfMonth };
}

export function monthOfDay(day: number, calendar: CalendarData): number {
  return dateOfDay(day, calendar).month;
}

/** Month as the "1"–"12" key used by every by-month table in data/. */
export function monthKeyOfDay(day: number, calendar: CalendarData): MonthKey {
  return String(monthOfDay(day, calendar)) as MonthKey;
}

/** Season ("vụ") a crop belongs to, from the month it was sown (calendar.seasonBySowingMonth). */
export function seasonOfSowingDay(sowDay: number, calendar: CalendarData): SeasonId {
  return calendar.seasonBySowingMonth[monthKeyOfDay(sowDay, calendar)];
}

/**
 * Unique key of the season occurrence a day belongs to: "DX-1", "HT-1", "TD-1", "DX-2" …
 * The counter goes up each time the season changes, so November at the start and at the end differ.
 */
export function seasonKeyOfDay(day: number, calendar: CalendarData): string {
  const season = seasonOfSowingDay(day, calendar);
  let occurrence = 0;
  let previous: SeasonId | null = null;
  for (let d = 0; d <= day; d++) {
    const current = seasonOfSowingDay(d, calendar);
    if (current !== previous && current === season) occurrence++;
    previous = current;
  }
  return `${season}-${occurrence}`;
}

export function isTetDay(day: number, calendar: CalendarData): boolean {
  return day === calendar.tetDay;
}

/** Days until Tết (0 on the day), null once it has passed. */
export function daysToTet(day: number, calendar: CalendarData): number | null {
  return day <= calendar.tetDay ? calendar.tetDay - day : null;
}

export function lastDay(calendar: CalendarData): number {
  return calendar.daysInYear - 1;
}

export function isLastDay(day: number, calendar: CalendarData): boolean {
  return day === lastDay(calendar);
}
