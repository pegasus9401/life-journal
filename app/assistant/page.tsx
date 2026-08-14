import { redirect } from "next/navigation";

export const metadata = { title: "AI асистент · Дневник на живота" };

export default async function AssistantPage() {
  redirect("/today");
}
