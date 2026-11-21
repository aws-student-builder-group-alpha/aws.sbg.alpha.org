import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDateRange, calendarMonthDates, moveCalendarDate } from "../lib/availability-calendar.ts";

test("calendar weeks start on Monday and include leap days and adjacent months", () => {
  const dates = calendarMonthDates("2024-02");
  assert.equal(dates.length, 42);
  assert.equal(dates[0], "2024-01-29");
  assert.ok(dates.includes("2024-02-29"));
  assert.equal(dates[41], "2024-03-10");
  assert.equal(new Set(dates).size, 42);
});
test("range selection supports either drag direction and one-day availability", () => {
  const expected = { startDate: "2026-11-22", endDate: "2026-11-27" };
  assert.deepEqual(calendarDateRange(expected.startDate, expected.endDate), expected);
  assert.deepEqual(calendarDateRange(expected.endDate, expected.startDate), expected);
  assert.deepEqual(calendarDateRange(expected.startDate, expected.startDate), { startDate: expected.startDate, endDate: expected.startDate });
  assert.equal(moveCalendarDate("2026-12-31", 1), "2027-01-01");
});
test("calendar navigation remains within supported four-digit years", () => {
  assert.equal(moveCalendarDate("0001-01-01", -7), "0001-01-01");
  assert.equal(moveCalendarDate("9999-12-31", 7), "9999-12-31");
  assert.ok(calendarMonthDates("9999-12").includes(null));
  assert.ok(calendarMonthDates("0001-01").every(date => !date || /^\d{4}-\d{2}-\d{2}$/.test(date)));
});
