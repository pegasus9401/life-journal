"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/features/auth/actions";
import { BrandLink } from "./brand-link";

const AVATAR_BUCKET = "journal-photos";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AppNavigation({ active }: { active?: "today" | "calendar" | "journal" | "nutrition" | "products" | "promotions" | "shopping" | "workouts" }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  const links = [
    ["today", "/today", "Днес"],
    ["calendar", "/calendar", "Календар"],
    ["journal", "/journal", "Дневник"],
    ["nutrition", "/nutrition", "Хранене"],
    ["products", "/products", "Продукти"],
    ["promotions", "/promotions", "Промоции"],
    ["shopping", "/shopping-list", "Пазарски списък"],
    ["workouts", "/workouts", "Тренировки"],
  ] as const;

  const loadAvatar = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const avatarPath = user?.user_metadata?.avatar_path as string | undefined;
    if (!avatarPath) return;
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(avatarPath, 60 * 60);
    if (!error) setAvatarUrl(data.signedUrl);
  };

  useEffect(() => { void loadAvatar(); }, []);

  const chooseAvatar = () => {
    setProfileOpen(false);
    avatarInput.current?.click();
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarMessage("Избери JPG, PNG или WebP снимка.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarMessage("Снимката трябва да е до 5 MB.");
      return;
    }

    setUploadingAvatar(true);
    setAvatarMessage("Качване на снимката…");
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setAvatarMessage("Неуспешно разпознаване на профила.");
      setUploadingAvatar(false);
      return;
    }

    const avatarPath = `${user.id}/profile/avatar`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(avatarPath, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

    if (uploadError) {
      setAvatarMessage(`Грешка при качване: ${uploadError.message}`);
      setUploadingAvatar(false);
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_path: avatarPath } });
    if (metadataError) {
      setAvatarMessage(`Снимката е качена, но профилът не се обнови: ${metadataError.message}`);
      setUploadingAvatar(false);
      return;
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, 60 * 60);

    if (signedError) {
      setAvatarMessage("Снимката е запазена. Ще се покаже при следващо отваряне.");
    } else {
      setAvatarUrl(`${signed.signedUrl}&v=${Date.now()}`);
      setAvatarMessage("✓ Профилната снимка е запазена.");
    }
    setUploadingAvatar(false);
  };

  const avatar = avatarUrl
    ? <img src={avatarUrl} alt="" />
    : <span>В</span>;

  return <>
    <nav className="app-nav app-nav-compact" aria-label="Основна навигация">
      <button className="burger-button" type="button" aria-label="Отвори менюто" aria-expanded={open} onClick={() => setOpen(true)}>
        <span />
        <span />
        <span />
      </button>
      <BrandLink />
      <button className="profile-avatar" type="button" aria-label="Отвори профилното меню" aria-expanded={profileOpen} onClick={() => setProfileOpen((current) => !current)} disabled={uploadingAvatar}>
        {avatar}
      </button>
      <input ref={avatarInput} className="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
    </nav>

    {profileOpen ? <>
      <button className="profile-menu-backdrop" type="button" aria-label="Затвори профилното меню" onClick={() => setProfileOpen(false)} />
      <div className="profile-menu">
        <button type="button" onClick={chooseAvatar}>Смени снимката</button>
        <form action={signOut}><button className="logout" type="submit">Изход</button></form>
      </div>
    </> : null}

    <div className={`burger-backdrop ${open ? "is-open" : ""}`} onClick={() => setOpen(false)} />
    <aside className={`burger-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <header className="burger-drawer-header">
        <div>
          <p className="life-kicker">Life OS</p>
          <strong>Меню</strong>
        </div>
        <button type="button" aria-label="Затвори менюто" onClick={() => setOpen(false)}>×</button>
      </header>
      <div className="burger-profile">
        <button className="burger-profile-avatar" type="button" aria-label="Смени профилната снимка" onClick={chooseAvatar} disabled={uploadingAvatar}>{avatar}</button>
        <div><strong>Вальо</strong><button className="profile-photo-action" type="button" onClick={chooseAvatar} disabled={uploadingAvatar}>{uploadingAvatar ? "Качване…" : "Смени снимката"}</button></div>
      </div>
      {avatarMessage ? <p className={`profile-avatar-message ${avatarMessage.startsWith("✓") ? "is-success" : ""}`}>{avatarMessage}</p> : null}
      <nav className="burger-links" aria-label="Меню">
        {links.map(([key, href, label]) => <Link key={key} className={active === key ? "active" : ""} href={href} onClick={() => setOpen(false)}><span>{label}</span><b>›</b></Link>)}
      </nav>
      <form className="burger-logout" action={signOut}><button type="submit"><span>Изход</span><b>↗</b></button></form>
    </aside>
  </>;
}
