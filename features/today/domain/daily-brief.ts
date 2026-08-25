import type { TodayDashboardData } from "../types";

export function buildDailyBrief(data: TodayDashboardData) {
  const pendingWorkout = data.workouts.find((workout) => !workout.completed);
  if (pendingWorkout) return `Имаш „${pendingWorkout.title}“ днес. Подготви се и започни директно от секцията Активност.`;

  const proteinLeft = Math.max(0, Math.round(data.nutrition.proteinGoal - data.nutrition.protein));
  if (proteinLeft >= 20) return `Протеинът изостава с около ${proteinLeft} g. Следващото хранене е добре да е богато на протеин.`;

  const openTasks = data.plannerItems.filter((item) => item.type === "task" && !item.completed).length;
  if (openTasks) return `Имаш ${openTasks} ${openTasks === 1 ? "отворена задача" : "отворени задачи"} за днес. Избери най-важната като следващо действие.`;

  if (data.wellness.recovery > 0 && data.wellness.recovery < 50) return "Възстановяването е ниско. Намали интензивността и пази време за сън.";
  if (data.nutrition.calories >= data.nutrition.calorieGoal * .9) return "Храненето е близо до дневната цел. Фокусирай се върху качеството на оставащите избори.";
  return "Денят е под контрол. Запиши следващото важно действие и продължи спокойно.";
}
