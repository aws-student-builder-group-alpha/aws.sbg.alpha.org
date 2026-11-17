export const MAX_AUTHENTICATOR_QR_LENGTH = 1024 * 1024;
export type AuthenticatorEnrollment = { factorId: string; qrCode: string | null; secret: string };
export type AuthenticatorQrDiagnostic = {
  inputLength: number | null;
  reason: "invalid_type" | "too_large" | "invalid_xml" | "invalid_comment" | "invalid_svg" | "invalid_encoding";
};

/** Normalize provider SVGs without including setup material in rejection diagnostics. */
export function authenticatorQrDataUrl(value: unknown, onReject?: (diagnostic: AuthenticatorQrDiagnostic) => void): string | null {
  const reject = (reason: AuthenticatorQrDiagnostic["reason"]) => {
    onReject?.({ inputLength: typeof value === "string" ? value.length : null, reason });
    return null;
  };
  if (typeof value !== "string") return reject("invalid_type");
  if (value.length > MAX_AUTHENTICATOR_QR_LENGTH) return reject("too_large");
  const prefix = "data:image/svg+xml;utf-8,";
  let svg = (value.startsWith(prefix) ? value.slice(prefix.length) : value).trimStart();
  if (/^<\?xml\s/.test(svg)) {
    const declarationEnd = svg.indexOf("?>");
    if (declarationEnd === -1) return reject("invalid_xml");
    svg = svg.slice(declarationEnd + 2).trimStart();
  }
  while (svg.startsWith("<!--")) {
    const commentEnd = svg.indexOf("-->");
    if (commentEnd === -1) return reject("invalid_comment");
    svg = svg.slice(commentEnd + 3).trimStart();
  }
  if (!/^<svg(?:\s|\/?>)/.test(svg)) return reject("invalid_svg");
  try { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
  catch { return reject("invalid_encoding"); }
}
