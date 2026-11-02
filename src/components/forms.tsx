"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "./Icon";
import type { FormState } from "@/lib/forms";

export function SubmitButton({
  children,
  pending: pendingLabel = "Wysyłanie…",
  className = "btn",
  arrow = true,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
  arrow?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
      {!pending && arrow && <Icon name="arrowRight" size={18} className="arrow" />}
    </button>
  );
}

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const msg = state.fieldErrors?.[name];
  if (!msg) return null;
  return (
    <span className="error-text" id={`${name}-error`} role="alert">
      <Icon name="alert" size={16} /> {msg}
    </span>
  );
}

export function invalid(state: FormState, name: string) {
  return state.fieldErrors?.[name]
    ? ({ "aria-invalid": true, "aria-describedby": `${name}-error` } as const)
    : {};
}

export function FormAlert({ state }: { state: FormState }) {
  if (state.ok && state.message)
    return (
      <div className="alert alert--ok" role="status">
        <Icon name="checkCircle" />
        <p>{state.message}</p>
      </div>
    );
  if (state.error)
    return (
      <div className="alert alert--error" role="alert">
        <Icon name="alert" />
        <p>{state.error}</p>
      </div>
    );
  return null;
}

/** Ukryte pole-pułapka na boty */
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Strona www
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
