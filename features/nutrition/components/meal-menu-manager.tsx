"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mealNames } from "../meal-data";
import { getMenuLibrary, type MealMenu, type MealMenuSettings } from "../menu-library";

const emptyMeals = (): MealMenu => Object.fromEntries(mealNames.map(meal => [meal, [""]]));

export function MealMenuManager() {
  const [settings, setSettings] = useState<MealMenuSettings>({});
  const [name, setName] = useState("");
  const [meals, setMeals] = useState<MealMenu>(emptyMeals);
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const library = useMemo(() => getMenuLibrary(settings), [settings]);
  const archived = new Set(settings.archived_meal_menus ?? []);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (user) setSettings(user.user_metadata as MealMenuSettings);
    })();
  }, []);

  const resetEditor = () => {
    setName("");
    setMeals(emptyMeals());
    setCreating(false);
    setEditingName(null);
  };

  const openNewMenu = () => {
    if (creating && !editingName) { resetEditor(); return; }
    setName("");
    setMeals(emptyMeals());
    setEditingName(null);
    setCreating(true);
    setMessage("");
  };

  const startEditing = (menuName: string) => {
    const menu = library[menuName];
    if (!menu) return;
    setName(menuName);
    setMeals(Object.fromEntries(mealNames.map(meal => [meal, [...(menu[meal] ?? [""])]])));
    setEditingName(menuName);
    setCreating(true);
    setMessage("");
  };

  const updateVariant = (meal: string, index: number, value: string) => {
    setMeals(current => ({ ...current, [meal]: current[meal].map((variant, variantIndex) => variantIndex === index ? value : variant) }));
  };

  const addVariant = (meal: string) => {
    setMeals(current => ({ ...current, [meal]: [...current[meal], ""] }));
  };

  const removeVariant = (meal: string, index: number) => {
    setMeals(current => {
      const variants = current[meal].filter((_, variantIndex) => variantIndex !== index);
      return { ...current, [meal]: variants.length ? variants : [""] };
    });
  };

  const saveSettings = async (next: MealMenuSettings, success: string) => {
    setMessage("Запазване…");
    const { error } = await createClient().auth.updateUser({ data: next });
    if (error) { setMessage(`Грешка: ${error.message}`); return false; }
    setSettings(next);
    setMessage(`✓ ${success}`);
    return true;
  };

  const saveMenu = async () => {
    const cleanName = name.trim();
    const cleanMenu = Object.fromEntries(Object.entries(meals).map(([meal, variants]) => [meal, variants.map(value => value.trim()).filter(Boolean)]));
    if (!cleanName) { setMessage("Въведи име на менюто."); return; }
    if (!editingName && library[cleanName]) { setMessage("Вече има меню с това име."); return; }
    if (Object.values(cleanMenu).some(variants => variants.length === 0)) { setMessage("Добави поне един вариант за всяко хранене."); return; }

    const next: MealMenuSettings = {
      ...settings,
      custom_meal_menus: { ...(settings.custom_meal_menus ?? {}), [cleanName]: cleanMenu },
      deleted_meal_menus: (settings.deleted_meal_menus ?? []).filter(item => item !== cleanName),
    };
    const success = editingName ? `${cleanName} е обновено.` : `${cleanName} е добавено.`;
    if (await saveSettings(next, success)) resetEditor();
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
    if (editingName === menuName) resetEditor();
    await saveSettings({
      ...settings,
      custom_meal_menus: custom,
      archived_meal_menus: (settings.archived_meal_menus ?? []).filter(item => item !== menuName),
      deleted_meal_menus: [...new Set([...(settings.deleted_meal_menus ?? []), menuName])],
    }, `${menuName} е изтрито.`);
  };

  return <section className="meal-menu-manager">
    <header><div><p className="life-kicker">Моите менюта</p><h2>Управление на менюта</h2></div><button className="primary-button" type="button" onClick={openNewMenu}>{creating && !editingName ? "Отказ" : "+ Добави меню"}</button></header>
    {creating ? <div className="meal-menu-create">
      <div className="meal-menu-editor-heading"><strong>{editingName ? `Редактиране на ${editingName}` : "Ново меню"}</strong>{editingName ? <button type="button" onClick={resetEditor}>Отказ</button> : null}</div>
      <label>Име на менюто<input value={name} onChange={event => setName(event.target.value)} placeholder="Например: Меню за почивен ден" maxLength={80} disabled={Boolean(editingName)} /></label>
      <p>Всеки вариант е в отделна кутийка. Продуктите във варианта разделяй с „ + “.</p>
      <div className="meal-menu-fields">{mealNames.map(meal => <section className="meal-variants-editor" key={meal}>
        <header><strong>{meal}</strong><span>{meals[meal].length} {meals[meal].length === 1 ? "вариант" : "варианта"}</span></header>
        <div className="meal-variant-list">{meals[meal].map((variant, index) => <div className="meal-variant-row" key={index}>
          <label><span>Вариант {index + 1}</span><textarea value={variant} onChange={event => updateVariant(meal, index, event.target.value)} placeholder="Продукт - количество + продукт - количество" /></label>
          <button type="button" className="remove-variant" onClick={() => removeVariant(meal, index)} disabled={meals[meal].length === 1} aria-label={`Премахни вариант ${index + 1} от ${meal}`}>Премахни</button>
        </div>)}</div>
        <button type="button" className="add-variant" onClick={() => addVariant(meal)}>+ Добави вариант</button>
      </section>)}</div>
      <button className="primary-button" type="button" onClick={saveMenu}>{editingName ? "Запази промените" : "Запази новото меню"}</button>
    </div> : null}
    <div className="meal-menu-admin-list">{Object.keys(library).map(menuName => <article key={menuName} className={archived.has(menuName) ? "is-archived" : ""}><div><strong>{menuName}</strong><span>{archived.has(menuName) ? "Архивирано" : "Активно"}</span></div><div><button type="button" onClick={() => startEditing(menuName)}>Редактирай</button><button type="button" onClick={() => toggleArchive(menuName)}>{archived.has(menuName) ? "Възстанови" : "Архивирай"}</button><button className="danger" type="button" onClick={() => deleteMenu(menuName)}>Изтрий</button></div></article>)}</div>
    {message ? <p className={`form-message ${message.startsWith("✓") ? "is-success" : message.startsWith("Грешка") ? "is-error" : ""}`}>{message}</p> : null}
  </section>;
}
