import styles from "@/features/today/components/today-dashboard.module.css";
export default function Loading() { return <main className="life-app-shell p2-shell"><div className={styles.dashboard} aria-busy="true"><div className="p2-skeleton p2-skeleton-title"/><div className="p2-skeleton p2-skeleton-brief"/><div className="p2-skeleton p2-skeleton-grid"/></div></main>; }
