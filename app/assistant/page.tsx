import { redirect } from "next/navigation";

export const metadata = { title: "PegasOS Intelligence" };

export default function AssistantPage() {
  redirect("/profile?tab=pegas");
}

