import Link from "next/link";
import { AssistantMemorySettings } from "@/features/assistant/components/assistant-memory-settings";
import styles from "../../settings.module.css";

export const metadata = { title: "Памет на Pegas · PEGASOS" };

export default function AssistantMemoryPage() {
  return <main className={styles.page}><header className={styles.top}><Link className={styles.back} href="/settings/ai-assistant" aria-label="Назад">‹</Link><h1>Какво помни Pegas</h1><span /></header><div className={styles.detail}><AssistantMemorySettings/></div></main>;
}
