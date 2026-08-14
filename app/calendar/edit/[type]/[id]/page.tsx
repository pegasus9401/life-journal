import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { EditCalendarForm } from "@/features/calendar/components/edit-calendar-form";
import { getCalendarSource } from "@/features/calendar/queries";

export default async function EditCalendarPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (type !== "event" && type !== "task" && type !== "birthday") notFound();
  const source = await getCalendarSource(type, id);
  if (!source) redirect("/calendar");
  return <main className="life-app-shell"><AppNavigation active="calendar" /><div className="calendar-editor"><Link href="/calendar">← Към календара</Link><p className="life-kicker">Редактиране</p><h1>{type === "event" ? "Събитие" : type === "task" ? "Задача" : "Рожден ден"}</h1><EditCalendarForm type={type} source={source} /></div></main>;
}
