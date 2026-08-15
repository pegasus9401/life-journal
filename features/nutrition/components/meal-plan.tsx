"use client";

import { useState } from "react";

type Meal = { title: string; kcal: number; protein: number; carbs: number; fat: number; options: string[] };
type Menu = { name: string; kcal: number; protein: number; carbs: number; fat: number; meals: Meal[] };

const menus: Menu[] = [
  { name: "Меню 1", kcal: 1888, protein: 180, carbs: 148, fat: 56, meals: [
    { title: "Закуска", kcal: 247, protein: 21, carbs: 33, fat: 3, options: ["High Protein Pudding Milbona - 1 бр + банан - 100 г", "Протеин на прах - 1 доза + банан - 100 г + прясно мляко 1.5% - 100 г", "Skyr обезмаслен - 175 г + ябълка - 150 г + фъстъчено масло - 10 г"] },
    { title: "След тренировка", kcal: 529, protein: 59, carbs: 31, fat: 16, options: ["Пилешка пържола от бут без кожа - 210 г + салата + протеинов хляб Vita - 40 г", "Пъстърва печена - 210 г + салата + картофи - 70 г", "3 яйца + 4 белтъка + пуешко филе - 85 г + протеинов хляб - 50 г", "Свинско контра филе - 190 г + салата + картофи - 90 г", "Моцарела light - 125 г + домат - 300 г + пуешко филе - 110 г + протеинов хляб - 50 г + песто - 10 г"] },
    { title: "Следобедна закуска", kcal: 514, protein: 36, carbs: 60, fat: 12, options: ["Протеин на прах - 1 доза + кисело мляко 2% - 400 г + ябълка - 100 г + овесени ядки - 45 г", "Цезар салата: пилешки гърди - 130 г + салата + Caesar сос - 20 г + крутони - 40 г", "Skyr - 350 г + Corny Big - 1 бр + ябълка - 50 г + бадеми - 15 г"] },
    { title: "Вечеря", kcal: 463, protein: 40, carbs: 17, fat: 24, options: ["Свински врат печен - 150 г + салата", "3 яйца + 2 белтъка + сирене - 40 г + пуешко филе - 40 г + салата", "Пилешка пържола от бут - 160 г + салата + Caesar сос - 30 г", "Свинско контра филе - 110 г + салата + бадеми - 30 г", "Сьомга печена - 150 г + салата + зехтин - 6 г"] },
    { title: "Преди лягане", kcal: 135, protein: 24, carbs: 7, fat: 1, options: ["High Protein Quark-Creme - 1 бр"] }
  ]},
  { name: "Меню 2", kcal: 1895, protein: 183, carbs: 124, fat: 65, meals: [
    { title: "Закуска", kcal: 337, protein: 27, carbs: 26, fat: 11, options: ["Протеинов хляб Vita - 60 г + пушено пуешко филе - 50 г + кашкавал - 35 г + домат - 150 г", "High Protein Quark-Creme - 1 бр + бадеми - 25 г + ябълка - 80 г", "Протеин - 1 доза + мляко 1.5% - 200 г + фъстъчено масло - 15 г + ябълка - 100 г"] },
    { title: "След тренировка", kcal: 720, protein: 62, carbs: 48, fat: 28, options: ["Лаваш - 50 г + крема сирене Goldessa - 50 г + пилешка пържола от бут - 220 г + салата", "Ориз - 50 г + пилешка пържола от бут - 210 г + зеленчуци - 50 г + кашкавал - 40 г", "Макарони - 50 г + Maggi Carbonara - 1/2 пакет + кашкавал - 40 г + пилешка пържола - 200 г", "3 яйца + 3 белтъка + пуешко филе - 75 г + кашкавал - 45 г + протеинов хляб - 40 г + картофи - 90 г", "Пъстърва - 220 г + картофи - 160 г + зехтин - 10 г + салата"] },
    { title: "Следобедна закуска", kcal: 350, protein: 29, carbs: 27, fat: 13, options: ["Ябълка - 110 г + High Protein Quark-Creme - 1 бр + бадеми - 25 г", "LZ шоколад - 1 бр + извара Pilos - 250 г", "Протеин - 1 доза + мляко - 200 г + фъстъчено масло - 15 г + ябълка - 130 г"] },
    { title: "Вечеря", kcal: 353, protein: 41, carbs: 16, fat: 12, options: ["Пилешка пържола от бут - 160 г + салата", "2 яйца + 3 белтъка + пуешко филе - 60 г + сирене - 15 г + салата", "Свинско контра филе - 140 г + салата", "Моцарела light - 125 г + домат - 200 г + пуешко филе - 70 г + ябълка - 80 г", "Пъстърва - 150 г + салата"] },
    { title: "Преди лягане", kcal: 135, protein: 24, carbs: 7, fat: 1, options: ["High Protein Quark-Creme - 1 бр"] }
  ]},
  { name: "Меню 3", kcal: 1905, protein: 185, carbs: 131, fat: 62, meals: [
    { title: "Закуска", kcal: 392, protein: 30, carbs: 31, fat: 15, options: ["High Protein Quark-Creme - 1 бр + бадеми - 30 г + ябълка - 130 г", "Протеин - 1 доза + мляко 1.5% - 200 г + фъстъчено масло - 18 г + банан - 100 г"] },
    { title: "След тренировка", kcal: 551, protein: 45, carbs: 48, fat: 18, options: ["Бургер питка - 1 бр + пилешки гърди - 160 г + Goldessa - 45 г + домат - 200 г", "Ориз - 50 г + пилешка пържола от бут - 170 г + зеленчуци - 50 г + кашкавал - 15 г", "Пилешки гърди - 180 г + картофи - 100 г + зехтин - 10 г + салата", "3 яйца + 3 белтъка + сирене - 15 г + пуешко филе - 60 г + пълнозърнест хляб - 50 г + салата", "Пъстърва - 150 г + картофи - 170 г + зехтин - 5 г + салата"] },
    { title: "Следобедна закуска", kcal: 395, protein: 42, carbs: 32, fat: 9, options: ["Skyr - 350 г + бадеми - 20 г + ябълка - 100 г", "Шейк: мляко 1.5% - 300 г + протеин - 1.5 дози + банан - 60 г + фъстъчено масло - 10 г"] },
    { title: "Вечеря", kcal: 432, protein: 44, carbs: 13, fat: 19, options: ["3 яйца + 3 белтъка + пуешко филе - 50 г + кашкавал - 20 г + салата", "Свинско контра филе - 160 г + салата + зехтин - 5 г", "Пилешка пържола от бут - 180 г + салата + зехтин - 5 г", "Пъстърва - 160 г + салата + зехтин - 6 г", "Моцарела light - 125 г + домат - 300 г + пуешко филе - 80 г + песто - 17 г"] },
    { title: "Преди лягане", kcal: 135, protein: 24, carbs: 7, fat: 1, options: ["High Protein Quark-Creme - 1 бр"] }
  ]}
];

export function MealPlan() {
  const [selected, setSelected] = useState(0);
  const menu = menus[selected];
  return <section style={{margin:"0 0 28px"}}>
    <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12}}>{menus.map((m,i)=><button key={m.name} type="button" className={i===selected?"primary-button":"nutrition-goals-button"} onClick={()=>setSelected(i)}>{m.name}</button>)}</div>
    <article className="nutrition-overview" style={{marginBottom:16}}><div><p className="life-kicker">Хранителен режим</p><h2 style={{margin:"4px 0 8px"}}>{menu.name}</h2><strong>{menu.kcal} kcal</strong><p>П {menu.protein} г · В {menu.carbs} г · М {menu.fat} г</p></div></article>
    <div className="nutrition-meals">{menu.meals.map(meal=><article className="nutrition-meal" key={meal.title}><header><div><h2>{meal.title}</h2><span>{meal.kcal} kcal · П {meal.protein} · В {meal.carbs} · М {meal.fat}</span></div></header><details><summary style={{cursor:"pointer",padding:"12px 0",fontWeight:700}}>Виж варианти ({meal.options.length})</summary><div className="nutrition-food-list">{meal.options.map((option,i)=><div className="nutrition-food" key={option}><div className="nutrition-food-main"><strong>Вариант {i+1}</strong><span>{option}</span></div></div>)}</div></details></article>)}</div>
  </section>;
}
