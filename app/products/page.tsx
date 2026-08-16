import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { ProductLibrary } from "@/features/products/components/product-library";
import { userProducts } from "@/features/products/types";
import { createClient } from "@/lib/supabase/server";
import { bestPromotions, getPromotions } from "@/lib/promotions";

export const metadata = { title: "Продукти · Дневник на живота" };

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const products = userProducts(user.user_metadata as Record<string, unknown>);
  const offersPromise = getPromotions();
  const withImagesPromise = Promise.all(products.map(async (product) => {
    if (!product.imagePath) return product;
    const { data } = await supabase.storage.from("journal-photos").createSignedUrl(product.imagePath, 60 * 60);
    return data?.signedUrl ? { ...product, imageUrl: data.signedUrl } : product;
  }));
  const [withImages, offers] = await Promise.all([withImagesPromise, offersPromise]);
  const promotions = Object.fromEntries(products.flatMap((product) => { const offer = bestPromotions(`${product.brand} ${product.name}`, offers, 1)[0] ?? bestPromotions(product.name, offers, 1)[0]; return offer ? [[product.id, offer]] : []; }));
  return <main className="life-app-shell"><AppNavigation active="products" /><ProductLibrary initialProducts={withImages} initialPromotions={promotions} /></main>;
}
