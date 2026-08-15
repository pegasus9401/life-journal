"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mealNames } from "../meal-data";
import { getMenuLibrary, type MealMenu, type MealMenuSettings } from "../menu-library";

const emptyMeals = (): MealMenu => Object.fromEntries(mealNames.map(meal => [meal, [""]]));

const measurementUnits = [
  ["", "Без мерна единица"],
  ["г", "Грама (г)"],
  ["кг", "Килограма (кг)"],
  ["мл", "Милилитра (мл)"],
  ["л", "Литра (л)"],
  ["бр", "Брой"],
  ["доза", "Доза"],
  ["порция", "Порция"],
  ["пакет", "Пакет"],
  ["ч.л.", "Чаена лъжица"],
  ["с.л.", "Супена лъжица"],
  ["чаша", "Чаша"],
  ["резен", "Резен"],
  ["филия", "Филия"],
  ["консерва", "Консерва"],
  ["бутилка", "Бутилка"],
  ["кутия", "Кутия"],
  ["шепа", "Шепа"],
  ["мерителна лъжица", "Мерителна лъжица"],
] as const;

type ProductParts = { name: string; amount: string; unit: string };

function normalizeAmount(value: string) {
  if (value.includes("/")) {
    const [left, right] = value.split("/").map(Number);
    return right ? String(left / right) : value;
  }
  return value.replace(",", ".");
}

function normalizeUnit(value: string) {
  const unit = value.trim().toLocaleLowerCase("bg-BG");
  const aliases: Record<string, string> = { "гр": "г", "грама": "г", "kg": "кг", "ml": "мл", "бр.": "бр", "брой": "бр", "дози": "доза", "порции": "порция", "пакета": "пакет", "филии": "филия", "резена": "резен", "кутии": "кутия", "бутилки": "бутилка", "консерви": "консерва" };
  return aliases[unit] ?? unit;
}

function parseProduct(value: string): ProductParts {
  const text = value.trim();
  const separated = text.match(/^(.*?)\s*-\s*(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(.*)$/);
  if (separated) return { name: separated[1].trim(), amount: normalizeAmount(separated[2]), unit: normalizeUnit(separated[3]) };
  const prefixedCount = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (prefixedCount) return { name: prefixedCount[2].trim(), amount: normalizeAmount(prefixedCount[1]), unit: "бр" };
  return { name: text, amount: "", unit: "" };
}

function formatProduct(product: ProductParts) {
  const name = product.name.trim();
  const amount = product.amount.trim();
  if (!amount) return name;
  return `${name} - ${amount} ${product.unit || "бр"}`.trim();
}

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

  const variantProducts = (variant: string) => variant.split(" + ").map(product => product.trim());

  const updateProductField = (meal: string, variantIndex: number, productIndex: number, field: keyof ProductParts, value: string) => {
    const products = variantProducts(meals[meal][variantIndex]);
    const product = parseProduct(products[productIndex] ?? "");
    products[productIndex] = formatProduct({ ...product, [field]: value });
    updateVariant(meal, variantIndex, products.join(" + "));
  };

  const addProduct = (meal: string, variantIndex: number) => {
    const products = variantProducts(meals[meal][variantIndex]);
    updateVariant(meal, variantIndex, [...products, ""].join(" + "));
  };

  const removeProduct = (meal: string, variantIndex: number, productIndex: number) => {
    const products = variantProducts(meals[meal][variantIndex]).filter((_, index) => index !== productIndex);
    updateVariant(meal, variantIndex, products.join(" + "));
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
    const cleanMenu = Object.fromEntries(Object.entries(meals).map(([meal, variants]) => [meal, variants.map(value => variantProducts(value).filter(Boolean).join(" + ")).filter(Boolean)]));
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
      <p>Всеки вариант и всеки продукт са на отделен ред.</p>
      <datalist id="meal-measurement-units">{measurementUnits.filter(([value]) => value).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</datalist>
      <div className="meal-menu-fields">{mealNames.map(meal => <section className="meal-variants-editor" key={meal}>
        <header><strong>{meal}</strong><span>{meals[meal].length} {meals[meal].length === 1 ? "вариант" : "варианта"}</span></header>
        <div className="meal-variant-list">{meals[meal].map((variant, index) => <div className="meal-variant-row" key={index}>
          <div className="meal-variant-products">
            <span className="meal-variant-label">Вариант {index + 1}</span>
            {(variantProducts(variant).length ? variantProducts(variant) : [""]).map((product, productIndex, products) => {
              const parts = parseProduct(product);
              return <div className="meal-product-row" key={productIndex}>
                <input className="product-name-input" value={parts.name} onChange={event => updateProductField(meal, index, productIndex, "name", event.target.value)} placeholder="Продукт" />
                <input className="product-amount-input" type="number" min="0" step="any" inputMode="decimal" value={parts.amount} onChange={event => updateProductField(meal, index, productIndex, "amount", event.target.value)} placeholder="Количество" />
                <input className="product-unit-input" list="meal-measurement-units" value={parts.unit} onChange={event => updateProductField(meal, index, productIndex, "unit", event.target.value)} placeholder="Мерна единица" aria-label={`Мерна единица за продукт ${productIndex + 1}`} />
                <button type="button" onClick={() => removeProduct(meal, index, productIndex)} disabled={products.length === 1} aria-label={`Премахни продукт ${productIndex + 1}`}>Премахни</button>
              </div>;
            })}
            <button type="button" className="add-product" onClick={() => addProduct(meal, index)}>+ Добави продукт</button>
          </div>
          <button type="button" className="remove-variant" onClick={() => removeVariant(meal, index)} disabled={meals[meal].length === 1} aria-label={`Премахни вариант ${index + 1} от ${meal}`}>Премахни варианта</button>
        </div>)}</div>
        <button type="button" className="add-variant" onClick={() => addVariant(meal)}>+ Добави вариант</button>
      </section>)}</div>
      <button className="primary-button" type="button" onClick={saveMenu}>{editingName ? "Запази промените" : "Запази новото меню"}</button>
    </div> : null}
    <div className="meal-menu-admin-list">{Object.keys(library).map(menuName => <article key={menuName} className={archived.has(menuName) ? "is-archived" : ""}><div><strong>{menuName}</strong><span>{archived.has(menuName) ? "Архивирано" : "Активно"}</span></div><div><button type="button" onClick={() => startEditing(menuName)}>Редактирай</button><button type="button" onClick={() => toggleArchive(menuName)}>{archived.has(menuName) ? "Възстанови" : "Архивирай"}</button><button className="danger" type="button" onClick={() => deleteMenu(menuName)}>Изтрий</button></div></article>)}</div>
    {message ? <p className={`form-message ${message.startsWith("✓") ? "is-success" : message.startsWith("Грешка") ? "is-error" : ""}`}>{message}</p> : null}
  </section>;
}
