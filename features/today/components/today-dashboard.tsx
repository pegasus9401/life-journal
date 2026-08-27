import Link from "next/link";
import { CalendarItem as ItemCard } from "@/features/calendar/components/calendar-item";
import { buildDailyBrief } from "../domain/daily-brief";
import type { TodayDashboardData } from "../types";
import styles from "./today-dashboard.module.css";


const dayFormat = new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const pct = (value: number, goal: number) => Math.min(100, Math.round(goal > 0 ? value / goal * 100 : 0));


export function TodayDashboard({ data }: { data: TodayDashboardData }) {
  const tasks = data.plannerItems.filter((item) => item.type === "task");
  const schedule = data.plannerItems.filter((item) => item.type !== "task").slice(0, 4);
  const nutrition = data.nutrition;
  const macros = [
    ["Протеин", nutrition.protein, nutrition.proteinGoal, "protein"],
    ["Въглехидрати", nutrition.carbs, nutrition.carbsGoal, "carbs"],
    ["Мазнини", nutrition.fat, nutrition.fatGoal, "fat"],
  ] as const;


  return <div className={styles.dashboard}>
    <header className={styles.header}>
      <div><p>{dayFormat.format(new Date(`${data.date}T12:00:00Z`))}</p><h1>{data.displayName ? `Здравей, ${data.displayName}` : "Здравей"}</h1></div>
      <Link href="/profile" aria-label="Отвори профила" className={styles.avatar}>{data.displayName?.slice(0, 1).toUpperCase() ?? "P"}</Link>
    </header>


    <section className={styles.brief} aria-labelledby="daily-brief-title"><span>✦</span><div><p id="daily-brief-title">PEGASOS DAILY BRIEF</p><h2>{buildDailyBrief(data)}</h2></div></section>


    <section className={styles.status} aria-label="Дневен статус">
      {([["Recovery", data.wellness.recovery], ["Strain", data.wellness.strain], ["Sleep", data.wellness.sleep], ["Energy", data.wellness.energy]] as const).map(([label, score]) =>
        <div key={label}><strong>{score ? `${score}%` : "—"}</strong><span>{label}</span></div>)}
    </section>


    <div className={styles.grid}>
      <section className={styles.primarySection}>
        <div className={styles.sectionHead}><div><p>ХРАНЕНЕ</p><h2>{Math.round(nutrition.calories)} <small>/ {nutrition.calorieGoal} kcal</small></h2></div><Link href="/nutrition">Детайли</Link></div>
        <div className={styles.calorieTrack}><span style={{ width: `${pct(nutrition.calories, nutrition.calorieGoal)}%` }} /></div>
