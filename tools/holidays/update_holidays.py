#!/usr/bin/env python3
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

OUT = Path("public/holidays/calendar.ics")

# Official holidays under Art. 154(1) of the Bulgarian Labour Code.
FIXED = [
    (1, 1, "🇧🇬 Нова година", True),
    (3, 3, "🇧🇬 Ден на Освобождението на България", True),
    (5, 1, "🇧🇬 Ден на труда", True),
    (5, 6, "🇧🇬 Гергьовден - Ден на храбростта и Българската армия", True),
    (5, 24, "🇧🇬 Ден на светите братя Кирил и Методий, на българската азбука, просвета и култура", True),
    (9, 6, "🇧🇬 Ден на Съединението", True),
    (9, 22, "🇧🇬 Ден на Независимостта", True),
    (11, 1, "🇧🇬 Ден на народните будители - неприсъствен за учебните заведения", False),
    (12, 24, "🎄 Бъдни вечер", True),
    (12, 25, "🎄 Рождество Христово", True),
    (12, 26, "🎄 Рождество Христово - втори ден", True),
]

# One-off non-working days formally declared by the Council of Ministers.
SPECIAL_DAYS = {
    date(2025, 12, 31): "🛌 Неприсъствен ден - решение на Министерския съвет",
    date(2026, 1, 2): "🛌 Неприсъствен ден - решение на Министерския съвет",
}


def orthodox_easter(year: int) -> date:
    # Meeus Julian algorithm, converted to Gregorian calendar.
    a = year % 4
    b = year % 7
    c = year % 19
    d = (19 * c + 15) % 30
    e = (2 * a + 4 * b - d + 34) % 7
    month = (d + e + 114) // 31
    day = ((d + e + 114) % 31) + 1
    julian = date(year, month, day)
    # 1900-2099: Gregorian calendar is 13 days ahead of Julian.
    return julian + timedelta(days=13)


def add_event(events, dt, title, kind="holiday"):
    events[dt] = (title, kind)


def year_events(year: int):
    events = {}

    # Fixed official holidays and substitute non-working days.
    occupied = set()
    substitutes = []
    for month, day, title, general_day_off in FIXED:
        dt = date(year, month, day)
        add_event(events, dt, title, "holiday" if general_day_off else "observance")
        if general_day_off:
            occupied.add(dt)
            if dt.weekday() >= 5:  # Saturday/Sunday
                substitutes.append((dt, title))

    # Easter holidays: Good Friday, Holy Saturday, Easter Sunday and Monday.
    easter = orthodox_easter(year)
    easter_days = [
        (easter - timedelta(days=2), "✝️ Велики петък"),
        (easter - timedelta(days=1), "✝️ Велика събота"),
        (easter, "✝️ Великден"),
        (easter + timedelta(days=1), "✝️ Светли понеделник"),
    ]
    for dt, title in easter_days:
        add_event(events, dt, title, "holiday")
        occupied.add(dt)

    # Labour Code Art. 154(2): when a fixed official holiday falls on a weekend,
    # the first following working day(s) are non-working. Easter is excluded.
    used_substitutes = set()
    for original, title in sorted(substitutes):
        candidate = original + timedelta(days=1)
        while candidate.weekday() >= 5 or candidate in occupied or candidate in used_substitutes:
            candidate += timedelta(days=1)
        add_event(events, candidate, f"🛌 Почивен ден заради {title.replace('🇧🇬 ', '').replace('🎄 ', '')}", "dayoff")
        used_substitutes.add(candidate)
        occupied.add(candidate)

    # Add formally declared one-off non-working days.
    for dt, title in SPECIAL_DAYS.items():
        if dt.year == year:
            add_event(events, dt, title, "dayoff")

    return events


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def build_ics(start_year: int, end_year: int) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Valyo//Bulgarian Holidays and Days Off//BG",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:🇧🇬 Български празници и почивни дни",
        "X-WR-CALDESC:Официални празници и неприсъствени дни в България",
    ]

    all_events = {}
    for year in range(start_year, end_year + 1):
        all_events.update(year_events(year))

    for dt, (title, kind) in sorted(all_events.items()):
        ds = dt.strftime("%Y%m%d")
        de = (dt + timedelta(days=1)).strftime("%Y%m%d")
        lines += [
            "BEGIN:VEVENT",
            f"UID:bg-holiday-{ds}-{kind}@valyo-bg",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{ds}",
            f"DTEND;VALUE=DATE:{de}",
            f"SUMMARY:{esc(title)}",
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
        ]

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


if __name__ == "__main__":
    current = datetime.now().year
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build_ics(current - 1, current + 9), encoding="utf-8", newline="")
    print(f"Wrote Bulgarian holidays for {current-1}-{current+9} to {OUT}")
