import type { TodayDashboardData } from "../types";

export function buildDailyBrief(data: TodayDashboardData) {
  const pendingWorkout = data.workouts.find((workout) => !workout.completed);
  if (pendingWorkout) return data.isToday ? `Имаш „${pendingWorkout.title}“ днес. Подготви се и започни директно от секцията Активност.` : `„${pendingWorkout.title}“ е останала планирана за този ден.`;

  const proteinLeft = Math.max(0, Math.round(data.nutrition.proteinGoal - data.nutrition.protein));
  if (proteinLeft >= 20) return data.isToday ? `Протеинът изостава с около ${proteinLeft} g. Следващото хранене е добре да е богато на протеин.` : `За този ден протеинът е останал с около ${proteinLeft} g под целта.`;

  const openTasks = data.plannerItems.filter((item) => item.type === "task" && !item.completed).length;
  if (openTasks) return data.isToday ? `Имаш ${openTasks} ${openTasks === 1 ? "отворена задача" : "отворени задачи"} за днес. Избери най-важната като следващо действие.` : `${openTasks} ${openTasks === 1 ? "задача е останала отворена" : "задачи са останали отворени"} за този ден.`;

  if (data.wellness.recovery > 0 && data.wellness.recovery < 50) return "Възстановяването е ниско. Намали интензивността и пази време за сън.";
  if (data.nutrition.calories >= data.nutrition.calorieGoal * .9) return "Храненето е близо до дневната цел. Фокусирай се върху качеството на оставащите избори.";
  return data.isToday ? "Денят е под контрол. Запиши следващото важно действие и продължи спокойно." : "Това е запазената картина на деня според наличните записи.";
}

