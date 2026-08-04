import { redirect } from "next/navigation";
import { BrandLink } from "@/components/brand-link";
import { PasswordForm } from "@/features/auth/components/password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Вход · Дневник на живота" };

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/journal");

  return (
    <main className="auth-shell">
      <BrandLink label="Назад към Дневник на живота" />
      <section className="auth-card" aria-labelledby="sign-in-title">
        <p className="kicker">Спомените ти остават твои</p>
        <h1 id="sign-in-title">Добре дошъл в своя дневник.</h1>
        <p className="intro">Въведи личната си парола. Не са нужни регистрация или имейл.</p>
        <PasswordForm />
      </section>
    </main>
  );
}
