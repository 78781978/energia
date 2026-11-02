#!/usr/bin/env python3
"""
Importer treści podstron z plików .docx (materialy/tresci) do content/services.json.

Uruchomienie (wymaga pandoc):
    python3 scripts/import_content.py

Skrypt:
  * dzieli dokumenty na podstrony usług (H1, lead, treść, CTA, FAQ, SEO),
  * wyciąga teksty stron nadrzędnych kategorii i wspólne moduły portalu,
  * pomija komentarze redakcyjne (rekomendacje SEO, wskazówki „jak nie powielać treści” itp.),
  * zapisuje raport braków do content/import-report.json.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "materialy" / "tresci"
OUT = ROOT / "content"

CATEGORY_FILES = [
    (1, "1._pierwsza_grupa_podstron_zakup_energii.docx"),
    (2, "2._materialy_na_podstrone_audyt_kosztow_energii_.docx"),
    (3, "3_kategoria_podstron_prad_budowlany.docx"),
    (4, "4_podstrona_tresc_energia_bierna_.docx"),
    (5, "5_podstrony_tresc_magazyny_i_fotowoltaika.docx"),
    (6, "6_podstrona_PPA_tresc_na_podstrony_.docx"),
    (7, "7._spoldzielnie_energetycze_podstrony_tresc.docx"),
    (8, "8._sluzebnosc_przesylu_WYPOWUEDZENIA_POMOc_prawna_TRESC_PDOSTRON.docx"),
    (9, "9_DORADZTWO_OPIEKA_ENERGETYCZNA_ENERGIA_360_TRESCI_PODTSRON.docx"),
    (10, "10._SERWIS_ENERGETYCZNY_tresc_podstrony.docx"),
]

HEADER_RE = re.compile(r"^\*\*(\d+)\.\s+(.+?)\*\*\s*$")
BOLD_LINE_RE = re.compile(r"^\*\*(.+?)\*\*\s*$")
CTA_RE = re.compile(r"^\\\[(.+?)\\\]\s*$")
FAQ_MARK_RE = re.compile(r"^(\*\*)?(Unikatowe\s+)?FAQ(\s|\*\*|$|:)", re.I)
SEO_MARK_RE = re.compile(r"^(\*\*)?SEO(\b|:)", re.I)
JUNK_RE = re.compile(r"^(Kopiuj wszystkie pytania i odpowiedzi|Kopiuj)\s*$")


def docx_to_lines(path: Path) -> list[str]:
    md = subprocess.run(
        ["pandoc", str(path), "-t", "gfm", "--wrap=none"],
        check=True, capture_output=True, text=True,
    ).stdout
    lines = []
    for raw in md.splitlines():
        line = raw.replace(" ", " ").rstrip()
        line = re.sub(r"\\$", "", line).rstrip()  # twarde łamania pandoc
        if not line.strip():
            continue
        lines.append(line.strip())
    return lines


def clean_inline(text: str) -> str:
    text = text.replace("\\|", "|").replace("\\[", "[").replace("\\]", "]")
    text = text.replace("\\-", "-").replace("\\*", "*")
    return text.strip()


def strip_bold(text: str) -> str:
    return clean_inline(text.replace("**", "")).strip()


def slugify(text: str) -> str:
    tr = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")
    t = text.translate(tr).lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t


# ---------------------------------------------------------------- FAQ / SEO

def parse_faq(lines: list[str]) -> tuple[list[dict], list[str]]:
    items: list[dict] = []
    missing: list[str] = []
    pending_q = None
    for line in lines:
        if JUNK_RE.match(line):
            continue
        text = strip_bold(line)
        if not text:
            continue
        if text.startswith("Te pytania") or text.startswith("Poniższe odpowiedzi") or text.lower().startswith("odpowiedzi są"):
            continue
        qpos = text.find("?")
        if qpos != -1 and len(text) - qpos > 12:
            # pytanie i odpowiedź w jednej linii
            if pending_q:
                missing.append(pending_q)
            items.append({"q": text[: qpos + 1].strip(), "a": text[qpos + 1 :].strip()})
            pending_q = None
        elif text.endswith("?"):
            if pending_q:
                missing.append(pending_q)
            pending_q = text
        else:
            if pending_q:
                items.append({"q": pending_q, "a": text})
                pending_q = None
            elif items:
                items[-1]["a"] += "\n\n" + text
    if pending_q:
        missing.append(pending_q)
    return items, missing


SEO_KEYS = [
    ("metaTitle", r"(?:Meta title|META TITLE|SEO Title)"),
    ("metaDescription", r"(?:Meta description|META DESCRIPTION)"),
    ("h1", r"(?:H1 – NAGŁÓWEK STRONY|H1)"),
    ("url", r"(?:ADRES URL|Adres URL|URL)"),
    ("keywords", r"(?:Frazy kluczowe|Frazy|Słowa kluczowe)"),
    ("_stop", r"(?:Pytanie pod AI|CTA główne|Portal online|Dane strukturalne|FAQ|Linkowanie wewnętrzne|Główne CTA)"),
]


def parse_seo(lines: list[str]) -> dict:
    text = "\n".join(clean_inline(l.replace("**", "")) for l in lines)
    text = re.sub(r"\|\s*-+\s*\|[\s\-|]*", " ", text)  # separatory tabel
    text = re.sub(r"\|\s*Element\s*\|\s*Propozycja\s*\|", " ", text)
    text = re.sub(r"^SEO( strony nadrzędnej)?:?", " ", text)
    marks = []
    for key, pat in SEO_KEYS:
        for m in re.finditer(r"(?:(?<=\s)|(?<=\|)|^)" + pat + r"\s*(?::|\||\n)", text, flags=re.M | re.I):
            marks.append((m.start(), m.end(), key))
    marks.sort()
    # usuń nakładające się dopasowania (np. „URL” wewnątrz „ADRES URL”)
    filtered = []
    for mk in marks:
        if filtered and mk[0] < filtered[-1][1]:
            continue
        filtered.append(mk)
    out: dict = {}
    for i, (s, e, key) in enumerate(filtered):
        end = filtered[i + 1][0] if i + 1 < len(filtered) else len(text)
        val = text[e:end]
        val = re.sub(r"\s*\|\s*", " ", val).strip(" |:-\n")
        val = re.sub(r"\s+", " ", val).strip()
        if key == "_stop" or not val or key in out:
            continue
        out[key] = val
    if "url" in out:
        m = re.search(r"/[a-z0-9\-/]+/?", out["url"])
        out["url"] = m.group(0).strip("/") if m else None
    if "keywords" in out:
        kw = out["keywords"].rstrip(".")
        out["keywords"] = [k.strip() for k in re.split(r",", kw) if k.strip()]
    return out


# ---------------------------------------------------------------- body

def build_body(lines: list[str]) -> tuple[str, list[str], str | None]:
    """Zwraca (markdown treści, lista CTA, zdanie-podsumowanie)."""
    md: list[str] = []
    ctas: list[str] = []
    in_list = False
    lines = [l for l in lines if not JUNK_RE.match(l)]
    for i, line in enumerate(lines):
        m = CTA_RE.match(line)
        if m:
            label = clean_inline(m.group(1))
            ctas.append(label)
            md.append("")
            md.append("{{cta|" + label + "}}")
            in_list = False
            continue
        b = BOLD_LINE_RE.match(line)
        if b and "**" not in b.group(1):
            heading = clean_inline(b.group(1))
            next_is_cta = i + 1 < len(lines) and CTA_RE.match(lines[i + 1])
            md.append("")
            if next_is_cta:
                md.append("{{callout|" + heading + "}}")
            else:
                md.append(("### " if re.match(r"^(Krok\s+)?\d+\.\s", heading) else "## ") + heading)
            md.append("")
            in_list = False
            continue
        if line.startswith("- ") or line.startswith("• "):
            if not in_list:
                md.append("")
            md.append("- " + clean_inline(line[2:]))
            in_list = True
            continue
        if line.startswith("|"):
            md.append(clean_inline(line).replace("**", "**"))
            in_list = False
            continue
        if in_list:
            md.append("")
            in_list = False
        md.append(clean_inline(line))
        md.append("")
    text = "\n".join(md)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    # Zdanie zamykające (ostatni nagłówek bez treści za nim) => tagline
    tagline = None
    m = re.search(r"\n## ([^\n]+)\s*$", "\n" + text)
    if m:
        tagline = m.group(1).strip()
        text = text[: len(text) - len(m.group(0)) + 1].rstrip()
    # sąsiednie przyciski CTA łączymy w jedną grupę
    text = re.sub(r"\}\}\n\n\{\{cta\|", "}}\n{{cta|", text)
    # tabele: pandoc gfm potrzebuje pustej linii przed tabelą
    text = re.sub(r"([^\n|])\n(\|)", r"\1\n\n\2", text)
    return text, ctas, tagline


def take_h1_lead(lines: list[str]) -> tuple[str | None, str | None, list[str]]:
    h1 = lead = None
    rest = list(lines)
    if rest and BOLD_LINE_RE.match(rest[0]):
        h1 = strip_bold(rest.pop(0))
        if rest and BOLD_LINE_RE.match(rest[0]) and not rest[0].strip("* ").startswith("Energia w Biznesie"):
            nxt = strip_bold(rest[0])
            if not nxt.endswith("?") or len(nxt) > 60:
                lead = nxt
                rest.pop(0)
    return h1, lead, rest


def split_sections(lines: list[str]):
    sections = []
    cur = None
    for line in lines:
        m = HEADER_RE.match(line)
        if m:
            cur = {"num": int(m.group(1)), "title": strip_bold(m.group(2)), "lines": []}
            sections.append(cur)
        elif cur is not None:
            cur["lines"].append(line)
    return sections


def parse_service_section(sec, report, cat_num):
    body_lines, faq_lines, seo_lines = [], [], []
    mode = "body"
    for line in sec["lines"]:
        plain = line.replace("**", "").strip()
        if FAQ_MARK_RE.match(line) or FAQ_MARK_RE.match(plain):
            mode = "faq"
            continue
        if SEO_MARK_RE.match(plain):
            mode = "seo"
            seo_lines.append(plain)
            continue
        if mode == "body":
            body_lines.append(line)
        elif mode == "faq":
            faq_lines.append(line)
        else:
            seo_lines.append(line)
    h1, lead, rest = take_h1_lead(body_lines)
    body, ctas, tagline = build_body(rest)
    faq, missing = parse_faq(faq_lines)
    seo = parse_seo(seo_lines)
    title = re.sub(r"\s+–.*$", "", sec["title"]) if len(sec["title"]) > 70 else sec["title"]
    slug = seo.get("url") or slugify(title)
    page = {
        "category": cat_num,
        "name": sec["title"],
        "slug": slug,
        "h1": h1 or sec["title"],
        "lead": lead,
        "body": body,
        "tagline": tagline,
        "ctas": ctas,
        "faq": faq,
        "metaTitle": seo.get("metaTitle"),
        "metaDescription": seo.get("metaDescription"),
        "keywords": seo.get("keywords", []),
    }
    issues = []
    if missing:
        issues.append({"type": "faq_bez_odpowiedzi", "pytania": missing})
    for k in ("metaTitle", "metaDescription"):
        if not page[k]:
            issues.append({"type": "brak_" + k})
    if not seo.get("url"):
        issues.append({"type": "brak_url", "uzyto": slug})
    if issues:
        report.append({"strona": page["name"], "slug": slug, "problemy": issues})
    return page


def parse_parent(sec):
    lines = list(sec["lines"])
    while lines and not BOLD_LINE_RE.match(lines[0]):
        lines.pop(0)  # komentarz redakcyjny przed właściwym tekstem
    h1, lead, rest = take_h1_lead(lines)
    # odetnij ewentualne SEO strony nadrzędnej
    body_lines, seo_lines, mode = [], [], "body"
    for line in rest:
        plain = line.replace("**", "").strip()
        if SEO_MARK_RE.match(plain) or plain.startswith("Meta title"):
            mode = "seo"
        (body_lines if mode == "body" else seo_lines).append(line)
    body, ctas, tagline = build_body(body_lines)
    seo = parse_seo(seo_lines) if seo_lines else {}
    return {"h1": h1, "lead": lead, "body": body, "ctas": ctas, "tagline": tagline,
            "metaTitle": seo.get("metaTitle"), "metaDescription": seo.get("metaDescription")}


def parse_module(sec):
    lines = [l for l in sec["lines"]]
    # pomiń zdanie wprowadzające redaktora
    while lines and not BOLD_LINE_RE.match(lines[0]):
        lines.pop(0)
    h1, lead, rest = take_h1_lead(lines)
    body, ctas, tagline = build_body(rest)
    return {"title": h1, "body": body, "ctas": ctas, "tagline": tagline}


def parse_regular(cat_num, lines, report):
    pages, parent, module = [], None, None
    for sec in split_sections(lines):
        joined = "\n".join(sec["lines"])
        t = sec["title"].lower()
        if "nadrzędn" in t:
            parent = parse_parent(sec)
        elif "wspólny moduł" in t or "gotowy wspólny moduł" in t:
            module = parse_module(sec)
        elif re.search(r"Meta title|META TITLE|URL", joined) and sec["lines"] and BOLD_LINE_RE.match(sec["lines"][0]):
            pages.append(parse_service_section(sec, report, cat_num))
    return pages, parent, module


def parse_category1(lines, report):
    """Plik 1 ma inny układ: każda podstrona zaczyna się od „1. Gotowa/Gotowy tekst…”."""
    starts = [i for i, l in enumerate(lines) if re.match(r"^\*\*1\.\s+Gotow", l)]
    pages = []
    for n, s in enumerate(starts):
        e = starts[n + 1] if n + 1 < len(starts) else len(lines)
        chunk = lines[s:e]
        secs = split_sections(chunk)
        faq_idx = next((i for i, l in enumerate(chunk) if re.match(r"^\*\*2\.\s+FAQ", l)), len(chunk))
        body_sec = {"lines": chunk[1:faq_idx]}
        faq_sec = next((x for x in secs if x["title"].startswith("FAQ")), None)
        seo_sec = next((x for x in secs if "SEO" in x["title"] and "Ustawienia" in x["title"]), None)
        if seo_sec is None:
            seo_sec = next((x for x in secs if "sztuczna inteligencja" in x["title"]), None)
        # Akapity redakcyjne po treści (przed kolejnym „1. Gotowy”) są w ostatniej sekcji – pomijamy.
        h1, lead, rest = take_h1_lead(body_sec["lines"])
        body, ctas, tagline = build_body(rest)
        faq, missing = parse_faq(faq_sec["lines"]) if faq_sec else ([], [])
        seo = parse_seo(seo_sec["lines"]) if seo_sec else {}
        if not seo.get("metaTitle") and seo_sec:
            # tabela „Element | Co wdrożyć”
            tbl = {}
            for l in seo_sec["lines"]:
                cells = [c.strip(" *") for c in l.strip("|").split("|")]
                if len(cells) >= 2:
                    tbl[cells[0]] = cells[1]
            seo = {
                "metaTitle": clean_inline(tbl.get("SEO Title", "")) or None,
                "metaDescription": clean_inline(tbl.get("Meta Description", "")) or None,
                "url": (tbl.get("Adres URL", "").strip("/") or None),
            }
        name = h1.split(" – ")[0] if h1 else f"Podstrona {n+1}"
        slug = seo.get("url") or slugify(name)
        page = {
            "category": 1, "name": name, "slug": slug, "h1": h1, "lead": lead, "body": body,
            "tagline": tagline, "ctas": ctas, "faq": faq,
            "metaTitle": seo.get("metaTitle"), "metaDescription": seo.get("metaDescription"),
            "keywords": seo.get("keywords", []),
        }
        issues = []
        if missing:
            issues.append({"type": "faq_bez_odpowiedzi", "pytania": missing})
        if not seo.get("url"):
            issues.append({"type": "brak_url", "uzyto": slug})
        if issues:
            report.append({"strona": name, "slug": slug, "problemy": issues})
        pages.append(page)
    return pages


def main():
    OUT.mkdir(exist_ok=True)
    report: list = []
    all_pages, parents, modules = [], {}, {}
    for num, fname in CATEGORY_FILES:
        path = SRC / fname
        if not path.exists():
            print("Brak pliku:", path, file=sys.stderr)
            continue
        lines = docx_to_lines(path)
        if num == 1:
            pages = parse_category1(lines, report)
            parent = module = None
        else:
            pages, parent, module = parse_regular(num, lines, report)
        all_pages += pages
        if parent:
            parents[num] = parent
        if module:
            modules[num] = module
        print(f"Kategoria {num}: {len(pages)} podstron, nadrzędna: {'tak' if parent else 'nie'}, moduł: {'tak' if module else 'nie'}")
    data = {"pages": all_pages, "parents": parents, "modules": modules}
    (OUT / "services.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "import-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Razem podstron:", len(all_pages), "| zgłoszeń w raporcie:", len(report))


if __name__ == "__main__":
    main()
