import Link from "next/link";

import { BrandLink } from "@/components/brand-link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="home-shell">
      <nav className="topbar" aria-label="Основна навигация">
        <BrandLink />
        <span className="eyebrow">Твоята история започва тук</span>
      </nav>

      <section className="hero" aria-labelledby="welcome-title">
        <div className="hero-copy">
          <p className="kicker">Място за дните, които си струва да помниш</p>
          <h1 id="welcome-title">Превърни пътуванията си в истории.</h1>
          <p className="intro">
            Запази местата, моментите и малките детайли, които правят всяко пътуване твое.
            Започни с едно пътешествие — останалото ще се разгърне естествено.
          </p>
          <Link className="primary-button" href={user ? "/today" : "/login"}>
            <span aria-hidden="true">+</span>
            {user ? "Отвори днешния ден" : "Отключи своя дневник"}
          </Link>
          <p className="helper">Нужен е само миг, за да започнеш.</p>
        </div>

        <div className="memory-card" aria-label="Преглед на бъдещия ти дневник за пътувания">
          <div className="memory-image" aria-hidden="true">
            <div className="sun" />
            <div className="hill hill-back" />
            <div className="hill hill-front" />
          </div>
          <div className="memory-meta">
            <div>
              <p className="memory-place">Някъде незабравимо</p>
              <p className="memory-date">Твоето първо пътешествие</p>
            </div>
            <span className="memory-number">01</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Създаден за живот, който си струва да помниш.</span>
        <span aria-hidden="true">✦</span>
      </footer>
    </main>
  );
}
