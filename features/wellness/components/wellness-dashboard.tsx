"use client";

import { useActionState, useState } from "react";
import { saveDailyWellness, type WellnessState } from "../actions";
import { wellnessScores, type DailyWellness } from "../types";
import styles from "./wellness-dashboard.module.css";

const initial: WellnessState = { status: "idle", message: "" };
const metrics = [{ key: "recovery", label: "Recovery" }, { key: "strain", label: "Strain" }, { key: "sleep", label: "Sleep" }, { key: "energy", label: "Energy" }] as const;

export function WellnessDashboard({ date, value, workoutCount }: { date: string; value: DailyWellness | null; workoutCount: number }) {
  const [open, setOpen] = useState(!value); const [state, action, pending] = useActionState(saveDailyWellness, initial); const scores = wellnessScores(value, workoutCount);
  return <section className={styles.wrap}>
    <div className={styles.topline}><div><p>Daily health</p><h1>Добър вечер</h1></div><button type="button" onClick={() => setOpen(true)}>Check-in</button></div>
    <div className={styles.metrics}>{metrics.map(({ key, label }) => <article key={key} className={styles.metric}><div className={styles.ring} style={{ "--score": scores[key] } as React.CSSProperties}><span><strong>{scores[key]}%</strong><small>{label}</small></span></div></article>)}</div>
    <article className={styles.coach}><span>✦</span><div><small>PEGASOS INSIGHT</small><h2>{value ? scores.recovery >= 70 ? "Имаш добър капацитет за активен ден." : "Днес заложи на по-спокоен ритъм." : "Направи първия си дневен check-in."}</h2><p>{value ? `Сън ${value.sleep_hours} ч. · Енергия ${value.energy}/5 · Стрес ${value.stress}/5` : "Няколко бързи отговора ще превърнат таблото в персонален здравен ориентир."}</p></div></article>
    {open ? <div className={styles.backdrop} role="presentation"><section className={styles.sheet} role="dialog" aria-modal="true" aria-label="Дневен check-in"><header><div><small>ДНЕШНО СЪСТОЯНИЕ</small><h2>Как се чувстваш?</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Затвори">×</button></header><form action={action}><input type="hidden" name="date" value={date}/><div className={styles.grid}><label>Сън (часове)<input name="sleepHours" type="number" min="0" max="24" step="0.25" defaultValue={value?.sleep_hours ?? 8}/></label><label>Пулс в покой<input name="restingHeartRate" type="number" min="25" max="220" defaultValue={value?.resting_heart_rate ?? ""}/></label>{[["sleepQuality","Качество на съня",value?.sleep_quality],["energy","Енергия",value?.energy],["soreness","Мускулна умора",value?.soreness],["stress","Стрес",value?.stress]].map(([name,label,current]) => <label key={String(name)}>{label}<input name={String(name)} type="range" min="1" max="5" defaultValue={Number(current ?? 3)}/><span>1 — 5</span></label>)}</div><label className={styles.notes}>Бележка<textarea name="notes" maxLength={500} defaultValue={value?.notes ?? ""}/></label>{state.message ? <p className={state.status === "error" ? styles.error : styles.success}>{state.message}</p> : null}<button className={styles.save} disabled={pending}>{pending ? "Запазване…" : "Запази check-in"}</button></form></section></div> : null}
  </section>;
}

