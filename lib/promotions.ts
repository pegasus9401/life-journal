import promotionFallback from "@/data/promotion-fallback.json";

export type Promotion = {
  id: string;
  name: string;
  store: string;
  oldPrice: number | null;
  price: number;
  validFrom: string;
  validUntil: string;
  url: string;
  imageUrl: string;
  source: "SmartPazar";
};

export const preferredPromotionStores = ["Kaufland", "Lidl", "Billa", "Fantastico", "T-Market"] as const;

export const retailerBrochures: Partial<Record<string, string>> = {
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

export function bestPromotionsByStore(query: string, offers: Promotion[], limit = Number.POSITIVE_INFINITY) {
  const ranked = offers
    .map((offer) => ({ offer, score: promotionMatchScore(query, offer.name) }))
    .filter((match) => match.score >= .5)
    .sort((a, b) => b.score - a.score || a.offer.price - b.offer.price);
  const selected: Promotion[] = [];
  const stores = new Set<string>();
  for (const { offer } of ranked) {
    const storeKey = offer.store.toLocaleLowerCase("bg-BG");
    if (stores.has(storeKey)) continue;
    stores.add(storeKey);
    selected.push(offer);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function promotionStoreNames(offers: Promotion[]) {
  const available = new Map(offers.map((offer) => [offer.store.toLocaleLowerCase("bg-BG"), offer.store]));
  const preferred = preferredPromotionStores.filter((store) => available.delete(store.toLocaleLowerCase("bg-BG")));
  return [...preferred, ...Array.from(available.values()).sort((a, b) => a.localeCompare(b, "bg"))];
}

export function interleavePromotionsByStore(offers: Promotion[], limit = offers.length) {
  const grouped = new Map<string, Promotion[]>();
  for (const offer of offers) grouped.set(offer.store, [...(grouped.get(offer.store) ?? []), offer]);
  const stores = promotionStoreNames(offers);
  const balanced: Promotion[] = [];
  for (let row = 0; balanced.length < limit; row += 1) {
    let added = false;
    for (const store of stores) {
      const offer = grouped.get(store)?.[row];
      if (!offer) continue;
      balanced.push(offer);
      added = true;
      if (balanced.length >= limit) break;
    }
    if (!added) break;
  }
  return balanced;
}

export function retailerBrochureUrl(store: string, offerUrl = "") {
  return retailerBrochures[store] ?? offerUrl;
}

const menuAliases: Record<string, string[]> = {
  банан: ["банани"], ябълка: ["ябълки"], домат: ["домати"], картофи: ["картоф"], яйца: ["яйце"],
  "пилешка пържола от бут": ["пилешки бут", "пилешко месо от бут"], "пилешки гърди": ["пилешко филе", "филе от пиле"],
  "пуешко филе": ["пуешки гърди", "филе от пуйка"], "свинско контра филе": ["свинско контрафиле"],
  пъстърва: ["филе от пъстърва"], сьомга: ["филе от сьомга"], skyr: ["скир"],
  "high protein pudding milbona": ["protein pudding", "протеинов пудинг"], "high protein quark creme": ["protein quark", "протеинов кварк"],
};

export function dietTermsFromMenus(menus: Record<string, Record<string, string[]>>) {
  const terms = new Set<string>();
  for (const menu of Object.values(menus)) for (const options of Object.values(menu)) for (const option of options) for (const raw of option.split(" + ")) {
    const term = raw.replace(/^.*?:\s*/, "").replace(/\s*-\s*\d.*$/, "").replace(/^\d+\s*/, "").trim();
    if (term.length >= 4 && term.toLocaleLowerCase("bg-BG") !== "салата") {
      terms.add(term);
      for (const alias of menuAliases[normalizeProductName(term)] ?? []) terms.add(alias);
    }
  }
  return [...terms];
}

export function isDietSuitablePromotion(offer: Promotion, terms: string[]) {
  const name = normalizeProductName(offer.name);
  const nameTokens = name.split(" ");
  return terms.some((term) => {
    const normalized = normalizeProductName(term); if (normalized.length < 4) return false;
    const termTokens = normalized.split(" ");
    for (let index = 0; index <= Math.min(1, nameTokens.length - termTokens.length); index += 1) {
      if (termTokens.every((token, offset) => nameTokens[index + offset] === token)) return true;
    }
    return false;
  });
}

function isCurrentOrUpcoming(value: string) {
  const match = value.match(/^(\d{1,2})\.(\d{1,2})/); if (!match) return true;
  const now = new Date(); let year = now.getUTCFullYear(); const month = Number(match[2]) - 1;
  if (month < now.getUTCMonth() - 6) year += 1;
  const end = new Date(Date.UTC(year, month, Number(match[1]), 23, 59, 59));
  return end.getTime() >= now.getTime() - 24 * 60 * 60 * 1000;
}

export function getPromotions(): Promise<Promotion[]> {
  const current = (promotionFallback as Promotion[]).filter((offer) => isCurrentOrUpcoming(offer.validUntil));
  return Promise.resolve(current);
}
