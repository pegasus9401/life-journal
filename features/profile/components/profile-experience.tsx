"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveProfile, type ProfileActionState } from "../actions";
import type { Profile } from "../types";
import styles from "./profile-experience.module.css";

const initialState: ProfileActionState = { status: "idle", message: "" };
const sexLabels = { female: "Жена", male: "Мъж", other: "Друго", prefer_not_to_say: "Не е посочен" } as const;
const activityLabels = { sedentary: "Заседнала", light: "Лека", moderate: "Умерена", active: "Активна", very_active: "Много активна" } as const;

function initials(name: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.length ? parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") : "P";
}

function splitName(name: string | null) {
  const [first = "Не е зададено", ...rest] = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return { first, last: rest.join(" ") || "Не е зададено" };
}

function formatBirthDate(value: string | null) {
  if (!value) return "Не е зададен";
  return new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function ageFromBirthDate(value: string | null) {
  if (!value) return "Не е зададена";
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return `${age} години`;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return <div className={styles.dataRow}><span>{label}</span><strong>{value}</strong></div>;
}

export function ProfileExperience({ email, profile, avatarUrl }: { email: string; profile: Profile | null; avatarUrl: string | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(avatarUrl);
  const [photoStatus, setPhotoStatus] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [profileState, profileAction, profilePending] = useActionState(saveProfile, initialState);
  const name = splitName(profile?.display_name ?? null);

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
      const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("owner_id", user.id);
      if (profileError) throw profileError;
      const { data } = await supabase.storage.from("journal-photos").createSignedUrl(path, 60 * 60);
      setPhotoUrl(data?.signedUrl ? `${data.signedUrl}&v=${Date.now()}` : null);
      setPhotoStatus("Снимката е сменена.");
      router.refresh();
    } catch {
      setPhotoStatus("Снимката не можа да бъде качена.");
    } finally {
      setPhotoPending(false);
    }
  }

  return <main className={styles.page}>
    <header className={styles.top}>
      <Link className={styles.back} href="/settings" aria-label="Назад към настройките">‹</Link>
      <h1>Профил</h1>
      <button className={styles.editButton} type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Отказ" : "Редактирай"}</button>
    </header>
    <section className={styles.content}>
      <div className={styles.identity}>
        <button className={styles.avatar} type="button" onClick={() => fileInput.current?.click()} disabled={photoPending} aria-label="Смени профилната снимка">
          {photoUrl ? <Image src={photoUrl} alt="Профилна снимка" fill sizes="126px" unoptimized /> : initials(profile?.display_name ?? null)}
        </button>
        <input ref={fileInput} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ""; }} />
        <button className={styles.changePhoto} type="button" onClick={() => fileInput.current?.click()} disabled={photoPending}>{photoPending ? "Качване…" : "Смени снимката"}</button>
        {photoStatus ? <p className={styles.photoStatus} role="status">{photoStatus}</p> : null}
      </div>
      {editing ? <form action={profileAction} className={styles.form}>
        <label><span>Име и фамилия</span><input name="displayName" defaultValue={profile?.display_name ?? ""} maxLength={100} /></label>
        <label><span>Рождена дата</span><input type="date" name="birthDate" defaultValue={profile?.birth_date ?? ""} /></label>
        <label><span>Пол</span><select name="sex" defaultValue={profile?.sex ?? ""}><option value="">Не е зададен</option><option value="female">Жена</option><option value="male">Мъж</option><option value="other">Друго</option><option value="prefer_not_to_say">Предпочитам да не казвам</option></select></label>
        <label><span>Ръст, см</span><input type="number" inputMode="decimal" name="heightCm" min="50" max="300" step="0.1" defaultValue={profile?.height_cm ?? ""} /></label>
        <label><span>Текущо тегло, кг</span><input type="number" inputMode="decimal" name="currentWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.current_weight_kg ?? ""} /></label>
        <label><span>Начално тегло, кг</span><input type="number" inputMode="decimal" name="startingWeightKg" min="20" max="500" step="0.1" defaultValue={profile?.starting_weight_kg ?? ""} /></label>
        <label><span>Активност</span><select name="activityLevel" defaultValue={profile?.activity_level ?? ""}><option value="">Не е зададена</option><option value="sedentary">Заседнала</option><option value="light">Лека</option><option value="moderate">Умерена</option><option value="active">Активна</option><option value="very_active">Много активна</option></select></label>
        <input type="hidden" name="targetWeightKg" value={profile?.target_weight_kg ?? ""} /><input type="hidden" name="fitnessGoal" value={profile?.fitness_goal ?? ""} /><input type="hidden" name="timezone" value={profile?.timezone ?? "Europe/Sofia"} />
        {profileState.message ? <p className={`${styles.formStatus} ${profileState.status === "error" ? styles.error : ""}`} role="status">{profileState.message}</p> : null}
        <button className={styles.save} type="submit" disabled={profilePending}>{profilePending ? "Запазване…" : "Запази промените"}</button>
      </form> : <div className={styles.dataCard}>
        <DataRow label="Име" value={name.first} /><DataRow label="Фамилия" value={name.last} />
        <DataRow label="Пол" value={profile?.sex ? sexLabels[profile.sex] : "Не е зададен"} /><DataRow label="Ръст" value={profile?.height_cm ? `${profile.height_cm} см` : "Не е зададен"} />
        <DataRow label="Рожден ден" value={formatBirthDate(profile?.birth_date ?? null)} /><DataRow label="Възраст" value={ageFromBirthDate(profile?.birth_date ?? null)} />
        <DataRow label="Имейл" value={email || "Не е зададен"} /><DataRow label="Текущо тегло" value={profile?.current_weight_kg ? `${profile.current_weight_kg} кг` : "Не е зададено"} />
        <DataRow label="Начално тегло" value={profile?.starting_weight_kg ? `${profile.starting_weight_kg} кг` : "Не е зададено"} /><DataRow label="Активност" value={profile?.activity_level ? activityLabels[profile.activity_level] : "Не е зададена"} />
      </div>}
    </section>
  </main>;
}

