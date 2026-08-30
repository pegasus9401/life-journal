import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfileSettings } from "@/features/profile/queries";
import { settingsGroups } from "./options";
import styles from "./settings.module.css";

export const metadata = { title: "Настройки · PEGASOS" };

export default async function SettingsPage() {
  const data = await getProfileSettings();
  if (!data) redirect("/login");
  const name = data.profile?.display_name?.trim() || data.email.split("@")[0] || "Профил";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return <main className={styles.page}>
    <header className={styles.top}><Link className={styles.back} href="/today" aria-label="Назад">‹</Link><h1>Настройки</h1><span /></header>
    <div className={styles.content}>
      <Link className={styles.profile} href="/profile"><span className={styles.avatar}>{initials}</span><span><strong>{name}</strong><small>Виж данните на профила</small></span><i className={styles.chevron}>›</i></Link>
      {settingsGroups.map((group) => <section className={styles.group} key={group.title}><h2>{group.title}</h2><div className={styles.card}>{group.items.map((item) => <Link className={styles.row} href={item.href} key={item.label}><span>{item.label}{item.detail ? <small>{item.detail}</small> : null}</span><i>›</i></Link>)}</div></section>)}
    </div>
  </main>;
}
