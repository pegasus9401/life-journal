"use client";

import { useMemo, useState } from "react";
import type { FoodProduct } from "@/features/products/types";
import { deleteRecipe, saveRecipe } from "../actions";
import { recipeMacros, type Recipe, type RecipeDraft, type RecipeIngredient } from "../types";
import styles from "./recipe-library.module.css";

const emptyRecipe = (): RecipeDraft => ({ id: crypto.randomUUID(), name: "", description: "", instructions: "", servings: 1, favorite: false, ingredients: [] });
const round = (value: number) => Math.round(value * 10) / 10;

export function RecipeLibrary({ initialRecipes, products }: { initialRecipes: Recipe[]; products: FoodProduct[] }) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const productIndex = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const updateIngredient = (index: number, patch: Partial<RecipeIngredient>) => setDraft((current) => current ? { ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) } : current);
  const addIngredient = () => setDraft((current) => current ? { ...current, ingredients: [...current.ingredients, { id: crypto.randomUUID(), productId: products.find((product) => !current.ingredients.some((item) => item.productId === product.id))?.id ?? "", quantity: 100, unit: "g", grams: 100, position: current.ingredients.length }] } : current);
  const openEditor = (recipe?: Recipe) => { setMessage(""); setDraft(recipe ? { id: recipe.id, name: recipe.name, description: recipe.description, instructions: recipe.instructions, servings: recipe.servings, favorite: recipe.favorite, ingredients: recipe.ingredients.map((item) => ({ ...item })) } : emptyRecipe()); };
  const persist = async () => {
    if (!draft) return;
    setBusy(true); setMessage("Запазване…");
    const result = await saveRecipe(draft);
    if (result.ok && result.recipe) {
      const now = new Date().toISOString();
      const saved: Recipe = { ...result.recipe, createdAt: recipes.find((item) => item.id === result.recipe!.id)?.createdAt ?? now, updatedAt: now };
      setRecipes((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setDraft(null);
    }
    setMessage(result.message); setBusy(false);
  };
  const remove = async (recipe: Recipe) => {
    if (!window.confirm(`Да изтрия ли „${recipe.name}“?`)) return;
    const result = await deleteRecipe(recipe.id); setMessage(result.message);
    if (result.ok) setRecipes((current) => current.filter((item) => item.id !== recipe.id));
  };

  const draftMacros = draft ? recipeMacros(draft, products) : null;
  return <section className={styles.page}>
    <header className={styles.header}><div><p className="life-kicker">Твоята кухня</p><h1>Рецепти</h1><p>Комбинирай продуктите си и получавай точни макроси за рецепта и порция.</p></div><button className="primary-button" type="button" onClick={() => openEditor()}>+ Нова рецепта</button></header>
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    <div className={styles.grid}>{recipes.map((recipe) => { const totals = recipeMacros(recipe, products); const perServing = Math.max(recipe.servings, .01); return <article className={styles.card} key={recipe.id}>
      <header><div><h2>{recipe.name}</h2><p>{recipe.description || `${recipe.ingredients.length} съставки · ${recipe.servings} порции`}</p></div>{recipe.favorite ? <span className={styles.favorite} aria-label="Любима рецепта">★</span> : null}</header>
      <ul className={styles.ingredients}>{recipe.ingredients.slice(0, 4).map((ingredient) => <li key={ingredient.id}><span>{productIndex.get(ingredient.productId)?.name ?? "Липсващ продукт"}</span><b>{ingredient.grams} g</b></li>)}{recipe.ingredients.length > 4 ? <li><span>Още {recipe.ingredients.length - 4}</span></li> : null}</ul>
      <div className={styles.macros} aria-label="Макроси за една порция"><span><b>{round(totals.calories / perServing)}</b>kcal</span><span><b>{round(totals.protein / perServing)}</b>протеин</span><span><b>{round(totals.carbs / perServing)}</b>въглех.</span><span><b>{round(totals.fat / perServing)}</b>мазнини</span></div>
      <footer className={styles.actions}><button type="button" onClick={() => openEditor(recipe)}>Редактирай</button><button type="button" onClick={() => void remove(recipe)}>Изтрий</button></footer>
    </article>; })}{!recipes.length ? <div className={styles.empty}>{products.length ? "Все още няма рецепти. Създай първата от продуктите си." : "Първо добави поне един продукт."}</div> : null}</div>
    {draft ? <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null); }}><section className={styles.editor} role="dialog" aria-modal="true" aria-label="Редактиране на рецепта">
      <header><div><p className="life-kicker">Recipe builder</p><h2>{draft.name || "Нова рецепта"}</h2></div><button className={styles.close} type="button" onClick={() => setDraft(null)} aria-label="Затвори">×</button></header>
      <div className={styles.fields}><label className={styles.wide}>Име<input value={draft.name} maxLength={160} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Порции<input type="number" min="0.01" max="1000" step="0.5" value={draft.servings} onChange={(event) => setDraft({ ...draft, servings: Math.max(.01, Number(event.target.value) || 1) })} /></label><label><span>Любима</span><input type="checkbox" checked={draft.favorite} onChange={(event) => setDraft({ ...draft, favorite: event.target.checked })} /></label><label className={styles.wide}>Описание<textarea rows={2} value={draft.description} maxLength={1000} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label></div>
      <section className={styles.ingredientsEditor}><header><h3>Съставки</h3><button type="button" onClick={addIngredient} disabled={!products.length || draft.ingredients.length >= products.length}>+ Добави</button></header>{draft.ingredients.map((ingredient, index) => <div className={styles.ingredientRow} key={ingredient.id}><label>Продукт<select value={ingredient.productId} onChange={(event) => updateIngredient(index, { productId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id} disabled={draft.ingredients.some((item, itemIndex) => itemIndex !== index && item.productId === product.id)}>{product.name}{product.brand ? ` · ${product.brand}` : ""}</option>)}</select></label><label>Грамове<input type="number" min="0.01" max="100000" step="0.1" value={ingredient.grams} onChange={(event) => { const grams = Math.max(.01, Number(event.target.value) || .01); updateIngredient(index, { grams, quantity: grams, unit: "g" }); }} /></label><button type="button" onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, itemIndex) => itemIndex !== index) })} aria-label="Премахни съставката">×</button></div>)}</section>
      {draftMacros ? <div className={styles.macros}><span><b>{round(draftMacros.calories)}</b>kcal общо</span><span><b>{round(draftMacros.protein)}</b>протеин</span><span><b>{round(draftMacros.carbs)}</b>въглех.</span><span><b>{round(draftMacros.fat)}</b>мазнини</span></div> : null}
      <div className={styles.fields}><label className={styles.wide}>Начин на приготвяне<textarea rows={5} value={draft.instructions} maxLength={10000} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} /></label></div>
      <footer><span>{draft.ingredients.length} съставки</span><button className="primary-button" type="button" disabled={busy || !draft.name.trim() || !draft.ingredients.length} onClick={() => void persist()}>{busy ? "Запазване…" : "Запази рецептата"}</button></footer>
    </section></div> : null}
  </section>;
}


