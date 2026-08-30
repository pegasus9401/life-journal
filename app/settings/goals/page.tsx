import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalsSettings } from "@/features/profile/components/goals-settings";
import { getProfileSettings } from "@/features/profile/queries";
import styles from "../settings.module.css";

export const metadata = { title: "Цели · PEGASOS" };
export default async function GoalsPage() {
  const data = await getProfileSettings(); if (!data) redirect("/login");
  return <main className={styles.page}><header className={styles.top}><Link className={styles.back} href="/settings" aria-label="Назад">‹</Link><h1>Цели</h1><span/></header><div className={styles.detail}><GoalsSettings profile={data.profile} goals={data.goals}/></div></main>;
}
