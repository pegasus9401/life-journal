import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { ProductLibrary } from "@/features/products/components/product-library";
import { getFoodProducts } from "@/features/products/queries";
import { bestPromotions, getPromotions } from "@/lib/promotions";

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
  const promotions = Object.fromEntries(products.flatMap((product) => { const offer = bestPromotions(`${product.brand} ${product.name}`, offers, 1)[0] ?? bestPromotions(product.name, offers, 1)[0]; return offer ? [[product.id, offer]] : []; }));
  return <main className="life-app-shell p2-shell"><AppNavigation active="products" /><ProductLibrary initialProducts={withImages} initialPromotions={promotions} /></main>;
}

