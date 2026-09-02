"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Promotion } from "@/lib/promotions";
import { deleteFoodProduct, saveFoodProduct } from "../actions";
import type { FoodProduct, ProductDraft, ProductPrice } from "../types";
import styles from "./product-library.module.css";

type ExternalProduct = Omit<ProductDraft, "favorite" | "imagePath" | "priceHistory">;
type Analysis = Partial<Pick<ProductDraft, "name" | "brand" | "barcode" | "packageSize" | "servingGrams" | "calories100g" | "protein100g" | "carbs100g" | "fat100g">>;
type Filter = "all" | "favorites" | "priced" | "offers";
type PromotionStoreSummary = { store: string; count: number };
type IconName = "search" | "scan" | "camera" | "plus" | "spark" | "cart" | "star" | "edit" | "trash" | "meal" | "close";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Sofia" });
const emptyDraft = (): ProductDraft => ({
  id: crypto.randomUUID(),
  name: "",
  brand: "",
  barcode: "",
  packageSize: "",
  servingGrams: 100,
  calories100g: 0,
  protein100g: 0,
  carbs100g: 0,
  fat100g: 0,
  source: "Добавен ръчно",
  imageUrl: "",
  imagePath: "",
  favorite: false,
  priceHistory: [],
});
const asNumber = (value: string) => Math.max(0, Number(value) || 0);
const round = (value: number) => Math.round(value * 10) / 10;
const money = (value: number) => new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" }).format(value);
const latestPrice = (product: Partial<ProductDraft>) => product.priceHistory?.[0];
const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(" ");

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10M8.5 9v6M11 9v6M14.5 9v6M17 9v6"/></>,
    camera: <><rect x="3" y="6" width="18" height="13" rx="3"/><path d="m8 6 1.3-2h5.4L16 6"/><circle cx="12" cy="12.5" r="3.2"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    spark: <><path d="M12 3 9.8 8.8 4 11l5.8 2.2L12 19l2.2-5.8L20 11l-5.8-2.2L12 3Z"/><path d="m19 3 .7 1.8L22 5.5l-2.3.7L19 8l-.7-1.8-2.3-.7 2.3-.7L19 3Z"/></>,
    cart: <><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
    meal: <><path d="M7 3v8M4.5 3v5A2.5 2.5 0 0 0 7 10.5 2.5 2.5 0 0 0 9.5 8V3M7 10.5V21M15 3v18M15 3c3 2 4 5 4 8h-4"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

async function createBarcodeReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const barcodeFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128];
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, barcodeFormats);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 400 });
}

async function prepareImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Избери снимка на продукт.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Снимката е прекалено голяма.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

function ProductImage({ product, preview }: { product?: Partial<ProductDraft>; preview?: string }) {
  const src = preview || product?.imageUrl;
  return src
    ? <Image src={src} alt="" width={108} height={108} unoptimized />
    : <span className={styles.imageFallback} aria-hidden="true"><Icon name="spark"/></span>;
}

function coachCopy(productCount: number, missingPrices: number, offerCount: number, offerStoreCount: number) {
  if (!productCount) return "Сканирай първия си продукт. Pegas ще използва точните му стойности в планове, рецепти и дневния прием.";
  if (offerCount > 0) return "Следя " + offerCount + " актуални оферти в " + offerStoreCount + (offerStoreCount === 1 ? " магазин" : " магазина") + " и ги свързвам с продуктите ти.";
  if (missingPrices > 0) return "Добави цена на още " + missingPrices + " продукта, за да стане прогнозата за пазаруване по-точна.";
  return "Базата ти е подредена. Използвай продуктите директно в дневния план или ги комбинирай в рецепта.";
}

export function ProductLibrary({
  initialProducts,
  initialPromotions = {},
  promotionSummary,
}: {
  initialProducts: FoodProduct[];
  initialPromotions?: Record<string, Promotion[]>;
  promotionSummary: PromotionStoreSummary[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [results, setResults] = useState<ExternalProduct[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [storeFilter, setStoreFilter] = useState("");
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Стартиране на камерата...");
  const [priceValue, setPriceValue] = useState("");
  const [priceStore, setPriceStore] = useState("");
  const [priceDate, setPriceDate] = useState(today());
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(false);

  const counts = useMemo(() => {
    return {
      favorites: products.filter((product) => product.favorite).length,
      priced: products.filter((product) => Boolean(latestPrice(product))).length,
      offerProducts: products.filter((product) => Boolean(initialPromotions[product.id]?.length)).length,
    };
  }, [initialPromotions, products]);
  const promotionTotal = promotionSummary.reduce((total, store) => total + store.count, 0);
  const stores = useMemo(() => [...new Set([
    ...products.flatMap((product) => product.priceHistory.map((price) => price.store).filter(Boolean)),
    ...products.flatMap((product) => (initialPromotions[product.id] ?? []).map((offer) => offer.store)),
  ])].sort((a, b) => a.localeCompare(b, "bg")), [initialPromotions, products]);
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("bg-BG");
    return products
      .filter((product) => {
        const searchable = [product.name, product.brand, product.barcode, product.packageSize, product.source, ...product.priceHistory.map((price) => price.store)].join(" ").toLocaleLowerCase("bg-BG");
        if (needle && !searchable.includes(needle)) return false;
        if (storeFilter && !product.priceHistory.some((price) => price.store === storeFilter) && !(initialPromotions[product.id] ?? []).some((offer) => offer.store === storeFilter)) return false;
        if (filter === "favorites" && !product.favorite) return false;
        if (filter === "priced" && !latestPrice(product)) return false;
        if (filter === "offers" && !initialPromotions[product.id]?.length) return false;
        return true;
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
  }, [filter, initialPromotions, products, query, storeFilter]);

  const openEditor = (product: ProductDraft, image = "") => {
    const current = latestPrice(product);
    setDraft(product);
    setPreview(image);
    setPriceValue(current ? String(current.price) : "");
    setPriceStore(current?.store ?? "");
    setPriceDate(current?.recordedAt ?? today());
    setMessage("");
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("scan") !== "1") return;
    url.searchParams.delete("scan");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    const frame = window.requestAnimationFrame(() => setScannerOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!draft && !scannerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setScannerOpen(false);
      setDraft(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [draft, scannerOpen]);

  const searchExternal = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setMessage("Търся в продуктовата база...");
    setResults([]);
    try {
      const barcode = /^\d{8,14}$/.test(query.replace(/\s/g, "")) ? query : "";
      const response = await fetch("/api/products/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: barcode ? "" : query, barcode }),
      });
      if (!response.ok) throw new Error("Търсенето временно не е достъпно.");
      const payload = await response.json() as { products?: ExternalProduct[]; error?: string };
      setResults(payload.products ?? []);
      setMessage(payload.error ?? (payload.products?.length ? "Избери точния продукт и провери стойностите." : "Няма съвпадение. Снимай етикета или добави продукта ръчно."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Търсенето не можа да завърши.");
    } finally {
      setBusy(false);
    }
  };

  const searchBarcode = async (barcode: string) => {
    setBusy(true);
    setQuery(barcode);
    setResults([]);
    setMessage("Баркод " + barcode + " е разпознат. Търся продукта...");
    try {
      const response = await fetch("/api/products/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      if (!response.ok) throw new Error("Баркодът е прочетен, но търсенето временно не е достъпно.");
      const payload = await response.json() as { products?: ExternalProduct[]; error?: string };
      setResults(payload.products ?? []);
      setMessage(payload.error ?? (payload.products?.length ? "Продуктът е намерен. Провери и го избери." : "Баркодът е прочетен, но продуктът липсва. Снимай етикета, за да го добавиш."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Търсенето по баркод не можа да завърши.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;
    detectedRef.current = false;
    setScannerStatus("Фокусирай целия баркод в рамката.");
    let cancelled = false;
    let stop: (() => void) | undefined;
    const focusTimer = window.setTimeout(() => setScannerStatus("Не намирам код. Отдалечи на 20 - 30 см или използвай снимка."), 7000);
    void createBarcodeReader().then(async (reader) => {
      if (cancelled) return;
      const controls = await reader.decodeFromConstraints({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      }, videoRef.current!, (result) => {
        const barcode = result?.getText().replace(/\D/g, "") ?? "";
        if (detectedRef.current || barcode.length < 8) return;
        detectedRef.current = true;
        window.clearTimeout(focusTimer);
        setScannerStatus("Разпознат баркод " + barcode);
        setScannerOpen(false);
        void searchBarcode(barcode);
      });
      if (cancelled) controls.stop();
      else stop = () => controls.stop();
    }).catch((error) => {
      if (cancelled) return;
      setScannerOpen(false);
      setMessage(error instanceof Error && error.name === "NotAllowedError" ? "Разреши достъп до камерата от настройките на Safari и опитай отново." : "Камерата не можа да се отвори. Опитай със снимка на баркода.");
    });
    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
      stop?.();
    };
  }, [scannerOpen]);

  const scanBarcodePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScannerStatus("Разчитам снимката...");
    const imageUrl = URL.createObjectURL(file);
    try {
      const reader = await createBarcodeReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      const barcode = result.getText().replace(/\D/g, "");
      if (barcode.length < 8) throw new Error("invalid barcode");
      detectedRef.current = true;
      setScannerOpen(false);
      await searchBarcode(barcode);
    } catch {
      setScannerStatus("Баркодът не се вижда ясно. Снимай го хоризонтално, отблизо и без отблясък.");
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const chooseResult = (product: ExternalProduct) => {
    openEditor({
      ...product,
      id: crypto.randomUUID(),
      favorite: false,
      imagePath: "",
      source: "Open Food Facts",
      priceHistory: [],
    }, product.imageUrl);
    setResults([]);
    setMessage("Провери разпознатите стойности преди запазване.");
  };

  const analyzePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setMessage("Pegas прочита продукта и хранителния етикет...");
    try {
      const image = await prepareImage(file);
      setPreview(image);
      const response = await fetch("/api/products/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const payload = await response.json() as { analysis?: Analysis; products?: ExternalProduct[]; error?: string };
      if (payload.error) throw new Error(payload.error);
      if (payload.products?.length) {
        setResults(payload.products);
        setMessage("Баркодът е разпознат. Избери намерения продукт.");
      } else {
        openEditor({ ...emptyDraft(), ...(payload.analysis ?? {}), source: "AI от снимка", imageUrl: "" }, image);
        setMessage("Прегледай стойностите и ги поправи, ако е необходимо.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Снимката не можа да бъде анализирана.");
    } finally {
      setBusy(false);
    }
  };

  const persist = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage("Запазвам продукта...");
    let priceHistory = draft.priceHistory ?? [];
    const price = asNumber(priceValue.replace(",", "."));
    const current = priceHistory[0];
    if (price > 0 && (!current || current.price !== price || current.store !== priceStore.trim() || current.recordedAt !== priceDate)) {
      const entry: ProductPrice = { id: crypto.randomUUID(), price, store: priceStore.trim(), recordedAt: priceDate || today() };
      priceHistory = [entry, ...priceHistory].slice(0, 30);
    }
    let product: ProductDraft = {
      ...draft,
      priceHistory,
      imageUrl: draft.imagePath ? "" : draft.imageUrl,
    };
    if (preview.startsWith("data:image/")) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const imagePath = user.id + "/products/" + product.id + ".jpg";
        const blob = await (await fetch(preview)).blob();
        const { error } = await supabase.storage.from("journal-photos").upload(imagePath, blob, {
          upsert: true,
          contentType: "image/jpeg",
          cacheControl: "3600",
        });
        if (!error) product = { ...product, imagePath, imageUrl: "" };
      }
    }
    const result = await saveFoodProduct(product);
    if (result.ok && result.product) {
      const displayed = { ...result.product, imageUrl: preview || result.product.imageUrl };
      setProducts((currentProducts) => [displayed, ...currentProducts.filter((item) => item.id !== displayed.id && (!displayed.barcode || item.barcode !== displayed.barcode))]);
      setDraft(null);
      setPreview("");
      setQuery("");
    }
    setMessage(result.message);
    setBusy(false);
  };

  const toggleFavorite = async (product: FoodProduct) => {
    if (savingId) return;
    const favorite = !product.favorite;
    setSavingId(product.id);
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, favorite } : item));
    const result = await saveFoodProduct({
      ...product,
      favorite,
      imageUrl: product.imagePath ? "" : product.imageUrl,
    });
    if (!result.ok) {
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, favorite: product.favorite } : item));
    }
    setMessage(result.ok ? (favorite ? "Добавено в любими." : "Премахнато от любими.") : result.message);
    setSavingId("");
  };

  const remove = async (product: FoodProduct) => {
    if (!window.confirm("Да изтрия ли „" + product.name + "“?")) return;
    setSavingId(product.id);
    const result = await deleteFoodProduct(product.id);
    if (result.ok) setProducts((current) => current.filter((item) => item.id !== product.id));
    setMessage(result.message);
    setSavingId("");
  };

  const update = (field: keyof ProductDraft, value: string | boolean) => setDraft((current) => current ? {
    ...current,
    [field]: typeof current[field] === "number" ? asNumber(String(value)) : value,
  } : current);

  const missingPrices = products.length - counts.priced;

  return <section className={styles.page}>
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.brand}><span aria-hidden="true">✦</span> PEGASOS · NUTRITION</p>
        <h1>Продукти</h1>
        <p>Точната база зад храненията, рецептите и пазаруването ти.</p>
      </div>
      <div className={styles.libraryBadge}><small>МОЯТА БАЗА</small><strong>{products.length}</strong><span>{products.length === 1 ? "продукт" : "продукта"}</span></div>
    </header>

    <nav className={styles.sectionNav} aria-label="Раздели в Хранене">
      <Link href="/nutrition">Дневник</Link>
      <Link href="/recipes">Рецепти</Link>
      <Link className={styles.activeNav} href="/products" aria-current="page">Продукти</Link>
      <Link href="/shopping-list">Списък</Link>
    </nav>

    <section className={styles.hero} aria-labelledby="product-coach-title">
      <div className={styles.heroGlow} aria-hidden="true"/>
      <Image className={styles.pegas} src="/images/pegas-friend.png" alt="" width={230} height={154} sizes="(max-width: 760px) 170px, 230px"/>
      <div className={styles.heroCopy}>
        <p><span aria-hidden="true"/> PEGAS · ХРАНИТЕЛНА БАЗА</p>
        <h2 id="product-coach-title">{products.length ? "Базата ти работи за целия ден" : "Започни с един реален продукт"}</h2>
        <p>{coachCopy(products.length, missingPrices, promotionTotal, promotionSummary.length)}</p>
        <div className={styles.heroStats}>
          <span><strong>{counts.priced}</strong> с цена</span>
          <span><strong>{counts.favorites}</strong> любими</span>
          <span><strong>{promotionTotal}</strong> оферти</span>
        </div>
        <div className={styles.heroActions}>
          <button type="button" onClick={() => window.dispatchEvent(new Event("open-assistant-popup"))}><Icon name="spark"/> Попитай Pegas</button>
          <Link href="/shopping-list"><Icon name="cart"/> Пазарски списък</Link>
        </div>
      </div>
    </section>

    {promotionTotal ? <Link className={styles.offerHub} href="/promotions">
      <span aria-hidden="true"><Icon name="cart"/></span>
      <div><small>АКТУАЛНИ ОФЕРТИ</small><strong>{promotionTotal} предложения от {promotionSummary.length} вериги</strong><p>{promotionSummary.map((store) => `${store.store} ${store.count}`).join(" · ")}</p></div>
      <b aria-hidden="true">›</b>
    </Link> : null}

    <section className={styles.capturePanel} aria-labelledby="add-product-title">
      <header>
        <div><p>ДОБАВИ ПРОДУКТ</p><h2 id="add-product-title">Намери го по най-лесния начин</h2></div>
        <span>{busy ? "Обработвам..." : "Стойностите се проверяват преди запис"}</span>
      </header>
      <div className={styles.searchBar}>
        <Icon name="search"/>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void searchExternal(); }}
          placeholder="Име, марка или баркод"
          aria-label="Търси продукт"
        />
        <button type="button" onClick={() => void searchExternal()} disabled={busy || !query.trim()}>Търси</button>
      </div>
      <div className={styles.captureActions}>
        <button type="button" onClick={() => setScannerOpen(true)} disabled={busy}><span><Icon name="scan"/></span><b>Сканирай</b><small>Баркод с камерата</small></button>
        <label><input type="file" accept="image/*" capture="environment" onChange={(event) => void analyzePhoto(event)} disabled={busy}/><span><Icon name="camera"/></span><b>Снимай етикет</b><small>Pegas чете стойностите</small></label>
        <button type="button" onClick={() => openEditor(emptyDraft())} disabled={busy}><span><Icon name="plus"/></span><b>Добави ръчно</b><small>Пълен контрол</small></button>
      </div>
    </section>

    {message ? <p className={styles.message} role="status">{message}</p> : null}

    {results.length ? <section className={styles.results} aria-labelledby="online-results-title">
      <header><div><p>ОНЛАЙН БАЗА</p><h2 id="online-results-title">Намерени продукти</h2></div><button type="button" onClick={() => setResults([])}>Изчисти</button></header>
      <div>{results.map((product) => <button type="button" key={product.id} onClick={() => chooseResult(product)}>
        <span className={styles.resultImage}><ProductImage product={product}/></span>
        <span><strong>{product.name}</strong><small>{product.brand || "Без марка"} · {product.packageSize || "100 g"}</small><b>{round(product.calories100g)} kcal · П {round(product.protein100g)} · В {round(product.carbs100g)} · М {round(product.fat100g)}</b></span>
        <i aria-hidden="true">›</i>
      </button>)}</div>
    </section> : null}

    <section className={styles.librarySection} aria-labelledby="library-title">
      <header className={styles.libraryHeading}>
        <div><p>ЛИЧНА БАЗА</p><h2 id="library-title">Твоите продукти</h2></div>
        <span>{visibleProducts.length} от {products.length}</span>
      </header>
      <div className={styles.filters}>
        <div className={styles.filterChips} aria-label="Филтър на продуктите">
          {([
            ["all", "Всички", products.length],
            ["favorites", "Любими", counts.favorites],
            ["priced", "С цена", counts.priced],
            ["offers", "В оферта", counts.offerProducts],
          ] as const).map(([value, label, count]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}
        </div>
        {stores.length ? <label className={styles.storeSelect}>Магазин<select value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)}><option value="">Всички</option>{stores.map((store) => <option key={store}>{store}</option>)}</select></label> : null}
      </div>

      <div className={styles.productGrid}>
        {visibleProducts.map((product) => {
          const current = product.priceHistory[0];
          const previous = product.priceHistory[1];
          const change = current && previous ? current.price - previous.price : 0;
          const promotions = initialPromotions[product.id] ?? [];
          return <article className={styles.productCard} key={product.id}>
            <div className={styles.productImage}><ProductImage product={product}/></div>
            <div className={styles.productContent}>
              <header>
                <span>{product.source}</span>
                <button
                  className={cx(styles.favoriteButton, product.favorite && styles.isFavorite)}
                  type="button"
                  disabled={savingId === product.id}
                  aria-label={product.favorite ? "Премахни от любими" : "Добави в любими"}
                  aria-pressed={product.favorite}
                  onClick={() => void toggleFavorite(product)}
                ><Icon name="star"/></button>
              </header>
              <div className={styles.productIdentity}>
                <h3>{product.name}</h3>
                <p>{[product.brand || "Без марка", product.packageSize, product.barcode].filter(Boolean).join(" · ")}</p>
              </div>
              <div className={styles.macros} aria-label="Хранителни стойности за 100 грама">
                <span><b>{round(product.calories100g)}</b> kcal</span>
                <span><b>{round(product.protein100g)}</b> П</span>
                <span><b>{round(product.carbs100g)}</b> В</span>
                <span><b>{round(product.fat100g)}</b> М</span>
              </div>
              {promotions.length ? <div className={styles.promotionGroup}>
                <div className={styles.promotionHeading}><small>АКТУАЛНИ ОФЕРТИ</small><span>{promotions.length} {promotions.length === 1 ? "магазин" : "магазина"}</span></div>
                <div className={styles.promotionRail}>{promotions.map((promotion) => <a className={styles.promotion} href={promotion.url} target="_blank" rel="noreferrer" key={`${promotion.store}-${promotion.id}`}>
                  <span><b>{promotion.store}</b><small>до {promotion.validUntil}</small></span>
                  <strong>{money(promotion.price)}</strong><i aria-hidden="true">↗</i>
                </a>)}</div>
              </div> : current ? <div className={styles.price}>
                <span><small>ПОСЛЕДНА ЦЕНА</small><strong>{money(current.price)}</strong></span>
                <span><b>{current.store || "Без магазин"}</b><small>{current.recordedAt}</small></span>
                {previous && change !== 0 ? <em className={change > 0 ? styles.priceUp : styles.priceDown}>{change > 0 ? "↑ " : "↓ "}{money(Math.abs(change))}</em> : null}
              </div> : <button className={styles.missingPrice} type="button" onClick={() => openEditor({ ...product }, product.imageUrl)}>+ Добави цена за точен списък</button>}
              <footer>
                <Link className={styles.mealAction} href={"/nutrition?add=meal&product=" + encodeURIComponent(product.id)}><Icon name="meal"/> Към хранене</Link>
                <button type="button" onClick={() => openEditor({ ...product }, product.imageUrl)}><Icon name="edit"/> Редактирай</button>
                <button className={styles.deleteButton} type="button" disabled={savingId === product.id} onClick={() => void remove(product)} aria-label={"Изтрий " + product.name}><Icon name="trash"/></button>
              </footer>
            </div>
          </article>;
        })}
        {!visibleProducts.length ? <div className={styles.empty}>
          <span><Icon name={products.length ? "search" : "scan"}/></span>
          <strong>{products.length ? "Няма продукти по този филтър" : "Базата ти е празна"}</strong>
          <p>{products.length ? "Изчисти търсенето или избери „Всички“." : "Сканирай баркод, снимай етикет или добави първия продукт ръчно."}</p>
          {products.length ? <button type="button" onClick={() => { setFilter("all"); setStoreFilter(""); setQuery(""); }}>Покажи всички</button> : <button type="button" onClick={() => setScannerOpen(true)}>Сканирай първия</button>}
        </div> : null}
      </div>
    </section>

    {scannerOpen ? <div className={styles.backdrop}>
      <section className={styles.scanner} role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <header><div><p>БАРКОД СКЕНЕР</p><h2 id="scanner-title">Насочи към кода</h2></div><button type="button" onClick={() => setScannerOpen(false)} aria-label="Затвори"><Icon name="close"/></button></header>
        <div className={styles.videoFrame}><video ref={videoRef} muted playsInline/><span/></div>
        <p role="status">{scannerStatus}</p>
        <label><input type="file" accept="image/*" capture="environment" onChange={(event) => void scanBarcodePhoto(event)}/><Icon name="camera"/> Снимай баркода</label>
      </section>
    </div> : null}

    {draft ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}>
      <section className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
        <header>
          <div className={styles.editorImage}><ProductImage product={draft} preview={preview}/></div>
          <div><p>{draft.source}</p><h2 id="product-editor-title">{draft.name || "Нов продукт"}</h2><span>Провери данните преди запис</span></div>
          <button type="button" onClick={() => setDraft(null)} aria-label="Затвори"><Icon name="close"/></button>
        </header>

        <div className={styles.editorBody}>
          {message ? <p className={styles.editorMessage} role="status">{message}</p> : null}
          <section className={styles.formSection}>
            <header><span>01</span><div><h3>Основни данни</h3><p>Идентичност и реална порция</p></div></header>
            <div className={styles.fields}>
              <label className={styles.wide}>Име<input value={draft.name} maxLength={160} autoFocus onChange={(event) => update("name", event.target.value)}/></label>
              <label>Марка<input value={draft.brand} maxLength={120} onChange={(event) => update("brand", event.target.value)}/></label>
              <label>Баркод<input inputMode="numeric" value={draft.barcode} onChange={(event) => update("barcode", event.target.value.replace(/\D/g, ""))}/></label>
              <label>Опаковка<input value={draft.packageSize} onChange={(event) => update("packageSize", event.target.value)} placeholder="Напр. 200 g"/></label>
              <label>Порция<input type="number" min="0" value={draft.servingGrams} onChange={(event) => update("servingGrams", event.target.value)}/><small>g</small></label>
            </div>
          </section>

          <section className={styles.formSection}>
            <header><span>02</span><div><h3>Цена и магазин</h3><p>Използва се в пазарския списък</p></div></header>
            <div className={styles.priceFields}>
              <label>Цена<input inputMode="decimal" value={priceValue} onChange={(event) => setPriceValue(event.target.value.replace(/[^0-9,.]/g, ""))} placeholder="2,49"/><small>€</small></label>
              <label>Магазин<input list="pegasos-product-stores" value={priceStore} onChange={(event) => setPriceStore(event.target.value)} placeholder="Lidl, Kaufland..."/><datalist id="pegasos-product-stores"><option value="Kaufland"/><option value="Lidl"/><option value="Billa"/><option value="Fantastico"/><option value="T-Market"/></datalist></label>
              <label>Дата<input type="date" value={priceDate} onChange={(event) => setPriceDate(event.target.value)}/></label>
            </div>
            {draft.priceHistory.length ? <div className={styles.priceHistory}><strong>Последни записи</strong>{draft.priceHistory.slice(0, 4).map((entry) => <span key={entry.id}><b>{money(entry.price)}</b><em>{entry.store || "Без магазин"}</em><small>{entry.recordedAt}</small></span>)}</div> : null}
          </section>

          <section className={styles.formSection}>
            <header><span>03</span><div><h3>Хранителни стойности</h3><p>За 100 g или 100 ml</p></div></header>
            <div className={styles.nutritionFields}>
              <label className={styles.calories}>Калории<input type="number" min="0" value={draft.calories100g} onChange={(event) => update("calories100g", event.target.value)}/><small>kcal</small></label>
              <label className={styles.protein}>Протеин<input type="number" min="0" step="0.1" value={draft.protein100g} onChange={(event) => update("protein100g", event.target.value)}/><small>g</small></label>
              <label className={styles.carbs}>Въглехидрати<input type="number" min="0" step="0.1" value={draft.carbs100g} onChange={(event) => update("carbs100g", event.target.value)}/><small>g</small></label>
              <label className={styles.fat}>Мазнини<input type="number" min="0" step="0.1" value={draft.fat100g} onChange={(event) => update("fat100g", event.target.value)}/><small>g</small></label>
            </div>
          </section>
        </div>

        <footer>
          <label className={styles.favoriteToggle}><input type="checkbox" checked={draft.favorite} onChange={(event) => update("favorite", event.target.checked)}/><span><Icon name="star"/></span><b>Любим продукт</b></label>
          <div><button type="button" onClick={() => setDraft(null)}>Откажи</button><button className={styles.saveButton} type="button" disabled={busy || !draft.name.trim()} onClick={() => void persist()}>{busy ? "Запазвам..." : "Запази продукта"}</button></div>
        </footer>
      </section>
    </div> : null}
  </section>;
}
