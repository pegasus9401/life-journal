import { redirect } from "next/navigation";

export const metadata = { title: "Цели · PEGASOS" };
export default function GoalsPage() {
  redirect("/profile?tab=goals");
}
