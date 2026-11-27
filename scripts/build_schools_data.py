"""
Build src/data/schools-source.ts from the files in "Schools data/".

Every value in the output is copied from a source file. The only changes are
whitespace trimming, title-casing tehsil and level labels, and splitting the
male sheet's "Non-Functional – <reason>" cell into a status and a reason.
Nothing is estimated: a field the files do not give is written as null.

Run:  python -I scripts/build_schools_data.py && npx prettier --write src/data/schools-source.ts
"""

import json
import re
import sys
import zipfile
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Schools data"
OUT = ROOT / "src" / "data" / "schools-source.ts"

MALE_FILE = "Pattern for Schools Data-DEO(M)-NW-26.11.2026-FNL.xlsx"
FEMALE_FILE = "NON - FUNCTIONAL & COLSED FEMALE SCHOOLS NORTH WAZIRISTAN.xlsx"
COORD_FILE = "Coordinates File From IMU (1).xlsx"
PPTX_FILE = "Non Func School.pptx"

TEHSIL_LABEL = {
    "MIRALI": "Mirali",
    "MIRANSHAH": "Miranshah",
    "DATTA KHEL": "Datta Khel",
    "DOSSALI": "Dossali",
    "SPINWAM": "Spinwam",
    "SHEWA": "Shewa",
    "RAZMAK": "Razmak",
    "GHULAM KHAN": "Ghulam Khan",
    "GARYUM": "Garyum",
}
# Spellings of each tehsil that appear in the female sheet's location column.
TEHSIL_PATTERNS = {
    "Mirali": [r"\bmir ?ali\b"],
    "Miranshah": [r"\bmiran ?shah\b"],
    "Datta Khel": [r"\bdatta khel\b"],
    "Dossali": [r"\bdossali\b"],
    "Spinwam": [r"\bspinwam\b"],
    "Shewa": [r"\bshewa\b"],
    "Razmak": [r"\brazmak\b"],
    "Ghulam Khan": [r"\bghulam ?khan\b"],
    "Garyum": [r"\bgaryum\b"],
}
LEVEL_LABEL = {
    "PRIMARY": "Primary",
    "MIDDLE": "Middle",
    "HIGH": "High",
    "HIGHER SECONDARY": "Higher Secondary",
}


def clean(v):
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    s = s.rstrip(",").strip()
    return s or None


def emis_of(v):
    s = clean(v)
    if s is None:
        return None
    if re.fullmatch(r"\d+(\.0)?", s):
        return s.split(".")[0]
    return s


def rows(path, start):
    wb = openpyxl.load_workbook(path, data_only=True)
    return list(wb.worksheets[0].iter_rows(min_row=start, values_only=True))


def load_coords():
    out = {}
    for r in rows(SRC / COORD_FILE, 3):
        e = emis_of(r[0])
        if e and isinstance(r[2], (int, float)) and isinstance(r[3], (int, float)):
            out[e] = (round(float(r[2]), 6), round(float(r[3]), 6))
    return out


def load_remarks():
    """EMIS -> remark text from the DEO's non-functional schools review slides."""
    z = zipfile.ZipFile(SRC / PPTX_FILE)
    names = sorted(
        (n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
        key=lambda n: int(re.search(r"(\d+)", n).group(1)),
    )
    out = {}
    for n in names:
        xml = z.read(n).decode("utf8")
        for tr in re.findall(r"<a:tr\b.*?</a:tr>", xml, re.S):
            cells = [
                "".join(re.findall(r"<a:t>([^<]*)</a:t>", c))
                for c in re.findall(r"<a:tc\b[^>]*>(.*?)</a:tc>", tr, re.S)
            ]
            cells = [clean(c.replace("&amp;", "&")) for c in cells]
            idx = next(
                (i for i, c in enumerate(cells[:3]) if c and re.fullmatch(r"\d{5}", c)),
                None,
            )
            if idx is None:
                continue
            remark = cells[-1] if len(cells) > idx + 2 else None
            if remark:
                remark = re.sub(r"\s+([.,])", r"\1", remark).strip()
            if not remark or remark in {"-", "."}:
                continue
            out[cells[idx]] = remark
    return out


def tehsil_from_location(loc):
    if not loc:
        return None
    low = loc.lower()
    hits = [t for t, pats in TEHSIL_PATTERNS.items() if any(re.search(p, low) for p in pats)]
    return hits[0] if len(hits) == 1 else None


def main():
    coords = load_coords()
    remarks = load_remarks()
    records = []

    # Male schools: DEO(M) North Waziristan basic information, 26 Nov 2026.
    for r in rows(SRC / MALE_FILE, 6):
        if r[0] is None or r[1] is None:
            continue
        emis = emis_of(r[2])
        raw_status = clean(r[6]) or ""
        m = re.match(r"non-functional\s*[–—-]\s*(.+)$", raw_status, re.I)
        functional = raw_status.lower() == "functional"
        lat, lng = coords.get(emis, (None, None))
        records.append(
            {
                "source": "male",
                "serial": int(r[0]),
                "emis": emis,
                "name": clean(r[1]),
                "level": LEVEL_LABEL[clean(r[3]).upper()],
                "gender": "Boys",
                "tehsil": TEHSIL_LABEL[clean(r[4]).upper()],
                "tehsilStated": True,
                "village": clean(r[5]),
                "status": "Functional" if functional else "Non-functional",
                "statusText": raw_status,
                "reason": clean(m.group(1)) if m else clean(r[8]),
                "students": r[9] if isinstance(r[9], int) else None,
                "teachers": r[10] if isinstance(r[10], int) else None,
                "principal": clean(r[11]),
                "lat": lat,
                "lng": lng,
                "deoRemark": remarks.get(emis) if emis else None,
            }
        )

    # Female schools: non-functional & closed list for North Waziristan.
    for r in rows(SRC / FEMALE_FILE, 3):
        if not isinstance(r[0], int) or r[1] is None:
            continue
        emis = emis_of(r[2])
        raw_status = clean(r[5]) or ""
        closed = raw_status.lower().startswith("closed")
        loc = clean(r[4])
        tehsil = tehsil_from_location(loc)
        lat, lng = coords.get(emis, (None, None)) if emis else (None, None)
        records.append(
            {
                "source": "female",
                "serial": r[0],
                "emis": emis,
                "name": clean(r[1]),
                "level": LEVEL_LABEL[clean(r[3]).upper()],
                "gender": "Girls",
                "tehsil": tehsil,
                "tehsilStated": tehsil is not None,
                "village": loc,
                "status": "Closed" if closed else "Non-functional",
                "statusText": raw_status,
                "reason": clean(r[6]),
                "students": None,
                "teachers": None,
                "principal": None,
                "lat": lat,
                "lng": lng,
                "deoRemark": remarks.get(emis) if emis else None,
            }
        )

    ids = [r["emis"] for r in records if r["emis"]]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate EMIS codes across files")

    unmatched_remarks = sorted(set(remarks) - set(ids))
    body = json.dumps(records, ensure_ascii=False, indent=1)
    OUT.write_text(
        "/**\n"
        " * North Waziristan school register, copied from the files in \"Schools data/\".\n"
        " * Built by scripts/build_schools_data.py (then prettier). Re-run it instead of editing by hand.\n"
        " *\n"
        f" * - {MALE_FILE} (male schools, DEO(M) NW, 26 Nov 2026)\n"
        f" * - {FEMALE_FILE} (female non-functional & closed)\n"
        f" * - {COORD_FILE} (latitude / longitude by EMIS)\n"
        f" * - {PPTX_FILE} (DEO review remarks by EMIS)\n"
        " *\n"
        " * null means the source files do not give that value.\n"
        " */\n"
        'import type { SchoolSourceRecord } from "./school-types";\n\n'
        f"export const SCHOOL_SOURCE: SchoolSourceRecord[] = {body};\n",
        encoding="utf8",
        newline="\n",
    )
    print(
        f"{len(records)} schools written "
        f"({sum(r['source']=='male' for r in records)} male, {sum(r['source']=='female' for r in records)} female); "
        f"coords {sum(r['lat'] is not None for r in records)}; remarks {sum(r['deoRemark'] is not None for r in records)}; "
        f"remarks with no matching school: {unmatched_remarks}"
    )


if __name__ == "__main__":
    main()
