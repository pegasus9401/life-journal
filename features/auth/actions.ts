"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { message: string; status: "idle" | "success" | "error" };

export async function requestMagicLink(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const requestHeaders = await headers();
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? requestHeaders.get("origin") ?? "http://localhost:3000").replace(/\/$/, "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${origin}/auth/callback?next=/journal` },
  });

  if (error) {
    return { status: "error", message: "We could not send the sign-in link. Please try again." };
  }

  return { status: "success", message: "Check your inbox. Your private sign-in link is on its way." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
