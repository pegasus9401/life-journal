"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssistantSettings } from "@/features/assistant/components/assistant-memory-settings";
import { saveProfile, type ProfileActionState } from "../actions";
import type { Profile, UserGoals } from "../types";
import { GoalsSettings } from "./goals-settings";
import styles from "./profile-experience.module.css";

const initialState: ProfileActionState = { status: "idle", message: "" };
type Tab = "profile" | "goals" | "pegas";

const sexLabels = { female: "Жена", male: "Мъж", other: "Друго", prefer_not_to_say: "Не е посочен" } as const;
const activityLabels = { sedentary: "Заседнала", light: "Лека", moderate: "Умерена", active: "Активна", very_active: "Много активна" } as const;
const goalLabels = { lose_weight: "Редуциране на тегло", maintain: "Поддържане", gain_muscle: "Покачване на мускулна маса", improve_fitness: "По-добра форма" } as const;

function initials(name: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length ? parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") : "P";
}

function formatBirthDate(value: string | null) {
  if (!value) return "Не е добавена";
  return new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function ageFromBirthDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

function DataRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className={styles.dataRow}><div><span>{label}</span>{detail ? <small>{detail}</small> : null}</div><strong>{value}</strong></div>;
}

function TabIcon({ name }: { name: Tab }) {
  const paths = {
    profile: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6"/></>,
    goals: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m14.5 9.5 5-5M16 4h3.5v3.5"/></>,
    pegas: <><path d="M12 3.5 13.7 9l5.8 1.7-5.8 1.7L12 18l-1.7-5.6-5.8-1.7L10.3 9z"/><path d="m18.5 16 .7 2.2 2.3.7-2.3.7-.7 2.2-.7-2.2-2.3-.7 2.3-.7z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function ProfileExperience({ email, profile, goals, avatarUrl, initialTab = "profile" }: { email: string; profile: Profile | null; goals: UserGoals; avatarUrl: string | null; initialTab?: Tab }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [editing, setEditing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(avatarUrl);
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [profileState, profileAction, profilePending] = useActionState(saveProfile, initialState);
  const age = ageFromBirthDate(profile?.birth_date ?? null);
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "";
  const completedFields = [profile?.display_name, profile?.birth_date, profile?.sex, profile?.height_cm, profile?.current_weight_kg, profile?.target_weight_kg, profile?.activity_level, profile?.fitness_goal].filter(Boolean).length;
  const completion = Math.round(completedFields / 8 * 100);

  useEffect(() => {
    if (profileState.status !== "success") return;
    const timer = window.setTimeout(() => setEditing(false), 500);
    return () => window.clearTimeout(timer);
  }, [profileState.status]);

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setPhotoStatus("Избери снимка до 5 MB.");
      return;
    }
    setPhotoPending(true);
    setPhotoStatus("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Сесията е изтекла.");
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/profile/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage.from("journal-photos").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { error: profileError } = await supabase.from("profiles").upsert({ owner_id: user.id, avatar_path: path }, { onConflict: "owner_id" });
      if (profileError) throw profileError;
      const { data } = await supabase.storage.from("journal-photos").createSignedUrl(path, 60 * 60);
      setPhotoUrl(data?.signedUrl ? `${data.signedUrl}&v=${Date.now()}` : null);
      setPhotoStatus("Снимката е обновена.");
      router.refresh();
    } catch {
      setPhotoStatus("Снимката не можа да бъде качена.");
    } finally {
      setPhotoPending(false);
    }
  }

  return <div className={styles.page}>
    <header className={styles.pageHeader}>
      <div><p className={styles.brand}><span aria-hidden="true">✦</span> PEGASOS</p><h1>Твоят профил</h1><small>Едно място за данните, целите и личния ти coach.</small></div>
      <Link className={styles.settingsLink} href="/settings" aria-label="Отвори настройките"><span aria-hidden="true">⚙</span></Link>
    </header>

    <section className={styles.identityHero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.avatarWrap}>
        <button className={styles.avatar} type="button" onClick={() => fileInput.current?.click()} disabled={photoPending} aria-label="Смени профилната снимка">
          {photoUrl ? <Image src={photoUrl} alt="Профилна снимка" fill sizes="92px" unoptimized /> : initials(profile?.display_name ?? null)}
          <i aria-hidden="true">＋</i>
        </button>
        <input ref={fileInput} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ""; }} />
      </div>
      <div className={styles.identityCopy}>
        <small>ЛИЧЕН ПРОФИЛ</small>
        <h2>{profile?.display_name || "Добави своето име"}</h2>
        <p>{email}</p>
        <div><span>{profile?.fitness_goal ? goalLabels[profile.fitness_goal] : "Избери основна цел"}</span><span>{profile?.activity_level ? activityLabels[profile.activity_level] : "Добави активност"}</span></div>
      </div>
      <div className={styles.completion} aria-label={`Профилът е попълнен на ${completion}%`}>
        <div style={{ "--completion": `${completion}%` } as CSSProperties}><strong>{completion}%</strong></div>
        <span>готов профил</span>
      </div>
    </section>
    {photoStatus ? <p className={styles.photoStatus} role="status">{photoStatus}</p> : null}

    <nav className={styles.tabs} aria-label="Секции в профила">
      {([{ key: "profile", label: "Лични данни" }, { key: "goals", label: "Цели" }, { key: "pegas", label: "Pegas" }] as Array<{ key: Tab; label: string }>).map((item) => <button key={item.key} type="button" className={tab === item.key ? styles.activeTab : ""} onClick={() => setTab(item.key)} aria-pressed={tab === item.key}><TabIcon name={item.key}/><span>{item.label}</span></button>)}
    </nav>

    {tab === "profile" ? <div className={styles.sectionStack}>
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}><div><p>ЗА ТЕБ</p><h2>Лични данни</h2><span>Тези данни помагат на Pegas да прави по-точни изчисления и препоръки.</span></div><button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Отказ" : "Редактирай"}</button></header>
        {editing ? <form action={profileAction} className={styles.form}>
          <label className={styles.wide}><span>Име и фамилия</span><input name="displayName" defaultValue={profile?.display_name ?? ""} maxLength={100} autoComplete="name" placeholder="Твоето име" /></label>
          <label><span>Рождена дата</span><input type="date" name="birthDate" defaultValue={profile?.birth_date ?? ""} /></label>
          <label><span>Пол</span><select name="sex" defaultValue={profile?.sex ?? ""}><option value="">Не е зададен</option><option value="female">Жена</option><option value="male">Мъж</option><option value="other">Друго</option><option value="prefer_not_to_say">Предпочитам да не казвам</option></select></label>
          <label><span>Ръст, cm</span><input type="number" inputMode="decimal" name="heightCm" min="50" max="300" step="0.1" defaultValue={profile?.height_cm ?? ""} /></label>
          <label><span>Текущо тегло, kg</span><input type="number" inputMode="decimal" name="currentWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.current_weight_kg ?? ""} /></label>
          <label><span>Начално тегло, kg</span><input type="number" inputMode="decimal" name="startingWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.starting_weight_kg ?? ""} /></label>
          <label><span>Целево тегло, kg</span><input type="number" inputMode="decimal" name="targetWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.target_weight_kg ?? ""} /></label>
          <label><span>Активност</span><select name="activityLevel" defaultValue={profile?.activity_level ?? ""}><option value="">Не е зададена</option><option value="sedentary">Заседнала</option><option value="light">Лека</option><option value="moderate">Умерена</option><option value="active">Активна</option><option value="very_active">Много активна</option></select></label>
          <label><span>Основна цел</span><select name="fitnessGoal" defaultValue={profile?.fitness_goal ?? ""}><option value="">Не е зададена</option><option value="lose_weight">Редуциране на тегло</option><option value="maintain">Поддържане</option><option value="gain_muscle">Мускулна маса</option><option value="improve_fitness">По-добра форма</option></select></label>
          <input type="hidden" name="timezone" value={profile?.timezone ?? "Europe/Sofia"} />
          {profileState.message ? <p className={`${styles.formStatus} ${profileState.status === "error" ? styles.error : ""}`} role="status">{profileState.message}</p> : null}
          <button className={styles.save} type="submit" disabled={profilePending}>{profilePending ? "Запазване..." : "Запази профила"}</button>
        </form> : <div className={styles.dataList}>
          <DataRow label="Име" value={profile?.display_name || "Не е добавено"} detail="Как Pegas да се обръща към теб" />
          <DataRow label="Рождена дата" value={formatBirthDate(profile?.birth_date ?? null)} detail={age ? `${age} години` : "Нужна за персонални изчисления"} />
          <DataRow label="Пол" value={profile?.sex ? sexLabels[profile.sex] : "Не е добавен"} />
          <DataRow label="Ръст" value={profile?.height_cm ? `${profile.height_cm} cm` : "Не е добавен"} />
          <DataRow label="Текущо тегло" value={profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : "Не е добавено"} />
          <DataRow label="Ниво на активност" value={profile?.activity_level ? activityLabels[profile.activity_level] : "Не е добавено"} />
        </div>}
      </section>

      <section className={styles.goalSnapshot}>
        <div><p>ТВОЯТА ПОСОКА</p><h2>{profile?.fitness_goal ? goalLabels[profile.fitness_goal] : "Задай своята основна цел"}</h2><span>{firstName ? `${firstName}, ` : ""}Pegas използва целта за дневния план, храненето и тренировките.</span></div>
        <div className={styles.goalNumbers}><span><small>ТЕКУЩО</small><strong>{profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : "–"}</strong></span><i aria-hidden="true">→</i><span><small>ЦЕЛ</small><strong>{profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : "–"}</strong></span></div>
        <button type="button" onClick={() => setTab("goals")}>Настрой целите <span>›</span></button>
      </section>
    </div> : null}

    {tab === "goals" ? <section className={styles.tabPanel}><header className={styles.panelIntro}><p>ПЛАН ЗА ПРОГРЕС</p><h2>Цели и дневни ориентири</h2><span>Промените се отразяват в Днес, Здраве, Хранене и съветите на Pegas.</span></header><GoalsSettings profile={profile} goals={goals} /></section> : null}

    {tab === "pegas" ? <section className={styles.tabPanel}>
      <div className={styles.pegasHero}>
        <div><p><span aria-hidden="true" /> PEGAS · ЛИЧЕН COACH</p><h2>Разбира контекста. Дава посока. Действа с теб.</h2><span>Pegas свързва профила, целите, здравето, храненето, тренировките и планера в един последователен план.</span></div>
        <Image src="/images/pegas-friend.png" alt="Pegas" width={230} height={154} sizes="(max-width: 640px) 150px, 230px" />
      </div>
      <div className={styles.capabilities}>
        <article><i>01</i><strong>Вижда целия контекст</strong><span>Използва само твоите реални данни и запазената памет.</span></article>
        <article><i>02</i><strong>Прави реални действия</strong><span>Планира задачи, събития, хранене, тренировки и check-in.</span></article>
        <article><i>03</i><strong>Ти държиш контрола</strong><span>Чувствителни промени и изтриване изискват ясна твоя команда.</span></article>
      </div>
      <div className={styles.assistantSettings}><header><p>ПОВЕДЕНИЕ И ПАМЕТ</p><h2>Настрой своя Pegas</h2><span>Избери стил на комуникация и управлявай какво да помни.</span></header><AssistantSettings /></div>
      <button className={styles.openAssistant} type="button" onClick={() => window.dispatchEvent(new Event("open-assistant-popup"))}><span>Попитай Pegas сега</span><i aria-hidden="true">›</i></button>
    </section> : null}
  </div>;
}
