"use client";

import { useActionState } from "react";
import { saveLongTermGoals, saveUserGoals, type ProfileActionState } from "../actions";
import type { Profile, UserGoals } from "../types";
import styles from "./goals-settings.module.css";

const initialState: ProfileActionState = { status: "idle", message: "" };
function Status({ state }: { state: ProfileActionState }) { return state.message ? <p role="status" className={`${styles.status} ${styles[state.status]}`}>{state.message}</p> : null; }

export function GoalsSettings({ profile, goals }: { profile: Profile | null; goals: UserGoals }) {
  const [longState, longAction, longPending] = useActionState(saveLongTermGoals, initialState);
  const [dailyState, dailyAction, dailyPending] = useActionState(saveUserGoals, initialState);
  return <div className={styles.grid}>
    <section className={styles.card}><div><p>Дългосрочни</p><h2>Основна цел</h2><span>Използва се от Home, Progress, Nutrition и AI асистента.</span></div><form action={longAction}><label>Посока<select name="fitnessGoal" defaultValue={profile?.fitness_goal ?? ""}><option value="">Не е зададена</option><option value="lose_weight">Отслабване</option><option value="maintain">Поддържане</option><option value="gain_muscle">Мускулна маса</option><option value="improve_fitness">По-добра форма</option></select></label><label>Целево тегло, kg<input type="number" inputMode="decimal" name="targetWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.target_weight_kg ?? ""}/></label><Status state={longState}/><button type="submit" disabled={longPending}>{longPending ? "Запазване…" : "Запази дългосрочните цели"}</button></form></section>
    <section className={styles.card}><div><p>Всеки ден</p><h2>Дневни цели</h2><span>Хранене, хидратация и движение.</span></div><form action={dailyAction}><input type="hidden" name="source" value="manual"/><label>Калории<input type="number" name="calories" min="1" defaultValue={goals.calorie_goal} required/></label><label>Протеин, g<input type="number" name="protein" min="0" step="0.1" defaultValue={goals.protein_goal_g} required/></label><label>Въглехидрати, g<input type="number" name="carbs" min="0" step="0.1" defaultValue={goals.carbs_goal_g} required/></label><label>Мазнини, g<input type="number" name="fat" min="0" step="0.1" defaultValue={goals.fat_goal_g} required/></label><label>Вода, ml<input type="number" name="water" min="0" max="20000" defaultValue={goals.water_goal_ml} required/></label><label>Стъпки<input type="number" name="steps" min="0" max="200000" defaultValue={goals.steps_goal} required/></label><Status state={dailyState}/><button type="submit" disabled={dailyPending}>{dailyPending ? "Запазване…" : "Запази дневните цели"}</button></form></section>
  </div>;
}
