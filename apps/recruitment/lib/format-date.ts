export function formatDate(value: string | null, timeOnly = false) {
  if (!value) return "Not yet submitted";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    ...(timeOnly ? {} : { month: "short", day: "numeric", year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
