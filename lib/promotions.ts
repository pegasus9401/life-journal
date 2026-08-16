export type Promotion = {
  id: string;
  name: string;
  store: "Kaufland" | "Lidl" | "Billa" | "Fantastico" | "T-Market";
  oldPrice: number | null;
  price: number;
  validFrom: string;
  validUntil: string;
  url: string;
  imageUrl: string;
  source: "SmartPazar";
};

type SmartPazarOffer = {
  id?: string | number;
  name?: string;
  store?: string;
  old_price_eur?: number | null;
  new_price_eur?: number | null;
  valid_from?: string;
  valid_until?: string;
  url?: string;
  image_url?: string;
};

const stores = new Set<Promotion["store"]>(["Kaufland", "Lidl", "Billa", "Fantastico", "T-Market"]);
const sourceUrl = "https://smartpazar.net/smartpazar_db.json";

export const retailerBrochures: Record<Promotion["store"], string> = {
  Kaufland: "https://www.kaufland.bg/broshuri.html",
  Lidl: "https://www.lidl.bg/c/broshura/s10020060",
  Billa: "https://www.billa.bg/",
  Fantastico: "https://www.fantastico.bg/",
  "T-Market": "https://tmarket.bg/",
};

export function normalizeProductName(value: string) {
  return value.toLocaleLowerCase("bg-BG").replace(/[^a-zа-я0-9]+/gi, " ").replace(/\b(бр|грама?|гр|кг|мл|литра?|опаковка|пакет)\b/g, " ").replace(/\s+/g, " ").trim();
}

const ignored = new Set(["с", "и", "на", "за", "от", "без", "в", "по", "или"]);
function tokens(value: string) { return normalizeProductName(value).split(" ").filter((token) => token.length > 2 && !ignored.has(token) && !/^\d+$/.test(token)); }

export function promotionMatchScore(query: string, offerName: string) {
  const a = normalizeProductName(query); const b = normalizeProductName(offerName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 5 && (a.includes(b) || b.includes(a))) return .9;
  const queryTokens = tokens(a); const offerTokens = new Set(tokens(b));
  if (!queryTokens.length) return 0;
  const matches = queryTokens.filter((token) => offerTokens.has(token)).length;
  return matches / Math.max(queryTokens.length, Math.min(offerTokens.size, 4));
}

export function bestPromotions(query: string, offers: Promotion[], limit = 3) {
  return offers.map((offer) => ({ offer, score: promotionMatchScore(query, offer.name) })).filter((match) => match.score >= .5).sort((a, b) => b.score - a.score || a.offer.price - b.offer.price).slice(0, limit).map((match) => match.offer);
}

const dietAliases = [
  "high protein", "protein pudding", "protein quark", "skyr", "извара", "кисело мляко", "прясно мляко", "моцарела light", "крема сирене", "сирене", "кашкавал",
  "пилешко", "пилешки гърди", "пилешки бут", "пуешко филе", "пуешки гърди", "свинско контра филе", "свински врат", "пъстърва", "сьомга", "яйца",
  "банан", "ябълка", "домат", "картофи", "зелена салата", "зеленчуци", "ориз", "овесени ядки", "протеинов хляб", "пълнозърнест хляб", "лаваш", "макарони",
  "бадеми", "фъстъчено масло", "зехтин", "песто", "протеин на прах", "суроватъчен протеин",
];

export function dietTermsFromMenus(menus: Record<string, Record<string, string[]>>) {
  const terms = new Set(dietAliases);
  for (const menu of Object.values(menus)) for (const options of Object.values(menu)) for (const option of options) for (const raw of option.split(" + ")) {
    const term = raw.replace(/^.*?:\s*/, "").replace(/\s*-\s*\d.*$/, "").replace(/^\d+\s*/, "").trim();
    if (term.length >= 4 && term !== "салата") terms.add(term);
  }
  return [...terms];
}

export function isDietSuitablePromotion(offer: Promotion, terms: string[]) {
  const name = normalizeProductName(offer.name);
  return terms.some((term) => { const normalized = normalizeProductName(term); return normalized.length >= 4 && (name.includes(normalized) || promotionMatchScore(normalized, name) >= .5); });
}

function isCurrentOrUpcoming(value: string) {
  const match = value.match(/^(\d{1,2})\.(\d{1,2})/); if (!match) return true;
  const now = new Date(); let year = now.getUTCFullYear(); const month = Number(match[2]) - 1;
  if (month < now.getUTCMonth() - 6) year += 1;
  const end = new Date(Date.UTC(year, month, Number(match[1]), 23, 59, 59));
  return end.getTime() >= now.getTime() - 24 * 60 * 60 * 1000;
}

export async function getPromotions(): Promise<Promotion[]> {
  try {
    const response = await fetch(sourceUrl, { next: { revalidate: 6 * 60 * 60 } });
    if (!response.ok) return [];
    const data = await response.json() as SmartPazarOffer[];
    return data.flatMap((item): Promotion[] => {
      const store = String(item.store ?? "") as Promotion["store"];
      const price = Number(item.new_price_eur);
      if (!stores.has(store) || !item.name || !Number.isFinite(price) || price <= 0 || !isCurrentOrUpcoming(String(item.valid_until ?? ""))) return [];
      return [{ id: String(item.id ?? `${store}-${item.name}`), name: String(item.name).slice(0, 240), store, oldPrice: Number(item.old_price_eur) > price ? Number(item.old_price_eur) : null, price, validFrom: String(item.valid_from ?? ""), validUntil: String(item.valid_until ?? ""), url: String(item.url ?? retailerBrochures[store]), imageUrl: String(item.image_url ?? ""), source: "SmartPazar" }];
    });
  } catch { return []; }
}
