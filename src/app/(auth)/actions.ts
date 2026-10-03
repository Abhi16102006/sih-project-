"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  deriveDemoWallet,
  findUserByEmail,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export type FormState = { error?: string; success?: string } | null;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  location: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(600).optional(),
});

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    location: formData.get("location") ?? "",
    bio: formData.get("bio") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details" };
  }

  const { name, email, password, location, bio } = parsed.data;

  if (findUserByEmail(email)) {
    return { error: "An account with this email already exists" };
  }

  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, bio, location, wallet)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(name, email, await hashPassword(password), bio ?? "", location ?? "", "");

  const id = Number(info.lastInsertRowid);
  db.prepare("UPDATE users SET wallet = ? WHERE id = ?").run(deriveDemoWallet(id), id);

  await createSession(id);
  redirect("/dashboard?welcome=1");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details" };
  }

  const user = findUserByEmail(parsed.data.email);
  // Same message for both cases so we never reveal which emails exist.
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return { error: "Incorrect email or password" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
}