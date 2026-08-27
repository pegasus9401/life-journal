import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { AssistantExperience } from "@/features/assistant/components/assistant-experience";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "PegasOS Intelligence" };

export default async function AssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <main className="life-app-shell p2-shell intelligence-page"><AppNavigation title="INTELLIGENCE"/><AssistantExperience/></main>;
}
