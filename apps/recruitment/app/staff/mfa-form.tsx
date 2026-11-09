"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { beginAuthenticator, cancelAuthenticator, verifyAuthenticator } from "./actions";
import { Callout, FieldError } from "@/app/components/ui";
import { useInlineValidation } from "@/app/components/inline-validation";
import type { AuthenticatorEnrollment } from "@/lib/authenticator";

type Factor = { id: string; name: string };
export function MfaForm({ accountId, factors }: { accountId: string; factors: Factor[] }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<AuthenticatorEnrollment | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [factorId, setFactorId] = useState(factors[0]?.id || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const validation = useInlineValidation((): Record<string, string> => /^\d{6}$/.test(code) ? {} : { "mfa-code": "Enter the current six-digit code from your authenticator." }, pending);
  const hasFactor = factors.length > 0;
  const manualSetup = !!enrollment && (!enrollment.qrCode || qrFailed);
  return <section className="panel prose mfa-panel" aria-busy={pending}>
    <h2>{hasFactor ? "Verify your authenticator" : "Set up your authenticator"}</h2>
    <p>{hasFactor ? "Enter the current six-digit code." : "Scan the QR code or enter the setup key, then verify a six-digit code."}</p>
    {!hasFactor && !enrollment && <button type="button" className="button button-orange" disabled={pending} onClick={() => startTransition(async () => {
      setError("");
      try {
        const result = await beginAuthenticator(accountId);
        if (result.ok) { setEnrollment(result.data); setFactorId(result.data.factorId); setQrFailed(false); }
        else setError(result.message);
      } catch { setError("Setup could not be confirmed. Reload and try again."); }
    })}>{pending ? "Starting setup…" : "Set up authenticator"}</button>}
    {enrollment && <div className="mfa-enrollment">
      {enrollment.qrCode && !qrFailed && <Image src={enrollment.qrCode} alt="Scan this code with your authenticator app" width={220} height={220} unoptimized onError={() => setQrFailed(true)} />}
      {manualSetup && <Callout tone="warning" title="Use the manual setup key" role="status">QR code unavailable. Enter the setup key manually to continue.</Callout>}
      <details open={manualSetup || undefined}><summary>Enter the setup key manually</summary><p className="field-hint">Keep this key private. It is shown only during this setup.</p><code className="mfa-secret">{enrollment.secret}</code></details>
    </div>}
    {(hasFactor || enrollment) && <form {...validation.props} onSubmit={event => {
      event.preventDefault();
      if (pending) return;
      if (!validation.check()) return;
      startTransition(async () => {
        setError("");
        try {
          const result = await verifyAuthenticator(accountId, factorId, code);
          setCode("");
          if (result.ok) { setEnrollment(null); router.replace("/admin"); router.refresh(); }
          else if (result.code === "VALIDATION") validation.reject("mfa-code", result.message);
          else setError(result.message);
        } catch { setCode(""); setError("Verification could not be confirmed. Try a fresh code or reload to check your session."); }
      });
    }}>
      {factors.length > 1 && <div className="field"><label htmlFor="factor">Authenticator</label><select id="factor" disabled={pending} value={factorId} onChange={event => setFactorId(event.target.value)}>{factors.map(factor => <option key={factor.id} value={factor.id}>{factor.name}</option>)}</select></div>}
      <div className="field"><label htmlFor="mfa-code">Authenticator code</label><input id="mfa-code" {...validation.field("mfa-code")} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} disabled={pending} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} />{validation.errors["mfa-code"] && <FieldError id="mfa-code-error">{validation.errors["mfa-code"]}</FieldError>}</div>
      <div className="inline-actions"><button className="button button-orange" type="submit" disabled={pending}>{pending ? "Verifying…" : hasFactor ? "Verify and continue" : "Enable and continue"}</button>
        {enrollment && <button className="button button-secondary" type="button" disabled={pending} onClick={() => startTransition(async () => {
          setError("");
          try {
            const result = await cancelAuthenticator(accountId, enrollment.factorId);
            if (result.ok) { setEnrollment(null); setFactorId(""); setCode(""); validation.clear(); }
            else setError(result.message);
          } catch { setError("Cancellation could not be confirmed. Please retry."); }
        })}>Cancel setup</button>}
      </div>
    </form>}
    {error && <Callout tone="error" title="Something needs attention" role="alert" id="mfa-error">{error} <button type="button" className="text-button" onClick={() => window.location.reload()}>Reload</button></Callout>}
    <details className="workspace-help"><summary>Lost your authenticator?</summary><p>Contact the Alpha project owner for identity verification and recovery.</p></details>
  </section>;
}
