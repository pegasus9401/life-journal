import { redirect } from "next/navigation";
import { ProfileExperience } from "@/features/profile/components/profile-experience";
import { getProfileSettings } from "@/features/profile/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Профил · PegasOS" };

export default async function ProfilePage() {
  const data = await getProfileSettings();
  if (!data) redirect("/login");
  let avatarUrl: string | null = null;
  if (data.profile?.avatar_path) {
    const supabase = await createClient();
    const { data: signed } = await supabase.storage.from("journal-photos").createSignedUrl(data.profile.avatar_path, 60 * 60);
    avatarUrl = signed?.signedUrl ?? null;
  }
  return <ProfileExperience email={data.email} profile={data.profile} avatarUrl={avatarUrl} />;
}

