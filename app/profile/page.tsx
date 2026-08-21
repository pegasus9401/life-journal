import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { ProfileExperience } from "@/features/profile/components/profile-experience";
import { getProfileSettings } from "@/features/profile/queries";

export const metadata = { title: "Профил · PegasOS" };

export default async function ProfilePage() {
  const data = await getProfileSettings();
  if (!data) redirect("/login");
  return <main className="life-app-shell"><AppNavigation active="profile" /><ProfileExperience {...data} /></main>;
}

