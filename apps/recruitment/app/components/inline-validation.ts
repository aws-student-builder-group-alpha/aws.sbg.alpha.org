"use client";

import { useEffect, useRef, useState } from "react";
import type { FocusEvent } from "react";

type Errors = Record<string, string>;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isControl = (value: EventTarget | null): value is Control => value instanceof HTMLInputElement || value instanceof HTMLSelectElement || value instanceof HTMLTextAreaElement;

/** Presentation-only validation. Command failures and frozen requests remain with their owners. */
export function useInlineValidation(validate: () => Errors, busy = false) {
  const form = useRef<HTMLFormElement>(null);
  const rejected = useRef<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  useEffect(() => {
    const id = rejected.current;
    if (busy || !id) return;
    const frame = requestAnimationFrame(() => {
      const target = form.current?.querySelector<Control>(`[id="${id}"]`);
      const dialog = document.querySelector("dialog[open]");
      if (target && !target.matches(":disabled") && !target.closest("[hidden], [inert]") && (!dialog || dialog.contains(target))) target.focus();
      rejected.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [busy, errors]);
  function collect() {
    const next = validate();
    form.current?.querySelectorAll<Control>("input[id], select[id], textarea[id]").forEach(control => {
      if (!control.matches(":disabled") && !control.validity.valid && !next[control.id]) next[control.id] = control.validationMessage;
    });
    return next;
  }
  function check() {
    const dialog = document.querySelector("dialog[open]");
    if (!form.current || form.current.closest("[hidden], [inert]") || dialog && !dialog.contains(form.current)) return false;
    const next = collect();
    setErrors(next);
    const target = Array.from(form.current.querySelectorAll<Control>("input[id], select[id], textarea[id]")).find(control => next[control.id] && !control.matches(":disabled") && !control.closest("[hidden], [inert]"));
    if (target) {
      for (let ancestor = target.parentElement; ancestor && ancestor !== form.current; ancestor = ancestor.parentElement) if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      requestAnimationFrame(() => target.isConnected && target.focus());
    }
    return Object.keys(next).length === 0;
  }
  function onBlur(event: FocusEvent<HTMLFormElement>) {
    const target = event.target;
    if (!isControl(target) || !target.id || target.disabled) return;
    // A pointer's focus transition happens before click; do not move its action target.
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest("button, a[href]")) return;
    const message = collect()[target.id];
    setErrors(current => {
      const next = { ...current };
      if (message) next[target.id] = message; else delete next[target.id];
      return next;
    });
  }
  function field(id: string, hint?: string) {
    return { "aria-invalid": errors[id] ? true : undefined, "aria-describedby": [hint, errors[id] ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined };
  }
  function reject(id: string, message: string) {
    rejected.current = id;
    setErrors(current => ({ ...current, [id]: message }));
  }
  return { form, errors, check, field, reject, clear: () => setErrors({}), props: { ref: form, noValidate: true, onBlur } };
}
