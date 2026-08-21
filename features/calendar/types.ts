export type CalendarItemType = "event" | "task" | "birthday" | "workout" | "meal" | "trip" | "reminder";
export type CalendarView = "month" | "week" | "day";
export type RecurrenceKind = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type CalendarItem = {
  id: string;
  type: CalendarItemType;
  sourceId: string;
  sourceType: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  allDay: boolean;
  completed?: boolean;
  category?: string | null;
  color: string;
  location?: string | null;
  recurring?: boolean;
  sticker?: string;
};

export type CalendarEventRow = {
  id: string; owner_id: string; title: string; description: string | null;
  starts_at: string | null; ends_at: string | null; start_date: string | null; end_date: string | null;
  all_day: boolean; timezone: string; location: string | null; category: string; color: string;
  recurrence_kind: RecurrenceKind; recurrence_interval: number; recurrence_end: string | null;
};

export type TaskRow = {
  id: string; owner_id: string; title: string; description: string | null; due_date: string | null;
  due_time: string | null; timezone: string; priority: "low" | "normal" | "high"; category: string | null;
  completed: boolean; completed_at: string | null; recurrence_kind: RecurrenceKind;
  recurrence_interval: number; recurrence_end: string | null;
};

export type BirthdayRow = {
  id: string; owner_id: string; person_name: string; birth_date: string;
  birth_year_known: boolean; notes: string | null;
};
