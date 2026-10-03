"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { IconLogout } from "./icons";

export function LogoutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logoutAction();
          router.push("/");
          router.refresh();
        })
      }
      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink-muted transition-colors hover:border-crimson/40 hover:text-ink disabled:opacity-50"
    >
      <IconLogout className="size-4" />
      <span className="hidden sm:inline">{pending ? "Signing out…" : "Log out"}</span>
    </button>
  );
}