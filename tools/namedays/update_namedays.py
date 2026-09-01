#!/usr/bin/env python3
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

SOURCE = "https://www.webcal.guru/bg-BG/%D1%81%D0%BF%D0%B8%D1%81%D1%8A%D0%BA_%D1%81%D1%8A%D1%81_%D1%81%D1%8A%D0%B1%D0%B8%D1%82%D0%B8%D1%8F/name_days_bulgaria"
OUT = Path("public/namedays/calendar.ics")

EXCEPTIONS = {
    "Aleko":"Алеко","Aleksandar":"Александър","Aleksandra":"Александра","Ana":"Ана","Anna":"Анна","Anushka":"Анушка",
    "Andon":"Андон","Anton":"Антон","Antonia":"Антония","Atanas":"Атанас","Atanaska":"Атанаска","Adrian":"Адриан","Adriana":"Адриана","Adriyan":"Адриан","Adriyana":"Адриана",
    "Anastas":"Анастас","Anastasi":"Анастаси","Anastasiya":"Анастасия","Andrei":"Андрей","Angel":"Ангел",
    "Bogdan":"Богдан","Bogdana":"Богдана","Bogomil":"Богомил","Bogomila":"Богомила",
    "Dana":"Дана","Danail":"Данаил","Danaila":"Данаила","Daniela":"Даниела","Dimitar":"Димитър","Dimitrina":"Димитрина","Dona":"Дона","Doncho":"Дончо","Donka":"Донка",
    "Efimir":"Ефимир","Ekaterina":"Екатерина","Elisaveta":"Елисавета","Emil":"Емил","Emilian":"Емилиан","Emiliya":"Емилия","Evgeni":"Евгени","Evgeniya":"Евгения","Evlogi":"Евлоги","Evtim":"Евтим","Evtimiya":"Евтимия",
    "Filio":"Фильо","Filip":"Филип","Filipa":"Филипа","Gavrail":"Гавраил","Gavril":"Гаврил","Grigor":"Григор",
    "Haralampi":"Харалампи","Hari":"Хари","Hristina":"Христина","Hristo":"Христо","Ignat":"Игнат","Ioan":"Йоан","Iordan":"Йордан","Iordanka":"Йорданка","Iosif":"Йосиф","Ivan":"Иван","Ivanka":"Иванка","Ivayla":"Ивайла","Ivaylo":"Ивайло","Ivet":"Ивет",
    "Kaloian":"Калоян","Kaloyan":"Калоян","Katerina":"Катерина","Katina":"Катина","Katya":"Катя","Kliment":"Климент","Klimentina":"Климентина","Krustan":"Кръстан","Krustina":"Кръстина","Krustyo":"Кръстьо",
    "Lyuba":"Люба","Lyuben":"Любен","Lyubomir":"Любомир","Lyubov":"Любов","Lyudmil":"Людмил","Lyudmila":"Людмила",
    "Maksim":"Максим","Mariya":"Мария","Matei":"Матей","Mihaela":"Михаела","Mihail":"Михаил","Minka":"Минка","Minko":"Минко","Mitko":"Митко","Momchil":"Момчил",
    "Nadezhda":"Надежда","Nadya":"Надя","Natali":"Натали","Nataliya":"Наталия","Nestor":"Нестор","Nikola":"Никола","Nikolai":"Николай","Nina":"Нина","Nusha":"Нуша",
    "Ognyan":"Огнян","Ognyana":"Огняна","Pencho":"Пенчо","Penka":"Пенка","Petka":"Петка","Petko":"Петко","Plamen":"Пламен","Plamena":"Пламена",
    "Rada":"Рада","Radka":"Радка","Radko":"Радко","Rafail":"Рафаил","Raia":"Рая","Raika":"Райка","Raina":"Райна","Rangel":"Рангел",
    "Sava":"Сава","Sevda":"Севда","Sergei":"Сергей","Silva":"Силва","Silvana":"Силвана","Silviya":"Силвия","Simeon":"Симеон","Simona":"Симона","Snezhala":"Снежана","Sofiya":"София","Stanimir":"Станимир","Stanka":"Станка","Stanko":"Станко","Stanislav":"Станислав","Stavri":"Ставри","Stefan":"Стефан","Stefka":"Стефка","Stilyan":"Стилиян","Stilyana":"Стилияна","Stoycho":"Стойчо","Svetla":"Светла","Svetlana":"Светлана","Svetlomir":"Светломир",
    "Tanya":"Таня","Tatyana":"Татяна","Teodosii":"Теодосий","Trifon":"Трифон","Valentin":"Валентин","Valentina":"Валентина","Vanya":"Ваня","Vanyo":"Ваньо","Varvara":"Варвара","Vasil":"Васил","Vasilena":"Василена","Vera":"Вера","Vesela":"Весела","Veselin":"Веселин","Veselina":"Веселина","Viktor":"Виктор","Viktoriya":"Виктория","Vyara":"Вяра","Zahari":"Захари","Zhan":"Жан","Zhana":"Жана","Zlata":"Злата","Zlatan":"Златан","Zlatka":"Златка","Zlatko":"Златко","Zlatomir":"Златомир"
}

MAP = [("sht","щ"),("Sht","Щ"),("zh","ж"),("Zh","Ж"),("ch","ч"),("Ch","Ч"),("sh","ш"),("Sh","Ш"),("yu","ю"),("Yu","Ю"),("ya","я"),("Ya","Я"),("yo","ьо"),("Yo","Ьо")]
SINGLE = str.maketrans({"a":"а","b":"б","v":"в","g":"г","d":"д","e":"е","z":"з","i":"и","y":"й","k":"к","l":"л","m":"м","n":"н","o":"о","p":"п","r":"р","s":"с","t":"т","f":"ф","h":"х","c":"ц","A":"А","B":"Б","V":"В","G":"Г","D":"Д","E":"Е","Z":"З","I":"И","Y":"Й","K":"К","L":"Л","M":"М","N":"Н","O":"О","P":"П","R":"Р","S":"С","T":"Т","F":"Ф","H":"Х","C":"Ц"})

def bg(name):
    name = name.strip()
    if name in EXCEPTIONS:
        return EXCEPTIONS[name]
    x = name
    for a,b in MAP:
        x = x.replace(a,b)
    return x.translate(SINGLE)

def fetch_events():
    req = Request(SOURCE, headers={"User-Agent":"Mozilla/5.0 BulgarianNameDaysCalendar/1.0"})
    html = urlopen(req, timeout=30).read().decode("utf-8", "replace")
    soup = BeautifulSoup(html, "html.parser")
    events = {}
    date_re = re.compile(r"(\d{1,2})\.(\d{1,2})\.(\d{2,4})")
    for tr in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td","th"])]
        if not cells:
            continue
        joined = " | ".join(cells)
        m = date_re.search(joined)
        if not m:
            continue
        d, mo, y = map(int, m.groups())
        if y < 100:
            y += 2000
        # Event text is normally the last cell. Ignore weekday/date columns.
        title = cells[-1].strip()
        if not title or date_re.search(title):
            continue
        if title.lower() in {"monday","tuesday","wednesday","thursday","friday","saturday","sunday"}:
            continue
        names = [n.strip() for n in title.split(",") if n.strip()]
        if not names:
            continue
        try:
            dt = datetime(y, mo, d)
        except ValueError:
            continue
        key = dt.strftime("%Y%m%d")
        events[key] = ", ".join(bg(n) for n in names)
    if not events:
        raise RuntimeError("No name-day events parsed from source")
    return events

def esc(s):
    return s.replace("\\","\\\\").replace(",","\\,").replace(";","\\;").replace("\n","\\n")

def build_ics(events):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Valyo//Bulgarian Name Days//BG",
        "CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:🇧🇬 Български имени дни",
        "X-WR-CALDESC:Български имени дни на кирилица - автоматично обновявани"
    ]
    for date, names in sorted(events.items()):
        dt = datetime.strptime(date, "%Y%m%d")
        end = dt.fromordinal(dt.toordinal()+1).strftime("%Y%m%d")
        lines += [
            "BEGIN:VEVENT",
            f"UID:nameday-{date}@valyo-bg",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{date}",
            f"DTEND;VALUE=DATE:{end}",
            f"SUMMARY:{esc('🎉 Имен ден: ' + names)}",
            "TRANSP:TRANSPARENT",
            "END:VEVENT"
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"

if __name__ == "__main__":
    events = fetch_events()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build_ics(events), encoding="utf-8", newline="")
    print(f"Wrote {len(events)} events to {OUT}")
