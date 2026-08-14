import type { SupabaseClient, User } from "@supabase/supabase-js";
import { zonedDateTimeToUtc } from "@/features/calendar/domain/date-utils";

type Context = { supabase: SupabaseClient; user: User };
type ToolDefinition = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };

const text = { type: "string" };
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const nullableId = { type: "string", description: "ID за редактиране; пропусни при нов запис" };

export const assistantToolDefinitions: ToolDefinition[] = [
  { type: "function", function: { name: "find_food_product", description: "Търси пакетиран хранителен продукт по име, марка или баркод в Open Food Facts. Използвай преди save_nutrition, когато потребителят не е дал калории и макроси. Ако резултатите са нееднозначни, покажи кратък избор и попитай.", parameters: { type: "object", properties: { query: { type: "string", description: "Име и марка, например: 7 Days кроасан какао" }, barcode: { type: "string", description: "Цифрите от баркода, ако са разчетени надеждно от снимка" } } } } },
  { type: "function", function: { name: "get_day", description: "Преглежда всички данни за определен ден: календар, задачи, дневник, хранене и тренировки.", parameters: { type: "object", properties: { date }, required: ["date"] } } },
  { type: "function", function: { name: "save_event", description: "Създава или редактира календарно събитие.", parameters: { type: "object", properties: { id: nullableId, title: text, date, end_date: date, all_day: { type: "boolean" }, start_time: { type: "string" }, end_time: { type: "string" }, location: text, description: text }, required: ["title", "date", "end_date", "all_day"] } } },
  { type: "function", function: { name: "save_task", description: "Създава или редактира задача.", parameters: { type: "object", properties: { id: nullableId, title: text, due_date: date, due_time: { type: "string" }, description: text, priority: { type: "string", enum: ["low", "normal", "high"] }, completed: { type: "boolean" } }, required: ["title", "priority", "completed"] } } },
  { type: "function", function: { name: "save_journal", description: "Създава или редактира текстов запис в дневника.", parameters: { type: "object", properties: { id: nullableId, entry_date: date, title: text, story: text, mood: { type: "string", enum: ["joyful", "peaceful", "excited", "reflective", "tired", "challenging"] }, weather: text, location: text, tags: { type: "array", items: text }, favorite: { type: "boolean" }, status: { type: "string", enum: ["draft", "published"] } }, required: ["entry_date", "title", "story", "tags", "favorite", "status"] } } },
  { type: "function", function: { name: "save_nutrition", description: "Създава или редактира хранене.", parameters: { type: "object", properties: { id: nullableId, entry_date: date, meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] }, name: text, quantity: text, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" }, notes: text }, required: ["entry_date", "meal_type", "name", "calories", "protein", "carbs", "fat"] } } },
  { type: "function", function: { name: "save_workout", description: "Създава или редактира тренировка и упражненията ѝ.", parameters: { type: "object", properties: { id: nullableId, workout_date: date, title: text, workout_type: { type: "string", enum: ["strength", "cardio", "mobility", "sport", "other"] }, duration_minutes: { type: "number" }, calories_burned: { type: "number" }, notes: text, completed: { type: "boolean" }, exercises: { type: "array", items: { type: "object", properties: { name: text, sets: { type: "number" }, reps: { type: "number" }, weight: { type: "number" } }, required: ["name", "sets", "reps", "weight"] } } }, required: ["workout_date", "title", "workout_type", "duration_minutes", "calories_burned", "completed", "exercises"] } } },
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
    const row = { owner_id: user.id, workout_date: args.workout_date, title: String(args.title).slice(0, 160), workout_type: args.workout_type, duration_minutes: Math.max(0, Number(args.duration_minutes)), calories_burned: Math.max(0, Number(args.calories_burned)), notes: args.notes ? String(args.notes).slice(0, 3000) : null, exercises: Array.isArray(args.exercises) ? args.exercises : [], completed: Boolean(args.completed) };
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
