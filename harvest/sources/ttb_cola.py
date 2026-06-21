"""
TTB COLA public registry watcher.

The strongest signal for Daley: a foreign producer filing US label approvals,
especially their first, means US-entry intent before they have hired anyone to
sequence it. The public COLA registry is searchable and free.

VERIFIED 2026-06-20 against the live public registry
  The three VERIFY items from the original draft were confirmed and the code
  below now matches the live site:
    1. The public basic search is a session-based POST to PROCESS_URL (the
       criteria field names are in build_query()), not a GET against the form
       page. A first GET of SEARCH_URL establishes the JSESSIONID the POST needs.
    2. The results live in a nested layout table with no usable id, so
       _parse_results() anchors on each row's COLA-detail link and reads the ten
       public columns (order documented there). A live results sample is saved at
       data/samples/ttb-cola-results-sample-2026-06-20.html for re-derivation.
    3. This is the public registry; requests go through the polite session
       (truthful User-Agent, REQUEST_DELAY_SECONDS between calls).

Known limitations (worth a later enhancement, not blockers)
  - Only the first results page is parsed. The query filters origin in Python
    after the fetch (per the design below), so foreign filings beyond page one in
    a wide window can be missed. Daily runs use a short window, which keeps the
    result set small; widen with care.
  - The origin dropdown is JS-populated, so we cannot cheaply pre-filter by
    country code at query time. Pre-filtering server-side would tighten this.

"First filing" heuristic
  The registry shows approvals, not whether they are a brand's first. We
  approximate: keep a local set of applicants/brands we have already seen, and
  treat a brand not seen before as a candidate first-filing ("first_cola").
  Everything else from a watched origin is still logged, as "new_cola", and the
  qualification pass decides what matters.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

from bs4 import BeautifulSoup

from harvest.base import DATA_DIR, ParserDriftError, Signal, Source

# Public basic search form (GET) - first call establishes the session cookie.
SEARCH_URL = "https://ttbonline.gov/colasonline/publicSearchColasBasic.do"
# Where the search criteria are POSTed; results come back in the response body.
PROCESS_URL = "https://ttbonline.gov/colasonline/publicSearchColasBasicProcess.do?action=search"
# Detail links in the results are relative to the colasonline app root.
DETAIL_BASE = "https://ttbonline.gov/colasonline/"

# How far back each run looks. Daily runs only need a short window; widen it for
# the first backfill, then drop it back.
LOOKBACK_DAYS = 7

# Origins worth watching, matched against the parsed origin text (case-insensitive
# substring). Country names are robust even if the form's internal codes change.
WATCHED_ORIGINS = [
    "france", "chile", "italy", "spain", "argentina",
    "portugal", "south africa", "australia", "new zealand", "austria",
]

# Local memory of applicants/brands already seen, for the first-filing heuristic.
KNOWN_APPLICANTS_PATH = DATA_DIR / "ttb_known_applicants.json"


class TTBColaSource(Source):
    key = "ttb_cola"
    default_active = True

    def fetch(self) -> list[Signal]:
        end = date.today()
        start = end - timedelta(days=LOOKBACK_DAYS)
        html = self._search(start, end)
        rows = _parse_results(html)
        # Zero rows parsed from the table itself means the structure is gone, not
        # that there were no approvals - that is parser drift, so escalate it.
        # (Rows present but none matching watched origins is a normal empty and
        # is handled downstream, not here.)
        if not rows:
            raise ParserDriftError(
                "COLA search returned a response but no rows parsed - "
                "the results table structure has likely changed"
            )
        return self._rows_to_signals(rows)

    def _search(self, start: date, end: date) -> str:
        # The search POST needs the JSESSIONID the form page sets, so GET the form
        # first (also applies the polite delay), then POST the criteria.
        self.get(SEARCH_URL)
        resp = self.post(PROCESS_URL, data=build_query(start, end))
        return resp.text

    def _rows_to_signals(self, rows: list[dict]) -> list[Signal]:
        known = _load_known()
        signals: list[Signal] = []
        newly_seen: set[str] = set()

        for row in rows:
            origin = (row.get("origin") or "").strip()
            if not _origin_watched(origin):
                continue

            brand = (row.get("brand") or "").strip()
            applicant = (row.get("applicant") or "").strip()
            ident = (applicant or brand).lower()
            is_first = bool(ident) and ident not in known

            signals.append(
                Signal(
                    source=self.key,
                    signal_type="first_cola" if is_first else "new_cola",
                    title=f"{brand or applicant} - COLA approved ({origin})",
                    url=row.get("detail_url") or SEARCH_URL,
                    # observed_date is the day we saw it (today); the COLA's own
                    # completion date lives in raw["approved_date"]. Required arg,
                    # so pass it explicitly.
                    observed_date=date.today().isoformat(),
                    brand_guess=brand,
                    origin=origin,
                    raw={
                        "dedupe_key": row.get("ttb_id") or row.get("detail_url") or f"{ident}:{row.get('approved_date')}",
                        "applicant": applicant,
                        "class_type": row.get("class_type"),
                        "approved_date": row.get("approved_date"),
                        "first_filing_guess": is_first,
                    },
                )
            )
            if ident:
                newly_seen.add(ident)

        if newly_seen:
            _save_known(known | newly_seen)
        return signals


def build_query(start: date, end: date) -> dict:
    """Build the POST body for the public basic search. Field names verified
    against the live searchCriteriaForm on 2026-06-20."""
    fmt = "%m/%d/%Y"
    return {
        "searchCriteria.dateCompletedFrom": start.strftime(fmt),
        "searchCriteria.dateCompletedTo": end.strftime(fmt),
        # 0 = match any product/fanciful name (we filter on origin, not name).
        "searchCriteria.productNameSearchType": "0",
        # Blank origin code = all origins; we filter to WATCHED_ORIGINS in Python.
        "searchCriteria.originCode": "",
    }


def _parse_results(html: str) -> list[dict]:
    """Parse the results table into row dicts.

    The public basic results sit in a nested layout table with no usable id, so
    we anchor on each row's COLA-detail link rather than a table selector - that
    survives the surrounding layout markup. Column order on the live page
    (verified 2026-06-20, sample in data/samples/):

        0 TTB ID (link)  1 Permit No.  2 Serial Number  3 Completed Date
        4 Fanciful Name  5 Brand Name  6 Origin code    7 Origin Desc
        8 Class/Type code  9 Class/Type Desc

    Keep this function the *only* place that knows the page's HTML, so the rest of
    the watcher is unaffected when the site changes.
    """
    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict] = []

    for link in soup.select('a[href*="viewColaDetails.do"]'):
        tr = link.find_parent("tr")
        if tr is None:
            continue
        cells = tr.find_all("td", recursive=False)
        if len(cells) < 10:
            continue  # not a data row

        href = link.get("href", "")
        detail_url = href
        if href and not href.startswith("http"):
            detail_url = DETAIL_BASE + href.lstrip("/")

        rows.append(
            {
                "ttb_id": cells[0].get_text(strip=True),
                "detail_url": detail_url,
                "approved_date": cells[3].get_text(strip=True),
                "brand": cells[5].get_text(strip=True),
                "origin": cells[7].get_text(strip=True),
                "class_type": cells[9].get_text(strip=True),
                # The public basic results expose no separate applicant column;
                # the brand name carries the first-filing heuristic.
                "applicant": "",
            }
        )
    return rows


def _origin_watched(origin: str) -> bool:
    o = origin.lower()
    return any(w in o for w in WATCHED_ORIGINS)


def _load_known() -> set[str]:
    if not KNOWN_APPLICANTS_PATH.exists():
        return set()
    with KNOWN_APPLICANTS_PATH.open("r", encoding="utf-8") as fh:
        return set(json.load(fh))


def _save_known(known: set[str]) -> None:
    KNOWN_APPLICANTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with KNOWN_APPLICANTS_PATH.open("w", encoding="utf-8") as fh:
        json.dump(sorted(known), fh, indent=2, ensure_ascii=False)
