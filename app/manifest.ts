import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Дневник на живота",
    short_name: "Life Journal",
    description: "Личен дневник, календар, хранене и тренировки.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#171522",
    theme_color: "#171522",
  };
}
