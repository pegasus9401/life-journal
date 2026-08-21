import type { SupabaseClient, User } from "@supabase/supabase-js";
import { zonedDateTimeToUtc } from "@/features/calendar/domain/date-utils";
import { userProducts } from "@/features/products/types";
import { lookupFoodProducts } from "@/lib/food-product-lookup";

type Context = { supabase: SupabaseClient; user: User };
type ToolDefinition = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };

const text = { type: "string" };
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const nullableId = { type: "string", description: "ID за редактиране; пропусни при нов запис" };

export const assistantToolDefinitions: ToolDefinition[] = [
  { type: "function", function: { name: "find_food_product", description: "Търси пакетиран хранителен продукт по име, марка или баркод в Open Food Facts. Използвай преди save_nutrition, когато потребителят не е дал калории и макроси. Ако резултатите са нееднозначни, покажи кратък избор и попитай.", parameters: { type: "object", properties: { query: { type: "string", description: "Име и марка, например: 7 Days кроасан какао" }, barcode: { type: "string", description: "Цифрите от баркода, ако са разчетени надеждно от снимка" } } } } },
  { type: "function", function: { name: "save_food_product", description: "Запазва потвърден продукт в личната продуктова база. Използвай само след като потребителят потвърди разпознатите стойности.", parameters: { type: "object", properties: { name: text, brand: text, barcode: text, package_size: text, serving_grams: { type: "number" }, calories_100g: { type: "number" }, protein_100g: { type: "number" }, carbs_100g: { type: "number" }, fat_100g: { type: "number" }, source: { type: "string", enum: ["Open Food Facts", "USDA", "AI от снимка", "Добавен ръчно"] } }, required: ["name", "calories_100g", "protein_100g", "carbs_100g", "fat_100g"] } } },
  { type: "function", function: { name: "get_day", description: "Преглежда всички данни за определен ден: календар, задачи, дневник, хранене и тренировки.", parameters: { type: "object", properties: { date }, required: ["date"] } } },
  { type: "function", function: { name: "save_event", description: "Създава или редактира календарно събитие. За ясна команда с час действай веднага; ако липсва краен час, използвай 60 минути продължителност.", parameters: { type: "object", properties: { id: nullableId, title: text, date, end_date: date, all_day: { type: "boolean" }, start_time: { type: "string" }, end_time: { type: "string" }, location: text, description: text }, required: ["title", "date", "end_date", "all_day"] } } },
  { type: "function", function: { name: "save_task", description: "Създава или редактира задача.", parameters: { type: "object", properties: { id: nullableId, title: text, due_date: date, due_time: { type: "string" }, description: text, priority: { type: "string", enum: ["low", "normal", "high"] }, completed: { type: "boolean" } }, required: ["title", "priority", "completed"] } } },
  { type: "function", function: { name: "save_journal", description: "Създава или редактира текстов запис в дневника.", parameters: { type: "object", properties: { id: nullableId, entry_date: date, title: text, story: text, mood: { type: "string", enum: ["joyful", "peaceful", "excited", "reflective", "tired", "challenging"] }, weather: text, location: text, tags: { type: "array", items: text }, favorite: { type: "boolean" }, status: { type: "string", enum: ["draft", "published"] } }, required: ["entry_date", "title", "story", "tags", "favorite", "status"] } } },
  { type: "function", function: { name: "save_nutrition", description: "Създава или редактира хранене.", parameters: { type: "object", properties: { id: nullableId, entry_date: date, meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] }, name: text, quantity: text, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" }, notes: text }, required: ["entry_date", "meal_type", "name", "calories", "protein", "carbs", "fat"] } } },
  { type: "function", function: { name: "save_workout", description: "Създава или редактира дневник на тренировка. Използвай за извършена или подробно описана тренировка; за планирана тренировка с час използвай save_event.", parameters: { type: "object", properties: { id: nullableId, workout_date: date, title: text, workout_type: { type: "string", enum: ["strength", "cardio", "mobility", "sport", "other"] }, duration_minutes: { type: "number" }, calories_burned: { type: "number" }, notes: text, completed: { type: "boolean" }, exercises: { type: "array", items: { type: "object", properties: { name: text, sets: { type: "number" }, reps: { type: "number" }, weight: { type: "number" } } } } }, required: ["workout_date", "title"] } } },
  { type: "function", function: { name: "delete_item", description: "Изтрива запис. Използвай САМО ако потребителят изрично е потвърдил изтриването в последното си съобщение.", parameters: { type: "object", properties: { kind: { type: "string", enum: ["event", "task", "journal", "nutrition", "workout"] }, id: { type: "string" } }, required: ["kind", "id"] } } },
];

function richText(story: string) {
  const paragraphs = story.split(/\n{2,}/).filter(Boolean);
  return { type: "doc", content: paragraphs.map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] })) };
}

export async function executeAssistantTool(name: string, args: Record<string, unknown>, context: Context) {
  const { supabase, user } = context;
  if (name === "find_food_product") {
    const query = String(args.query ?? "").trim().slice(0, 160);
    const barcode = String(args.barcode ?? "").replace(/\D/g, "").slice(0, 14);
    if (!query && !barcode) throw new Error("Липсва име или баркод на продукт.");
    const personalProducts = userProducts(user.user_metadata as Record<string, unknown>).filter((product) => barcode
      ? product.barcode === barcode
      : `${product.name} ${product.brand}`.toLocaleLowerCase("bg-BG").includes(query.toLocaleLowerCase("bg-BG"))).slice(0, 5);
    if (personalProducts.length) return { source: "Лична продуктова база", query, barcode, products: personalProducts.map((product) => ({
      barcode: product.barcode, name: product.name, brand: product.brand, package: product.packageSize, serving: `${product.servingGrams || 100} g`, serving_grams: product.servingGrams || 100,
      calories: Math.round(product.calories100g * (product.servingGrams || 100) / 100), protein: Math.round(product.protein100g * (product.servingGrams || 100)) / 100,
      carbs: Math.round(product.carbs100g * (product.servingGrams || 100)) / 100, fat: Math.round(product.fat100g * (product.servingGrams || 100)) / 100,
    })) };
    if (!barcode) {
      const generic = (await lookupFoodProducts(query, "")).filter((product) => product.source === "USDA").slice(0, 5);
      if (generic.length) return { source: "USDA", query, barcode, products: generic.map((product) => ({ barcode: "", name: product.name, brand: product.brand, package: product.packageSize, serving: "100 g", serving_grams: 100, calories: product.calories100g, protein: product.protein100g, carbs: product.carbs100g, fat: product.fat100g })) };
    }
    const fields = "code,product_name,brands,quantity,product_quantity,serving_size,serving_quantity,nutriments";
    const url = barcode ? new URL(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`) : new URL("https://world.openfoodfacts.org/cgi/search.pl");
    if (barcode) url.searchParams.set("fields", fields);
    else {
      url.searchParams.set("search_terms", query); url.searchParams.set("search_simple", "1"); url.searchParams.set("action", "process");
      url.searchParams.set("json", "1"); url.searchParams.set("page_size", "5"); url.searchParams.set("sort_by", "popularity_key"); url.searchParams.set("fields", fields);
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "LifeJournal/1.0 (https://github.com/pegasus9401/life-journal)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Продуктовата база не отговори (${response.status}).`);
    const payload = await response.json() as { product?: Record<string, unknown>; products?: Array<Record<string, unknown>> };
    const rawProducts = payload.product ? [payload.product] : (payload.products ?? []);
    const products = rawProducts.flatMap((product) => {
      const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
      const servingGrams = Number(product.serving_quantity) || Number(product.product_quantity) || 100;
      const factor = servingGrams / 100;
      const nutrient = (servingKey: string, hundredKey: string) => {
        const perServing = Number(nutriments[servingKey]);
        if (Number.isFinite(perServing)) return perServing;
        const perHundred = Number(nutriments[hundredKey]);
        return Number.isFinite(perHundred) ? perHundred * factor : 0;
      };
      const name = String(product.product_name ?? "").trim();
      if (!name) return [];
      return [{
        barcode: String(product.code ?? ""),
        name,
        brand: String(product.brands ?? ""),
        package: String(product.quantity ?? ""),
        serving: String(product.serving_size ?? `${servingGrams} g`),
        serving_grams: servingGrams,
        calories: Math.round(nutrient("energy-kcal_serving", "energy-kcal_100g")),
        protein: Math.round(nutrient("proteins_serving", "proteins_100g") * 10) / 10,
        carbs: Math.round(nutrient("carbohydrates_serving", "carbohydrates_100g") * 10) / 10,
        fat: Math.round(nutrient("fat_serving", "fat_100g") * 10) / 10,
      }];
    });
    return { source: "Open Food Facts", query, barcode, products };
  }

  if (name === "save_food_product") {
    const now = new Date().toISOString();
    const barcode = String(args.barcode ?? "").replace(/\D/g, "").slice(0, 14);
    const current = userProducts(user.user_metadata as Record<string, unknown>);
    const existing = barcode ? current.find((product) => product.barcode === barcode) : undefined;
    const product = {
      id: existing?.id ?? crypto.randomUUID(), name: String(args.name ?? "").trim().slice(0, 160), brand: String(args.brand ?? "").trim().slice(0, 120), barcode,
      packageSize: String(args.package_size ?? "").slice(0, 80), servingGrams: Math.max(0, Number(args.serving_grams) || 100), calories100g: Math.max(0, Number(args.calories_100g) || 0),
      protein100g: Math.max(0, Number(args.protein_100g) || 0), carbs100g: Math.max(0, Number(args.carbs_100g) || 0), fat100g: Math.max(0, Number(args.fat_100g) || 0),
      source: args.source === "Open Food Facts" || args.source === "USDA" || args.source === "AI от снимка" ? args.source : "Добавен ръчно" as const,
      imageUrl: existing?.imageUrl ?? "", imagePath: existing?.imagePath ?? "", favorite: existing?.favorite ?? false, createdAt: existing?.createdAt ?? now, updatedAt: now,
    };
    if (!product.name) throw new Error("Липсва име на продукта.");
    const next = [product, ...current.filter((item) => item.id !== product.id && (!barcode || item.barcode !== barcode))].slice(0, 500);
    const { error } = await supabase.auth.updateUser({ data: { food_products: next } });
    if (error) throw error;
    return { saved: true, product };
  }

  if (name === "get_day") {
    const selectedDate = String(args.date);
    const startIso = `${selectedDate}T00:00:00.000Z`; const endIso = `${selectedDate}T23:59:59.999Z`;
    const [events, tasks, journal, nutrition, workouts] = await Promise.all([
      supabase.from("calendar_events").select("id,title,description,start_date,end_date,starts_at,ends_at,all_day,location").or(`and(all_day.eq.true,start_date.lte.${selectedDate},end_date.gte.${selectedDate}),and(all_day.eq.false,starts_at.lte.${endIso},ends_at.gte.${startIso})`),
      supabase.from("tasks").select("id,title,description,due_date,due_time,priority,completed").eq("due_date", selectedDate),
      supabase.from("journal_entries").select("id,entry_date,title,content_text,mood,weather,location_name,tags,status").eq("entry_date", selectedDate),
      supabase.from("nutrition_entries").select("id,meal_type,name,quantity,calories,protein_g,carbs_g,fat_g,notes").eq("entry_date", selectedDate),
      supabase.from("workout_sessions").select("id,title,workout_type,duration_minutes,calories_burned,notes,exercises,completed").eq("workout_date", selectedDate),
    ]);
    return { date: selectedDate, events: events.data ?? [], tasks: tasks.data ?? [], journal: journal.data ?? [], nutrition: nutrition.data ?? [], workouts: workouts.data ?? [] };
  }

  if (name === "save_event") {
    const allDay = Boolean(args.all_day); const selectedDate = String(args.date); const endDate = String(args.end_date);
    const row = { owner_id: user.id, title: String(args.title).slice(0, 160), description: args.description ? String(args.description).slice(0, 5000) : null, all_day: allDay, timezone: "Europe/Sofia", location: args.location ? String(args.location).slice(0, 240) : null, category: "personal", color: "violet", recurrence_kind: "none", recurrence_interval: 1, recurrence_end: null, start_date: allDay ? selectedDate : null, end_date: allDay ? endDate : null, starts_at: allDay ? null : zonedDateTimeToUtc(selectedDate, String(args.start_time ?? "09:00"), "Europe/Sofia"), ends_at: allDay ? null : zonedDateTimeToUtc(endDate, String(args.end_time ?? "10:00"), "Europe/Sofia") };
    const query = args.id ? supabase.from("calendar_events").update(row).eq("id", String(args.id)).eq("owner_id", user.id) : supabase.from("calendar_events").insert(row);
    const { data, error } = await query.select("id,title").single(); if (error) throw error; return { saved: true, ...data };
  }

  if (name === "save_task") {
    const row = { owner_id: user.id, title: String(args.title).slice(0, 200), description: args.description ? String(args.description).slice(0, 5000) : null, due_date: args.due_date ? String(args.due_date) : null, due_time: args.due_time ? String(args.due_time) : null, timezone: "Europe/Sofia", priority: args.priority, category: null, completed: Boolean(args.completed), completed_at: args.completed ? new Date().toISOString() : null, recurrence_kind: "none", recurrence_interval: 1, recurrence_end: null };
    const query = args.id ? supabase.from("tasks").update(row).eq("id", String(args.id)).eq("owner_id", user.id) : supabase.from("tasks").insert(row);
    const { data, error } = await query.select("id,title").single(); if (error) throw error; return { saved: true, ...data };
  }

  if (name === "save_journal") {
    const story = String(args.story); const status = args.status === "published" ? "published" : "draft";
    const row = { owner_id: user.id, entry_date: args.entry_date, title: String(args.title).slice(0, 140), content: richText(story), content_text: story, mood: args.mood ?? null, weather: args.weather ? String(args.weather).slice(0, 80) : null, location_name: args.location ? String(args.location).slice(0, 160) : null, tags: Array.isArray(args.tags) ? args.tags.map(String).slice(0, 20) : [], is_favorite: Boolean(args.favorite), status, published_at: status === "published" ? new Date().toISOString() : null };
    const query = args.id ? supabase.from("journal_entries").update(row).eq("id", String(args.id)).eq("owner_id", user.id) : supabase.from("journal_entries").insert(row);
    const { data, error } = await query.select("id,title").single(); if (error) throw error; return { saved: true, ...data };
  }

  if (name === "save_nutrition") {
    const row = { owner_id: user.id, entry_date: args.entry_date, meal_type: args.meal_type, name: String(args.name).slice(0, 160), quantity: args.quantity ? String(args.quantity).slice(0, 80) : null, calories: Math.max(0, Number(args.calories)), protein_g: Math.max(0, Number(args.protein)), carbs_g: Math.max(0, Number(args.carbs)), fat_g: Math.max(0, Number(args.fat)), notes: args.notes ? String(args.notes).slice(0, 1000) : null };
    const query = args.id ? supabase.from("nutrition_entries").update(row).eq("id", String(args.id)).eq("owner_id", user.id) : supabase.from("nutrition_entries").insert(row);
    const { data, error } = await query.select("id,name").single(); if (error) throw error; return { saved: true, ...data };
  }

  if (name === "save_workout") {
    const row = { owner_id: user.id, workout_date: args.workout_date, title: String(args.title).slice(0, 160), workout_type: ["strength", "cardio", "mobility", "sport", "other"].includes(String(args.workout_type)) ? args.workout_type : "other", duration_minutes: Math.max(0, Number(args.duration_minutes) || 60), calories_burned: Math.max(0, Number(args.calories_burned) || 0), notes: args.notes ? String(args.notes).slice(0, 3000) : null, exercises: Array.isArray(args.exercises) ? args.exercises : [], completed: args.completed === undefined ? false : Boolean(args.completed) };
    const query = args.id ? supabase.from("workout_sessions").update(row).eq("id", String(args.id)).eq("owner_id", user.id) : supabase.from("workout_sessions").insert(row);
    const { data, error } = await query.select("id,title").single(); if (error) throw error; return { saved: true, ...data };
  }

  if (name === "delete_item") {
    const tables = { event: "calendar_events", task: "tasks", journal: "journal_entries", nutrition: "nutrition_entries", workout: "workout_sessions" } as const;
    const table = tables[args.kind as keyof typeof tables]; if (!table) throw new Error("Невалиден вид запис.");
    const { error } = await supabase.from(table).delete().eq("id", String(args.id)).eq("owner_id", user.id); if (error) throw error; return { deleted: true, kind: args.kind, id: args.id };
  }
  throw new Error("Непознат инструмент.");
}
