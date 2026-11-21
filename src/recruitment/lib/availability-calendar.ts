export function moveCalendarDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  if (value.getUTCFullYear() < 1) return "0001-01-01";
  if (value.getUTCFullYear() > 9999) return "9999-12-31";
  return value.toISOString().slice(0, 10);
}

export function calendarMonthDates(month: string) {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(`${first}T12:00:00Z`);
    date.setUTCDate(index + 1 - ((weekday + 6) % 7));
    if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return null;
    return date.toISOString().slice(0, 10);
  });
}

export function calendarDateRange(first: string, last: string) {
  return first <= last ? { startDate: first, endDate: last } : { startDate: last, endDate: first };
}
