import { NextResponse } from "next/server";
import { z } from "zod";
import { start } from "workflow/api";

import { createClient } from "@/lib/supabase/server";
import { workoutRestNotification } from "@/workflows/workout-rest-notification";

const bodySchema = z.object({
  subscription: z.object({
    endpoint: z.url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
  endsAt: z.number().int().positive(),
  workoutName: z.string().min(1).max(160),
  nextExercise: z.string().max(160).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Сесията изтече." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидно push известие." }, { status: 400 });
  if (parsed.data.endsAt < Date.now() || parsed.data.endsAt > Date.now() + 15 * 60_000) {
    return NextResponse.json({ error: "Невалиден край на почивката." }, { status: 400 });
  }
  const run = await start(workoutRestNotification, [parsed.data]);
  return NextResponse.json({ runId: run.runId });
}
