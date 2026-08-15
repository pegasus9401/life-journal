"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mealNames } from "../meal-data";
import { getMenuLibrary, getMenuNutrition, type MealMenu, type MealMenuSettings, type MenuNutrition, type NutritionValues } from "../menu-library";

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
  return `${name} - ${amount}${product.unit.trim() ? ` ${product.unit.trim()}` : ""}`.trim();
}

export function MealMenuManager() {
  const [settings, setSettings] = useState<MealMenuSettings>({});
  const [name, setName] = useState("");
  const [meals, setMeals] = useState<MealMenu>(emptyMeals);
  const [menuNutrition, setMenuNutrition] = useState<MenuNutrition>(() => getMenuNutrition({}, "__new__"));
  const [creating, setCreating] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [activeUnitField, setActiveUnitField] = useState<string | null>(null);
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [previewChoices, setPreviewChoices] = useState<Record<string, number>>({});
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
    setMenuNutrition(getMenuNutrition({}, "__new__"));
    setCreating(false);
    setEditingName(null);
    setUnitDrafts({});
  };

  const openNewMenu = () => {
    if (creating && !editingName) { resetEditor(); return; }
    setName("");
    setMeals(emptyMeals());
    setMenuNutrition(getMenuNutrition({}, "__new__"));
    setEditingName(null);
    setCreating(true);
    setMessage("");
  };

  const startEditing = (menuName: string) => {
    const menu = library[menuName];
    if (!menu) return;
    setName(menuName);
    setMeals(Object.fromEntries(mealNames.map(meal => [meal, [...(menu[meal] ?? [""])]])));
    setMenuNutrition(getMenuNutrition(settings, menuName));
    setEditingName(menuName);
    setCreating(true);
    setMessage("");
  };

  const updateVariant = (meal: string, index: number, value: string) => {
    setMeals(current => ({ ...current, [meal]: current[meal].map((variant, variantIndex) => variantIndex === index ? value : variant) }));
  };

  const updateMenuNutrition = (field: keyof NutritionValues, value: string) => {
    setMenuNutrition(current => ({ ...current, [field]: Math.max(0, Number(value) || 0) }));
  };

  const updateMealNutrition = (meal: string, field: keyof NutritionValues, value: string) => {
    setMenuNutrition(current => ({ ...current, meals: { ...current.meals, [meal]: { ...current.meals[meal], [field]: Math.max(0, Number(value) || 0) } } }));
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

  const unitSuggestions = (query: string) => {
    const normalized = query.trim().toLocaleLowerCase("bg-BG");
    return measurementUnits
      .filter(([value]) => value)
      .filter(([value, label]) => !normalized || value.toLocaleLowerCase("bg-BG").includes(normalized) || label.toLocaleLowerCase("bg-BG").includes(normalized))
      .slice(0, 8);
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
      meal_menu_nutrition: { ...(settings.meal_menu_nutrition ?? {}), [cleanName]: menuNutrition },
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
    const nutrition = { ...(settings.meal_menu_nutrition ?? {}) };
    delete custom[menuName];
    delete nutrition[menuName];
    if (editingName === menuName) resetEditor();
    await saveSettings({
      ...settings,
      custom_meal_menus: custom,
      meal_menu_nutrition: nutrition,
      archived_meal_menus: (settings.archived_meal_menus ?? []).filter(item => item !== menuName),
      deleted_meal_menus: [...new Set([...(settings.deleted_meal_menus ?? []), menuName])],
    }, `${menuName} е изтрито.`);
  };

  const menuList = Object.keys(library);
  const selectedName = selectedMenu && library[selectedMenu] ? selectedMenu : menuList[0];
  const selectedData = selectedName ? library[selectedName] : null;
  const selectedNutrition = selectedName ? getMenuNutrition(settings, selectedName) : getMenuNutrition({}, "__empty__");
  const totalVariants = selectedData ? Object.values(selectedData).reduce((sum, variants) => sum + variants.length, 0) : 0;
  const totalProducts = selectedData ? Object.values(selectedData).flat().reduce((sum, variant) => sum + variant.split(" + ").length, 0) : 0;

  return <section className="meal-plan managed-meal-plan">
    <div className="managed-meal-plan-toolbar"><div><p className="life-kicker">Хранителен режим</p><h2>Моите менюта</h2></div><button className="primary-button" type="button" onClick={creating ? resetEditor : openNewMenu}>{creating ? "Отказ" : "+ Добави меню"}</button></div>
    <div className="meal-plan-tabs managed-meal-tabs" role="tablist" aria-label="Избор на хранително меню">{menuList.map(menuName => <button key={menuName} type="button" role="tab" aria-selected={selectedName === menuName} className={selectedName === menuName ? "active" : ""} onClick={() => { setSelectedMenu(menuName); if (editingName && editingName !== menuName) resetEditor(); }}><span>{menuName}</span><small>{archived.has(menuName) ? "Архивирано" : "Активно"}</small></button>)}</div>
    {!creating && selectedName && selectedData ? <>
      <article className="meal-plan-hero managed-meal-hero">
        <div className="meal-plan-hero-copy"><p className="life-kicker">{archived.has(selectedName) ? "Архивирано меню" : "Активно меню"}</p><h2>{selectedName}</h2><p>Всички хранения, варианти, продукти и количества на едно място.</p></div>
        <div className="managed-meal-stats"><div><strong>{Object.keys(selectedData).length}</strong><span>хранения</span></div><div><strong>{totalVariants}</strong><span>варианта</span></div><div><strong>{totalProducts}</strong><span>продукта</span></div></div>
        <div className="meal-menu-actions managed-meal-actions"><button className="edit" type="button" onClick={() => startEditing(selectedName)}>Редактирай менюто</button><button type="button" onClick={() => toggleArchive(selectedName)}>{archived.has(selectedName) ? "Възстанови" : "Архивирай"}</button><button className="danger" type="button" onClick={() => deleteMenu(selectedName)}>Изтрий</button></div>
      </article>
      <div className="meal-plan-list managed-meal-details">{Object.entries(selectedData).map(([meal, variants]) => {
        const choiceKey = `${selectedName}-${meal}`;
        const selectedVariant = Math.min(previewChoices[choiceKey] ?? 0, variants.length - 1);
        const selectedProducts = variants[selectedVariant].split(" + ");
        return <article className="meal-plan-card" key={meal}>
          <header className="meal-plan-card-header"><div className="meal-plan-title"><span className="meal-plan-icon">✦</span><div><h3>{meal}</h3><span>{variants.length} {variants.length === 1 ? "вариант" : "варианта"}</span></div></div></header>
          <div className="meal-plan-selected"><span className="meal-plan-option-label">Избран вариант {selectedVariant + 1}</span><div className="meal-plan-food-rows">{selectedProducts.map((product, productIndex) => <div className="meal-plan-food-row" key={`${product}-${productIndex}`}><span className="meal-plan-food-dot" /><span>{product}</span></div>)}</div></div>
          {variants.length > 1 ? <details className="meal-plan-alternatives"><summary>Виж всички варианти <span>{variants.length} варианта</span></summary><div className="meal-plan-options">{variants.map((variant, variantIndex) => <button type="button" key={`${meal}-${variantIndex}`} className={variantIndex === selectedVariant ? "selected" : ""} onClick={event => { setPreviewChoices(current => ({ ...current, [choiceKey]: variantIndex })); event.currentTarget.closest("details")?.removeAttribute("open"); }}><span className="meal-plan-radio">{variantIndex === selectedVariant ? "✓" : variantIndex + 1}</span><span><b>Вариант {variantIndex + 1}</b><span className="meal-plan-option-products">{variant.split(" + ").join(" • ")}</span></span></button>)}</div></details> : null}
        </article>;
      })}</div>
    </> : !creating ? <p className="calendar-empty">Все още няма менюта. Добави първото си меню.</p> : null}
    {creating ? <div className="meal-menu-create managed-meal-editor">
      <div className="meal-menu-editor-heading"><strong>{editingName ? `Редактиране на ${editingName}` : "Ново меню"}</strong>{editingName ? <button type="button" onClick={resetEditor}>Отказ</button> : null}</div>
      <label>Име на менюто<input value={name} onChange={event => setName(event.target.value)} placeholder="Например: Меню за почивен ден" maxLength={80} disabled={Boolean(editingName)} /></label>
      <p>Всеки вариант и всеки продукт са на отделен ред.</p>
      <div className="meal-menu-fields">{mealNames.map(meal => <section className="meal-variants-editor" key={meal}>
        <header><strong>{meal}</strong><span>{meals[meal].length} {meals[meal].length === 1 ? "вариант" : "варианта"}</span></header>
        <div className="meal-variant-list">{meals[meal].map((variant, index) => <div className="meal-variant-row" key={index}>
          <div className="meal-variant-products">
            <span className="meal-variant-label">Вариант {index + 1}</span>
            {(variantProducts(variant).length ? variantProducts(variant) : [""]).map((product, productIndex, products) => {
              const parts = parseProduct(product);
              const unitFieldKey = `${meal}-${index}-${productIndex}`;
              const unitValue = unitDrafts[unitFieldKey] ?? parts.unit;
              return <div className="meal-product-row" key={productIndex}>
                <input className="product-name-input" value={parts.name} onChange={event => updateProductField(meal, index, productIndex, "name", event.target.value)} placeholder="Продукт" />
                <input className="product-amount-input" type="number" min="0" step="any" inputMode="decimal" value={parts.amount} onChange={event => updateProductField(meal, index, productIndex, "amount", event.target.value)} placeholder="Количество" />
                <div className="product-unit-combobox">
                  <input className="product-unit-input" value={unitValue} onFocus={() => { setUnitDrafts(current => ({ ...current, [unitFieldKey]: unitValue })); setActiveUnitField(unitFieldKey); }} onChange={event => { const value = event.target.value; setUnitDrafts(current => ({ ...current, [unitFieldKey]: value })); updateProductField(meal, index, productIndex, "unit", value); setActiveUnitField(unitFieldKey); }} onKeyDown={event => { if (event.key === "Escape") setActiveUnitField(null); }} onBlur={() => window.setTimeout(() => setActiveUnitField(null), 120)} placeholder="Мерна единица" autoComplete="off" aria-label={`Мерна единица за продукт ${productIndex + 1}`} aria-expanded={activeUnitField === unitFieldKey} />
                  {activeUnitField === unitFieldKey ? <div className="product-unit-suggestions">{unitSuggestions(unitValue).length ? unitSuggestions(unitValue).map(([value, label]) => <button type="button" key={value} onMouseDown={event => event.preventDefault()} onClick={() => { setUnitDrafts(current => ({ ...current, [unitFieldKey]: value })); updateProductField(meal, index, productIndex, "unit", value); setActiveUnitField(null); }}><strong>{value}</strong><span>{label}</span></button>) : <p>Няма предложение — можеш да използваш въведения текст.</p>}</div> : null}
                </div>
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
    {message ? <p className={`form-message ${message.startsWith("✓") ? "is-success" : message.startsWith("Грешка") ? "is-error" : ""}`}>{message}</p> : null}
  </section>;
}
