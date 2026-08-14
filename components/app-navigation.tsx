import Link from "next/link";
import { BrandLink } from "./brand-link";
import { signOut } from "@/features/auth/actions";

export function AppNavigation({ active }: { active?: "today" | "calendar" | "journal" | "nutrition" | "workouts" | "assistant" }) {
  return <nav className="app-nav" aria-label="Основна навигация">
    <BrandLink />
    <div className="app-nav-links">
      <Link className={active === "today" ? "active" : ""} href="/today">Днес</Link>
      <Link className={active === "calendar" ? "active" : ""} href="/calendar">Календар</Link>
      <Link className={active === "journal" ? "active" : ""} href="/journal">Дневник</Link>
      <Link className={active === "nutrition" ? "active" : ""} href="/nutrition">Хранене</Link>
      <Link className={active === "workouts" ? "active" : ""} href="/workouts">Тренировки</Link>
      <Link className={active === "assistant" ? "active" : ""} href="/assistant">AI</Link>
      <form action={signOut}><button type="submit">Изход</button></form>
    </div>
  </nav>;
}
