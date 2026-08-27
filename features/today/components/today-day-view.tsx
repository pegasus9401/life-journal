"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays } from "@/features/calendar/domain/date-utils";
import type { TodayDashboardData } from "../types";
import { TodayDashboard } from "./today-dashboard";
import styles from "./timeline.module.css";

const dateLabel = new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function TodayDayView({ data, today }: { data: TodayDashboardData; today: string }) {
  const router = useRouter(); const touch = useRef<{ x: number; y: number } | null>(null); const [moving, setMoving] = useState<"older" | "newer" | null>(null);
  const go = (date: string, direction: "older" | "newer") => { if (date > today) return; setMoving(direction); router.push(`/today?date=${date}`, { scroll: false }); window.setTimeout(() => setMoving(null), 260); };
  const older = addDays(data.date, -1); const newer = addDays(data.date, 1); const canNewer = newer <= today;
  useEffect(() => { router.prefetch(`/today?date=${older}`); if (canNewer) router.prefetch(`/today?date=${newer}`); }, [router, older, newer, canNewer]);
  return <div className={`${styles.dayView} ${moving ? styles[moving] : ""}`} onTouchStart={(event) => { const target = event.target as HTMLElement; if (target.closest("[data-horizontal-scroll],button,a,input,textarea,select")) return; const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY }; }} onTouchEnd={(event) => { if (!touch.current) return; const point = event.changedTouches[0]; const dx = point.clientX - touch.current.x; const dy = point.clientY - touch.current.y; touch.current = null; if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.35) return; if (dx > 0) go(older, "older"); else if (canNewer) go(newer, "newer"); }}>
    <TodayDashboard data={data} dateNavigation={<nav className={styles.dayNavigation} aria-label="Избран ден"><button type="button" onClick={() => go(older, "older")} aria-label="Предишен ден">‹</button><label><span>{data.isToday ? "Днес" : "Избран ден"}</span><strong>{dateLabel.format(new Date(`${data.date}T12:00:00Z`))}</strong><input type="date" value={data.date} max={today} onChange={(event) => go(event.target.value, event.target.value < data.date ? "older" : "newer")} aria-label="Избери минала дата" /></label><button type="button" disabled={!canNewer} onClick={() => go(newer, "newer")} aria-label="Следващ ден">›</button>{!data.isToday ? <button type="button" className={styles.todayShortcut} onClick={() => go(today, "newer")}>Днес</button> : null}</nav>}/>
  </div>;
}

