"use client";

import { useActionState, useMemo, useState } from "react";
import { saveLongTermGoals, saveUserGoals, type ProfileActionState } from "../actions";
import { missingRecommendationFields, recommendNutrition } from "../nutrition-goals";
import type { Profile, UserGoals } from "../types";
import styles from "./goals-settings.module.css";

const initialState: ProfileActionState = { status: "idle", message: "" };
type FitnessGoal = NonNullable<Profile["fitness_goal"]>;
function Status({ state }: { state: ProfileActionState }) { return state.message ? <p role="status" className={`${styles.status} ${styles[state.status]}`}>{state.message}</p> : null; }

export function GoalsSettings({ profile, goals }: { profile: Profile | null; goals: UserGoals }) {
  const [longState, longAction, longPending] = useActionState(saveLongTermGoals, initialState);
  const [dailyState, dailyAction, dailyPending] = useActionState(saveUserGoals, initialState);
  const [goal, setGoal] = useState<FitnessGoal | "">(profile?.fitness_goal ?? "");
  const [source, setSource] = useState<"manual" | "automatic">(goals.source === "automatic" ? "automatic" : "manual");
  const [values, setValues] = useState({ calories: String(goals.calorie_goal), protein: String(goals.protein_goal_g), carbs: String(goals.carbs_goal_g), fat: String(goals.fat_goal_g) });
  const recommendation = useMemo(() => recommendNutrition(profile, goal || null), [profile, goal]);
  const missing = useMemo(() => missingRecommendationFields(profile, goal || null), [profile, goal]);

  function update(field: keyof typeof values, value: string) {
    setSource("manual");
    setValues((current) => ({ ...current, [field]: value }));
  }

  function applyRecommendation() {
    if (!recommendation) return;
    setValues({ calories: String(recommendation.calories), protein: String(recommendation.protein), carbs: String(recommendation.carbs), fat: String(recommendation.fat) });
    setSource("automatic");
  }

  return <div className={styles.grid}>
    <section className={styles.card}>
      <div><p>Дългосрочни</p><h2>Основна цел</h2><span>Използва се от Home, Progress, Nutrition и AI асистента.</span></div>
      <form action={longAction}>
        <label>Посока<select name="fitnessGoal" value={goal} onChange={(event) => setGoal(event.target.value as FitnessGoal | "")}><option value="">Не е зададена</option><option value="lose_weight">Отслабване</option><option value="maintain">Поддържане</option><option value="gain_muscle">Мускулна маса</option><option value="improve_fitness">По-добра форма</option></select></label>
        <label>Целево тегло, kg<input type="number" inputMode="decimal" name="targetWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.target_weight_kg ?? ""}/></label>
        <Status state={longState}/><button type="submit" disabled={longPending}>{longPending ? "Запазване…" : "Запази дългосрочните цели"}</button>
      </form>
    </section>
    <section className={styles.card}>
      <div><p>Всеки ден</p><h2>Дневни цели</h2><span>Хранене, хидратация и движение.</span></div>
      {recommendation ? <aside className={styles.recommendation}>
        <div><p>Препоръка за твоята цел</p><strong>{recommendation.calories} kcal</strong><span>{recommendation.protein} г протеин · {recommendation.carbs} г въглехидрати · {recommendation.fat} г мазнини</span><small>{recommendation.basis}</small></div>
        <button type="button" onClick={applyRecommendation}>Приложи</button>
      </aside> : <aside className={styles.missing}><strong>Нужни са още данни за препоръка</strong><span>Липсват: {missing.join(", ")}.</span><small>Можеш да въведеш целите ръчно, докато попълниш параметрите.</small></aside>}
      <form action={dailyAction}>
        <input type="hidden" name="source" value={source}/>
        <label>Калории<input type="number" name="calories" min="1" value={values.calories} onChange={(event) => update("calories", event.target.value)} required/></label>
        <label>Протеин, g<input type="number" name="protein" min="0" step="1" value={values.protein} onChange={(event) => update("protein", event.target.value)} required/></label>
        <label>Въглехидрати, g<input type="number" name="carbs" min="0" step="1" value={values.carbs} onChange={(event) => update("carbs", event.target.value)} required/></label>
        <label>Мазнини, g<input type="number" name="fat" min="0" step="1" value={values.fat} onChange={(event) => update("fat", event.target.value)} required/></label>
        <label>Вода, ml<input type="number" name="water" min="0" max="20000" defaultValue={goals.water_goal_ml} required/></label>
        <label>Стъпки<input type="number" name="steps" min="0" max="200000" defaultValue={goals.steps_goal} required/></label>
        <p className={styles.hint}>Макросите трябва да отговарят на калориите: протеин и въглехидрати × 4 kcal, мазнини × 9 kcal.</p>
        <Status state={dailyState}/><button type="submit" disabled={dailyPending}>{dailyPending ? "Запазване…" : "Запази дневните цели"}</button>
      </form>
    </section>
  </div>;
}

