import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { ProductLibrary } from "@/features/products/components/product-library";
import { getFoodProducts } from "@/features/products/queries";
import { bestPromotionsByStore, getPromotions, promotionStoreNames } from "@/lib/promotions";

export const metadata = { title: "Продукти · PEGASOS" };

export default async function ProductsPage() {
  const data = await getFoodProducts();
  if (!data) redirect("/login");
  const { supabase, products } = data;
  const offersPromise = getPromotions();
  const withImagesPromise = Promise.all(products.map(async (product) => {
    if (!product.imagePath) return product;
    const { data: signed } = await supabase.storage.from("journal-photos").createSignedUrl(product.imagePath, 60 * 60);
    return signed?.signedUrl ? { ...product, imageUrl: signed.signedUrl } : product;
  }));
  const [withImages, offers] = await Promise.all([withImagesPromise, offersPromise]);
  const promotions = Object.fromEntries(products.flatMap((product) => {
    const branded = bestPromotionsByStore(`${product.brand} ${product.name}`, offers);
    const matches = branded.length ? branded : bestPromotionsByStore(product.name, offers);
    return matches.length ? [[product.id, matches]] : [];
  }));
  const promotionCounts = offers.reduce<Map<string, number>>((counts, offer) => {
    counts.set(offer.store, (counts.get(offer.store) ?? 0) + 1);
    return counts;
  }, new Map());
  const promotionSummary = promotionStoreNames(offers).map((store) => ({ store, count: promotionCounts.get(store) ?? 0 }));
  return <main className="life-app-shell p2-shell"><AppNavigation active="products" /><ProductLibrary initialProducts={withImages} initialPromotions={promotions} promotionSummary={promotionSummary} /></main>;
}

