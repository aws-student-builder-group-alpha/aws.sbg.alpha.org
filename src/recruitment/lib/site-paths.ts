export const recruitmentBasePath = "/recruitment";
export const alphaSiteOrigin = "";
export const chapterLinks = [
  { path: "/#about", label: "About" },
  { path: "/#events", label: "Events" },
  { path: "/#members", label: "Team" },
  { path: "/#contact", label: "Connect" },
  { path: "/skillbuilder/", label: "Skillbuilders" },
];
export function recruitmentPath(path: string) {
  return path === recruitmentBasePath || path.startsWith(recruitmentBasePath + "/") || path.startsWith(recruitmentBasePath + "?")
    ? path : recruitmentBasePath + (path.startsWith("/") ? path : "/" + path);
}
