import Link from "next/link";
import { BrandLink } from "./brand-link";
import { signOut } from "@/features/auth/actions";

function NavIcon({ name }: { name: "today" | "calendar" | "nutrition" | "journal" | "workouts" | "more" }) {
  const paths = {
    today: <><path d="M5 5.5h14v14H5z" /><path d="M8 3v5M16 3v5M5 9h14" /><circle cx="10" cy="14" r="1.7" /></>,
    calendar: <><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M8 3v5M16 3v5M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01" /></>,
    nutrition: <><path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M15 3v18M15 3c3 1 4.5 4 4.5 7.5H15" /></>,
    journal: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17M9 7h6M9 11h6" /></>,
    workouts: <><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></>,
    more: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function AppNavigation({ active }: { active?: "today" | "calendar" | "journal" | "nutrition" | "products" | "workouts" }) {
  return <>
    <nav className="app-nav" aria-label="Основна навигация">
      <BrandLink />
      <div className="app-nav-links">
      <Link className={active === "today" ? "active" : ""} href="/today">Днес</Link>
      <Link className={active === "calendar" ? "active" : ""} href="/calendar">Календар</Link>
      <Link className={active === "journal" ? "active" : ""} href="/journal">Дневник</Link>
      <Link className={active === "nutrition" ? "active" : ""} href="/nutrition">Хранене</Link>
      <Link className={active === "workouts" ? "active" : ""} href="/workouts">Тренировки</Link>
      <form action={signOut}><button type="submit">Изход</button></form>
      </div>
    </nav>
    <nav className="mobile-bottom-nav" aria-label="Мобилна навигация">
      <Link className={active === "today" ? "active" : ""} href="/today"><NavIcon name="today" /><span>Днес</span></Link>
      <Link className={active === "calendar" ? "active" : ""} href="/calendar"><NavIcon name="calendar" /><span>Календар</span></Link>
      <span className="mobile-ai-space" aria-hidden="true" />
      <Link className={active === "nutrition" ? "active" : ""} href="/nutrition"><NavIcon name="nutrition" /><span>Хранене</span></Link>
      <details className="mobile-more">
        <summary className={active === "journal" || active === "products" || active === "workouts" ? "active" : ""}><NavIcon name="more" /><span>Още</span></summary>
        <div>
          <Link href="/journal"><NavIcon name="journal" /> Дневник</Link>
          <Link href="/workouts"><NavIcon name="workouts" /> Тренировки</Link>
          <Link href="/products"><NavIcon name="nutrition" /> Продукти</Link>
          <form action={signOut}><button type="submit">Изход</button></form>
        </div>
      </details>
    </nav>
  </>;
}

