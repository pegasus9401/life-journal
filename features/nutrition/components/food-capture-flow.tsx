"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCapturedMeal } from "../dynamic-actions";
import styles from "./food-capture-flow.module.css";

type Analysis = { name: string; description: string; calories: number; protein: number; carbs: number; fat: number; confidence?: number };
type Props = { image: string; date: string; onClose: () => void; onRetake: () => void };
const number = (value: unknown) => Math.max(0, Number(value) || 0);

export function FoodCaptureFlow({ image, date, onClose, onRetake }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"preview" | "analyzing" | "review" | "saving" | "done">("preview");
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>({ name: "", description: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const analyze = async () => {
    setStage("analyzing"); setMessage("");
    try {
      const response = await fetch("/api/nutrition/analyze-photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, description: note }) });
      const payload = await response.json() as { analysis?: Partial<Analysis>; error?: string };
      if (!response.ok || !payload.analysis) throw new Error(payload.error || "Храната не можа да бъде анализирана.");
      setAnalysis({ name: String(payload.analysis.name || "Хранене"), description: String(payload.analysis.description || note), calories: number(payload.analysis.calories), protein: number(payload.analysis.protein), carbs: number(payload.analysis.carbs), fat: number(payload.analysis.fat), confidence: number(payload.analysis.confidence) });
      setStage("review");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Храната не можа да бъде анализирана."); setStage("preview"); }
  };

  const save = async () => {
    setStage("saving"); setMessage("");
    const result = await saveCapturedMeal({ date, ...analysis, description: analysis.description || note });
    if (!result.ok) { setMessage(result.message); setStage("review"); return; }
    setStage("done"); router.refresh();
  };

  const update = (field: keyof Analysis, value: string) => setAnalysis((current) => ({ ...current, [field]: field === "name" || field === "description" ? value : number(value) }));

  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Добавяне на храна от снимка">
    <section className={styles.sheet}>
      <header><button type="button" onClick={onClose} aria-label="Затвори">×</button><h1>{stage === "review" || stage === "saving" ? "Преглед на храната" : stage === "done" ? "Готово" : "Снимай храна"}</h1><span /></header>
      {stage === "preview" ? <div className={styles.preview}>
        <div className={styles.photo}><Image src={image} alt="Снимана храна" fill unoptimized sizes="100vw" /></div>
        <div className={styles.copy}><h2>Какво хапваш?</h2><p>Добави кратко описание, ако нещо на снимката не се вижда ясно.</p></div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Напр. две яйца, салата и една филия…" autoFocus />
        {message ? <p className={styles.error} role="alert">{message}</p> : null}
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={onRetake}>Снимай отново</button><button type="button" className={styles.primary} onClick={() => void analyze()}>Продължи</button></div>
      </div> : null}
      {stage === "analyzing" ? <div className={styles.loading}><Image src="/images/pegas-friend.png" alt="" width={118} height={88} /><i /><h2>Pegas анализира храната…</h2><p>Разпознавам продуктите и изчислявам приблизителните калории и макроси.</p></div> : null}
      {stage === "review" || stage === "saving" ? <div className={styles.review}>
        <div className={styles.reviewPhoto}><Image src={image} alt="Снимана храна" fill unoptimized sizes="132px" /></div>
        <label className={styles.wide}>Име<input value={analysis.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label className={styles.wide}>Разпознати храни<textarea value={analysis.description} onChange={(event) => update("description", event.target.value)} /></label>
        <div className={styles.nutrients}>
          <label><span>Калории</span><input type="number" inputMode="decimal" value={analysis.calories} onChange={(event) => update("calories", event.target.value)} /><small>kcal</small></label>
          <label><span>Протеин</span><input type="number" inputMode="decimal" value={analysis.protein} onChange={(event) => update("protein", event.target.value)} /><small>g</small></label>
          <label><span>Въглехидрати</span><input type="number" inputMode="decimal" value={analysis.carbs} onChange={(event) => update("carbs", event.target.value)} /><small>g</small></label>
          <label><span>Мазнини</span><input type="number" inputMode="decimal" value={analysis.fat} onChange={(event) => update("fat", event.target.value)} /><small>g</small></label>
        </div>
        <p className={styles.hint}>Стойностите са AI оценка. Провери и коригирай порцията преди запис.</p>
        {message ? <p className={styles.error} role="alert">{message}</p> : null}
        <button type="button" className={styles.primary} disabled={stage === "saving" || !analysis.name.trim()} onClick={() => void save()}>{stage === "saving" ? "Запазване…" : "Добави в дневника"}</button>
      </div> : null}
      {stage === "done" ? <div className={styles.done}><span>✓</span><h2>Храната е добавена</h2><p>Записът и хранителните стойности вече са в Timeline и в дневника за хранене.</p><button type="button" className={styles.primary} onClick={onClose}>Готово</button></div> : null}
    </section>
  </div>;
}

