"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { message: string; status: "idle" | "success" | "error" };

function passwordsMatch(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length
    && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function signInWithJournalPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formData.get("password");
  const journalPassword = process.env.LIFE_JOURNAL_PASSWORD;
  const ownerEmail = process.env.LIFE_JOURNAL_OWNER_EMAIL;
  const ownerAuthPassword = process.env.LIFE_JOURNAL_OWNER_AUTH_PASSWORD;

  if (!journalPassword || !ownerEmail || !ownerAuthPassword) {
    return { status: "error", message: "Заключването на дневника не е настроено." };
  }

  if (typeof password !== "string" || !passwordsMatch(password, journalPassword)) {
    return { status: "error", message: "Грешна парола." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerAuthPassword,
  });

  if (error) {
    return { status: "error", message: "Дневникът не можа да бъде отключен. Опитай отново." };
  }

  redirect("/journal");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
