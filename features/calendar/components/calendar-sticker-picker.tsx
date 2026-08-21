"use client";

import { CALENDAR_STICKERS } from "../domain/stickers";

export function CalendarStickerPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <fieldset className="calendar-sticker-picker"><legend>Стикер за записа</legend>
    <input type="hidden" name="sticker" value={value} />
    <div>
      <button className={!value ? "selected" : ""} type="button" aria-label="Без стикер" aria-pressed={!value} onClick={() => onChange("")}>∅</button>
      {CALENDAR_STICKERS.map((item) => <button className={value === item ? "selected" : ""} key={item} type="button" aria-label={`Избери стикер ${item}`} aria-pressed={value === item} onClick={() => onChange(item)}>{item}</button>)}
    </div>
  </fieldset>;
}
