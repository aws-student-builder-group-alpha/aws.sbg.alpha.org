"use server";

import { accountSession } from "@/lib/server/session";
import { isUuid } from "@/lib/staff";
import type { StaffResult } from "@/lib/staff";
import { staffAdminSession } from "@/lib/server/staff";
import { authenticatorQrDataUrl } from "@/lib/authenticator";
import type { AuthenticatorEnrollment } from "@/lib/authenticator";

async function mfaAccess(accountId: unknown) {
  const session = await accountSession();
  if (session.kind === "unavailable" || session.kind === "unconfigured") return { ok: false, code: "UNAVAILABLE", message: "Your account could not be verified. Please retry." } as const;
  if (session.kind === "anonymous") return { ok: false, code: "AUTH_REQUIRED", message: "Sign in again to continue." } as const;
  if (session.identity.id !== accountId) return { ok: false, code: "ACCOUNT_CHANGED", message: "A different account is signed in. Reload before continuing." } as const;
  if (session.kind !== "staff" || session.membership.status !== "active" || session.membership.role !== "administrator") return { ok: false, code: "DENIED", message: "Administrator access is not available for this account." } as const;
  return { ok: true, session } as const;
}

export async function beginAuthenticator(accountId: unknown): Promise<StaffResult<AuthenticatorEnrollment>> {
  const access = await mfaAccess(accountId);
  if (!access.ok) return access;
  try {
    const { data: factors, error } = await access.session.client.auth.mfa.listFactors();
    if (error || !factors) return { ok: false, code: "UNAVAILABLE", message: "Authenticator setup is unavailable. Reload and try again." };
    if (factors.totp.length) return { ok: false, code: "CONFLICT", message: "An authenticator is already set up. Reload to enter its current code." };
    // Retry/cancel may leave an unverified enrollment. Never remove verified factors.
    for (const factor of factors.all.filter(f => f.factor_type === "totp" && f.status === "unverified" && f.friendly_name === "Alpha recruitment")) {
      const { error: removeError } = await access.session.client.auth.mfa.unenroll({ factorId: factor.id });
      if (removeError) return { ok: false, code: "UNAVAILABLE", message: "An earlier setup could not be cleared. Reload and retry." };
    }
    const { data, error: enrollError } = await access.session.client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Alpha recruitment", issuer: "Alpha Recruitment" });
    if (enrollError || !data) return { ok: false, code: "UNAVAILABLE", message: "Authenticator setup could not start. Please retry or contact the project owner." };
    const qrCode = authenticatorQrDataUrl(data.totp.qr_code, diagnostic => {
      console.warn("Authenticator QR unavailable", diagnostic);
    });
    return { ok: true, data: { factorId: data.id, qrCode, secret: data.totp.secret } };
  } catch { return { ok: false, code: "UNAVAILABLE", message: "Authenticator setup could not be confirmed. Please retry." }; }
}

export async function verifyAuthenticator(accountId: unknown, factorId: unknown, code: unknown): Promise<StaffResult<null>> {
  const access = await mfaAccess(accountId);
  if (!access.ok) return access;
  if (!isUuid(factorId) || typeof code !== "string" || !/^\d{6}$/.test(code)) return { ok: false, code: "VALIDATION", message: "Enter the current six-digit code from your authenticator." };
  try {
    const { data: factors, error } = await access.session.client.auth.mfa.listFactors();
    if (error || !factors?.all.some(f => f.id === factorId && f.factor_type === "totp")) return { ok: false, code: "CONFLICT", message: "This authenticator setup changed. Reload before trying again." };
    const { error: verifyError } = await access.session.client.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) return { ok: false, code: "VALIDATION", message: "The code was not accepted. Enter a fresh code, or wait briefly if you have tried several times." };
    // The SSR client writes the upgraded session to cookies in this Server Action.
    const confirmed = await staffAdminSession(String(accountId));
    return confirmed.ok ? { ok: true, data: null } : confirmed;
  } catch { return { ok: false, code: "UNAVAILABLE", message: "Verification could not be confirmed. Keep this page open and retry with a fresh code." }; }
}

export async function cancelAuthenticator(accountId: unknown, factorId: unknown): Promise<StaffResult<null>> {
  const access = await mfaAccess(accountId);
  if (!access.ok) return access;
  if (!isUuid(factorId)) return { ok: false, code: "VALIDATION", message: "Reload to check your authenticator setup." };
  try {
    const { data, error } = await access.session.client.auth.mfa.listFactors();
    if (error || !data) return { ok: false, code: "UNAVAILABLE", message: "Setup could not be checked. Retry or reload." };
    const factor = data.all.find(f => f.id === factorId);
    if (factor && (factor.status !== "unverified" || factor.factor_type !== "totp")) return { ok: false, code: "DENIED", message: "A verified authenticator cannot be removed here." };
    if (factor) {
      const { error: cancelError } = await access.session.client.auth.mfa.unenroll({ factorId });
      if (cancelError) return { ok: false, code: "UNAVAILABLE", message: "Setup cancellation could not be confirmed. Please retry." };
    }
    return { ok: true, data: null };
  } catch { return { ok: false, code: "UNAVAILABLE", message: "Setup cancellation could not be confirmed. Please retry." }; }
}
