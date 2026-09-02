"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { saveDailyWellness, type WellnessState } from "../actions";
import { wellnessScores, type DailyWellness, type WellnessScores } from "../types";
import styles from "./wellness-dashboard.module.css";

const initial: WellnessState = { status: "idle", message: "" };
const pct = (value: number, goal: number) => Math.min(100, Math.max(0, Math.round(goal > 0 ? value / goal * 100 : 0)));

function RangeField({ name, label, initialValue, low, high }: { name: string; label: string; initialValue: number; low: string; high: string }) {
  const [value, setValue] = useState(initialValue);
  return <label className={styles.rangeField}>
    <span><b>{label}</b><strong>{value}/5</strong></span>
    <input name={name} type="range" min="1" max="5" value={value} onChange={(event) => setValue(Number(event.target.value))} />
    <small><span>{low}</span><span>{high}</span></small>
  </label>;
}

function insightFor(value: DailyWellness | null, scores: WellnessScores) {
  if (!value) return { title: "Нека видим как си днес.", copy: "Краткият check-in ще свърже съня, енергията, стреса и натоварването в един здравен ориентир." };
  if (scores.recovery >= 75) return { title: "Имаш добър ресурс за активен ден.", copy: `Възстановяване ${scores.recovery}% · Сън ${value.sleep_hours} ч. · Енергия ${value.energy}/5` };
  if (scores.recovery >= 50) return { title: "Поддържай умерен и устойчив ритъм.", copy: `Възстановяване ${scores.recovery}% · Стрес ${value.stress}/5 · Умора ${value.soreness}/5` };
  return { title: "Днес сложи възстановяването на първо място.", copy: `Възстановяване ${scores.recovery}% · Сън ${value.sleep_hours} ч. · Енергия ${value.energy}/5` };
}

export function WellnessDashboard({ date, value, displayName, workoutCount, workoutMinutes, calories, calorieGoal, protein, proteinGoal, currentWeight, targetWeight }: {
  date: string;
  value: DailyWellness | null;
  displayName: string | null;
  workoutCount: number;
  workoutMinutes: number;
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  currentWeight: number | null;
  targetWeight: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveDailyWellness, initial);
  const scores = wellnessScores(value, workoutCount);
  const insight = insightFor(value, scores);
  const calorieProgress = pct(calories, calorieGoal);
  const proteinProgress = pct(protein, proteinGoal);
  const firstName = displayName?.trim().split(/\s+/)[0];
  const metrics = [
    { key: "recovery", label: "Възстановяване", detail: value ? "общ баланс" : "Няма check-in", tone: "#59cfa1" },
    { key: "sleep", label: "Сън", detail: value ? `${value.sleep_hours} часа` : "Няма данни", tone: "#7d8cff" },
    { key: "energy", label: "Енергия", detail: value ? `${value.energy}/5` : "Няма данни", tone: "#efb65d" },
    { key: "strain", label: "Натоварване", detail: workoutCount ? `${workoutCount} активности` : "Спокоен ден", tone: "#ef759d" },
  ] as const;

  useEffect(() => {
    if (state.status !== "success") return;
    router.refresh();
    const timer = window.setTimeout(() => setOpen(false), 650);
    return () => window.clearTimeout(timer);
  }, [state.status, router]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const closeFromGesture = () => setOpen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("gesture-close-overlay", closeFromGesture);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("gesture-close-overlay", closeFromGesture);
    };
  }, [open]);

  return <div className={styles.dashboard}>
    <header className={styles.pageHeader}>
      <div><p className={styles.brand}><span aria-hidden="true">✦</span> PEGASOS</p><h1>Здраве</h1><small>{firstName ? `${firstName}, тук виждаш цялостната картина.` : "Тук виждаш цялостната картина за деня."}</small></div>
      <Link href="/profile" aria-label="Отвори профила" className={styles.avatar}><span>{displayName?.slice(0, 1).toUpperCase() ?? "P"}</span></Link>
    </header>

    <section className={styles.hero} aria-labelledby="health-insight-title">
      <div className={styles.heroGlow} aria-hidden="true" />
      <Image className={styles.heroOrb} src="/images/pegas-friend.png" alt="" width={220} height={148} priority sizes="(max-width: 760px) 150px, 220px" />
      <div className={styles.heroContent}>
        <p><span aria-hidden="true" /> PEGAS · ЗДРАВЕН ОРИЕНТИР</p>
        <h2 id="health-insight-title">{insight.title}</h2>
        <div className={styles.heroInsight}>{insight.copy}</div>
        <button type="button" onClick={() => setOpen(true)}>{value ? "Обнови check-in" : "Направи check-in"}<span aria-hidden="true">›</span></button>
      </div>
    </section>

    <section className={styles.metrics} aria-label="Здравни показатели">
      {metrics.map((metric) => <article key={metric.key}>
        <i style={{ "--metric-score": `${scores[metric.key]}%`, "--metric-tone": metric.tone } as CSSProperties}><strong>{scores[metric.key] || "–"}</strong></i>
        <div><span>{metric.label}</span><small>{metric.detail}</small></div>
      </article>)}
    </section>

    <div className={styles.grid}>
      <section className={styles.card}>
        <header className={styles.cardHeader}><div><p>ХРАНЕНЕ</p><h2>Гориво за деня</h2></div><Link href={`/nutrition?date=${date}`}>Детайли <span>›</span></Link></header>
        <div className={styles.nutritionMain}><div className={styles.calorieRing} style={{ "--progress": `${calorieProgress}%` } as CSSProperties}><div><strong>{Math.round(calories)}</strong><span>kcal</span></div></div><div><small>ДНЕВНА ЦЕЛ</small><strong>{calorieGoal} kcal</strong><p>{Math.max(0, Math.round(calorieGoal - calories))} kcal остават</p></div></div>
        <div className={styles.progressRow}><span><b>Протеин</b><small>{Math.round(protein)} / {proteinGoal} g</small></span><i><em style={{ width: `${proteinProgress}%` }} /></i></div>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}><div><p>ДВИЖЕНИЕ</p><h2>Активност</h2></div><Link href="/workouts">Тренировки <span>›</span></Link></header>
        <div className={styles.activityMain}><span aria-hidden="true">↗</span><div><strong>{workoutCount}</strong><small>{workoutCount === 1 ? "активност днес" : "активности днес"}</small></div><div><strong>{workoutMinutes}</strong><small>планирани минути</small></div></div>
        <p className={styles.cardNote}>{workoutCount ? "Движението участва в оценката за дневно натоварване." : "Няма записана активност. Почивката също е част от прогреса."}</p>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}><div><p>СЪН И ПУЛС</p><h2>Възстановяване</h2></div><button type="button" onClick={() => setOpen(true)}>Редактирай</button></header>
        <div className={styles.detailList}><div><span>Сън</span><strong>{value ? `${value.sleep_hours} ч.` : "–"}</strong></div><div><span>Качество</span><strong>{value ? `${value.sleep_quality}/5` : "–"}</strong></div><div><span>Пулс в покой</span><strong>{value?.resting_heart_rate ? `${value.resting_heart_rate} bpm` : "–"}</strong></div></div>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHeader}><div><p>ТЯЛО И ЦЕЛ</p><h2>Тегло</h2></div><Link href="/profile">Профил <span>›</span></Link></header>
        <div className={styles.weightMain}><div><small>ТЕКУЩО</small><strong>{currentWeight ? `${currentWeight} kg` : "Не е добавено"}</strong></div><span aria-hidden="true">→</span><div><small>ЦЕЛ</small><strong>{targetWeight ? `${targetWeight} kg` : "Не е зададена"}</strong></div></div>
        <p className={styles.cardNote}>{currentWeight && targetWeight ? `Разлика до целта: ${Math.abs(currentWeight - targetWeight).toFixed(1)} kg.` : "Добави текущо и целево тегло, за да получаваш по-точни препоръки."}</p>
      </section>
    </div>

    {value?.notes ? <section className={styles.dailyNote}><span aria-hidden="true">✎</span><div><small>БЕЛЕЖКА ОТ CHECK-IN</small><p>{value.notes}</p></div><button type="button" onClick={() => setOpen(true)} aria-label="Редактирай бележката">›</button></section> : null}

    {open ? <div className={styles.backdrop} data-health-checkin role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="checkin-title">
        <div className={styles.sheetHandle} aria-hidden="true"><span /></div>
        <header><div><small>ДНЕШНО СЪСТОЯНИЕ</small><h2 id="checkin-title">Как се чувстваш?</h2><p>Отнема по-малко от минута.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Затвори">×</button></header>
        <form action={action}>
          <input type="hidden" name="date" value={date} />
          <div className={styles.numberGrid}>
            <label><span>Сън</span><div><input name="sleepHours" type="number" min="0" max="24" step="0.25" defaultValue={value?.sleep_hours ?? 8} /><b>часа</b></div></label>
            <label><span>Пулс в покой</span><div><input name="restingHeartRate" type="number" min="25" max="220" defaultValue={value?.resting_heart_rate ?? ""} placeholder="–" /><b>bpm</b></div></label>
          </div>
          <div className={styles.rangeGrid}>
            <RangeField name="sleepQuality" label="Качество на съня" initialValue={value?.sleep_quality ?? 3} low="Лошо" high="Отлично" />
            <RangeField name="energy" label="Енергия" initialValue={value?.energy ?? 3} low="Ниска" high="Висока" />
            <RangeField name="soreness" label="Мускулна умора" initialValue={value?.soreness ?? 3} low="Няма" high="Силна" />
            <RangeField name="stress" label="Стрес" initialValue={value?.stress ?? 3} low="Спокойно" high="Висок" />
          </div>
          <label className={styles.notes}><span>Бележка</span><textarea name="notes" maxLength={500} defaultValue={value?.notes ?? ""} placeholder="Нещо важно за днешното ти състояние..." /></label>
          {state.message ? <p className={state.status === "error" ? styles.error : styles.success} role="status">{state.message}</p> : null}
          <button className={styles.save} disabled={pending}>{pending ? "Запазване..." : "Запази дневното състояние"}</button>
        </form>
      </section>
    </div> : null}
  </div>;
}
