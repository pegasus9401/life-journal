export type SettingsItem = { label: string; href: string; detail?: string };
export type SettingsGroup = { title: string; items: SettingsItem[] };

export const settingsGroups: SettingsGroup[] = [
  { title: "Общи", items: [
    { label: "Профил", href: "/profile", detail: "Лични данни и здравен профил" },
    { label: "Изглед", href: "/settings/appearance", detail: "Тема и визуални предпочитания" },
    { label: "Известия", href: "/settings/notifications", detail: "Напомняния и разрешения" },
    { label: "Персонализиране", href: "/settings/personalization", detail: "Начален екран и поведение" },
    { label: "Преки пътища", href: "/settings/shortcuts", detail: "Бързи действия" },
    { label: "Език", href: "/settings/language", detail: "Български" },
  ] },
  { title: "Данни", items: [
    { label: "Източници на данни", href: "/settings/data-sources", detail: "Свързани източници" },
    { label: "Синхронизация на здравето", href: "/settings/health-sync", detail: "Apple Health и устройства" },
    { label: "Импортиране на данни", href: "/settings/import", detail: "Добави архив или файл" },
  ] },
  { title: "Персонализация", items: [
    { label: "Цели", href: "/profile#goals", detail: "Дневни и дългосрочни цели" },
    { label: "Мерни единици", href: "/settings/units", detail: "kg, cm, kcal" },
    { label: "Зони на пулса", href: "/settings/heart-rate-zones", detail: "Персонални тренировъчни зони" },
    { label: "Изчисления", href: "/settings/calculations", detail: "Метаболизъм и активност" },
    { label: "Хранене", href: "/nutrition", detail: "Цели, менюта и дневник" },
    { label: "Периодично гладуване", href: "/settings/fasting", detail: "Прозорец за хранене" },
    { label: "Силова програма", href: "/workouts", detail: "Тренировки и прогрес" },
    { label: "Дневник", href: "/journal", detail: "Записи и дневни обобщения" },
    { label: "AI асистент", href: "/settings/ai-assistant", detail: "Pegas и автоматична памет" },
  ] },
  { title: "Ресурси", items: [
    { label: "Какво ново", href: "/settings/whats-new" },
    { label: "Първи стъпки", href: "/settings/getting-started" },
    { label: "База знания", href: "/settings/knowledge" },
    { label: "Предложи функция", href: "/settings/feature-request" },
    { label: "Докладвай бъг", href: "/settings/report-bug" },
  ] },
  { title: "Правни", items: [
    { label: "Условия", href: "/settings/terms" },
    { label: "Поверителност", href: "/settings/privacy" },
  ] },
];

export const settingsDetails: Record<string, { title: string; eyebrow: string; description: string; rows: string[] }> = {
  appearance: { title: "Изглед", eyebrow: "Общи", description: "Избери как да изглежда PegasOS на това устройство.", rows: ["Системна тема", "Светъл режим", "Тъмен режим"] },
  notifications: { title: "Известия", eyebrow: "Общи", description: "Управлявай известията за задачи, тренировки, хранения и почивки между сериите.", rows: ["Разрешение за известия", "Тренировки и таймери", "Задачи и събития", "Хранене"] },
  personalization: { title: "Персонализиране", eyebrow: "Общи", description: "Подреди PegasOS според начина, по който планираш деня си.", rows: ["Начален екран", "Timeline категории", "Бързо добавяне", "AI предложения"] },
  shortcuts: { title: "Преки пътища", eyebrow: "Общи", description: "Бързи действия за най-често използваните функции.", rows: ["Добави храна", "Започни тренировка", "Нова задача", "Нов запис в дневника"] },
  language: { title: "Език", eyebrow: "Общи", description: "Езикът се използва в интерфейса и от AI асистента.", rows: ["Български"] },
  "data-sources": { title: "Източници на данни", eyebrow: "Данни", description: "Преглеждай кои части на PegasOS подават информация към общия Timeline.", rows: ["Календар", "Хранене", "Тренировки", "Дневник"] },
  "health-sync": { title: "Синхронизация на здравето", eyebrow: "Данни", description: "Apple Health интеграцията ще обедини активност, пулс и здравни показатели без дублиране.", rows: ["Apple Health — предстои", "Свързани устройства"] },
  import: { title: "Импортиране на данни", eyebrow: "Данни", description: "Добавяй данни от поддържани файлове и архиви.", rows: ["Хранителни данни", "Тренировъчна история", "Календар"] },
  units: { title: "Мерни единици", eyebrow: "Персонализация", description: "Основните единици, използвани в приложението.", rows: ["Тегло — килограми", "Ръст — сантиметри", "Енергия — kcal", "Течности — ml"] },
  "heart-rate-zones": { title: "Зони на пулса", eyebrow: "Персонализация", description: "Зоните ще се използват при налични надеждни данни за пулс.", rows: ["Максимален пулс", "Зона 1", "Зона 2", "Зона 3", "Зона 4", "Зона 5"] },
  calculations: { title: "Изчисления", eyebrow: "Персонализация", description: "Преглед на методите за дневни цели и активност.", rows: ["Базов метаболизъм", "Дневен енергиен разход", "Тренировъчен обем"] },
  fasting: { title: "Периодично гладуване", eyebrow: "Персонализация", description: "Настройки за хранителен прозорец без автоматична промяна на целите.", rows: ["Изключено", "Начало на прозореца", "Край на прозореца"] },
  "ai-assistant": { title: "AI асистент", eyebrow: "Персонализация", description: "Управлявай дългосрочната памет на Pegas. Автоматичното запомняне остава винаги активно.", rows: [] },
  "whats-new": { title: "Какво ново", eyebrow: "Ресурси", description: "Последните подобрения в PegasOS.", rows: ["Автоматична AI памет", "Интегрирани тренировки", "Подобрени известия"] },
  "getting-started": { title: "Първи стъпки", eyebrow: "Ресурси", description: "Настрой основните части на твоя LifeOS.", rows: ["Попълни профила", "Задай цели", "Създай тренировка", "Добави първото хранене"] },
  knowledge: { title: "База знания", eyebrow: "Ресурси", description: "Кратки обяснения за основните модули.", rows: ["Home и Timeline", "Calendar", "Nutrition", "Fitness", "AI и памет"] },
  "feature-request": { title: "Предложи функция", eyebrow: "Ресурси", description: "Опиши какво искаш да бъде добавено в PegasOS.", rows: ["Отвори AI асистента и опиши предложението"] },
  "report-bug": { title: "Докладвай бъг", eyebrow: "Ресурси", description: "Добави точни стъпки и снимка, за да бъде проблемът възпроизведен.", rows: ["Отвори AI асистента и приложи снимка"] },
  terms: { title: "Условия", eyebrow: "Правни", description: "Условия за използване на PegasOS.", rows: ["Личните данни остават свързани с твоя акаунт", "Функциите не заменят медицински съвет"] },
  privacy: { title: "Поверителност", eyebrow: "Правни", description: "Как PegasOS използва информацията ти.", rows: ["Данните са защитени по потребител", "AI използва само релевантния разрешен контекст", "Паметта може да бъде преглеждана и изтривана"] },
};
