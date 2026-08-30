"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileActionState } from "../actions";
import type { Profile } from "../types";

const initialState: ProfileActionState = { status: "idle", message: "" };
function Status({ state }: { state: ProfileActionState }) { return state.message ? <p role="status" className={`form-status ${state.status}`}>{state.message}</p> : null; }

export function ProfileExperience({ email, profile }: { email: string; profile: Profile | null }) {
  const [profileState, profileAction, profilePending] = useActionState(saveProfile, initialState);
  return <div className="life-page">
    <header className="life-page-header"><div><p className="life-kicker">Твоят PegasOS</p><h1>Профил</h1><p>{email}</p></div></header>
    <section className="today-main-panel"><div className="section-heading"><div><p className="life-kicker">Лични данни</p><h2>Твоите данни</h2></div></div>
      <form action={profileAction} className="entry-main-fields">
        <label className="field"><span>Име</span><input name="displayName" defaultValue={profile?.display_name ?? ""} maxLength={100} /></label>
        <label className="field"><span>Рождена дата</span><input type="date" name="birthDate" defaultValue={profile?.birth_date ?? ""} /></label>
        <label className="field"><span>Пол</span><select name="sex" defaultValue={profile?.sex ?? ""}><option value="">Не е зададен</option><option value="female">Жена</option><option value="male">Мъж</option><option value="other">Друго</option><option value="prefer_not_to_say">Предпочитам да не казвам</option></select></label>
        <label className="field"><span>Ръст, cm</span><input type="number" inputMode="decimal" name="heightCm" min="50" max="300" step="0.1" defaultValue={profile?.height_cm ?? ""} /></label>
        <label className="field"><span>Текущо тегло, kg</span><input type="number" inputMode="decimal" name="currentWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.current_weight_kg ?? ""} /></label>
        <label className="field"><span>Начално тегло, kg</span><input type="number" inputMode="decimal" name="startingWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.starting_weight_kg ?? ""} /></label>
        <label className="field"><span>Активност</span><select name="activityLevel" defaultValue={profile?.activity_level ?? ""}><option value="">Не е зададена</option><option value="sedentary">Заседнал</option><option value="light">Лека</option><option value="moderate">Умерена</option><option value="active">Активна</option><option value="very_active">Много активна</option></select></label>
        <input type="hidden" name="targetWeightKg" value={profile?.target_weight_kg ?? ""}/><input type="hidden" name="fitnessGoal" value={profile?.fitness_goal ?? ""}/><input type="hidden" name="timezone" value={profile?.timezone ?? "Europe/Sofia"} />
        <Status state={profileState} /><button className="primary-button" type="submit" disabled={profilePending}>{profilePending ? "Запазване…" : "Запази профила"}</button>
      </form>
    </section>
  </div>;
}
