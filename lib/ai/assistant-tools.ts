import type { SupabaseClient, User } from "@supabase/supabase-js";
import { zonedDateTimeToUtc } from "@/features/calendar/domain/date-utils";
import { userProducts } from "@/features/products/types";
import { lookupFoodProducts } from "@/lib/food-product-lookup";
import { fitnessSummary, strengthProgression } from "@/features/workouts/domain/fitness-analytics";
import { validateMacroEnergy } from "@/features/profile/nutrition-goals";
import type { WorkoutSession } from "@/features/workouts/types";

type Context = { supabase: SupabaseClient; user: User };
type ToolDefinition = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };

const text = { type: "string" };
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const nullableId = { type: "string", description: "ID за редактиране; пропусни при нов запис" };
const mealNames = { breakfast: "Закуска", lunch: "Обяд", dinner: "Вечеря", snack: "Междинно" } as const;
const mealTimes = { breakfast: "08:00", lunch: "13:00", dinner: "19:00", snack: "16:00" } as const;

export const assistantToolDefinitions: ToolDefinition[] = [
  { type: "function", function: { name: "find_food_product", description: "Търси пакетиран хранителен продукт по име, марка или баркод в Open Food Facts. Използвай преди save_nutrition, когато потребителят не е дал калории и макроси. Ако резултатите са нееднозначни, покажи кратък избор и попитай.", parameters: { type: "object", properties: { query: { type: "string", description: "Име и марка, например: 7 Days кроасан какао" }, barcode: { type: "string", description: "Цифрите от баркода, ако са разчетени надеждно от снимка" } } } } },
  { type: "function", function: { name: "save_food_product", description: "Запазва потвърден продукт в личната продуктова база. Използвай само след като потребителят потвърди разпознатите стойности.", parameters: { type: "object", properties: { name: text, brand: text, barcode: text, package_size: text, serving_grams: { type: "number" }, calories_100g: { type: "number" }, protein_100g: { type: "number" }, carbs_100g: { type: "number" }, fat_100g: { type: "number" }, source: { type: "string", enum: ["Open Food Facts", "USDA", "AI от снимка", "Добавен ръчно"] } }, required: ["name", "calories_100g", "protein_100g", "carbs_100g", "fat_100g"] } } },
  { type: "function", function: { name: "get_day", description: "Преглежда всички данни за определен ден: календар, задачи, дневник, хранене и тренировки.", parameters: { type: "object", properties: { date }, required: ["date"] } } },
  { type: "function", function: { name: "get_events", description: "Връща календарните събития за дата.", parameters: { type: "object", properties: { date }, required: ["date"] } } },
  { type: "function", function: { name: "get_tasks", description: "Връща задачите за дата, включително завършените.", parameters: { type: "object", properties: { date }, required: ["date"] } } },
  { type: "function", function: { name: "complete_task", description: "Маркира конкретна задача като завършена.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "get_today_nutrition", description: "Връща записите и общите макроси за днешното хранене.", parameters: { type: "object", properties: { date }, required: ["date"] } } },
  { type: "function", function: { name: "get_workout_plan", description: "Връща текущите тренировъчни програми на потребителя.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_workout_history", description: "Връща последните завършени тренировки.", parameters: { type: "object", properties: { limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_fitness_progress", description: "Изчислява реалния Fitness прогрес, тренировъчен обем, cardio минути, мускулен баланс и прогрес по упражнения за избран период.", parameters: { type: "object", properties: { days: { type: "number", description: "Период в дни, между 7 и 365" } } } } },
  { type: "function", function: { name: "reschedule_workout", description: "Премества съществуваща планирана тренировка. Използва същия workout запис, без да създава копие.", parameters: { type: "object", properties: { id: { type: "string" }, workout_date: date, start_time: { type: "string" } }, required: ["id", "workout_date"] } } },
  { type: "function", function: { name: "get_health_profile", description: "Връща личния профил, дългосрочната цел, дневните цели и здравния check-in за избрана дата. Използвай за персонален анализ и преди промяна на профил или цели.", parameters: { type: "object", properties: { date }, required: ["date"] } } },
  { type: "function", function: { name: "save_wellness", description: "Записва или обновява здравния check-in за дата. Използвай само стойности, които потребителят е дал или изрично е потвърдил. Не отгатвай здравни данни.", parameters: { type: "object", properties: { date, sleep_hours: { type: "number", minimum: 0, maximum: 24 }, sleep_quality: { type: "number", minimum: 1, maximum: 5 }, energy: { type: "number", minimum: 1, maximum: 5 }, soreness: { type: "number", minimum: 1, maximum: 5 }, stress: { type: "number", minimum: 1, maximum: 5 }, resting_heart_rate: { type: "number", minimum: 25, maximum: 220 }, notes: text }, required: ["date", "sleep_hours", "sleep_quality", "energy", "soreness", "stress"] } } },
  { type: "function", function: { name: "update_profile", description: "Обновява само изрично поисканите лични параметри. Никога не сменяй име, тегло, активност или основна цел по собствена инициатива. Преди действие трябва да има ясна команда от потребителя.", parameters: { type: "object", properties: { display_name: text, birth_date: date, sex: { type: "string", enum: ["female", "male", "other", "prefer_not_to_say"] }, height_cm: { type: "number", minimum: 50, maximum: 300 }, current_weight_kg: { type: "number", minimum: 20, maximum: 500 }, target_weight_kg: { type: "number", minimum: 20, maximum: 500 }, activity_level: { type: "string", enum: ["sedentary", "light", "moderate", "active", "very_active"] }, fitness_goal: { type: "string", enum: ["lose_weight", "maintain", "gain_muscle", "improve_fitness"] } } } } },
  { type: "function", function: { name: "update_daily_goals", description: "Обновява дневните цели след ясна команда. За калории и макроси подай и четирите взаимно съгласувани стойности. Не променяй цели само защото Pegas препоръчва нещо.", parameters: { type: "object", properties: { calorie_goal: { type: "number", minimum: 1, maximum: 100000 }, protein_goal_g: { type: "number", minimum: 0 }, carbs_goal_g: { type: "number", minimum: 0 }, fat_goal_g: { type: "number", minimum: 0 }, water_goal_ml: { type: "number", minimum: 0, maximum: 20000 }, steps_goal: { type: "number", minimum: 0, maximum: 200000 } }, required: ["calorie_goal", "protein_goal_g", "carbs_goal_g", "fat_goal_g"] } } },
  { type: "function", function: { name: "set_persona", description: "Сменя стила на Pegas само когато потребителят изрично поиска това.", parameters: { type: "object", properties: { persona: { type: "string", enum: ["friend", "guardian", "data_nerd", "commander"] } }, required: ["persona"] } } },
  { type: "function", function: { name: "save_event", description: "Създава или редактира календарно събитие. За ясна команда с час действай веднага; ако липсва краен час, използвай 60 минути продължителност.", parameters: { type: "object", properties: { id: nullableId, title: text, date, end_date: date, all_day: { type: "boolean" }, start_time: { type: "string" }, end_time: { type: "string" }, location: text, description: text }, required: ["title", "date", "end_date", "all_day"] } } },
  { type: "function", function: { name: "save_task", description: "Създава или редактира задача.", parameters: { type: "object", properties: { id: nullableId, title: text, due_date: date, due_time: { type: "string" }, description: text, priority: { type: "string", enum: ["low", "normal", "high"] }, completed: { type: "boolean" } }, required: ["title", "priority", "completed"] } } },
  { type: "function", function: { name: "save_journal", description: "Създава или редактира текстов запис в дневника.", parameters: { type: "object", properties: { id: nullableId, entry_date: date, title: text, story: text, mood: { type: "string", enum: ["joyful", "peaceful", "excited", "reflective", "tired", "challenging"] }, weather: text, location: text, tags: { type: "array", items: text }, favorite: { type: "boolean" }, status: { type: "string", enum: ["draft", "published"] } }, required: ["entry_date", "title", "story", "tags", "favorite", "status"] } } },
  { type: "function", function: { name: "save_nutrition", description: "Създава или редактира хранене в хранителния план. За меню, план или бъдещо хранене остави completed=false. Използвай completed=true само ако потребителят изрично казва, че вече го е изял.", parameters: { type: "object", properties: { id: nullableId, entry_date: date, meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] }, planned_time: { type: "string", description: "Час HH:MM; ако липсва, използва стандартен час според храненето" }, name: text, quantity: text, calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" }, notes: text, completed: { type: "boolean", description: "По подразбиране false; true само за вече консумирана храна" } }, required: ["entry_date", "meal_type", "name", "calories", "protein", "carbs", "fat"] } } },
  { type: "function", function: { name: "save_workout", description: "Създава или редактира дневник на тренировка. Използвай за извършена или подробно описана тренировка; за планирана тренировка с час използвай save_event.", parameters: { type: "object", properties: { id: nullableId, workout_date: date, title: text, workout_type: { type: "string", enum: ["strength", "cardio", "mobility", "sport", "other"] }, duration_minutes: { type: "number" }, calories_burned: { type: "number" }, notes: text, completed: { type: "boolean" }, exercises: { type: "array", items: { type: "object", properties: { name: text, sets: { type: "number" }, reps: { type: "number" }, weight: { type: "number" } } } } }, required: ["workout_date", "title"] } } },
  { type: "function", function: { name: "delete_item", description: "Изтрива запис. Използвай САМО ако потребителят изрично е потвърдил изтриването в последното си съобщение.", parameters: { type: "object", properties: { kind: { type: "string", enum: ["event", "task", "journal", "nutrition", "workout"] }, id: { type: "string" } }, required: ["kind", "id"] } } },
];

function richText(story: string) {
  const paragraphs = story.split(/\n{2,}/).filter(Boolean);
  return { type: "doc", content: paragraphs.map((paragraph) => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] })) };
}

function boundedNumber(value: unknown, minimum: number, maximum: number, label: string, integer = false) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`Невалидна стойност за ${label}.`);
  return integer ? Math.round(parsed) : parsed;
}

function hasArgument(args: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(args, key) && args[key] !== undefined && args[key] !== null && args[key] !== "";
}

export async function getNutritionForDate(supabase: SupabaseClient, ownerId: string, selectedDate: string) {
  const { data: meals, error } = await supabase.from("day_meals").select("id,name,planned_time,legacy_payload").eq("owner_id", ownerId).eq("meal_date", selectedDate).order("position");
  if (error) throw error;
  const ids = (meals ?? []).map((meal) => meal.id);
  const { data: items, error: itemsError } = ids.length ? await supabase.from("meal_items").select("day_meal_id,label,calories,protein_g,carbs_g,fat_g").eq("owner_id", ownerId).in("day_meal_id", ids) : { data: [], error: null };
  if (itemsError) throw itemsError;
  return (meals ?? []).map((meal) => {
    const payload = meal.legacy_payload && typeof meal.legacy_payload === "object" ? meal.legacy_payload as Record<string, unknown> : {};
    const legacy = payload.nutrition && typeof payload.nutrition === "object" ? payload.nutrition as Record<string, unknown> : null;
    const mealItems = (items ?? []).filter((item) => item.day_meal_id === meal.id);
    const totals = legacy ? { calories: Number(legacy.calories) || 0, protein: Number(legacy.protein) || 0, carbs: Number(legacy.carbs) || 0, fat: Number(legacy.fat) || 0 } : mealItems.reduce((sum, item) => ({ calories: sum.calories + Number(item.calories), protein: sum.protein + Number(item.protein_g), carbs: sum.carbs + Number(item.carbs_g), fat: sum.fat + Number(item.fat_g) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return { id: meal.id, name: meal.name, planned_time: meal.planned_time?.slice(0, 5) ?? null, description: typeof payload.description === "string" ? payload.description : mealItems.map((item) => item.label).join(" · "), completed: typeof payload.completed_at === "string" || (!meal.planned_time && payload.source !== "assistant"), ...totals };
  });
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
    const matches = (await lookupFoodProducts(query, barcode)).slice(0, 5);
    return {
      source: matches[0]?.source ?? "Няма намерен продукт",
      query,
      barcode,
      products: matches.map((product) => {
        const servingGrams = product.servingGrams || 100;
        const factor = servingGrams / 100;
        return {
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          package: product.packageSize,
          serving: `${servingGrams} g`,
          serving_grams: servingGrams,
          calories: Math.round(product.calories100g * factor),
          protein: Math.round(product.protein100g * factor * 10) / 10,
          carbs: Math.round(product.carbs100g * factor * 10) / 10,
          fat: Math.round(product.fat100g * factor * 10) / 10,
        };
      }),
    };
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
      supabase.from("calendar_events").select("id,title,description,start_date,end_date,starts_at,ends_at,all_day,location").eq("owner_id", user.id).or(`and(all_day.eq.true,start_date.lte.${selectedDate},end_date.gte.${selectedDate}),and(all_day.eq.false,starts_at.lte.${endIso},ends_at.gte.${startIso})`),
      supabase.from("tasks").select("id,title,description,due_date,due_time,priority,completed").eq("owner_id", user.id).eq("due_date", selectedDate),
      supabase.from("journal_entries").select("id,entry_date,title,content_text,mood,weather,location_name,tags,status").eq("owner_id", user.id).eq("entry_date", selectedDate),
      getNutritionForDate(supabase, user.id, selectedDate),
      supabase.from("workout_sessions").select("id,title,workout_type,duration_minutes,calories_burned,notes,exercises,completed").eq("owner_id", user.id).eq("workout_date", selectedDate),
    ]);
    return { date: selectedDate, events: events.data ?? [], tasks: tasks.data ?? [], journal: journal.data ?? [], nutrition, workouts: workouts.data ?? [] };
  }

  if (name === "get_health_profile") {
    const selectedDate = String(args.date);
    const [profile, goals, wellness] = await Promise.all([
      supabase.from("profiles").select("display_name,birth_date,sex,height_cm,current_weight_kg,starting_weight_kg,target_weight_kg,activity_level,fitness_goal,timezone").eq("owner_id", user.id).maybeSingle(),
      supabase.from("user_goals").select("calorie_goal,protein_goal_g,carbs_goal_g,fat_goal_g,water_goal_ml,steps_goal,source").eq("owner_id", user.id).maybeSingle(),
      supabase.from("daily_wellness").select("entry_date,sleep_hours,sleep_quality,energy,soreness,stress,resting_heart_rate,notes").eq("owner_id", user.id).eq("entry_date", selectedDate).maybeSingle(),
    ]);
    if (profile.error) throw profile.error;
    if (goals.error) throw goals.error;
    if (wellness.error) throw wellness.error;
    return { date: selectedDate, profile: profile.data, goals: goals.data, wellness: wellness.data };
  }

  if (name === "get_events") {
    const selectedDate = String(args.date); const startIso = `${selectedDate}T00:00:00.000Z`; const endIso = `${selectedDate}T23:59:59.999Z`;
    const { data, error } = await supabase.from("calendar_events").select("id,title,description,start_date,end_date,starts_at,ends_at,all_day,location").eq("owner_id", user.id).or(`and(all_day.eq.true,start_date.lte.${selectedDate},end_date.gte.${selectedDate}),and(all_day.eq.false,starts_at.lte.${endIso},ends_at.gte.${startIso})`).limit(40); if (error) throw error; return data ?? [];
  }
  if (name === "get_tasks") { const { data, error } = await supabase.from("tasks").select("id,title,description,due_date,due_time,priority,completed").eq("owner_id", user.id).eq("due_date", String(args.date)).limit(60); if (error) throw error; return data ?? []; }
  if (name === "complete_task") { const { data, error } = await supabase.from("tasks").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", String(args.id)).eq("owner_id", user.id).select("id,title").single(); if (error) throw error; return { saved: true, completed: true, ...data }; }
  if (name === "get_today_nutrition") { const entries = await getNutritionForDate(supabase, user.id, String(args.date)); const sumEntries = (rows: typeof entries) => rows.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 }); const consumedTotals = sumEntries(entries.filter((item) => item.completed)); const plannedTotals = sumEntries(entries); return { entries, totals: consumedTotals, consumedTotals, plannedTotals }; }
  if (name === "get_workout_plan") { return { plans: (user.user_metadata as Record<string, unknown> | undefined)?.workout_templates ?? [] }; }
  if (name === "get_workout_history") { const limit = Math.min(30, Math.max(1, Number(args.limit) || 10)); const { data, error } = await supabase.from("workout_sessions").select("id,workout_date,title,workout_type,duration_minutes,calories_burned,exercises").eq("owner_id", user.id).eq("completed", true).order("workout_date", { ascending: false }).limit(limit); if (error) throw error; return data ?? []; }
  if (name === "get_fitness_progress") {
    const days = Math.min(365, Math.max(7, Number(args.days) || 30));
    const end = new Date(); const start = new Date(); start.setDate(start.getDate() - days + 1);
    const { data, error } = await supabase.from("workout_sessions").select("*").eq("owner_id", user.id).gte("workout_date", start.toISOString().slice(0, 10)).lte("workout_date", end.toISOString().slice(0, 10)).order("workout_date");
    if (error) throw error;
    const sessions = (data ?? []) as WorkoutSession[];
    return { period_days: days, summary: fitnessSummary(sessions), strength_progression: strengthProgression(sessions).slice(0, 12) };
  }
  if (name === "reschedule_workout") {
    const workoutDate = String(args.workout_date); const startTime = String(args.start_time ?? "").trim();
    const scheduledAt = startTime ? zonedDateTimeToUtc(workoutDate, startTime, "Europe/Sofia") : null;
    const { data, error } = await supabase.from("workout_sessions").update({ workout_date: workoutDate, scheduled_at: scheduledAt, status: "planned", completed: false, completed_at: null, skipped_at: null }).eq("id", String(args.id)).eq("owner_id", user.id).select("id,title,workout_date,scheduled_at,status").single();
    if (error) throw error; return { saved: true, ...data };
  }

  if (name === "save_wellness") {
    const selectedDate = String(args.date);
    const { data: current, error: currentError } = await supabase.from("daily_wellness").select("resting_heart_rate,notes").eq("owner_id", user.id).eq("entry_date", selectedDate).maybeSingle();
    if (currentError) throw currentError;
    const row = {
      owner_id: user.id,
      entry_date: selectedDate,
      sleep_hours: boundedNumber(args.sleep_hours, 0, 24, "часове сън"),
      sleep_quality: boundedNumber(args.sleep_quality, 1, 5, "качество на съня", true),
      energy: boundedNumber(args.energy, 1, 5, "енергия", true),
      soreness: boundedNumber(args.soreness, 1, 5, "мускулна умора", true),
      stress: boundedNumber(args.stress, 1, 5, "стрес", true),
      resting_heart_rate: hasArgument(args, "resting_heart_rate") ? boundedNumber(args.resting_heart_rate, 25, 220, "пулс в покой", true) : current?.resting_heart_rate ?? null,
      notes: hasArgument(args, "notes") ? String(args.notes).trim().slice(0, 500) || null : current?.notes ?? null,
    };
    const { data, error } = await supabase.from("daily_wellness").upsert(row, { onConflict: "owner_id,entry_date" }).select("entry_date,sleep_hours,sleep_quality,energy,soreness,stress,resting_heart_rate,notes").single();
    if (error) throw error;
    return { saved: true, wellness: data };
  }

  if (name === "update_profile") {
    const row: Record<string, unknown> = { owner_id: user.id };
    if (hasArgument(args, "display_name")) row.display_name = String(args.display_name).trim().slice(0, 100);
    if (hasArgument(args, "birth_date")) {
      const value = String(args.birth_date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Невалидна рождена дата.");
      row.birth_date = value;
    }
    if (hasArgument(args, "sex")) {
      const value = String(args.sex);
      if (!["female", "male", "other", "prefer_not_to_say"].includes(value)) throw new Error("Невалидна стойност за пол.");
      row.sex = value;
    }
    if (hasArgument(args, "height_cm")) row.height_cm = boundedNumber(args.height_cm, 50, 300, "ръст");
    if (hasArgument(args, "current_weight_kg")) row.current_weight_kg = boundedNumber(args.current_weight_kg, 20, 500, "текущо тегло");
    if (hasArgument(args, "target_weight_kg")) row.target_weight_kg = boundedNumber(args.target_weight_kg, 20, 500, "целево тегло");
    if (hasArgument(args, "activity_level")) {
      const value = String(args.activity_level);
      if (!["sedentary", "light", "moderate", "active", "very_active"].includes(value)) throw new Error("Невалидно ниво на активност.");
      row.activity_level = value;
    }
    if (hasArgument(args, "fitness_goal")) {
      const value = String(args.fitness_goal);
      if (!["lose_weight", "maintain", "gain_muscle", "improve_fitness"].includes(value)) throw new Error("Невалидна основна цел.");
      row.fitness_goal = value;
    }
    if (Object.keys(row).length === 1) throw new Error("Не е посочена промяна в профила.");
    const { data, error } = await supabase.from("profiles").upsert(row, { onConflict: "owner_id" }).select("display_name,birth_date,sex,height_cm,current_weight_kg,target_weight_kg,activity_level,fitness_goal").single();
    if (error) throw error;
    return { saved: true, profile: data };
  }

  if (name === "update_daily_goals") {
    const calorieGoal = boundedNumber(args.calorie_goal, 1, 100000, "калорийна цел", true);
    const proteinGoal = boundedNumber(args.protein_goal_g, 0, 100000, "протеин");
    const carbsGoal = boundedNumber(args.carbs_goal_g, 0, 100000, "въглехидрати");
    const fatGoal = boundedNumber(args.fat_goal_g, 0, 100000, "мазнини");
    const macroError = validateMacroEnergy(calorieGoal, proteinGoal, carbsGoal, fatGoal);
    if (macroError) throw new Error(macroError);
    const { data: current, error: currentError } = await supabase.from("user_goals").select("water_goal_ml,steps_goal").eq("owner_id", user.id).maybeSingle();
    if (currentError) throw currentError;
    const row = {
      owner_id: user.id,
      calorie_goal: calorieGoal,
      protein_goal_g: proteinGoal,
      carbs_goal_g: carbsGoal,
      fat_goal_g: fatGoal,
      water_goal_ml: hasArgument(args, "water_goal_ml") ? boundedNumber(args.water_goal_ml, 0, 20000, "вода", true) : current?.water_goal_ml ?? 2000,
      steps_goal: hasArgument(args, "steps_goal") ? boundedNumber(args.steps_goal, 0, 200000, "стъпки", true) : current?.steps_goal ?? 8000,
      source: "manual",
    };
    const { data, error } = await supabase.from("user_goals").upsert(row, { onConflict: "owner_id" }).select("calorie_goal,protein_goal_g,carbs_goal_g,fat_goal_g,water_goal_ml,steps_goal,source").single();
    if (error) throw error;
    return { saved: true, goals: data };
  }

  if (name === "set_persona") {
    const persona = String(args.persona);
    if (!["friend", "guardian", "data_nerd", "commander"].includes(persona)) throw new Error("Невалиден стил на Pegas.");
    const { data, error } = await supabase.from("ai_preferences").upsert({ owner_id: user.id, persona }, { onConflict: "owner_id" }).select("persona").single();
    if (error) throw error;
    return { saved: true, persona: data.persona };
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
    const mealType = String(args.meal_type) as keyof typeof mealNames;
    if (!(mealType in mealNames)) throw new Error("Невалиден вид хранене.");
    const id = args.id && /^[0-9a-f-]{36}$/i.test(String(args.id)) ? String(args.id) : crypto.randomUUID();
    const completed = Boolean(args.completed);
    const plannedTime = /^\d{2}:\d{2}$/.test(String(args.planned_time ?? "")) ? String(args.planned_time) : mealTimes[mealType];
    const nutrition = { calories: Math.max(0, Number(args.calories)), protein: Math.max(0, Number(args.protein)), carbs: Math.max(0, Number(args.carbs)), fat: Math.max(0, Number(args.fat)) };
    const payload = { source: "assistant", meal_type: mealType, description: [String(args.name).slice(0, 160), args.quantity ? String(args.quantity).slice(0, 80) : "", args.notes ? String(args.notes).slice(0, 1000) : ""].filter(Boolean).join(" · "), nutrition, items: [{ name: String(args.name).slice(0, 160), calories: nutrition.calories }], completed_at: completed ? new Date().toISOString() : null };
    const { data, error } = await supabase.from("day_meals").upsert({ id, owner_id: user.id, meal_date: args.entry_date, name: mealNames[mealType], planned_time: plannedTime, position: { breakfast: 0, lunch: 1, snack: 2, dinner: 3 }[mealType], legacy_payload: payload }, { onConflict: "id" }).select("id,name,planned_time,legacy_payload").single();
    if (error) throw error; return { saved: true, status: completed ? "completed" : "planned", ...data };
  }

  if (name === "save_workout") {
    const completed = args.completed === undefined ? false : Boolean(args.completed);
    const row = { owner_id: user.id, workout_date: args.workout_date, title: String(args.title).slice(0, 160), workout_type: ["strength", "cardio", "mobility", "sport", "other"].includes(String(args.workout_type)) ? args.workout_type : "other", duration_minutes: Math.max(0, Number(args.duration_minutes) || 60), calories_burned: Math.max(0, Number(args.calories_burned) || 0), notes: args.notes ? String(args.notes).slice(0, 3000) : null, exercises: Array.isArray(args.exercises) ? args.exercises : [], completed, status: completed ? "completed" : "planned", completed_at: completed ? new Date().toISOString() : null };
    const query = args.id ? supabase.from("workout_sessions").update(row).eq("id", String(args.id)).eq("owner_id", user.id) : supabase.from("workout_sessions").insert(row);
    const { data, error } = await query.select("id,title").single(); if (error) throw error; return { saved: true, ...data };
  }

  if (name === "delete_item") {
    const tables = { event: "calendar_events", task: "tasks", journal: "journal_entries", nutrition: "day_meals", workout: "workout_sessions" } as const;
    const table = tables[args.kind as keyof typeof tables]; if (!table) throw new Error("Невалиден вид запис.");
    const { error } = await supabase.from(table).delete().eq("id", String(args.id)).eq("owner_id", user.id); if (error) throw error; return { deleted: true, kind: args.kind, id: args.id };
  }
  throw new Error("Непознат инструмент.");
}

