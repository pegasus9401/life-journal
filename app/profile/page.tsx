import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { localDateKey } from "@/features/calendar/domain/date-utils";
import { ProfileExperience } from "@/features/profile/components/profile-experience";
import { getProfileSettings } from "@/features/profile/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Профил · PegasOS" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const data = await getProfileSettings();
  if (!data) redirect("/login");
  let avatarUrl: string | null = null;
  if (data.profile?.avatar_path) {
    const supabase = await createClient();
    const { data: signed } = await supabase.storage.from("journal-photos").createSignedUrl(data.profile.avatar_path, 60 * 60);
    avatarUrl = signed?.signedUrl ?? null;
  }
  return <main className="life-app-shell p2-shell">
    <AppNavigation active="profile" captureDate={localDateKey()} />
    <ProfileExperience email={data.email} profile={data.profile} goals={data.goals} avatarUrl={avatarUrl} initialTab={params.tab === "goals" ? "goals" : params.tab === "pegas" ? "pegas" : "profile"} />
  </main>;
}

