"use client";
export default function TodayError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="life-app-shell p2-shell"><section className="p2-error"><p>PEGASOS не успя да зареди деня.</p><button type="button" onClick={reset}>Опитай отново</button></section></main>; }
