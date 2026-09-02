import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { getMenuLibrary, type MealMenuSettings } from "@/features/nutrition/menu-library";
import {
  dietTermsFromMenus,
  getPromotions,
  interleavePromotionsByStore,
  isDietSuitablePromotion,
  preferredPromotionStores,
  promotionStoreNames,
  retailerBrochureUrl,
} from "@/lib/promotions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Промоции · PEGASOS" };

const money = (value: number) => new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" }).format(value);
const discountRatio = (offer: { oldPrice: number | null; price: number }) => offer.oldPrice ? (offer.oldPrice - offer.price) / offer.oldPrice : 0;

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; store?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const allOffers = await getPromotions();
  const stores = [...new Set([...preferredPromotionStores, ...promotionStoreNames(allOffers)])];
  const requestedStore = String(params.store ?? "");
  const selectedStore = stores.includes(requestedStore) ? requestedStore : "";
  const query = String(params.q ?? "").trim().toLocaleLowerCase("bg-BG");
  const dietView = params.view === "diet";
  const menus = getMenuLibrary(user.user_metadata as MealMenuSettings);
  const dietTerms = dietTermsFromMenus(menus);
  const relevantOffers = allOffers
    .filter((offer) => (!dietView || isDietSuitablePromotion(offer, dietTerms))
      && (!query || offer.name.toLocaleLowerCase("bg-BG").includes(query)))
    .sort((a, b) => discountRatio(b) - discountRatio(a) || a.price - b.price);
  const matchingOffers = selectedStore ? relevantOffers.filter((offer) => offer.store === selectedStore) : relevantOffers;
  const offers = interleavePromotionsByStore(matchingOffers, 240);
  const storeCounts = relevantOffers.reduce<Map<string, number>>((counts, offer) => {
    counts.set(offer.store, (counts.get(offer.store) ?? 0) + 1);
    return counts;
  }, new Map());
  const dietHref = `?${new URLSearchParams({
    view: "diet",
    ...(params.q ? { q: params.q } : {}),
    ...(selectedStore ? { store: selectedStore } : {}),
  })}`;
  const allHref = `?${new URLSearchParams({
    ...(params.q ? { q: params.q } : {}),
    ...(selectedStore ? { store: selectedStore } : {}),
  })}`;

  return <main className="life-app-shell">
    <AppNavigation active="promotions" />
    <section className="promotions-page">
      <header>
        <div>
          <p className="life-kicker">Умен пазар</p>
          <h1>Седмични промоции</h1>
          <p>{dietView
            ? "Подходящите за режима ти предложения от всички налични вериги."
            : "Всички актуални предложения от наблюдаваните вериги."}</p>
        </div>
        <span>{matchingOffers.length} предложения</span>
      </header>

      <nav className="promotion-view-tabs" aria-label="Вид промоции">
        <Link className={dietView ? "active" : ""} href={dietHref}>Подходящи за режима</Link>
        <Link className={!dietView ? "active" : ""} href={allHref}>Всички оферти</Link>
      </nav>

      <form className="promotion-filters">
        {dietView ? <input type="hidden" name="view" value="diet" /> : null}
        <input name="q" defaultValue={params.q ?? ""} placeholder="Търси продукт, марка или разфасовка" />
        <select name="store" defaultValue={selectedStore}>
          <option value="">Всички магазини</option>
          {stores.map((store) => <option key={store}>{store}</option>)}
        </select>
        <button type="submit">Търси</button>
      </form>

      <div className="promotion-brochures">
        {stores.map((store) => {
          const storeOffer = allOffers.find((offer) => offer.store === store);
          const href = retailerBrochureUrl(store, storeOffer?.url) || "/promotions";
          return <a key={store} href={href} target="_blank" rel="noreferrer">
            <b>{store}</b>
            <span>{storeCounts.get(store) ?? 0} оферти · Брошура ↗</span>
          </a>;
        })}
      </div>

      {offers.length ? <div className="promotion-grid">
        {offers.map((offer) => {
          const discount = offer.oldPrice ? Math.round((1 - offer.price / offer.oldPrice) * 100) : 0;
          return <article key={`${offer.store}-${offer.id}`}>
            <div className="promotion-image">
              {offer.imageUrl ? <Image src={offer.imageUrl} alt="" width={600} height={400} unoptimized /> : <span>€</span>}
              {discount > 0 ? <b>-{discount}%</b> : null}
            </div>
            <div className="promotion-copy">
              <span>{offer.store}</span>
              <h2>{offer.name}</h2>
              <div><strong>{money(offer.price)}</strong>{offer.oldPrice ? <del>{money(offer.oldPrice)}</del> : null}</div>
              <small>{offer.validFrom ? `От ${offer.validFrom} ` : ""}{offer.validUntil ? `до ${offer.validUntil}` : "Провери валидността"}</small>
              <a href={offer.url || retailerBrochureUrl(offer.store) || "/promotions"} target="_blank" rel="noreferrer">Провери офертата ↗</a>
            </div>
          </article>;
        })}
      </div> : <div className="promotion-empty">
        <strong>Няма намерени предложения</strong>
        <p>Провери официалните брошури или опитай с по-кратко име.</p>
      </div>}

      <p className="promotion-source">Цените се обновяват автоматично през SmartPazar и се показват информационно. Наличността и крайната цена се потвърждават от магазина.</p>
    </section>
  </main>;
}
