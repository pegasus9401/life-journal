import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { createClient } from "@/lib/supabase/server";
import { mealMenus, type MenuName } from "@/features/nutrition/meal-data";
import { addDays, localDateKey, startOfWeek } from "@/features/calendar/domain/date-utils";

function collect(plans: { menu_name: string; selections: Record<string, number> }[]) {
  const counts = new Map<string, number>();
  for (const plan of plans) { const menu = mealMenus[plan.menu_name as MenuName]; if (!menu) continue; for (const [meal, options] of Object.entries(menu)) { const option = options[plan.selections?.[meal] ?? 0]; if (!option) continue; for (const food of option.split(" + ")) { const key = food.trim(); counts.set(key,(counts.get(key) ?? 0)+1); } } }
  return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],"bg"));
}
export default async function ShoppingListPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params=await searchParams; const selected=/^\d{4}-\d{2}-\d{2}$/.test(params.date??"")?params.date!:localDateKey(); const start=startOfWeek(selected); const end=addDays(start,6);
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:plans}=await supabase.from("daily_meal_plans").select("plan_date,menu_name,selections").gte("plan_date",start).lte("plan_date",end).order("plan_date"); const items=collect((plans??[]) as {menu_name:string;selections:Record<string,number>}[]);
  return <main className="life-app-shell"><AppNavigation /><section className="shopping-page"><p className="life-kicker">Седмично планиране</p><h1>Пазарски списък</h1><p>{start} - {end}</p><div className="shopping-summary"><strong>{plans?.length ?? 0}</strong><span>планирани дни</span><strong>{items.length}</strong><span>продукта</span></div><div className="shopping-list">{items.length ? items.map(([food,count])=><label key={food}><input type="checkbox"/><span>{food}</span>{count>1?<b>× {count}</b>:null}</label>) : <p>Първо избери меню и варианти за дните от календара.</p>}</div></section></main>;
}
