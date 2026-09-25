import { describe, expect, it } from "vitest";
import { loadData } from "../../../data/loadData";
import type { CalendarData } from "../../../data/schemas";
import {
  dateOfDay,
  daysInMonth,
  isLastDay,
  isTetDay,
  lastDay,
  monthKeyOfDay,
  monthOfDay,
  seasonOfSowingDay,
} from "../../../core/systems/calendar";

const { calendar } = loadData();

describe("dateOfDay with the game calendar (day 0 = 15/11, no leap years)", () => {
  it.each([
    [0, 11, 15],
    [15, 11, 30],
    [16, 12, 1],
    [46, 12, 31],
    [47, 1, 1],
    [80, 2, 3], // tetDay
    [105, 2, 28],
    [106, 3, 1],
    [150, 4, 14], // rent installment 2
    [290, 9, 1],
    [351, 11, 1],
    [364, 11, 14], // last day
  ])("day %i → %i/%i", (day, month, dayOfMonth) => {
    expect(dateOfDay(day, calendar)).toEqual({ month, dayOfMonth });
  });

  it("walks every day of the year one calendar day at a time", () => {
    let prev = dateOfDay(0, calendar);
    for (let day = 1; day < calendar.daysInYear; day++) {
      const d = dateOfDay(day, calendar);
      if (d.dayOfMonth === 1) {
        expect(prev.dayOfMonth).toBe(daysInMonth(prev.month));
        expect(d.month).toBe(prev.month === 12 ? 1 : prev.month + 1);
      } else {
        expect(d).toEqual({ month: prev.month, dayOfMonth: prev.dayOfMonth + 1 });
      }
      prev = d;
    }
  });

  it("365 days cover every month in full exactly once (November split across start and end)", () => {
    const counts = new Map<number, number>();
    for (let day = 0; day < calendar.daysInYear; day++) {
      const m = monthOfDay(day, calendar);
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    for (let m = 1; m <= 12; m++) expect(counts.get(m)).toBe(daysInMonth(m));
  });

  it("rejects negative or fractional days", () => {
    expect(() => dateOfDay(-1, calendar)).toThrow(RangeError);
    expect(() => dateOfDay(1.5, calendar)).toThrow(RangeError);
  });

  it("keeps counting past the last game day (for weather look-ahead)", () => {
    expect(dateOfDay(365, calendar)).toEqual({ month: 11, dayOfMonth: 15 });
    expect(dateOfDay(366, calendar)).toEqual({ month: 11, dayOfMonth: 16 });
  });

  it("follows the start date in data, including a year boundary", () => {
    const custom: CalendarData = { ...calendar, startMonth: 12, startDayOfMonth: 31 };
    expect(dateOfDay(0, custom)).toEqual({ month: 12, dayOfMonth: 31 });
    expect(dateOfDay(1, custom)).toEqual({ month: 1, dayOfMonth: 1 });
    expect(dateOfDay(59, custom)).toEqual({ month: 2, dayOfMonth: 28 });
    expect(dateOfDay(60, custom)).toEqual({ month: 3, dayOfMonth: 1 });
  });

  it("daysInMonth rejects invalid months", () => {
    expect(() => daysInMonth(0)).toThrow(RangeError);
    expect(() => daysInMonth(13)).toThrow(RangeError);
  });
});

describe("month key and season", () => {
  it("month key is the string used by data tables", () => {
    expect(monthKeyOfDay(0, calendar)).toBe("11");
    expect(monthKeyOfDay(47, calendar)).toBe("1");
  });

  it.each([
    [0, "DX"], // 15/11
    [46, "DX"], // 31/12
    [77, "DX"], // 31/1
    [78, "HT"], // 1/2
    [197, "HT"], // 31/5
    [198, "TD"], // 1/6
    [350, "TD"], // 31/10
    [351, "DX"], // 1/11
  ])("sowing on day %i → season %s", (day, season) => {
    expect(seasonOfSowingDay(day, calendar)).toBe(season);
  });

  it("reads the season table from data", () => {
    const custom: CalendarData = {
      ...calendar,
      seasonBySowingMonth: { ...calendar.seasonBySowingMonth, "11": "TD" },
    };
    expect(seasonOfSowingDay(0, custom)).toBe("TD");
  });
});

describe("Tết and last day", () => {
  it("Tết is exactly calendar.tetDay", () => {
    expect(isTetDay(calendar.tetDay, calendar)).toBe(true);
    expect(isTetDay(calendar.tetDay - 1, calendar)).toBe(false);
    expect(isTetDay(calendar.tetDay + 1, calendar)).toBe(false);
    expect(isTetDay(10, { ...calendar, tetDay: 10 })).toBe(true);
  });

  it("the game ends after day daysInYear - 1", () => {
    expect(lastDay(calendar)).toBe(364);
    expect(isLastDay(364, calendar)).toBe(true);
    expect(isLastDay(363, calendar)).toBe(false);
  });
});
