export const CALENDAR_STICKERS = [
  "🎂", "🎉", "❤️", "⭐", "😊", "🥳", "💪", "🏆",
  "✈️", "🏖️", "🚗", "🏠", "💼", "💰", "🛒", "🎁",
  "☕", "🍽️", "💧", "💊", "🌧️", "☀️", "🌙", "🐾",
] as const;

const stickerMarker = /^\[\[sticker:(.+?)\]\]\n?/u;

export function splitStickerDescription(value: string | null | undefined) {
  const description = value ?? "";
  const match = description.match(stickerMarker);
  return {
    sticker: match?.[1] ?? "",
    description: description.replace(stickerMarker, ""),
  };
}

export function withStickerDescription(value: string | null | undefined, sticker: string | null | undefined) {
  const description = splitStickerDescription(value).description.trim();
  const selected = sticker?.trim() ?? "";
  return selected ? `[[sticker:${selected}]]${description ? `\n${description}` : ""}` : description || null;
}
