import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Field, TextArea } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "../actions";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Join as an artist"
      subtitle="Create a free account to anchor your work to the blockchain."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-brass hover:text-ink">
            Log in
          </Link>
        </>
      }
    >
      <AuthForm action={registerAction}>
        <Field
          label="Full name"
          name="name"
          type="text"
          placeholder="Prachi Panchpor"
          autoComplete="name"
          required
        />
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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          hint="Stored as a bcrypt hash, never in plain text."
          required
        />
        <Field
          label="Location"
          name="location"
          type="text"
          placeholder="Pune, Maharashtra"
          autoComplete="address-level2"
        />
        <TextArea
          label="Short bio"
          name="bio"
          placeholder="Contemporary painter working in acrylic and charcoal…"
          hint="Shown on your public artist page."
        />
        <SubmitButton className="mt-2 w-full" pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </AuthForm>
    </AuthShell>
  );
}