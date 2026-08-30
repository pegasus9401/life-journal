"use client";

import { useActionState } from "react";
import { saveProfile, saveUserGoals, type ProfileActionState } from "../actions";
import type { Profile, UserGoals } from "../types";

const initialState: ProfileActionState = { status: "idle", message: "" };

function Status({ state }: { state: ProfileActionState }) {
  return state.message ? <p role="status" className={`form-status ${state.status}`}>{state.message}</p> : null;
}

export function ProfileExperience({ email, profile, goals }: { email: string; profile: Profile | null; goals: UserGoals }) {
  const [profileState, profileAction, profilePending] = useActionState(saveProfile, initialState);
  const [goalsState, goalsAction, goalsPending] = useActionState(saveUserGoals, initialState);
  return <div className="life-page">
    <header className="life-page-header"><div><p className="life-kicker">Твоят PegasOS</p><h1>Профил и цели</h1><p>{email}</p></div></header>
    <div className="today-dashboard">
      <section className="today-main-panel">
        <div className="section-heading"><div><p className="life-kicker">Лични данни</p><h2>Профил</h2></div></div>
        <form action={profileAction} className="entry-main-fields">
          <label className="field"><span>Име</span><input name="displayName" defaultValue={profile?.display_name ?? ""} maxLength={100} /></label>
          <label className="field"><span>Рождена дата</span><input type="date" name="birthDate" defaultValue={profile?.birth_date ?? ""} /></label>
          <label className="field"><span>Пол</span><select name="sex" defaultValue={profile?.sex ?? ""}><option value="">Не е зададен</option><option value="female">Жена</option><option value="male">Мъж</option><option value="other">Друго</option><option value="prefer_not_to_say">Предпочитам да не казвам</option></select></label>
          <label className="field"><span>Ръст, cm</span><input type="number" inputMode="decimal" name="heightCm" min="50" max="300" step="0.1" defaultValue={profile?.height_cm ?? ""} /></label>
          <label className="field"><span>Текущо тегло, kg</span><input type="number" inputMode="decimal" name="currentWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.current_weight_kg ?? ""} /></label>
          <label className="field"><span>Начално тегло, kg</span><input type="number" inputMode="decimal" name="startingWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.starting_weight_kg ?? ""} /></label>
          <label className="field"><span>Целево тегло, kg</span><input type="number" inputMode="decimal" name="targetWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.target_weight_kg ?? ""} /></label>
          <label className="field"><span>Активност</span><select name="activityLevel" defaultValue={profile?.activity_level ?? ""}><option value="">Не е зададена</option><option value="sedentary">Заседнал</option><option value="light">Лека</option><option value="moderate">Умерена</option><option value="active">Активна</option><option value="very_active">Много активна</option></select></label>
          <label className="field"><span>Основна цел</span><select name="fitnessGoal" defaultValue={profile?.fitness_goal ?? ""}><option value="">Не е зададена</option><option value="lose_weight">Отслабване</option><option value="maintain">Поддържане</option><option value="gain_muscle">Мускулна маса</option><option value="improve_fitness">По-добра форма</option></select></label>
          <input type="hidden" name="timezone" value={profile?.timezone ?? "Europe/Sofia"} />
          <Status state={profileState} /><button className="primary-button" type="submit" disabled={profilePending}>{profilePending ? "Запазване…" : "Запази профила"}</button>
        </form>
      </section>
      <aside className="today-side-panel"><section className="today-widget">
        <div className="section-heading"><div><p className="life-kicker">Всеки ден</p><h2>Цели</h2></div></div>
        <form id="goals" action={goalsAction} className="entry-main-fields">
          <input type="hidden" name="source" value="manual" />
          <label className="field"><span>Калории</span><input type="number" name="calories" min="1" defaultValue={goals.calorie_goal} required /></label>
          <label className="field"><span>Протеин, g</span><input type="number" name="protein" min="0" step="0.1" defaultValue={goals.protein_goal_g} required /></label>
          <label className="field"><span>Въглехидрати, g</span><input type="number" name="carbs" min="0" step="0.1" defaultValue={goals.carbs_goal_g} required /></label>
          <label className="field"><span>Мазнини, g</span><input type="number" name="fat" min="0" step="0.1" defaultValue={goals.fat_goal_g} required /></label>
          <label className="field"><span>Вода, ml</span><input type="number" name="water" min="0" max="20000" defaultValue={goals.water_goal_ml} required /></label>
          <label className="field"><span>Стъпки</span><input type="number" name="steps" min="0" max="200000" defaultValue={goals.steps_goal} required /></label>
          <Status state={goalsState} /><button className="primary-button" type="submit" disabled={goalsPending}>{goalsPending ? "Запазване…" : "Запази целите"}</button>
        </form>
      </section></aside>
    </div>
  </div>;
}


