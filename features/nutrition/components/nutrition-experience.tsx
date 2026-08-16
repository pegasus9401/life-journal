"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteNutritionEntry, saveNutritionEntry, saveNutritionGoals, type NutritionActionState } from "../actions";
import { goalProgress, nutritionTotals } from "../domain";
import { MEAL_LABELS, type MealType, type NutritionEntry, type NutritionGoals } from "../types";

const initialState: NutritionActionState = { status: "idle", message: "" };
const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

function Metric({ label, value, goal, unit, tone }: { label: string; value: number; goal: number; unit: string; tone: "protein" | "carbs" | "fat" }) {
  const progress = goalProgress(value, goal);
  return <article className={`nutrition-metric macro-${tone}`}>
    <div><span>{label}</span><strong>{Math.round(value)}<small> / {goal} {unit}</small></strong></div>
    <div className="nutrition-progress" aria-label={`${progress}% от целта`}><span style={{ width: `${progress}%` }} /></div>
  </article>;
}

function EntryForm({ date, entry, mealType, onClose }: { date: string; entry: NutritionEntry | null; mealType: MealType; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveNutritionEntry, initialState);
  useEffect(() => { if (state.status === "success") { router.refresh(); const timer = setTimeout(onClose, 350); return () => clearTimeout(timer); } }, [state, router, onClose]);
  return <div className="quick-add-backdrop nutrition-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="food-form-title">
      <header><div><p className="life-kicker">{MEAL_LABELS[entry?.meal_type ?? mealType]}</p><h2 id="food-form-title">{entry ? "Редактирай храненето" : "Какво хапна?"}</h2></div><button type="button" aria-label="Затвори" onClick={onClose}>×</button></header>
      <form action={action} className="quick-form nutrition-entry-form">
        <input type="hidden" name="id" value={entry?.id ?? ""} />
        <input type="hidden" name="entryDate" value={date} />
        <label><span>Хранене</span><select name="mealType" defaultValue={entry?.meal_type ?? mealType}>{mealTypes.map((type) => <option key={type} value={type}>{MEAL_LABELS[type]}</option>)}</select></label>
        <label><span>Храна или ястие</span><input name="name" autoFocus required maxLength={160} defaultValue={entry?.name ?? ""} placeholder="Напр. омлет със сирене" /></label>
        <div className="quick-form-row"><label><span>Количество</span><input name="quantity" maxLength={80} defaultValue={entry?.quantity ?? ""} placeholder="Напр. 250 г" /></label><label><span>Калории</span><input name="calories" type="number" min="0" step="1" required defaultValue={entry?.calories ?? 0} /></label></div>
        <div className="nutrition-macro-inputs">
          <label><span>Протеин (г)</span><input name="protein" type="number" min="0" step="0.1" defaultValue={entry?.protein_g ?? 0} /></label>
          <label><span>Въглехидрати (г)</span><input name="carbs" type="number" min="0" step="0.1" defaultValue={entry?.carbs_g ?? 0} /></label>
          <label><span>Мазнини (г)</span><input name="fat" type="number" min="0" step="0.1" defaultValue={entry?.fat_g ?? 0} /></label>
        </div>
        <label><span>Бележка</span><textarea name="notes" rows={2} maxLength={1000} defaultValue={entry?.notes ?? ""} placeholder="По желание" /></label>
        <button className="primary-button" disabled={pending}>{pending ? "Запазване…" : "Запази"}</button>
        <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
      </form>
    </section>
  </div>;
}

function GoalsForm({ goals, onClose }: { goals: NutritionGoals; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveNutritionGoals, initialState);
  useEffect(() => { if (state.status === "success") { router.refresh(); const timer = setTimeout(onClose, 350); return () => clearTimeout(timer); } }, [state, router, onClose]);
  return <div className="quick-add-backdrop nutrition-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="quick-add-sheet" role="dialog" aria-modal="true" aria-labelledby="goals-title">
    <header><div><p className="life-kicker">Настройки</p><h2 id="goals-title">Дневни цели</h2></div><button type="button" aria-label="Затвори" onClick={onClose}>×</button></header>
    <form action={action} className="quick-form nutrition-goals-form">
      <label><span>Калории</span><input name="calories" type="number" min="1" required defaultValue={goals.calories} /></label>
      <label><span>Протеин (г)</span><input name="protein" type="number" min="0" step="1" required defaultValue={goals.protein} /></label>
      <label><span>Въглехидрати (г)</span><input name="carbs" type="number" min="0" step="1" required defaultValue={goals.carbs} /></label>
      <label><span>Мазнини (г)</span><input name="fat" type="number" min="0" step="1" required defaultValue={goals.fat} /></label>
      <button className="primary-button" disabled={pending}>{pending ? "Запазване…" : "Запази целите"}</button>
      <p className={`form-message ${state.status}`} aria-live="polite">{state.message}</p>
    </form>
  </section></div>;
}

export function NutritionExperience({ date, today, entries, goals }: { date: string; today: string; entries: NutritionEntry[]; goals: NutritionGoals }) {
  const router = useRouter();
  const [editor, setEditor] = useState<{ mealType: MealType; entry: NutritionEntry | null } | null>(null);
  const [showGoals, setShowGoals] = useState(false);
  const totals = useMemo(() => nutritionTotals(entries), [entries]);
  const remaining = Math.max(0, goals.calories - totals.calories);

  async function remove(entry: NutritionEntry) {
    if (!window.confirm(`Да изтрия ли „${entry.name}“?`)) return;
    await deleteNutritionEntry(entry.id); router.refresh();
  }

  return <>
    <header className="nutrition-header">
      <div><p className="life-kicker">Моят хранителен дневник</p><h1>{date === today ? "Днес" : formatDate(date)}</h1><p>{Math.round(totals.calories)} приети · {Math.round(remaining)} оставащи калории</p></div>
      <div className="nutrition-date-controls"><Link href={`/nutrition?date=${shiftDate(date, -1)}`} aria-label="Предишен ден">←</Link><Link href="/nutrition">Днес</Link><Link href={`/nutrition?date=${shiftDate(date, 1)}`} aria-label="Следващ ден">→</Link></div>
    </header>

    <section className="nutrition-overview">
      <div className="nutrition-calorie-ring" style={{ "--progress": `${goalProgress(totals.calories, goals.calories) * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.round(totals.calories)}</strong><span>от {goals.calories} kcal</span></div></div>
      <div className="nutrition-metrics"><Metric label="Протеин" value={totals.protein} goal={goals.protein} unit="г" tone="protein" /><Metric label="Въглехидрати" value={totals.carbs} goal={goals.carbs} unit="г" tone="carbs" /><Metric label="Мазнини" value={totals.fat} goal={goals.fat} unit="г" tone="fat" /></div>
      <button className="nutrition-goals-button" type="button" onClick={() => setShowGoals(true)}>Промени целите</button>
    </section>

    <section className="nutrition-meals">
      {mealTypes.map((type) => {
        const mealEntries = entries.filter((entry) => entry.meal_type === type);
        const calories = mealEntries.reduce((sum, entry) => sum + entry.calories, 0);
        return <article className="nutrition-meal" key={type}><header><div><h2>{MEAL_LABELS[type]}</h2><span>{Math.round(calories)} kcal</span></div><button type="button" onClick={() => setEditor({ mealType: type, entry: null })}>+ Добави</button></header>
          {mealEntries.length ? <div className="nutrition-food-list">{mealEntries.map((entry) => <div className="nutrition-food" key={entry.id}><button className="nutrition-food-main" type="button" onClick={() => setEditor({ mealType: type, entry })}><strong>{entry.name}</strong><span>{entry.quantity || "Без количество"} · П {entry.protein_g} · В {entry.carbs_g} · М {entry.fat_g}</span></button><strong>{entry.calories} <small>kcal</small></strong><button className="nutrition-delete" type="button" aria-label={`Изтрий ${entry.name}`} onClick={() => remove(entry)}>×</button></div>)}</div> : <button className="nutrition-empty-meal" type="button" onClick={() => setEditor({ mealType: type, entry: null })}>Добави първото хранене</button>}
        </article>;
      })}
    </section>
    {editor ? <EntryForm date={date} mealType={editor.mealType} entry={editor.entry} onClose={() => setEditor(null)} /> : null}
    {showGoals ? <GoalsForm goals={goals} onClose={() => setShowGoals(false)} /> : null}
  </>;
}
