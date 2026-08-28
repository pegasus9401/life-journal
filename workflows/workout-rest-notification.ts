import webPush, { type PushSubscription } from "web-push";
import { sleep } from "workflow";

type RestPushInput = {
  subscription: PushSubscription;
  endsAt: number;
  workoutName: string;
  nextExercise?: string;
};

async function sendRestPush(input: RestPushInput) {
  "use step";
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Web Push VAPID keys are missing.");
  webPush.setVapidDetails(process.env.WEB_PUSH_SUBJECT || "mailto:notifications@pegasos.app", publicKey, privateKey);
  await webPush.sendNotification(input.subscription, JSON.stringify({
    title: "Почивката приключи",
    body: input.nextExercise ? `Следваща серия: ${input.nextExercise}` : `Продължи с ${input.workoutName}.`,
    url: "/workouts",
  }));
}

export async function workoutRestNotification(input: RestPushInput) {
  "use workflow";
  await sleep(new Date(input.endsAt));
  await sendRestPush(input);
}
