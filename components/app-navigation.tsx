"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLink } from "./brand-link";

export function AppNavigation({ active }: { active?: "today" | "calendar" | "journal" | "nutrition" | "workouts" }) {
  const [open, setOpen] = useState(false);

  const links = [
    ["today", "/today", "Днес"],
    ["calendar", "/calendar", "Календар"],
    ["journal", "/journal", "Дневник"],
    ["nutrition", "/nutrition", "Хранене"],
    ["workouts", "/workouts", "Тренировки"],
  ] as const;

  return <>
    <nav className="app-nav app-nav-compact" aria-label="Основна навигация">
      <button className="burger-button" type="button" aria-label="Отвори менюто" aria-expanded={open} onClick={() => setOpen(true)}>
        <span />
        <span />
        <span />
      </button>
      <BrandLink />
      <button className="profile-avatar" type="button" aria-label="Профил">
        <span>В</span>
      </button>
    </nav>

    <div className={`burger-backdrop ${open ? "is-open" : ""}`} onClick={() => setOpen(false)} />
    <aside className={`burger-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <header className="burger-drawer-header">
        <div>
          <p className="life-kicker">Life OS</p>
          <strong>Меню</strong>
        </div>
        <button type="button" aria-label="Затвори менюто" onClick={() => setOpen(false)}>×</button>
      </header>
      <div className="burger-profile">
        <div className="burger-profile-avatar">В</div>
        <div><strong>Вальо</strong><span>Моят профил</span></div>
      </div>
      <nav className="burger-links" aria-label="Меню">
        {links.map(([key, href, label]) => <Link key={key} className={active === key ? "active" : ""} href={href} onClick={() => setOpen(false)}><span>{label}</span><b>›</b></Link>)}
        <Link href="/assistant" onClick={() => setOpen(false)}><span>AI Асистент</span><b>›</b></Link>
      </nav>
    </aside>
  </>;
}
