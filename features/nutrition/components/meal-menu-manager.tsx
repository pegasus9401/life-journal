"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mealNames } from "../meal-data";
import { cleanMealMenu, getMenuLibrary, type MealMenuSettings } from "../menu-library";

export function MealMenuManager() {
  const [settings, setSettings] = useState<MealMenuSettings>({});
  const [name, setName] = useState("");
  const [meals, setMeals] = useState<Record<string, string>>(() => Object.fromEntries(mealNames.map(meal => [meal, ""])));
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const library = useMemo(() => getMenuLibrary(settings), [settings]);
  const archived = new Set(settings.archived_meal_menus ?? []);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (user) setSettings(user.user_metadata as MealMenuSettings);
    })();
  }, []);

  const saveSettings = async (next: MealMenuSettings, success: string) => {
    setMessage("Запазване…");
    const { error } = await createClient().auth.updateUser({ data: next });
    if (error) { setMessage(`Грешка: ${error.message}`); return false; }
    setSettings(next);
    setMessage(`✓ ${success}`);
    return true;
  };

  const addMenu = async () => {
    const cleanName = name.trim();
    const menu = cleanMealMenu(meals);
    if (!cleanName) { setMessage("Въведи име на менюто."); return; }
    if (library[cleanName]) { setMessage("Вече има меню с това име."); return; }
    if (!menu) { setMessage("Добави поне един вариант за всяко хранене."); return; }
    const next: MealMenuSettings = {
      ...settings,
      custom_meal_menus: { ...(settings.custom_meal_menus ?? {}), [cleanName]: menu },
      deleted_meal_menus: (settings.deleted_meal_menus ?? []).filter(item => item !== cleanName),
    };
    if (await saveSettings(next, `${cleanName} е добавено.`)) {
      setName("");
      setMeals(Object.fromEntries(mealNames.map(meal => [meal, ""])));
      setCreating(false);
    }
  };

  const toggleArchive = async (menuName: string) => {
    const nextArchived = archived.has(menuName)
      ? (settings.archived_meal_menus ?? []).filter(item => item !== menuName)
      : [...(settings.archived_meal_menus ?? []), menuName];
    await saveSettings({ ...settings, archived_meal_menus: nextArchived }, archived.has(menuName) ? `${menuName} е възстановено.` : `${menuName} е архивирано.`);
  };

  const deleteMenu = async (menuName: string) => {
    if (!window.confirm(`Да изтрия ли окончателно „${menuName}“? Старите дни ще запазят името, но менюто няма да може да се избира отново.`)) return;
    const custom = { ...(settings.custom_meal_menus ?? {}) };
    delete custom[menuName];
    await saveSettings({
      ...settings,
      custom_meal_menus: custom,
      archived_meal_menus: (settings.archived_meal_menus ?? []).filter(item => item !== menuName),
      deleted_meal_menus: [...new Set([...(settings.deleted_meal_menus ?? []), menuName])],
    }, `${menuName} е изтрито.`);
  };

  return <section className="meal-menu-manager">
    <header><div><p className="life-kicker">Моите менюта</p><h2>Управление на менюта</h2></div><button className="primary-button" type="button" onClick={() => setCreating(value => !value)}>{creating ? "Отказ" : "+ Добави меню"}</button></header>
    {creating ? <div className="meal-menu-create">
      <label>Име на менюто<input value={name} onChange={event => setName(event.target.value)} placeholder="Например: Меню за почивен ден" maxLength={80} /></label>
      <p>За всеки ред въведи отделен вариант. Продуктите във варианта разделяй с „ + “.</p>
      <div className="meal-menu-fields">{mealNames.map(meal => <label key={meal}>{meal}<textarea value={meals[meal] ?? ""} onChange={event => setMeals(current => ({ ...current, [meal]: event.target.value }))} placeholder={"Вариант 1\nВариант 2"} /></label>)}</div>
      <button className="primary-button" type="button" onClick={addMenu}>Запази новото меню</button>
    </div> : null}
    <div className="meal-menu-admin-list">{Object.keys(library).map(menuName => <article key={menuName} className={archived.has(menuName) ? "is-archived" : ""}><div><strong>{menuName}</strong><span>{archived.has(menuName) ? "Архивирано" : "Активно"}</span></div><div><button type="button" onClick={() => toggleArchive(menuName)}>{archived.has(menuName) ? "Възстанови" : "Архивирай"}</button><button className="danger" type="button" onClick={() => deleteMenu(menuName)}>Изтрий</button></div></article>)}</div>
    {message ? <p className={`form-message ${message.startsWith("✓") ? "is-success" : message.startsWith("Грешка") ? "is-error" : ""}`}>{message}</p> : null}
  </section>;
}
