"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  applyMealTemplate,
  deleteDynamicMeal,
  saveCapturedMeal,
  saveDayAsTemplate,
  saveDynamicMeal,
  updateCapturedMeal,
} from "../dynamic-actions";
import {
  mealCompleted,
  mealDescription,
  mealSource,
  mealTotals,
  type DynamicMeal,
  type DynamicMealDraft,
  type DynamicMealDraftItem,
  type DynamicNutritionData,
  type MealSource,
} from "../dynamic-types";
import type { NutritionGoals } from "../types";
import type { Promotion } from "@/lib/promotions";
import { setTimelineCompleted } from "@/features/today/actions";
import { zonedDateTimeToUtc } from "@/features/calendar/domain/date-utils";
import styles from "./nutrition-dashboard.module.css";

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type CapturedItem = { name?: string; grams?: number; unit?: string; calories?: number; protein?: number; carbs?: number; fat?: number };
type LoggedDraft = Totals & {
  id?: string;
  name: string;
  description: string;
  time: string;
  source: Exclude<MealSource, "dynamic">;
  completed: boolean;
  items: CapturedItem[];
};

const blankTotals = (): Totals => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
const round = (value: number) => Math.round(value * 10) / 10;
const progress = (value: number, goal: number) => Math.min(100, Math.max(0, value / Math.max(goal, 1) * 100));
const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(" ");
const dateShift = (date: string, days: number) => {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const emptyMeal = (date: string): DynamicMealDraft => ({ id: crypto.randomUUID(), date, name: "", plannedTime: "", items: [] });
const currentTime = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
const localTime = (iso: string) => new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const formatDay = (date: string) => new Intl.DateTimeFormat("bg-BG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));

function totalMeals(meals: DynamicMeal[]) {
  return meals.reduce((sum, meal) => {
    const value = mealTotals(meal);
    sum.calories += value.calories;
    sum.protein += value.protein;
    sum.carbs += value.carbs;
    sum.fat += value.fat;
    return sum;
  }, blankTotals());
}

function capturedItems(meal: DynamicMeal) {
  return Array.isArray(meal.legacyPayload?.items) ? meal.legacyPayload.items as CapturedItem[] : [];
}

function Icon({ name }: { name: "camera" | "manual" | "plan" | "pegas" | "shop" | "meal" }) {
  const paths = {
    camera: <><rect x="3" y="6" width="18" height="13" rx="3"/><path d="m8 6 1.3-2h5.4L16 6"/><circle cx="12" cy="12.5" r="3.2"/></>,
    manual: <><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4M4 16l4 4"/></>,
    plan: <><rect x="4" y="4.5" width="16" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M4 9h16M8 13h3M8 17h6"/></>,
    pegas: <path d="M12 3 9.7 8.7 4 11l5.7 2.3L12 19l2.3-5.7L20 11l-5.7-2.3L12 3Z"/>,
    shop: <><path d="M4 7h16l-1.3 12H5.3L4 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></>,
    meal: <><path d="M7 3v8M4.5 3v5A2.5 2.5 0 0 0 7 10.5 2.5 2.5 0 0 0 9.5 8V3M7 10.5V21M15 3v18M15 3c3 2 4 5 4 8h-4"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function coachCopy(planned: Totals, consumed: Totals, goals: NutritionGoals, mealCount: number) {
  if (!mealCount) return "Денят е празен. Започни с реалистичен план или добави първото хранене със снимка.";
  const proteinGap = Math.max(0, goals.protein - planned.protein);
  const calorieGap = goals.calories - planned.calories;
  if (proteinGap > 25) return "Планът има нужда от още около " + Math.round(proteinGap) + " g протеин. Pegas може да предложи лесна комбинация според режима ти.";
  if (calorieGap < -150) return "Планът е с " + Math.abs(Math.round(calorieGap)) + " kcal над целта. Намали порция или замени най-калоричния продукт.";
  if (consumed.calories >= goals.calories) return "Дневната калорийна цел е достигната. Избери леко хранене само ако си гладен.";
  return "Остават " + Math.max(0, Math.round(goals.calories - consumed.calories)) + " kcal и " + Math.max(0, Math.round(goals.protein - consumed.protein)) + " g протеин за деня.";
}

const sourceLabels: Record<MealSource, string> = {
  dynamic: "План",
  food_photo: "Снимка",
  assistant: "Pegas",
  manual: "Ръчно",
};

export function NutritionDashboard({
  date,
  data,
  goals,
  promotions,
  dayContext,
  workoutLabel,
  openNew = false,
  initialProductId,
}: {
  date: string;
  data: DynamicNutritionData;
  goals: NutritionGoals;
  promotions: Promotion[];
  dayContext: string;
  workoutLabel: string;
  openNew?: boolean;
  initialProductId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DynamicMealDraft | null>(() => {
    if (!openNew) return null;
    const product = initialProductId ? data.products.find((item) => item.id === initialProductId) : undefined;
    if (!product) return emptyMeal(date);
    return {
      ...emptyMeal(date),
      name: product.name,
      items: [{ id: crypto.randomUUID(), itemType: "product", referenceId: product.id, quantity: product.servingGrams || 100 }],
    };
  });
  const [loggedDraft, setLoggedDraft] = useState<LoggedDraft | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({});

  const choices = useMemo(() => [
    ...data.products.map((item) => ({ type: "product" as const, id: item.id, label: [item.name, item.brand].filter(Boolean).join(" · ") })),
    ...data.recipes.map((item) => ({ type: "recipe" as const, id: item.id, label: "Рецепта: " + item.name })),
  ], [data.products, data.recipes]);
  const completedMeals = data.meals.filter((meal) => statusOverrides[meal.id] ?? mealCompleted(meal));
  const consumed = totalMeals(completedMeals);
  const planned = totalMeals(data.meals);
  const reusableMeals = data.meals.filter((meal) => meal.items.length > 0);
  const plannedProducts = new Set(data.meals.flatMap((meal) => meal.items.map((item) => item.label))).size;
  const promotionGroups = promotions.reduce<Record<string, Promotion[]>>((groups, offer) => ({ ...groups, [offer.store]: [...(groups[offer.store] ?? []), offer] }), {});

  useEffect(() => {
    if (!draft && !loggedDraft && !showTemplateSave) return;
    const previousOverflow = document.body.style.overflow;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDraft(null);
      setLoggedDraft(null);
      setShowTemplateSave(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [draft, loggedDraft, showTemplateSave]);

  const openMeal = (meal?: DynamicMeal) => setDraft(meal ? {
    id: meal.id,
    date,
    name: meal.name,
    plannedTime: meal.plannedTime ?? "",
    items: meal.items.map((item) => ({ id: item.id, itemType: item.itemType, referenceId: item.productId ?? item.recipeId ?? "", quantity: item.quantity })),
  } : emptyMeal(date));

  const openLoggedMeal = (meal?: DynamicMeal) => {
    if (!meal) {
      setLoggedDraft({ name: "", description: "", time: currentTime(), source: "manual", completed: true, items: [], ...blankTotals() });
      return;
    }
    const source = mealSource(meal);
    setLoggedDraft({
      id: meal.id,
      name: meal.name,
      description: mealDescription(meal),
      time: meal.plannedTime ?? localTime(meal.createdAt),
      source: source === "dynamic" ? "manual" : source,
      completed: statusOverrides[meal.id] ?? mealCompleted(meal),
      items: capturedItems(meal),
      ...mealTotals(meal),
    });
  };

  const addItem = () => setDraft((current) => current && choices.length ? {
    ...current,
    items: [...current.items, { id: crypto.randomUUID(), itemType: choices[0].type, referenceId: choices[0].id, quantity: choices[0].type === "product" ? 100 : 1 }],
  } : current);

  const updateItem = (index: number, patch: Partial<DynamicMealDraftItem>) => setDraft((current) => current ? {
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  } : current);

  const run = (action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) => startTransition(async () => {
    setMessage({ text: "Запазване…" });
    try {
      const result = await action();
      setMessage({ text: result.message, error: !result.ok });
      if (result.ok) {
        close?.();
        router.refresh();
      }
    } catch {
      setMessage({ text: "Възникна неочаквана грешка. Опитай отново.", error: true });
    }
  });

  const persistPlanned = () => draft && run(() => saveDynamicMeal(draft), () => setDraft(null));

  const persistLogged = () => {
    if (!loggedDraft) return;
    const payload = {
      date,
      name: loggedDraft.name,
      description: loggedDraft.description,
      source: loggedDraft.source,
      completed: loggedDraft.completed,
      calories: loggedDraft.calories,
      protein: loggedDraft.protein,
      carbs: loggedDraft.carbs,
      fat: loggedDraft.fat,
      items: loggedDraft.items.map((item) => ({
        name: String(item.name ?? loggedDraft.name),
        grams: Number(item.grams ?? 0),
        unit: item.unit,
        calories: Number(item.calories ?? 0),
        protein: Number(item.protein ?? 0),
        carbs: Number(item.carbs ?? 0),
        fat: Number(item.fat ?? 0),
      })),
    };
    if (loggedDraft.id) {
      run(() => updateCapturedMeal({ ...payload, id: loggedDraft.id as string }), () => setLoggedDraft(null));
      return;
    }
    run(() => saveCapturedMeal({
      ...payload,
      loggedAt: zonedDateTimeToUtc(date, loggedDraft.time, "Europe/Sofia"),
      source: "manual",
      items: payload.items.length ? payload.items : [{
        name: loggedDraft.name,
        grams: 0,
        unit: "serving",
        calories: loggedDraft.calories,
        protein: loggedDraft.protein,
        carbs: loggedDraft.carbs,
        fat: loggedDraft.fat,
      }],
    }), () => setLoggedDraft(null));
  };

  const remove = (meal: DynamicMeal) => {
    if (window.confirm("Да изтрия ли „" + meal.name + "“?")) run(() => deleteDynamicMeal(meal.id));
  };

  const toggleCompleted = (meal: DynamicMeal) => {
    const next = !(statusOverrides[meal.id] ?? mealCompleted(meal));
    setStatusOverrides((current) => ({ ...current, [meal.id]: next }));
    startTransition(async () => {
      try {
        const result = await setTimelineCompleted({ kind: "meal", sourceId: meal.id }, next);
        setMessage({ text: result.message, error: !result.ok });
        if (!result.ok) setStatusOverrides((current) => ({ ...current, [meal.id]: !next }));
        router.refresh();
      } catch {
        setStatusOverrides((current) => ({ ...current, [meal.id]: !next }));
        setMessage({ text: "Статусът не можа да бъде обновен.", error: true });
      }
    });
  };

  const apply = (templateId: string, name: string) => {
    const approved = window.confirm("Да заменя текущите незавършени планирани хранения с „" + name + "“? Вече записаната храна ще остане.");
    if (approved) run(() => applyMealTemplate(templateId, date));
  };

  const saveTemplate = () => startTransition(async () => {
    setMessage({ text: "Запазване…" });
    const result = await saveDayAsTemplate(date, templateName);
    setMessage({ text: result.message, error: !result.ok });
    if (result.ok) {
      setTemplateName("");
      setShowTemplateSave(false);
      router.refresh();
    }
  });

  return <div className={styles.dashboard}>
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.brand}><span aria-hidden="true">✦</span> PEGASOS · NUTRITION</p>
        <h1>Хранене</h1>
        <p>План, реален прием и умни решения на едно място.</p>
      </div>
      <Link className={styles.goalBadge} href="/profile?tab=goals" aria-label="Отвори хранителните цели"><small>ДНЕВНА ЦЕЛ</small><strong>{goals.calories}</strong><span>kcal</span></Link>
    </header>

    <nav className={styles.sectionNav} aria-label="Раздели в Хранене">
      <Link className={styles.activeNav} href={"/nutrition?date=" + date}>Дневник</Link>
      <Link href="/recipes">Рецепти</Link>
      <Link href="/products">Продукти</Link>
      <Link href="/shopping-list">Списък</Link>
    </nav>

    <section className={styles.hero} aria-labelledby="nutrition-day-title">
      <div className={styles.heroGlow} aria-hidden="true"/>
      <Image className={styles.pegas} src="/images/pegas-friend.png" alt="" width={230} height={154} sizes="(max-width: 760px) 150px, 230px"/>
      <div className={styles.dateBar}>
        <Link href={"/nutrition?date=" + dateShift(date, -1)} aria-label="Предишен ден">‹</Link>
        <div><small>{dayContext}</small><h2 id="nutrition-day-title">{formatDay(date)}</h2></div>
        <Link href={"/nutrition?date=" + dateShift(date, 1)} aria-label="Следващ ден">›</Link>
      </div>
      <div className={styles.heroBody}>
        <p><span aria-hidden="true"/> PEGAS · ДНЕВЕН ФОКУС</p>
        <h3>{planned.protein >= goals.protein ? "Протеинът е под контрол" : "Подреди храненето без крайности"}</h3>
        <p>{coachCopy(planned, consumed, goals, data.meals.length)}</p>
        <small>{workoutLabel ? "Движение: " + workoutLabel : "Почивен ден: запази режима лек и изпълним."}</small>
        <button type="button" onClick={() => window.dispatchEvent(new Event("open-assistant-popup"))}>Попитай Pegas</button>
      </div>
    </section>

    <section className={styles.overview} aria-label="Хранителен напредък">
      <div className={styles.calorieBlock}>
        <div className={styles.calorieRing} style={{ "--progress": String(progress(consumed.calories, goals.calories) * 3.6) + "deg" } as CSSProperties}>
          <span><strong>{Math.round(consumed.calories)}</strong><small>приети kcal</small></span>
        </div>
        <div><small>ОСТАВАТ</small><strong>{Math.max(0, Math.round(goals.calories - consumed.calories))} kcal</strong><p>Планът е {Math.round(planned.calories)} kcal</p></div>
      </div>
      <div className={styles.macroList}>
        {([
          ["Протеин", consumed.protein, planned.protein, goals.protein, "protein"],
          ["Въглехидрати", consumed.carbs, planned.carbs, goals.carbs, "carbs"],
          ["Мазнини", consumed.fat, planned.fat, goals.fat, "fat"],
        ] as const).map(([label, actual, plan, goal, tone]) => <article key={label}>
          <header><span>{label}</span><b>{round(actual)} / {goal} g</b></header>
          <i className={styles[tone]}><em style={{ width: String(progress(actual, goal)) + "%" }}/></i>
          <small>Планирани: {round(plan)} g</small>
        </article>)}
      </div>
    </section>

    <section className={styles.quickActions} aria-label="Бързи действия за храна">
      <button type="button" onClick={() => window.dispatchEvent(new Event("open-food-camera"))}><span><Icon name="camera"/></span><b>Снимай</b><small>AI анализ</small></button>
      <button type="button" onClick={() => openLoggedMeal()}><span><Icon name="manual"/></span><b>Добави</b><small>Ръчно</small></button>
      <button type="button" onClick={() => openMeal()}><span><Icon name="plan"/></span><b>Планирай</b><small>Продукти и рецепти</small></button>
      <button type="button" onClick={() => window.dispatchEvent(new Event("open-assistant-popup"))}><span><Icon name="pegas"/></span><b>Pegas</b><small>Съвет или промяна</small></button>
    </section>

    {message ? <p className={cx(styles.message, message.error && styles.errorMessage)} role="status">{message.text}</p> : null}

    <section className={styles.mealsSection}>
      <header className={styles.sectionHeading}><div><p>ХРАНЕНИЯ ЗА ДЕНЯ</p><h2>План и дневник</h2></div><span><b>{completedMeals.length}</b> от {data.meals.length} записани</span></header>
      <div className={styles.mealList}>
        {data.meals.map((meal, index) => {
          const value = mealTotals(meal);
          const source = mealSource(meal);
          const completed = statusOverrides[meal.id] ?? mealCompleted(meal);
          const items = meal.items.length
            ? meal.items.map((item) => ({ name: item.label, quantity: round(item.quantity) + " " + item.unit, calories: item.calories }))
            : capturedItems(meal).map((item) => ({ name: item.name || "Продукт", quantity: item.grams ? round(Number(item.grams)) + " " + (item.unit === "piece" ? "бр." : item.unit || "g") : "", calories: Number(item.calories) || 0 }));
          return <article className={cx(styles.mealCard, completed && styles.completedMeal)} key={meal.id}>
            <div className={styles.mealMarker}><span>{meal.plannedTime ?? localTime(meal.createdAt)}</span><i>{index + 1}</i></div>
            <div className={styles.mealContent}>
              <header><div><span className={cx(styles.source, styles[source])}>{sourceLabels[source]}</span><h3>{meal.name}</h3></div><strong>{Math.round(value.calories)} <small>kcal</small></strong></header>
              {items.length ? <div className={styles.foodItems}>
                {items.slice(0, 3).map((item, itemIndex) => <div key={meal.id + ":" + itemIndex}><span><b>{item.name}</b>{item.quantity ? <small>{item.quantity}</small> : null}</span><strong>{Math.round(item.calories)} kcal</strong></div>)}
                {items.length > 3 ? <details><summary>Още {items.length - 3} продукта</summary>{items.slice(3).map((item, itemIndex) => <div key={meal.id + ":more:" + itemIndex}><span>{item.name}</span><b>{Math.round(item.calories)} kcal</b></div>)}</details> : null}
              </div> : <p className={styles.description}>{mealDescription(meal) || "Запис без отделни продукти."}</p>}
              <div className={styles.mealMacros}><span>П <b>{round(value.protein)}</b></span><span>В <b>{round(value.carbs)}</b></span><span>М <b>{round(value.fat)}</b></span></div>
              <footer>
                {meal.plannedTime ? <button className={styles.completeButton} type="button" disabled={pending} aria-pressed={completed} onClick={() => toggleCompleted(meal)}><i>{completed ? "✓" : ""}</i>{completed ? "Изядено" : "Отбележи като изядено"}</button> : <span className={styles.loggedStatus}><i>✓</i> Записано</span>}
                <div><button type="button" onClick={() => meal.items.length ? openMeal(meal) : openLoggedMeal(meal)}>Редактирай</button><button type="button" onClick={() => remove(meal)}>Изтрий</button></div>
              </footer>
            </div>
          </article>;
        })}
        {!data.meals.length ? <div className={styles.empty}><span><Icon name="meal"/></span><strong>Денят още е празен</strong><p>Добави реално хранене, създай план или остави Pegas да предложи лесен вариант.</p><div><button type="button" onClick={() => window.dispatchEvent(new Event("open-food-camera"))}>Снимай храна</button><button type="button" onClick={() => openMeal()}>Създай план</button></div></div> : null}
      </div>
    </section>

    <section className={styles.templateSection}>
      <header className={styles.sectionHeading}><div><p>ПОВТОРНА УПОТРЕБА</p><h2>Твоите дневни планове</h2></div><button type="button" disabled={!reusableMeals.length} onClick={() => setShowTemplateSave(true)}>+ Запази деня</button></header>
      {data.templates.length ? <div className={styles.templates}>{data.templates.map((template) => <article key={template.id}><span><Icon name="plan"/></span><div><strong>{template.name}</strong><small>{template.mealCount} {template.mealCount === 1 ? "хранене" : "хранения"}</small></div><button type="button" disabled={pending} onClick={() => apply(template.id, template.name)}>Приложи</button></article>)}</div> : <p className={styles.templateEmpty}>Когато подредиш работещ ден, запази го тук и го прилагай с едно действие.</p>}
    </section>

    <section className={styles.shoppingPanel}>
      <Link className={styles.shoppingCard} href="/shopping-list"><span><Icon name="shop"/></span><div><small>УМЕН СПИСЪК</small><strong>Пазаруване по плана</strong><p>{plannedProducts ? plannedProducts + " продукта от храненията за деня" : "Добави планирани продукти, за да изчислим списъка"}</p></div><b>›</b></Link>
      {promotions.length ? <div className={styles.storePromotions}><header><strong>Подходящи промоции</strong><Link href="/shopping-list">Виж всички</Link></header><div>{Object.entries(promotionGroups).map(([store, offers]) => <section key={store}><header><strong>{store}</strong><span>{offers.length}</span></header>{offers.slice(0, 2).map((offer) => <a href={offer.url} target="_blank" rel="noreferrer" key={offer.id}><span>{offer.name}</span><b>{offer.price.toFixed(2).replace(".", ",")} €</b><small>до {offer.validUntil}</small></a>)}</section>)}</div></div> : <p className={styles.noPromotions}>Няма намерени актуални промоции за продуктите в плана.</p>}
    </section>

    {showTemplateSave ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowTemplateSave(false); }}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="template-title"><header><div><p>НОВ ШАБЛОН</p><h2 id="template-title">Запази дневния план</h2></div><button type="button" onClick={() => setShowTemplateSave(false)} aria-label="Затвори">×</button></header><p>Запазват се планираните хранения с продуктите, количествата и часовете им. Снимковите записи не се копират.</p><div className={styles.dialogSummary}><strong>{reusableMeals.length} подходящи хранения</strong><span>{reusableMeals.map((meal) => meal.name).join(" · ")}</span></div><label>Име на плана<input autoFocus value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Напр. Лесен високопротеинов ден" maxLength={100}/></label><button className={styles.primaryAction} type="button" disabled={pending || !templateName.trim() || !reusableMeals.length} onClick={saveTemplate}>{pending ? "Запазване…" : "Запази плана"}</button></section></div> : null}

    {draft ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}><section className={cx(styles.dialog, styles.mealEditor)} role="dialog" aria-modal="true" aria-labelledby="meal-editor-title"><header><div><p>ПЛАНИРАНО ХРАНЕНЕ</p><h2 id="meal-editor-title">{draft.name || "Ново хранене"}</h2></div><button type="button" onClick={() => setDraft(null)} aria-label="Затвори">×</button></header><div className={styles.fields}><label>Име<input value={draft.name} maxLength={100} placeholder="Закуска, обяд, вечеря…" onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label><label>Час<input type="time" value={draft.plannedTime} onChange={(event) => setDraft({ ...draft, plannedTime: event.target.value })}/></label></div><section className={styles.draftItems}><header><div><h3>Продукти и рецепти</h3><small>{choices.length ? data.products.length + " продукта · " + data.recipes.length + " рецепти" : "Първо добави продукт или рецепта"}</small></div><button type="button" disabled={!choices.length} onClick={addItem}>+ Добави</button></header>{!choices.length ? <div className={styles.missingLibrary}><p>Няма налични продукти или рецепти.</p><div><Link href="/products">Добави продукт</Link><Link href="/recipes">Създай рецепта</Link></div></div> : null}{draft.items.map((item, index) => <div className={styles.draftItem} key={item.id}><label>Тип<select value={item.itemType} onChange={(event) => { const type = event.target.value as "product" | "recipe"; const first = choices.find((choice) => choice.type === type); updateItem(index, { itemType: type, referenceId: first?.id ?? "", quantity: type === "product" ? 100 : 1 }); }}><option value="product">Продукт</option><option value="recipe">Рецепта</option></select></label><label>Избор<select value={item.referenceId} onChange={(event) => updateItem(index, { referenceId: event.target.value })}>{choices.filter((choice) => choice.type === item.itemType).map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label><label>{item.itemType === "product" ? "Грамове" : "Порции"}<input type="number" min="0.01" step={item.itemType === "product" ? ".1" : ".5"} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Math.max(.01, Number(event.target.value) || .01) })}/></label><button type="button" aria-label="Премахни продукта" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>×</button></div>)}</section><button className={styles.primaryAction} type="button" disabled={pending || !draft.name.trim() || !draft.plannedTime || !draft.items.length} onClick={persistPlanned}>{pending ? "Запазване…" : "Запази храненето"}</button></section></div> : null}

    {loggedDraft ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setLoggedDraft(null); }}><section className={cx(styles.dialog, styles.logEditor)} role="dialog" aria-modal="true" aria-labelledby="log-editor-title"><header><div><p>{loggedDraft.id ? "РЕДАКЦИЯ" : "БЪРЗО ДОБАВЯНЕ"}</p><h2 id="log-editor-title">{loggedDraft.id ? "Промени храненето" : "Какво хапна?"}</h2></div><button type="button" onClick={() => setLoggedDraft(null)} aria-label="Затвори">×</button></header><div className={styles.fields}><label>Храна или ястие<input autoFocus value={loggedDraft.name} maxLength={100} placeholder="Напр. Skyr и банан" onChange={(event) => setLoggedDraft({ ...loggedDraft, name: event.target.value })}/></label><label>Час<input type="time" value={loggedDraft.time} disabled={Boolean(loggedDraft.id)} onChange={(event) => setLoggedDraft({ ...loggedDraft, time: event.target.value })}/></label></div><label className={styles.descriptionField}>Бележка<textarea value={loggedDraft.description} maxLength={500} rows={2} placeholder="Количество, марка или допълнение" onChange={(event) => setLoggedDraft({ ...loggedDraft, description: event.target.value })}/></label><fieldset className={styles.nutritionFields}><legend>Хранителни стойности</legend>{([["calories", "Калории", "kcal"], ["protein", "Протеин", "g"], ["carbs", "Въглехидрати", "g"], ["fat", "Мазнини", "g"]] as const).map(([key, label, unit]) => <label key={key}><span>{label}</span><div><input type="number" min="0" step="0.1" value={loggedDraft[key]} onChange={(event) => setLoggedDraft({ ...loggedDraft, [key]: Math.max(0, Number(event.target.value) || 0) })}/><small>{unit}</small></div></label>)}</fieldset><p className={styles.editorHint}>Не си сигурен в стойностите? Снимай храната или попитай Pegas за оценка.</p><button className={styles.primaryAction} type="button" disabled={pending || !loggedDraft.name.trim()} onClick={persistLogged}>{pending ? "Запазване…" : loggedDraft.id ? "Запази промените" : "Добави в дневника"}</button></section></div> : null}
  </div>;
}
