import { recruitmentBasePath } from "../site-paths.ts";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes("your-project") || key.includes("your-publishable") || key.startsWith("sb_secret_")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) return null;
    if (key.startsWith("eyJ")) {
      const claims: unknown = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
      if (typeof claims !== "object" || claims === null || !("role" in claims) || claims.role !== "anon") return null;
    }
    return { url: parsed.origin, key };
  } catch { return null; }
}
export function getAppOrigin() {
  const localOrigin = recruitmentBasePath ? "http://127.0.0.1:4300" : "http://localhost:3000";
  const url = new URL(process.env.APP_URL || localOrigin);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("APP_URL must be an HTTPS origin or HTTP localhost.");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("APP_URL must contain an origin only.");
  return url.origin;
}
