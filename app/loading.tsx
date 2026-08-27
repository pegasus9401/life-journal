export default function Loading() {
  return <main className="life-app-shell p2-shell route-loading" aria-busy="true" aria-label="Зареждане">
    <div className="p2-skeleton p2-skeleton-title" />
    <div className="p2-skeleton p2-skeleton-brief" />
    <div className="p2-skeleton p2-skeleton-grid" />
  </main>;
}

