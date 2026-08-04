import { redirect } from "next/navigation";
import { BrandLink } from "@/components/brand-link";
import { MagicLinkForm } from "@/features/auth/components/magic-link-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in · Life Journal" };

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/journal");

  return (
    <main className="auth-shell">
      <BrandLink label="Back to Life Journal" />
      <section className="auth-card" aria-labelledby="sign-in-title">
        <p className="kicker">Your memories stay yours</p>
        <h1 id="sign-in-title">Welcome to your journal.</h1>
        <p className="intro">No password to remember. We will email you a secure, one-time link.</p>
        <MagicLinkForm />
      </section>
    </main>
  );
}
