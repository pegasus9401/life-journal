"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestMagicLink, type AuthFormState } from "@/features/auth/actions";

const initialAuthFormState: AuthFormState = { message: "", status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button auth-submit" type="submit" disabled={pending}>
      {pending ? "Sending…" : "Send my private link"}
    </button>
  );
}

export function MagicLinkForm() {
  const [state, formAction] = useActionState(requestMagicLink, initialAuthFormState);
  return (
    <form className="auth-form" action={formAction}>
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required />
      <SubmitButton />
      <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
    </form>
  );
}
