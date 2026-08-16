import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { createClient } from "@/lib/supabase/server";
import { getMenuLibrary, orderedMealEntries, type MealMenuSettings, type MenuLibrary } from "@/features/nutrition/menu-library";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { userProducts, type FoodProduct } from "@/features/products/types";

type ShoppingItem = { name: string; amount: number | null; unit: string | null; count: number; estimatedPrice?: number; pricedFrom?: string };
const normalize = (value: string) => value.trim().toLocaleLowerCase("bg-BG").replace(/\s+/g, " ");
function parseFood(raw: string) {
  const text = raw.trim();
  const match = text.match(/^(.*?)\s*-\s*(\d+(?:[.,]\d+)?)\s*(г|гр|kg|кг|мл|ml|л|бр|доза|дози|порция|порции|пакет|пакета|ч\\.л\\.|с\\.л\\.|чаша|чаши|резен|резена|филия|филии|консерва|консерви|бутилка|бутилки|кутия|кутии|шепа|шепи|мерителна лъжица)\.?$/i);
  if (!match) return { name: text, amount: null, unit: null };
  let amount = Number(match[2].replace(",", ".")); let unit = match[3].toLowerCase();
  if (unit === "гр") unit = "г"; if (unit === "kg") unit = "кг"; if (unit === "ml") unit = "мл";
  if (unit === "кг") { amount *= 1000; unit = "г"; }
  if (unit === "л") { amount *= 1000; unit = "мл"; }
  if (unit === "дози") unit = "доза"; if (unit === "порции") unit = "порция"; if (unit === "пакета") unit = "пакет"; if (unit === "чаши") unit = "чаша"; if (unit === "резена") unit = "резен"; if (unit === "филии") unit = "филия"; if (unit === "консерви") unit = "консерва"; if (unit === "бутилки") unit = "бутилка"; if (unit === "кутии") unit = "кутия"; if (unit === "шепи") unit = "шепа";
  return { name: match[1].trim(), amount, unit };
}
function collect(plans: { menu_name: string; selections: Record<string, number> }[], menus: MenuLibrary) {
  const items = new Map<string, ShoppingItem>();
  for (const plan of plans) {
    const menu = menus[plan.menu_name]; if (!menu) continue;
    for (const [meal, options] of orderedMealEntries(menu)) {
      const option = options[plan.selections?.[meal] ?? 0]; if (!option) continue;
      for (const raw of option.split(" + ")) {
        const food = parseFood(raw); const key = `${normalize(food.name)}|${food.unit ?? ""}`; const existing = items.get(key);
        if (existing) { existing.count += 1; if (existing.amount !== null && food.amount !== null) existing.amount += food.amount; else existing.amount = null; }
        else items.set(key, { ...food, count: 1 });
      }
    }
  }
  return [...items.values()].sort((a,b)=>a.name.localeCompare(b.name,"bg"));
}
function amountLabel(item: ShoppingItem) { if (item.amount !== null && item.unit) return `${Number(item.amount.toFixed(2))} ${item.unit}`; return item.count > 1 ? `× ${item.count}` : ""; }
function packageAmount(value: string) {
  const match=value.toLocaleLowerCase("bg-BG").match(/(\d+(?:[.,]\d+)?)\s*(кг|kg|г|гр|ml|мл|л|бр)/); if(!match)return null;
  let amount=Number(match[1].replace(",",".")); let unit=match[2];
  if(unit==="кг"||unit==="kg"){amount*=1000;unit="г"} if(unit==="л"){amount*=1000;unit="мл"} if(unit==="гр")unit="г"; if(unit==="ml")unit="мл";
  return {amount,unit};
}
function addPriceEstimates(items:ShoppingItem[],products:FoodProduct[]){
  return items.map(item=>{
    const itemName=normalize(item.name); const matches=products.filter(product=>product.priceHistory[0]&&(normalize(product.name)===itemName||normalize(product.name).includes(itemName)||itemName.includes(normalize(product.name))));
    const product=matches.sort((a,b)=>Math.abs(normalize(a.name).length-itemName.length)-Math.abs(normalize(b.name).length-itemName.length))[0]; const price=product?.priceHistory[0]; if(!product||!price)return item;
    const pack=packageAmount(product.packageSize); let packages=item.count;
    if(item.amount!==null&&item.unit&&pack&&pack.unit===item.unit)packages=Math.max(1,Math.ceil(item.amount/pack.amount));
    return {...item,estimatedPrice:packages*price.price,pricedFrom:product.name};
  });
}
const money=(value:number)=>new Intl.NumberFormat("bg-BG",{style:"currency",currency:"BGN"}).format(value);
export default async function ShoppingListPage() {
  const today=localDateKey();
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:plans}=await supabase.from("daily_meal_plans").select("plan_date,menu_name,selections").gte("plan_date",today).order("plan_date"); const menus=getMenuLibrary(user.user_metadata as MealMenuSettings); const items=addPriceEstimates(collect((plans??[]) as {menu_name:string;selections:Record<string,number>}[],menus),userProducts(user.user_metadata as Record<string,unknown>)); const estimatedTotal=items.reduce((sum,item)=>sum+(item.estimatedPrice??0),0);
  return <main className="life-app-shell"><AppNavigation /><section className="shopping-page"><p className="life-kicker">От днес нататък</p><h1>Пазарски списък</h1><p className="shopping-range">Всички отбелязани хранения от {today}, независимо от седмицата.</p><div className="shopping-summary"><strong>{plans?.length ?? 0}</strong><span>планирани дни</span><strong>{items.length}</strong><span>различни продукта</span>{estimatedTotal>0?<><strong>{money(estimatedTotal)}</strong><span>ориентировъчно</span></>:null}</div><div className="shopping-list">{items.length ? items.map(item=><label key={`${item.name}-${item.unit ?? ""}`}><input type="checkbox"/><span>{item.name}{item.estimatedPrice?<small>Около {money(item.estimatedPrice)} по цена на {item.pricedFrom}</small>:null}</span><b>{amountLabel(item)}</b></label>) : <p>Първо избери меню и варианти за днешна или бъдеща дата в календара.</p>}</div></section></main>;
}
