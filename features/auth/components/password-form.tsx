"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInWithJournalPassword, type AuthFormState } from "@/features/auth/actions";

const initialAuthFormState: AuthFormState = { message: "", status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button auth-submit" type="submit" disabled={pending}>
      {pending ? "Unlocking…" : "Unlock journal"}
    </button>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState(signInWithJournalPassword, initialAuthFormState);
  return (
    <form className="auth-form" action={formAction}>
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        autoFocus
        required
      />
      <SubmitButton />
      <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
    </form>
  );
}
