"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/(auth)/actions";

/**
 * Wraps a server action that returns a `FormState`.
 *
 * Our actions have the `(prevState, formData)` signature that `useActionState`
 * expects. Passing one straight to `<form action={...}>` does **not** work:
 * React treats it as a plain `(formData) => void` action and calls it with a
 * single argument, so the action receives the FormData in the `prevState`
 * slot and `formData` is `undefined`. `useActionState` supplies the previous
 * state itself and hands back a `formAction` with the signature the form
 * actually wants — no casts required.
 *
 * It also renders the returned error, which nothing was doing before, so
 * validation failures were silently invisible.
 */
export function AuthForm({
  action,
  children,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {state?.error ? (
        <p
          role="alert"
          className="mb-4 rounded-md border border-crimson/35 bg-crimson/10 px-4 py-3 text-sm text-crimson"
        >
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage"
        >
          {state.success}
        </p>
      ) : null}
      {children}
    </form>
  );
}
