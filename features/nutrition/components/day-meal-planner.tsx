"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mealMenus, type MenuName } from "../meal-data";
import { saveDailyMealPlan } from "../meal-plan-actions";

export function DayMealPlanner({ date, initialMenu = "Меню 1", initialSelections = {} }: { date: string; initialMenu?: MenuName; initialSelections?: Record<string, number> }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  const [menu, setMenu] = useState<MenuName>(initialMenu); const [selections, setSelections] = useState<Record<string, number>>(initialSelections); const [message, setMessage] = useState("");
  const initialized = useRef(false); const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const meals = mealMenus[menu];
  const persist = (nextMenu: MenuName, nextSelections: Record<string, number>, refresh = true) => startTransition(async () => { setMessage("Запазване…"); const result = await saveDailyMealPlan({ date, menu: nextMenu, selections: nextSelections }); setMessage(result.ok ? "✓ Запазено в календара и пазарския списък" : `Грешка: ${result.message}`); if (result.ok && refresh) router.refresh(); });
  useEffect(() => { if (!initialized.current) { initialized.current = true; return; } if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => persist(menu, selections), 350); return () => { if (saveTimer.current) clearTimeout(saveTimer.current); }; }, [menu, selections]);
  const changeMenu = (value: MenuName) => { setMenu(value); setSelections({}); setMessage("Ще се запази автоматично…"); };
  const changeSelection = (meal: string, value: number) => { setSelections(current => ({...current,[meal]:value})); setMessage("Ще се запази автоматично…"); };
  const save = () => persist(menu, selections);
  return <section className="day-meal-planner"><header><div><p className="life-kicker">Хранене за деня</p><h2>Избери меню и варианти</h2></div><select value={menu} onChange={e => changeMenu(e.target.value as MenuName)}>{Object.keys(mealMenus).map(name => <option key={name}>{name}</option>)}</select></header>
    <div className="day-meal-planner-list">{Object.entries(meals).map(([meal, options]) => { const selected = selections[meal] ?? 0; return <article key={meal}><div className="day-meal-planner-title"><strong>{meal}</strong><span>Вариант {selected + 1}</span></div><select value={selected} onChange={e => changeSelection(meal,Number(e.target.value))}>{options.map((option: string, index: number) => <option key={option} value={index}>Вариант {index+1}</option>)}</select><div className="day-meal-foods">{options[selected].split(" + ").map((food: string, index: number) => <span key={`${food}-${index}`}>{food}</span>)}</div></article>; })}</div>
    <button className="primary-button" type="button" disabled={pending} onClick={save}>{pending ? "Запазване…" : "Запази сега"}</button><p className={`form-message ${message.startsWith("✓") ? "is-success" : message.startsWith("Грешка") ? "is-error" : ""}`}>{message || "Промените се запазват автоматично."}</p></section>;
}
