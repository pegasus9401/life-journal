"use client";

import { useState } from "react";
import type { Promotion } from "@/lib/promotions";

const money = (value: number) => new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" }).format(value);

export function PromotionCarousel({ promotions }: { promotions: Promotion[] }) {
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  if (!promotions.length) return null;
  return <section className="shopping-more-promotions" aria-labelledby="more-promotions-title"><header><div><p className="life-kicker">Седмични предложения</p><h2 id="more-promotions-title">Още промоции</h2></div><span>{promotions.length} извън списъка</span></header><div>{promotions.map((promotion) => { const selected = added.has(promotion.id); return <article key={promotion.id}><a href={promotion.url} target="_blank" rel="noreferrer"><small>{promotion.store}</small><strong>{promotion.name}</strong><span>{promotion.oldPrice ? <del>{money(promotion.oldPrice)}</del> : null}<b>{money(promotion.price)}</b></span><em>до {promotion.validUntil} ↗</em></a><button type="button" className={selected ? "added" : ""} disabled={selected} onClick={() => setAdded((current) => new Set(current).add(promotion.id))}>{selected ? "Добавено ✓" : "Добави"}</button></article>; })}</div></section>;
}

