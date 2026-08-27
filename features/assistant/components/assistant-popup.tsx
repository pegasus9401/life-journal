"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AssistantExperience } from "./assistant-experience";
import { FoodCaptureFlow } from "@/features/nutrition/components/food-capture-flow";

async function prepareFoodImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Избери снимка на храна.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL("image/jpeg", .72);
}

const todayKey = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Sofia" });

export function AssistantPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [foodImage, setFoodImage] = useState("");
  const [foodDate, setFoodDate] = useState(todayKey());
  const panelRef = useRef<HTMLDivElement>(null);
  const foodCameraRef = useRef<HTMLInputElement>(null);
  const foodImportRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("close-assistant-popup", close);
    window.addEventListener("gesture-close-overlay", close);
    return () => { window.removeEventListener("close-assistant-popup", close); window.removeEventListener("gesture-close-overlay", close); };
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateChrome = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) >= 8) {
        const shouldHide = delta > 0 && currentY > 72 && !open;
        document.documentElement.classList.toggle("mobile-chrome-hidden", shouldHide);
        lastScrollY.current = currentY;
      }
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateChrome);
    };
    if (open) document.documentElement.classList.remove("mobile-chrome-hidden");
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.classList.remove("mobile-chrome-hidden");
    };
  }, [open]);

  if (pathname === "/login") return null;

  const captureFood = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedDate = params.get("date");
      setFoodDate(requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayKey());
      setFoodImage(await prepareFoodImage(file));
    } catch (error) { window.alert(error instanceof Error ? error.message : "Снимката не можа да бъде отворена."); }
  };

  return <>
    <input ref={foodCameraRef} className="food-camera-input" type="file" accept="image/*" capture="environment" onChange={(event) => void captureFood(event)} />
    <input ref={foodImportRef} className="food-camera-input" type="file" accept="image/*" onChange={(event) => void captureFood(event)} />
    <div className="assistant-condensed-bar" aria-label="Компактна навигация">
      <Link href="/today" aria-label="Начало"><span aria-hidden="true">⌂</span></Link>
      <button type="button" onClick={() => { document.documentElement.classList.remove("mobile-chrome-hidden"); setOpen(true); }} aria-label="Попитай Pegas"><i aria-hidden="true"><Image src="/images/pegas-friend.png" alt="" width={34} height={34} /></i><span>Ask Pegas anything</span></button>

    <button type="button" className="assistant-condensed-add" onClick={() => setQuickActionsOpen((current) => !current)} aria-label={quickActionsOpen ? "Затвори бързите действия" : "Бързо добавяне"}><span aria-hidden="true">{quickActionsOpen ? "×" : "+"}</span></button>
    </div>
    <button type="button" className="assistant-quick-add-trigger" onClick={() => setQuickActionsOpen((current) => !current)} aria-label={quickActionsOpen ? "Затвори бързите действия" : "Бързо добавяне"}>{quickActionsOpen ? "×" : "+"}</button>
    {quickActionsOpen ? <div className="assistant-quick-add-backdrop" onClick={() => setQuickActionsOpen(false)}>
      <section className="assistant-quick-add-sheet" role="dialog" aria-modal="true" aria-label="Бързо добавяне" onClick={(event) => event.stopPropagation()}>
        <button className="assistant-quick-add-close" type="button" onClick={() => setQuickActionsOpen(false)} aria-label="Затвори">×</button>
        <div className="assistant-quick-actions">
          <button type="button" onClick={() => { setQuickActionsOpen(false); setOpen(true); }}><b>AI</b><span>Опиши храна</span></button>
          <Link href="/nutrition" onClick={() => setQuickActionsOpen(false)}><b>▧</b><span>Добави храна</span></Link>
          <button type="button" onClick={() => { setQuickActionsOpen(false); foodCameraRef.current?.click(); }}><b>●</b><span>Снимай храна</span></button>
          <Link href="/products?mode=scan" onClick={() => setQuickActionsOpen(false)}><b>▣</b><span>Сканирай</span></Link>
          <button type="button" className="ask-pegas" onClick={() => { setQuickActionsOpen(false); setOpen(true); }}><b><Image src="/images/pegas-friend.png" alt="" width={62} height={42} /></b><span>Попитай Pegas</span></button>
          <Link href="/products" onClick={() => setQuickActionsOpen(false)}><b>⌕</b><span>Търси храна</span></Link>
          <Link href="/nutrition" onClick={() => setQuickActionsOpen(false)}><b>✦</b><span>Създай меню</span></Link>
          <Link href="/workouts" onClick={() => setQuickActionsOpen(false)}><b>▥</b><span>Тренировки</span></Link>
          <Link href="/workouts" onClick={() => setQuickActionsOpen(false)}><b>⌁</b><span>Запиши активност</span></Link>
        </div>
      </section>
    </div> : null}
    {foodImage ? <FoodCaptureFlow image={foodImage} date={foodDate} onClose={() => setFoodImage("")} onRetake={() => { setFoodImage(""); window.setTimeout(() => foodCameraRef.current?.click(), 0); }} onImport={() => { setFoodImage(""); window.setTimeout(() => foodImportRef.current?.click(), 0); }} /> : null}
    <button type="button" className={`assistant-fab${open ? " is-open" : ""}`} onClick={() => { document.documentElement.classList.remove("mobile-chrome-hidden"); setOpen((current) => !current); }} aria-label={open ? "Затвори AI асистента" : "Отвори AI асистента"} aria-expanded={open} aria-controls="assistant-popup">
      <Image className="pegas-friend-avatar" src="/images/pegas-friend.png" alt="" width={42} height={32} /><span aria-hidden="true">{open ? "×" : "Friend"}</span>
    </button>
    <div className={`assistant-popup-backdrop${open ? " is-open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
    <div id="assistant-popup" ref={panelRef} className={`assistant-popup${open ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Личен AI асистент" aria-hidden={!open}>
      <div className="assistant-popup-bar"><div><i /><span>Личен AI асистент</span></div><button type="button" onClick={() => setOpen(false)} aria-label="Затвори">×</button></div>
      <AssistantExperience />
    </div>
    <style jsx global>{`
      .food-camera-input { position: fixed !important; width: 1px !important; height: 1px !important; opacity: 0 !important; pointer-events: none !important; }
      @media (max-width: 820px) {
        .assistant-popup {
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          max-width: none !important;
          max-height: 100dvh !important;
          border: 0 !important;
          border-radius: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .assistant-popup-bar {
          flex: 0 0 calc(58px + env(safe-area-inset-top)) !important;
          min-height: calc(58px + env(safe-area-inset-top)) !important;
          padding: env(safe-area-inset-top) 12px 0 18px !important;
          color: #30263b !important;
          border-color: #eee7f5 !important;
          background: rgba(255,255,255,.98) !important;
        }
        .assistant-popup .assistant-layout {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          display: flex !important;
        }
        .assistant-popup .assistant-header {
          flex: 0 0 auto !important;
          display: block !important;
          align-items: center !important;
          padding: 8px 12px !important;
          background: #fff !important;
        }
        .assistant-popup .assistant-header > div:first-child {
          display: none !important;
        }
        .assistant-popup .assistant-header .life-kicker {
          display: none !important;
        }
        .assistant-popup .assistant-header h1 {
          font-size: 17px !important;
          line-height: 1.25 !important;
          white-space: nowrap !important;
        }
        .assistant-popup .intelligence-header-actions {
          display: grid !important;
          width: 100% !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          margin: 0 !important;
        }
        .assistant-popup .intelligence-header-actions button {
          min-height: 38px !important;
          padding: 0 8px !important;
          font-size: 11px !important;
        }
        .assistant-popup .intelligence-personas {
          flex: 0 0 auto !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 5px !important;
          padding: 2px 12px 10px !important;
          overflow: hidden !important;
          background: #fff !important;
          scrollbar-width: none !important;
        }
        .assistant-popup .intelligence-personas button {
          min-width: 0 !important;
          min-height: 36px !important;
          padding: 0 4px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          font-size: 9px !important;
        }
        .assistant-popup .intelligence-personas::-webkit-scrollbar,
        .assistant-popup .intelligence-history::-webkit-scrollbar {
          display: none !important;
        }
        .assistant-popup .assistant-panel {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          background: #fff !important;
        }
        .assistant-popup .intelligence-history {
          flex: 0 0 auto !important;
          align-items: center !important;
          padding: 9px 12px 6px !important;
          scrollbar-width: none !important;
        }
        .assistant-popup .intelligence-history button {
          flex: 0 0 auto !important;
          max-width: 138px !important;
          min-height: 30px !important;
          font-size: 9px !important;
        }
        .assistant-popup .intelligence-history > span {
          position: sticky !important;
          left: 0 !important;
          z-index: 1 !important;
          padding: 0 6px 0 2px !important;
          color: #7b8190 !important;
          background: #fff !important;
          font-size: 10px !important;
          font-weight: 800 !important;
        }
        .assistant-popup .assistant-messages {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          padding: 12px 16px !important;
          gap: 12px !important;
        }
        .assistant-popup .intelligence-welcome {
          min-height: 150px !important;
          padding: 8px 0 !important;
        }
        .assistant-popup .intelligence-welcome img {
          width: 82px !important;
          height: 62px !important;
        }
        .assistant-popup .intelligence-welcome h2 {
          margin-top: 3px !important;
          font-size: 18px !important;
        }
        .assistant-popup .intelligence-welcome p {
          font-size: 11px !important;
        }
        .assistant-popup .assistant-message {
          max-width: 92% !important;
          gap: 9px !important;
        }
        .assistant-popup .assistant-message p {
          padding: 11px 13px !important;
          font-size: 14px !important;
          line-height: 1.45 !important;
          color: #30263b !important;
          background: #f3eef8 !important;
        }
        .assistant-popup .assistant-suggestions {
          flex: 0 0 auto !important;
          display: flex !important;
          grid-template-columns: none !important;
          max-height: none !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          overscroll-behavior-x: contain !important;
          scroll-snap-type: x mandatory !important;
          scrollbar-width: none !important;
          padding: 6px 16px 12px !important;
          gap: 10px !important;
          -webkit-overflow-scrolling: touch;
        }
        .assistant-popup .assistant-suggestions::-webkit-scrollbar {
          display: none !important;
        }
        .assistant-popup .assistant-suggestions button {
          flex: 0 0 min(72vw, 280px) !important;
          min-height: 56px !important;
          padding: 12px 14px !important;
          scroll-snap-align: start !important;
          font-size: 13px !important;
          color: #473a55 !important;
          border-color: #e3d8ee !important;
          background: #fbf9fd !important;
        }
        .assistant-popup .assistant-composer {
          flex: 0 0 auto !important;
          padding: 10px !important;
          padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
          border-color: #e8deef !important;
          background: #f7f3fa !important;
        }
        .assistant-popup .assistant-input-row {
          grid-template-columns: minmax(0,1fr) 44px !important;
          gap: 7px !important;
        }
        .assistant-popup .assistant-capture-actions {
          grid-template-columns: 1fr 1fr !important;
          gap: 7px !important;
        }
        .assistant-popup .assistant-capture-button {
          min-height: 48px !important;
          padding: 0 10px !important;
          color: #5b21b6 !important;
          border-color: #d9c8f4 !important;
          background: #f1eafd !important;
        }
        .assistant-popup .assistant-capture-button.food {
          color: #047857 !important;
          border-color: #afe5d1 !important;
          background: #eaf9f3 !important;
        }
        .assistant-popup .assistant-capture-button b { display: inline !important; }
        .assistant-popup .assistant-composer textarea {
          min-height: 42px !important;
          height: 42px !important;
          max-height: 100px !important;
          padding: 11px 13px !important;
          border-radius: 13px !important;
          resize: none !important;
          font-size: 16px !important;
          color: #30263b !important;
          border-color: #ded4e7 !important;
          background: #fff !important;
        }
        .assistant-popup .assistant-input-row > button {
          width: 44px !important;
          height: 44px !important;
        }
        .assistant-popup .assistant-composer small { display: none !important; }
        .assistant-fab.is-open { display: none !important; }
        body:has(.assistant-popup.is-open) .assistant-quick-add-trigger,
        body:has(.assistant-popup.is-open) .assistant-condensed-add,
        body:has(.assistant-popup.is-open) .assistant-condensed-bar {
          display: none !important;
        }
      }
    `}</style>
  </>;
}

