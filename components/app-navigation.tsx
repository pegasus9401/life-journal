import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { CaptureButton } from "@/components/capture-button";

type Area = "today" | "health" | "planner" | "journal" | "progress";
function areaFor(active?: string): Area | undefined {
  if (active === "nutrition" || active === "recipes" || active === "products" || active === "workouts") return "health";
  if (active === "calendar") return "planner";
  if (active === "profile") return "progress";
  return active as Area | undefined;
}
function Icon({ name }: { name: Area }) {
  const paths = {
    today: <><path d="M5 5.5h14v14H5z"/><path d="M8 3v5M16 3v5M5 9h14"/><circle cx="10" cy="14" r="1.7"/></>,
    health: <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="M8.5 12h2l1-2.5 1.7 5 1-2.5h1.8"/></>,
    planner: <><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3v5M16 3v5M4 10h16M8 14h.01M12 14h.01M16 14h.01"/></>,
    journal: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17M9 7h6M9 11h6"/></>,
    progress: <><path d="M5 19V9M12 19V5M19 19V2"/><path d="M3 19h18"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
const desktopAreas: Array<{ key: Area; label: string; href: string }> = [
  { key: "today", label: "Днес", href: "/today" },
  { key: "health", label: "Здраве", href: "/nutrition" },
  { key: "planner", label: "Планер", href: "/calendar" },
  { key: "journal", label: "Дневник", href: "/journal" },
  { key: "progress", label: "Прогрес", href: "/profile" },
];
const mobileAreas = desktopAreas.filter((area) => area.key !== "progress");

export function AppNavigation({ active, title }: { active?: string; title?: string }) {
  const selected = areaFor(active);
  return <>
    <nav className="p2-top-nav" aria-label="Основна навигация">
      <Link className="p2-brand" href="/today" aria-label="PEGASOS — Днес"><span>✦</span><strong>{title ?? "PEGASOS"}</strong></Link>
      <div>{desktopAreas.map((area) => <Link key={area.key} className={selected === area.key ? "active" : ""} href={area.href}>{area.label}</Link>)}</div>
      <form action={signOut}><button type="submit">Изход</button></form>
    </nav>
    <nav className="p2-bottom-nav" aria-label="Мобилна навигация">
      {mobileAreas.slice(0, 2).map((area) => <Link key={area.key} className={selected === area.key ? "active" : ""} href={area.href}><Icon name={area.key}/><span>{area.label}</span></Link>)}
      <CaptureButton />
      {mobileAreas.slice(2).map((area) => <Link key={area.key} className={selected === area.key ? "active" : ""} href={area.href}><Icon name={area.key}/><span>{area.label}</span></Link>)}
    </nav>
  </>;
}
