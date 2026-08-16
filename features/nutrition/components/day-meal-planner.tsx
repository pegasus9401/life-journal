"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMenuLibrary, orderedMealEntries, type MealMenuSettings, type MenuLibrary } from "../menu-library";
import { removeDailyMealPlan, saveDailyMealPlan } from "../meal-plan-actions";

export function DayMealPlanner({ date, initialMenu = "Меню 1", initialSelections = {}, initialHasPlan = false }: { date: string; initialMenu?: string; initialSelections?: Record<string, number>; initialHasPlan?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menus, setMenus] = useState<MenuLibrary>({});
  const [activeNames, setActiveNames] = useState<string[]>([]);
  const [menu, setMenu] = useState(initialMenu);
  const [selections, setSelections] = useState<Record<string, number>>(initialSelections);
  const [message, setMessage] = useState("");
  const [hasPlan, setHasPlan] = useState(initialHasPlan);
  const initialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await createClient().auth.getUser();
      const settings = (user?.user_metadata ?? {}) as MealMenuSettings;
      const allMenus = getMenuLibrary(settings);
      const activeMenus = getMenuLibrary(settings, false);
      setMenus(allMenus);
      setActiveNames(Object.keys(activeMenus));
      if (!allMenus[initialMenu]) {
        const fallback = Object.keys(activeMenus)[0];
        if (fallback) { setMenu(fallback); setSelections({}); }
      }
    })();
  }, [initialMenu]);

  const meals = menus[menu];
  const persist = (nextMenu: string, nextSelections: Record<string, number>, refresh = true) => startTransition(async () => {
    setMessage("Запазване…");
    const result = await saveDailyMealPlan({ date, menu: nextMenu, selections: nextSelections });
    setMessage(result.ok ? "✓ Запазено в календара и пазарския списък" : `Грешка: ${result.message}`);
    if (result.ok) setHasPlan(true);
    if (result.ok && refresh) router.refresh();
  });

  const removePlan = () => {
    if (!window.confirm("Да премахна ли хранителното меню от този ден?")) return;
    startTransition(async () => {
      setMessage("Премахване…");
      const result = await removeDailyMealPlan(date);
      setMessage(result.ok ? "✓ Менюто е премахнато от деня" : `Грешка: ${result.message}`);
      if (result.ok) { setHasPlan(false); router.refresh(); }
    });
  };

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    if (!meals) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(menu, selections), 350);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [menu, selections]);

  const changeMenu = (value: string) => { setMenu(value); setSelections({}); setMessage("Ще се запази автоматично…"); };
  const changeSelection = (meal: string, value: number) => { setSelections(current => ({ ...current, [meal]: value })); setMessage("Ще се запази автоматично…"); };
  const menuNames = activeNames.includes(menu) ? activeNames : [menu, ...activeNames];

  if (!meals) return <section className="day-meal-planner"><p className="form-message">Зареждане на менютата…</p></section>;

  return <section className="day-meal-planner">
    <header><div><p className="life-kicker">Хранене за {new Date(`${date}T00:00:00Z`).toLocaleDateString("bg-BG", { day: "numeric", month: "long", timeZone: "UTC" })}</p><h2>{hasPlan ? "Промени или премахни менюто" : "Добави меню към деня"}</h2></div><select value={menu} onChange={event => changeMenu(event.target.value)}>{menuNames.map(name => <option key={name} value={name}>{name}{!activeNames.includes(name) ? " (архивирано)" : ""}</option>)}</select></header>
    <div className="day-meal-planner-list">{orderedMealEntries(meals).map(([meal, options]) => { const selected = Math.min(selections[meal] ?? 0, options.length - 1); return <article key={meal}><div className="day-meal-planner-title"><strong>{meal}</strong><span>Вариант {selected + 1}</span></div><select value={selected} onChange={event => changeSelection(meal, Number(event.target.value))}>{options.map((option, index) => <option key={`${option}-${index}`} value={index}>Вариант {index + 1}</option>)}</select><div className="day-meal-foods">{options[selected].split(" + ").map((food, index) => <span key={`${food}-${index}`}>{food}</span>)}</div></article>; })}</div>
    <div className="day-meal-planner-actions"><button className="primary-button" type="button" disabled={pending || !activeNames.includes(menu)} onClick={() => persist(menu, selections)}>{pending ? "Запазване…" : hasPlan ? "Запази промените" : "Добави към деня"}</button>{hasPlan ? <button className="remove-meal-plan" type="button" disabled={pending} onClick={removePlan}>Премахни от този ден</button> : null}</div>
    <p className={`form-message ${message.startsWith("✓") ? "is-success" : message.startsWith("Грешка") ? "is-error" : ""}`}>{message || "Промените се запазват автоматично."}</p>
  </section>;
}
