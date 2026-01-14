#!/usr/bin/env python3

import csv
import json
from collections import Counter
import re

CSV_FILE = "MetObjects_clean.csv"
OUT_FILE = "country_counts.json"

def normalize_country(name):
    if not name:
        return None

    n = name.strip().lower()

    n = re.sub(r"[\?\(\)\s]+$", "", n).strip()
    n = re.sub(r"^(Probably|Possible|Possibly|Central)\s+", "", n, flags=re.IGNORECASE).strip()

    if n.startswith("present-day "):
        n = n[len("present-day "):].strip()
        n = n.lower()

    # some manual 
    if n in ["united states", "usa", "u.s.a.", "us", "U.S.A", "United States|united States|united States"]:
        return "United States of America"
    if n in ["england", "scotland", "wales", "United States|united States", "England"]:
        return "United Kingdom"
    if n == "czech republic":
        return "Czechia"
    if n == "republic of the philippines":
        return "Phillippines"
    if n == "myanmar (formerly burma":
        return "Myanmar"
    if n == "republic of cameroon":
        return "Cameroon"
    if n == "croatia (former yugoslavia":
        return "Croatia"

    # title Case fallback
    return " ".join(word.capitalize() for word in n.split())


def main():
    counts = Counter()

    with open(CSV_FILE, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)

        for row in reader:
            raw_country = row.get("Country")
            country = normalize_country(raw_country)

            if not country:
                continue

            counts[country] += 1

    sorted_counts = dict(sorted(counts.items(), key=lambda kv: kv[1], reverse=True))

    with open(OUT_FILE, "w", encoding="utf-8") as out:
        json.dump(sorted_counts, out, indent=2, ensure_ascii=False)

    print(f"Wrote {len(sorted_counts)} normalized countries to {OUT_FILE}")

if __name__ == "__main__":
    main()
