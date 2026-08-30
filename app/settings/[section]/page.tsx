import Link from "next/link";
import { notFound } from "next/navigation";
import { settingsDetails } from "../options";
import styles from "../settings.module.css";
import { AssistantSettings } from "@/features/assistant/components/assistant-memory-settings";

export default async function SettingsDetailPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const detail = settingsDetails[section];
  if (!detail) notFound();
  const assistantAction = section === "feature-request" || section === "report-bug";
  return <main className={styles.page}>
    <header className={styles.top}><Link className={styles.back} href="/settings" aria-label="Назад">‹</Link><h1>{detail.title}</h1><span /></header>
    <div className={styles.detail}><section className={styles.intro}><p>{detail.eyebrow}</p><h1>{detail.title}</h1><span>{detail.description}</span></section>{section === "ai-assistant" ? <><AssistantSettings/><Link className={styles.action} href="/assistant">Отвори AI асистента</Link></> : <section className={styles.detailCard}>{detail.rows.map((row) => <div className={styles.detailRow} key={row}><span>{row}</span><b>›</b></div>)}</section>}{assistantAction ? <Link className={styles.action} href="/assistant">Отвори AI асистента</Link> : null}</div>
  </main>;
}
