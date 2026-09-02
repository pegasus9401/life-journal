import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl = "https://smartpazar.net/smartpazar_db.json";
const outputUrl = new URL("../../data/promotion-fallback.json", import.meta.url);
const storeOrder = ["Kaufland", "Lidl", "Billa", "Fantastico", "T-Market"];
const retailerBrochures = {
  Kaufland: "https://www.kaufland.bg/broshuri.html",
  Lidl: "https://www.lidl.bg/c/broshura/s10020060",
  Billa: "https://www.billa.bg/",
  Fantastico: "https://www.fantastico.bg/",
  "T-Market": "https://tmarket.bg/",
};

function isCurrentOrUpcoming(value) {
  const match = String(value ?? "").match(/^(\d{1,2})\.(\d{1,2})/);
  if (!match) return true;
  const now = new Date();
  let year = now.getUTCFullYear();
  const month = Number(match[2]) - 1;
  if (month < now.getUTCMonth() - 6) year += 1;
  const end = new Date(Date.UTC(year, month, Number(match[1]), 23, 59, 59));
  return end.getTime() >= now.getTime() - 24 * 60 * 60 * 1000;
}

async function fetchCatalog() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(sourceUrl, {
        headers: { Accept: "application/json", "User-Agent": "PegasOS promotion snapshot" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`SmartPazar returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("SmartPazar returned an invalid catalog");
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }
  throw lastError;
}

const rawCatalog = await fetchCatalog();
const offers = rawCatalog.flatMap((item) => {
  const store = String(item.store ?? "").trim().slice(0, 80);
  const name = String(item.name ?? "").trim().slice(0, 240);
  const price = Number(item.new_price_eur);
  const validUntil = String(item.valid_until ?? "");
  if (!store || !name || !Number.isFinite(price) || price <= 0 || !isCurrentOrUpcoming(validUntil)) return [];
  const oldPrice = Number(item.old_price_eur);
  return [{
    id: `${store}:${String(item.id ?? name)}`,
    name,
    store,
    oldPrice: oldPrice > price ? oldPrice : null,
    price,
    validFrom: String(item.valid_from ?? ""),
    validUntil,
    url: String(item.url || retailerBrochures[store] || ""),
    imageUrl: String(item.image_url ?? ""),
    source: "SmartPazar",
  }];
});

const activeStores = new Set(offers.map((offer) => offer.store));
if (offers.length < 100 || activeStores.size < 2) {
  throw new Error(`Refusing to replace the snapshot with ${offers.length} offers from ${activeStores.size} stores`);
}

offers.sort((left, right) => {
  const leftStore = storeOrder.indexOf(left.store);
  const rightStore = storeOrder.indexOf(right.store);
  const storeDifference = (leftStore < 0 ? 999 : leftStore) - (rightStore < 0 ? 999 : rightStore);
  return storeDifference || left.name.localeCompare(right.name, "bg");
});

const requestedLimit = Number(process.env.PROMOTION_SNAPSHOT_LIMIT_PER_STORE ?? 0);
const snapshot = requestedLimit > 0
  ? [...activeStores].flatMap((store) => offers.filter((offer) => offer.store === store).slice(0, requestedLimit))
  : offers;
const outputPath = fileURLToPath(outputUrl);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Saved ${snapshot.length} active offers from ${activeStores.size} stores`);
