"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { createClient } from "@/lib/supabase/client";
import { deleteFoodProduct, saveFoodProduct } from "../actions";
import type { FoodProduct, ProductDraft, ProductSource } from "../types";

type ExternalProduct = Omit<ProductDraft, "favorite" | "imagePath">;
type Analysis = Partial<Pick<ProductDraft, "name" | "brand" | "barcode" | "packageSize" | "servingGrams" | "calories100g" | "protein100g" | "carbs100g" | "fat100g">>;

const emptyDraft = (): ProductDraft => ({ id: crypto.randomUUID(), name: "", brand: "", barcode: "", packageSize: "", servingGrams: 100, calories100g: 0, protein100g: 0, carbs100g: 0, fat100g: 0, source: "Добавен ръчно", imageUrl: "", imagePath: "", favorite: false });
const asNumber = (value: string) => Math.max(0, Number(value) || 0);
const barcodeFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128];

async function createBarcodeReader() {
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const hints = new Map<DecodeHintType, unknown>();
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
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL("image/jpeg", .72);
}

function ProductImage({ product, preview }: { product?: Partial<ProductDraft>; preview?: string }) {
  const src = preview || product?.imageUrl;
  return src ? <Image src={src} alt="" width={92} height={92} unoptimized /> : <span aria-hidden="true">✦</span>;
}

export function ProductLibrary({ initialProducts }: { initialProducts: FoodProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [results, setResults] = useState<ExternalProduct[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Стартиране на камерата…");
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectedRef = useRef(false);
  const visibleProducts = useMemo(() => products.filter((product) => `${product.name} ${product.brand} ${product.barcode}`.toLocaleLowerCase("bg-BG").includes(query.toLocaleLowerCase("bg-BG"))), [products, query]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("scan") !== "1") return;
    setScannerOpen(true);
    url.searchParams.delete("scan");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const searchExternal = async () => {
    if (!query.trim()) return;
    setBusy(true); setMessage("Търсене в продуктовата база…"); setResults([]);
    const barcode = /^\d{8,14}$/.test(query.replace(/\s/g, "")) ? query : "";
    const response = await fetch("/api/products/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: barcode ? "" : query, barcode }) });
    const payload = await response.json() as { products?: ExternalProduct[]; error?: string };
    setResults(payload.products ?? []); setMessage(payload.error ?? (payload.products?.length ? "Избери точния продукт." : "Не е намерен продукт. Снимай етикета или го добави ръчно.")); setBusy(false);
  };

  const searchBarcode = async (barcode: string) => {
    setBusy(true); setQuery(barcode); setResults([]); setMessage(`Баркод ${barcode} е разпознат. Търсене на продукта…`);
    const response = await fetch("/api/products/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode }) });
    const payload = await response.json() as { products?: ExternalProduct[]; error?: string };
    setResults(payload.products ?? []); setMessage(payload.error ?? (payload.products?.length ? "Продуктът е намерен. Провери и го избери." : "Баркодът е прочетен, но продуктът липсва. Снимай етикета, за да го добавиш.")); setBusy(false);
  };

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;
    detectedRef.current = false;
    setScannerStatus("Фокусирай целия баркод в цветната рамка.");
    let stop: (() => void) | undefined;
    const focusTimer = window.setTimeout(() => setScannerStatus("Не намирам код. Отдалечи на 20–30 см или използвай „Снимай баркода“."), 7000);
    void createBarcodeReader().then(async (reader) => {
      const controls = await reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } }, videoRef.current!, (result) => {
        const barcode = result?.getText().replace(/\D/g, "") ?? "";
        if (detectedRef.current || barcode.length < 8) return;
        detectedRef.current = true; window.clearTimeout(focusTimer); setScannerStatus(`Разпознат баркод ${barcode}`); setScannerOpen(false); void searchBarcode(barcode);
      });
      stop = () => controls.stop();
    }).catch((error) => { setScannerOpen(false); setMessage(error instanceof Error && error.name === "NotAllowedError" ? "Разреши достъп до камерата от настройките на Safari и опитай отново." : "Камерата не можа да се отвори. Опитай със снимка на баркода."); });
    return () => { window.clearTimeout(focusTimer); stop?.(); };
  }, [scannerOpen]);

  const scanBarcodePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setScannerStatus("Разчитане на снимката…");
    const imageUrl = URL.createObjectURL(file);
    try {
      const reader = await createBarcodeReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      const barcode = result.getText().replace(/\D/g, "");
      if (barcode.length < 8) throw new Error("invalid barcode");
      detectedRef.current = true; setScannerOpen(false); await searchBarcode(barcode);
    } catch {
      setScannerStatus("Баркодът не се вижда ясно. Снимай го отблизо, хоризонтално и без отблясък.");
    } finally { URL.revokeObjectURL(imageUrl); }
  };

  const chooseResult = (product: ExternalProduct) => {
    setDraft({ ...product, id: crypto.randomUUID(), favorite: false, imagePath: "", source: "Open Food Facts" }); setPreview(product.imageUrl); setResults([]); setMessage("Провери стойностите преди запазване.");
  };

  const analyzePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setBusy(true); setMessage("AI прочита продукта и хранителния етикет…");
    try {
      const image = await prepareImage(file); setPreview(image);
      const response = await fetch("/api/products/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const payload = await response.json() as { analysis?: Analysis; products?: ExternalProduct[]; error?: string; matchedByBarcode?: boolean };
      if (payload.error) throw new Error(payload.error);
      if (payload.products?.length) { setResults(payload.products); setMessage("Баркодът е разпознат. Избери намерения продукт."); }
      else {
        const analysis = payload.analysis ?? {};
        setDraft({ ...emptyDraft(), ...analysis, source: "AI от снимка", imageUrl: "" });
        setMessage("Прегледай разпознатите стойности. Поправи ги, ако е необходимо.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Снимката не можа да бъде анализирана."); }
    setBusy(false);
  };

  const persist = async () => {
    if (!draft) return; setBusy(true); setMessage("Запазване…");
    let product = { ...draft };
    if (preview.startsWith("data:image/")) {
      const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const imagePath = `${user.id}/products/${product.id}.jpg`; const blob = await (await fetch(preview)).blob();
        const { error } = await supabase.storage.from("journal-photos").upload(imagePath, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) product = { ...product, imagePath, imageUrl: "" };
      }
    }
    const result = await saveFoodProduct(product);
    if (result.ok && result.product) { const displayed = { ...result.product, imageUrl: preview || result.product.imageUrl }; setProducts((current) => [displayed, ...current.filter((item) => item.id !== displayed.id && (!displayed.barcode || item.barcode !== displayed.barcode))]); setDraft(null); setPreview(""); setQuery(""); }
    setMessage(result.message); setBusy(false);
  };

  const remove = async (product: FoodProduct) => {
    if (!window.confirm(`Да изтрия ли „${product.name}“?`)) return;
    const result = await deleteFoodProduct(product.id); if (result.ok) setProducts((current) => current.filter((item) => item.id !== product.id)); setMessage(result.message);
  };

  const update = (field: keyof ProductDraft, value: string | boolean) => setDraft((current) => current ? { ...current, [field]: typeof current[field] === "number" ? asNumber(String(value)) : value } : current);

  return <section className="products-page">
    <header className="products-header"><div><p className="life-kicker">Лична хранителна база</p><h1>Продукти</h1><p>Сканирай, провери и запази продуктите, които реално използваш.</p></div><button className="primary-button" type="button" onClick={() => { setDraft(emptyDraft()); setPreview(""); }}>+ Добави ръчно</button></header>
    <div className="product-tools"><div className="product-search"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchExternal(); }} placeholder="Име, марка или баркод" /><button type="button" onClick={() => void searchExternal()} disabled={busy || !query.trim()}>Търси</button></div><button className="product-camera product-live-scanner" type="button" onClick={() => setScannerOpen(true)} disabled={busy}><span>▥</span><b>Сканирай баркод</b></button><label className="product-camera"><input type="file" accept="image/*" capture="environment" onChange={(event) => void analyzePhoto(event)} disabled={busy} /><span>▣</span><b>Снимай етикет</b></label></div>
    {message ? <p className="product-message" aria-live="polite">{message}</p> : null}
    {scannerOpen ? <div className="barcode-scanner-backdrop"><section className="barcode-scanner" role="dialog" aria-modal="true" aria-label="Сканиране на баркод"><header><div><p className="life-kicker">Скенер</p><h2>Насочи към баркода</h2></div><button type="button" onClick={() => setScannerOpen(false)}>×</button></header><div className="barcode-video-frame"><video ref={videoRef} muted playsInline /><span className="barcode-guide" /></div><p className="barcode-scanner-status" aria-live="polite">{scannerStatus}</p><label className="barcode-photo-button"><input type="file" accept="image/*" capture="environment" onChange={(event) => void scanBarcodePhoto(event)} /><span>▣</span> Снимай баркода</label></section></div> : null}
    {results.length ? <div className="product-results">{results.map((product) => <button type="button" key={product.id} onClick={() => chooseResult(product)}><ProductImage product={product} /><span><strong>{product.name}</strong><small>{product.brand || "Без марка"} · {product.packageSize || "100 г"}</small><b>П {product.protein100g} · В {product.carbs100g} · М {product.fat100g} · {product.calories100g} kcal</b></span></button>)}</div> : null}
    {draft ? <div className="product-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}><section className="product-editor" role="dialog" aria-modal="true"><header><div className="product-editor-image"><ProductImage product={draft} preview={preview} /></div><div><p className="life-kicker">Потвърждение</p><h2>{draft.name || "Нов продукт"}</h2><span>{draft.source}</span></div><button type="button" onClick={() => setDraft(null)}>×</button></header><div className="product-editor-fields"><label className="wide">Име<input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label>Марка<input value={draft.brand} onChange={(event) => update("brand", event.target.value)} /></label><label>Баркод<input inputMode="numeric" value={draft.barcode} onChange={(event) => update("barcode", event.target.value.replace(/\D/g, ""))} /></label><label>Опаковка<input value={draft.packageSize} onChange={(event) => update("packageSize", event.target.value)} placeholder="Напр. 200 г" /></label><label>Порция в грамове<input type="number" value={draft.servingGrams} onChange={(event) => update("servingGrams", event.target.value)} /></label><fieldset className="product-macros wide"><legend>Стойности за 100 г</legend><label className="calories">Калории<input type="number" value={draft.calories100g} onChange={(event) => update("calories100g", event.target.value)} /></label><label className="protein">Протеин<input type="number" step="0.1" value={draft.protein100g} onChange={(event) => update("protein100g", event.target.value)} /></label><label className="carbs">Въглехидрати<input type="number" step="0.1" value={draft.carbs100g} onChange={(event) => update("carbs100g", event.target.value)} /></label><label className="fat">Мазнини<input type="number" step="0.1" value={draft.fat100g} onChange={(event) => update("fat100g", event.target.value)} /></label></fieldset></div><footer><label><input type="checkbox" checked={draft.favorite} onChange={(event) => update("favorite", event.target.checked)} /> Любим продукт</label><button className="primary-button" type="button" disabled={busy || !draft.name.trim()} onClick={() => void persist()}>{busy ? "Запазване…" : "Потвърди и запази"}</button></footer></section></div> : null}
    <div className="product-library-heading"><h2>Моята база</h2><span>{products.length} продукта</span></div><div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}><div className="product-card-image"><ProductImage product={product} /></div><div><span>{product.source}</span><h3>{product.name}</h3><p>{product.brand || "Без марка"}{product.barcode ? ` · ${product.barcode}` : ""}</p><div className="product-card-macros"><b>{product.calories100g}<small> kcal</small></b><b>П {product.protein100g}</b><b>В {product.carbs100g}</b><b>М {product.fat100g}</b></div><footer><button type="button" onClick={() => { setDraft({ ...product }); setPreview(product.imageUrl); }}>Редактирай</button><button type="button" onClick={() => void remove(product)}>Изтрий</button></footer></div></article>)}{!visibleProducts.length ? <p className="product-empty">Няма продукти. Потърси по баркод или снимай първия.</p> : null}</div>
  </section>;
}
