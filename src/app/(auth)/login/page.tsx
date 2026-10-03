import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your certificates and artwork."
      footer={
        <>
          New to KalaSecure?{" "}
          <Link href="/register" className="text-brass hover:text-ink">
            Create an account
          </Link>
        </>
      }
    >
      <AuthForm action={loginAction}>
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <SubmitButton className="mt-2 w-full" pendingLabel="Signing in…">
          Log in
        </SubmitButton>
      </AuthForm>

      <div className="mt-8 rounded-sm border border-line-soft bg-surface/60 p-4">
        <p className="text-xs font-medium text-ink-muted">Demo account</p>
        <p className="mt-1.5 font-mono text-xs text-ink-faint">
          aisha@kalasecure.art / kalasecure123
        </p>
      </div>
    </AuthShell>
  );
}