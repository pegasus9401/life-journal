import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { EditCalendarForm } from "@/features/calendar/components/edit-calendar-form";
import { getCalendarSource } from "@/features/calendar/queries";
import { rescheduleWorkout } from "@/features/calendar/actions";
import type { WorkoutSession } from "@/features/workouts/types";

export default async function EditCalendarPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (type !== "event" && type !== "task" && type !== "birthday" && type !== "workout") notFound();
  const source = await getCalendarSource(type, id);
  if (!source) redirect("/calendar");
  if (type === "workout") {
    const workout = source as WorkoutSession;
    const time = workout.scheduled_at ? new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(workout.scheduled_at)) : "";
    return <main className="life-app-shell"><AppNavigation active="calendar" /><div className="calendar-editor"><Link href="/calendar">← Към календара</Link><p className="life-kicker">Един запис · всички изгледи</p><h1>{workout.title}</h1><form action={rescheduleWorkout} className="quick-form"><input type="hidden" name="id" value={workout.id}/><label><span>Дата</span><input type="date" name="workoutDate" defaultValue={workout.workout_date} required/></label><label><span>Начален час</span><input type="time" name="time" defaultValue={time}/></label><button className="primary-button">Премести тренировката</button></form></div></main>;
  }
  return <main className="life-app-shell"><AppNavigation active="calendar" /><div className="calendar-editor"><Link href="/calendar">← Към календара</Link><p className="life-kicker">Редактиране</p><h1>{type === "event" ? "Събитие" : type === "task" ? "Задача" : "Рожден ден"}</h1><EditCalendarForm type={type} source={source} /></div></main>;
}
