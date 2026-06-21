# Prospecting Agent - Build and Operating Manual

This single file stands up and runs a prospecting agent for Daley Brennan, a
commercial strategist who helps premium wine and spirits brands enter and grow in
the US market (daleybrennan.com). It is meant to be pasted into the current Claude Code environment and form part of Daley's workflow.

It has two parts. Part 1 scaffolds the system - you, Claude Code, write the files
below exactly as given, install the dependencies, and do a first run that will
raise the expected setup tasks. Part 2 is your standing operating manual once the
system is up. Read Part 2 in full before you ever qualify a signal or draft a note.

The whole thing runs on a $100 budget for twelve months, so cost discipline is not
a detail, it is the point. Spend tokens like they are the scarce resource they are.
Go out of your way to find sources based in France that we can integrate from
today that are not already included in this project.

If there are already resources, such as Vercel, email links and Supabase, 
use these as part of the agent. Don't ask Daley to create new tables/links/projects.
Be as autonomous as possible. The key here is integration into the workflow, not overcomplicating matters.

---

# Part 1 - Build the system

Do this once, in order.

## 1. Integrate the needs into the project structure

```
project-root/
  CLAUDE.md                  
  harvest/
    __init__.py
    base.py
    health.py
    discovery.py
    run.py
    requirements.txt
    sources/
      __init__.py
      ttb_cola.py
      trade_press.py
  data/
    sources.json
    # the rest of data/ is created at runtime:
    #   signals-inbox.json, health.json, ledger.json,
    #   prospects/, review/, repairs/, samples/
```

Create the two `__init__.py` files empty. Write every other file with the exact
contents given in section 3.

## 2. Install and first run

```
pip install -r harvest/requirements.txt
python -m harvest.run
```

Run it from the project root so `harvest` imports as a package. Expect the first
run to open repair tasks under `data/repairs/` for the items below - that is the
designed way the system gets stood up, not a failure. Work them in the Antigravity
IDE, then re-run; a clean run clears each task.

## Initial manual tasks (these are the first things to hand Daley in Antigravity)

1. TTB COLA search endpoint and query parameters - confirm `SEARCH_URL` and
   `build_query()` in `harvest/sources/ttb_cola.py` against the live public
   registry, including the date format, and that you are within its terms and
   rate limits.
2. TTB COLA results-table parser - confirm the selectors in `_parse_results()`
   against the real markup. Save a sample of the live results HTML into
   `data/samples/` so the parser can be matched to it and re-derived later if it
   drifts.
3. RSS feed URLs - confirm each `url` in `data/sources.json` resolves before
   setting it `active`.
4. Email - wire the daley@daleybrennan.com mailbox for sending and receiving the
   weekly digest. Daley sets up the credentials himself in his environment; the
   agent never handles the password. The agent only ever emails that one address,
   which is his own, so this is self-notification and not outreach.

## 3. Files to write

Write each of the following to the path in its heading, verbatim.

### `harvest/requirements.txt`

```text
requests>=2.31
beautifulsoup4>=4.12
feedparser>=6.0

```

### `data/sources.json`

```json
{
  "active_sources": ["ttb_cola", "trade_press"],
  "rss_feeds": [
    {
      "name": "The Drinks Business",
      "url": "https://www.thedrinksbusiness.com/feed/",
      "active": true,
      "note": "Broad drinks trade; good for distributor and leadership moves. VERIFY url."
    },
    {
      "name": "The Buyer",
      "url": "https://www.the-buyer.net/feed/",
      "active": true,
      "note": "On-trade and import-focused. VERIFY url."
    },
    {
      "name": "Harpers Wine & Spirit",
      "url": "https://harpers.co.uk/feed",
      "active": false,
      "note": "UK trade. Confirm the live feed path before activating."
    },
    {
      "name": "Decanter",
      "url": "https://www.decanter.com/feed/",
      "active": false,
      "note": "Strong for scores and awards. Confirm feed path before activating."
    }
  ],
  "candidates": [],
  "yield": {}
}

```

### `harvest/__init__.py`

```python

```

### `harvest/sources/__init__.py`

```python

```

### `harvest/base.py`

```python
"""
Shared plumbing for the harvest layer.

Every source returns a list of Signal objects. The runner dedupes them against
what has already been seen and appends the new ones to data/signals-inbox.json,
where the agent's qualification pass picks them up.

Design notes
- No model calls happen here. Harvest is rules only. Triage with Haiku and
  everything costlier runs later, in the agent, over the inbox this writes.
- Be a polite citizen: a real User-Agent, a delay between requests, and respect
  for each source's terms and rate limits. Nothing here hammers a server.
"""

from __future__ import annotations

import hashlib
import json
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

import requests


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
INBOX_PATH = DATA_DIR / "signals-inbox.json"
SOURCES_PATH = DATA_DIR / "sources.json"

# A truthful, contactable User-Agent. Replace the email with a real inbox so a
# site owner who notices the traffic can reach Daley rather than just blocking.
USER_AGENT = "DaleyBrennanProspecting/1.0 (+mailto:daley@daleybrennan.com)"

# Minimum seconds between outbound requests, per source. Keep this gentle.
REQUEST_DELAY_SECONDS = 2.0


class SourceError(Exception):
    """A source failed in a way the runner should record against its health."""


class ParserDriftError(SourceError):
    """Site responded but yielded nothing parseable - selectors likely broke.

    Distinct from a genuine empty result. Raise this only when the structure the
    parser depends on is gone, which is the signal that a source needs repair.
    """


@dataclass
class Signal:
    """One observed trigger event, normalised across all sources."""

    source: str            # source key, e.g. "ttb_cola"
    signal_type: str       # "first_cola" | "distributor_churn" | "leadership" | "award" | "funding" | "tradeshow"
    title: str             # short human-readable summary
    url: str               # where Daley can verify it
    observed_date: str     # ISO date the agent saw it
    brand_guess: str = ""  # best guess at the brand name, may be refined later
    origin: str = ""       # country / region if known
    raw: dict = field(default_factory=dict)  # source-specific payload for later reasoning
    signal_id: str = ""    # stable dedupe hash, filled in post-init

    def __post_init__(self) -> None:
        if not self.observed_date:
            self.observed_date = date.today().isoformat()
        if not self.signal_id:
            self.signal_id = self._make_id()

    def _make_id(self) -> str:
        # Dedupe on the source plus whatever uniquely identifies the event.
        # Prefer a stable source-native id in raw["dedupe_key"] if present,
        # otherwise fall back to the URL, then the title.
        key = self.raw.get("dedupe_key") or self.url or self.title
        return hashlib.sha1(f"{self.source}:{key}".encode("utf-8")).hexdigest()[:16]


class Source(ABC):
    """Base class for a harvest source.

    Subclass it, set `key` and `default_active`, and implement `fetch`.
    Keep all network access inside `fetch` and route HTTP through `self.get`
    so the polite headers and delay apply everywhere.
    """

    key: str = "source"
    default_active: bool = True

    def __init__(self) -> None:
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": USER_AGENT})
        # Soft, non-fatal issues found during fetch (e.g. one dead feed among
        # many). The runner drains these into repair tasks. Reset each fetch.
        self.problems: list[dict] = []

    def flag_problem(self, scope: str, reason: str, manual_action: str) -> None:
        """Record a recoverable-but-needs-attention issue without failing the run."""
        self.problems.append(
            {"scope": scope, "reason": reason, "manual_action": manual_action}
        )

    def get(self, url: str, **kwargs) -> requests.Response:
        """Polite GET: shared session, sane timeout, a pause after each call."""
        kwargs.setdefault("timeout", 30)
        resp = self._session.get(url, **kwargs)
        time.sleep(REQUEST_DELAY_SECONDS)
        resp.raise_for_status()
        return resp

    @abstractmethod
    def fetch(self) -> list[Signal]:
        """Return the signals visible right now. Dedupe happens upstream."""
        raise NotImplementedError


# --- inbox storage -------------------------------------------------------------

def _read_json(path: Path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)


def load_seen_ids() -> set[str]:
    """Every signal_id already in the inbox, so we never write a duplicate."""
    inbox = _read_json(INBOX_PATH, [])
    return {item["signal_id"] for item in inbox if "signal_id" in item}


def append_signals(signals: Iterable[Signal]) -> list[Signal]:
    """Append only genuinely new signals. Returns the ones actually written."""
    inbox = _read_json(INBOX_PATH, [])
    seen = {item["signal_id"] for item in inbox if "signal_id" in item}
    fresh: list[Signal] = []
    for sig in signals:
        if sig.signal_id in seen:
            continue
        seen.add(sig.signal_id)
        fresh.append(sig)
    if fresh:
        inbox.extend(asdict(s) for s in fresh)
        _write_json(INBOX_PATH, inbox)
    return fresh

```

### `harvest/health.py`

```python
"""
Autoanneal - health tracking and self-healing escalation.

The agent should settle toward a working state on its own, and only pull Daley in
when it genuinely cannot. This module is the spine of that:

- Every source run records success or failure here, in data/health.json.
- A source that fails is marked degraded, then broken after repeated failure. A
  broken source is rested (not hammered) but periodically re-tested, so a site
  that recovers on its own heals without anyone touching it.
- When the agent cannot self-heal, it opens a precise repair task in
  data/repairs/ describing what broke, what it already tried, and the exact
  manual step needed. Those surface in the weekly digest and as tasks in the
  Antigravity IDE. Daley fixes it there, the next run re-tests, and a clean run
  clears the task and locks the source back to ok.

Two guardrails on self-healing
- It only ever repairs an existing source back to working. It never invents new
  targets and never changes who outreach contacts - that stays the gated
  discovery and human-send flows.
- Every automated fix is logged in the source's health record, so a self-applied
  change is always visible, never silent.

No model calls happen in this file. Model-assisted repair (re-deriving a broken
parser) is an agent action described in the operating manual and gated on budget;
this module only detects, rests, escalates, and clears.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

from harvest.base import DATA_DIR

HEALTH_PATH = DATA_DIR / "health.json"
REPAIRS_DIR = DATA_DIR / "repairs"

# Failures before a source is considered broken and rested.
BROKEN_THRESHOLD = 3
# Even when broken, re-test every N runs in case the site healed itself.
RETEST_EVERY = 5


def _load() -> dict:
    if not HEALTH_PATH.exists():
        return {}
    with HEALTH_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save(health: dict) -> None:
    HEALTH_PATH.parent.mkdir(parents=True, exist_ok=True)
    with HEALTH_PATH.open("w", encoding="utf-8") as fh:
        json.dump(health, fh, indent=2, ensure_ascii=False)


def _entry(health: dict, source: str) -> dict:
    return health.setdefault(
        source,
        {
            "status": "ok",
            "consecutive_failures": 0,
            "runs_since_test": 0,
            "last_success": None,
            "last_failure": None,
            "note": "",
            "open_repair": None,
            "fix_log": [],
        },
    )


def record_success(source: str, n_new: int) -> None:
    """A clean run. Resets failure state and clears any open repair task."""
    health = _load()
    e = _entry(health, source)
    healed = e["status"] != "ok"
    e["status"] = "ok"
    e["consecutive_failures"] = 0
    e["runs_since_test"] = 0
    e["last_success"] = date.today().isoformat()
    e["note"] = f"{n_new} new on last run"
    if e.get("open_repair"):
        _resolve_repair_file(e["open_repair"])
        e["fix_log"].append(
            {"date": date.today().isoformat(), "event": "repair cleared by clean run"}
        )
        e["open_repair"] = None
    _save(health)
    if healed:
        print(f"  autoanneal: {source} recovered and is healthy again")


def record_failure(source: str, reason: str) -> None:
    """A failed run. Escalates to broken + a repair task once it persists."""
    health = _load()
    e = _entry(health, source)
    e["consecutive_failures"] += 1
    e["runs_since_test"] = 0
    e["last_failure"] = date.today().isoformat()
    e["note"] = reason
    if e["consecutive_failures"] >= BROKEN_THRESHOLD:
        e["status"] = "broken"
    else:
        e["status"] = "degraded"
    _save(health)


def log_fix(source: str, what: str) -> None:
    """Record a self-applied fix so the change is never silent."""
    health = _load()
    e = _entry(health, source)
    e["fix_log"].append({"date": date.today().isoformat(), "event": what})
    _save(health)


def should_attempt(source: str) -> bool:
    """Whether the runner should try this source this run.

    Healthy and degraded sources always run. Broken sources are rested, but
    re-tested every RETEST_EVERY runs so self-healing sites recover untouched.
    """
    health = _load()
    e = health.get(source)
    if not e or e["status"] != "broken":
        return True
    e["runs_since_test"] += 1
    _save(health)
    if e["runs_since_test"] >= RETEST_EVERY:
        return True
    return False


def open_repair(source: str, what_broke: str, attempted: str, manual_action: str,
                verify: str) -> str:
    """Write a precise manual repair task and link it to the source."""
    REPAIRS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    path = REPAIRS_DIR / f"{stamp}-{source}.md"
    path.write_text(
        f"# Repair - {source}\n\n"
        f"Status open. Opened {datetime.now().isoformat(timespec='minutes')}.\n\n"
        f"## What broke\n{what_broke}\n\n"
        f"## What the agent already tried\n{attempted}\n\n"
        f"## Manual step needed (do this in Antigravity)\n{manual_action}\n\n"
        f"## How the agent will verify the fix\n{verify}\n",
        encoding="utf-8",
    )
    health = _load()
    e = _entry(health, source)
    e["open_repair"] = str(path)
    _save(health)
    return str(path)


def _resolve_repair_file(path_str: str) -> None:
    path = Path(path_str)
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    text = text.replace("Status open.", "Status RESOLVED.", 1)
    path.write_text(text, encoding="utf-8")


def open_repairs() -> list[dict]:
    """Sources with an unresolved repair task, for the weekly digest."""
    health = _load()
    return [
        {"source": s, "repair": e["open_repair"], "note": e.get("note", "")}
        for s, e in health.items()
        if e.get("open_repair")
    ]

```

### `harvest/discovery.py`

```python
"""
Source discovery and yield tracking.

Two jobs, both operating on data/sources.json:

1. Candidate sources. When the agent keeps hitting a publication that carries
   real signals, it logs the source here as a candidate. Candidates are never
   polled automatically - they wait until Daley promotes one in the weekly
   review. This is the gate that stops the agent wandering off to scrape
   whatever it stumbles across, and keeps cost from creeping as the list grows.

2. Yield. Track how many raw signals and, later, how many qualified prospects
   each source actually produces, so dead weight can be retired.

Nothing here makes a model call.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from harvest.base import SOURCES_PATH


# A candidate is worth proposing once it has carried this many real signals.
PROMOTION_THRESHOLD = 2

# An active source going this many days with no qualified prospect is stale.
STALE_DAYS = 42


def _load() -> dict:
    if not SOURCES_PATH.exists():
        return {"active_sources": [], "rss_feeds": [], "candidates": [], "yield": {}}
    with SOURCES_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save(sources: dict) -> None:
    SOURCES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SOURCES_PATH.open("w", encoding="utf-8") as fh:
        json.dump(sources, fh, indent=2, ensure_ascii=False)


def note_candidate(url: str, signal_type: str, note: str) -> None:
    """Log or reinforce a candidate source seen while harvesting or enriching."""
    sources = _load()
    candidates = sources.setdefault("candidates", [])
    for cand in candidates:
        if cand["url"] == url:
            cand["times_seen"] += 1
            cand["last_seen"] = date.today().isoformat()
            if note and note not in cand.get("notes", []):
                cand.setdefault("notes", []).append(note)
            _save(sources)
            return
    candidates.append(
        {
            "url": url,
            "signal_type": signal_type,
            "times_seen": 1,
            "first_seen": date.today().isoformat(),
            "last_seen": date.today().isoformat(),
            "notes": [note] if note else [],
        }
    )
    _save(sources)


def candidates_for_review() -> list[dict]:
    """Candidates that have earned a place in the weekly digest."""
    sources = _load()
    return [c for c in sources.get("candidates", []) if c["times_seen"] >= PROMOTION_THRESHOLD]


def record_signals(source_key: str, count: int) -> None:
    """Tally raw signals produced by a source on this run."""
    if count <= 0:
        return
    sources = _load()
    y = sources.setdefault("yield", {}).setdefault(source_key, {})
    y["signals"] = y.get("signals", 0) + count
    y["last_signal"] = date.today().isoformat()
    _save(sources)


def record_qualified(source_key: str) -> None:
    """Call from the agent when a source's signal became a qualified prospect."""
    sources = _load()
    y = sources.setdefault("yield", {}).setdefault(source_key, {})
    y["qualified"] = y.get("qualified", 0) + 1
    y["last_qualified"] = date.today().isoformat()
    _save(sources)


def stale_sources() -> list[str]:
    """Active sources that have gone too long without a qualified prospect."""
    sources = _load()
    today = date.today()
    stale: list[str] = []
    for key in sources.get("active_sources", []):
        y = sources.get("yield", {}).get(key, {})
        last = y.get("last_qualified")
        if not last:
            continue  # too new to judge
        gap = (today - date.fromisoformat(last)).days
        if gap >= STALE_DAYS:
            stale.append(key)
    return stale

```

### `harvest/sources/ttb_cola.py`

```python
"""
TTB COLA public registry watcher.

The strongest signal for Daley: a foreign producer filing US label approvals,
especially their first, means US-entry intent before they have hired anyone to
sequence it. The public COLA registry is searchable and free.

IMPORTANT - verify before trusting
  I could not reach the live registry while writing this, and TTB has migrated
  the site over time, so three things below are marked VERIFY. Open the live
  public search once, confirm them, and adjust. Everything else is stable.
    1. SEARCH_URL and the query parameters in build_query().
    2. The row structure in _parse_results() (table id, column order).
    3. That you are using the *public* registry and respecting its terms and
       any rate limits. Keep REQUEST_DELAY_SECONDS gentle.

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

# VERIFY (1): confirm the live public search endpoint and method.
SEARCH_URL = "https://ttbonline.gov/colasonline/publicSearchColasBasic.do"

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
        # VERIFY (1): confirm parameter names and date format against the live
        # form. These are placeholders mirroring the public advanced search.
        params = build_query(start, end)
        resp = self.get(SEARCH_URL, params=params)
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
    """Build the search query. VERIFY (1) parameter names and date format."""
    fmt = "%m/%d/%Y"
    return {
        # Common public-search fields; names may differ on the live form.
        "searchCriteria.dateCompletedFrom": start.strftime(fmt),
        "searchCriteria.dateCompletedTo": end.strftime(fmt),
        "action": "search",
    }


def _parse_results(html: str) -> list[dict]:
    """Parse the results table into row dicts.

    VERIFY (2): the live results table id and column order. The selectors below
    are a reasonable starting point; adjust once you see the real markup. Keep
    this function the *only* place that knows the page's HTML, so the rest of the
    watcher is unaffected when the site changes.
    """
    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict] = []

    table = soup.find("table", id="searchResults") or soup.find("table")
    if not table:
        return rows

    for tr in table.find_all("tr"):
        cells = tr.find_all("td")
        if len(cells) < 5:
            continue  # header or layout row
        link = cells[0].find("a")
        detail_url = link["href"] if link and link.has_attr("href") else ""
        if detail_url and detail_url.startswith("/"):
            detail_url = "https://ttbonline.gov" + detail_url
        rows.append(
            {
                "ttb_id": cells[0].get_text(strip=True),
                "detail_url": detail_url,
                "brand": cells[1].get_text(strip=True),
                "origin": cells[2].get_text(strip=True),
                "class_type": cells[3].get_text(strip=True),
                "approved_date": cells[4].get_text(strip=True),
                "applicant": cells[5].get_text(strip=True) if len(cells) > 5 else "",
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

```

### `harvest/sources/trade_press.py`

```python
"""
Trade press watcher.

Polls a list of RSS feeds (drinks and wine trade outlets) and keeps only entries
whose title or summary matches a trigger pattern - distributor churn, leadership
moves, standout scores, funding, first-time US trade-show appearances. Everything
else is dropped here, cheaply, so the model never reads it.

Feeds live in data/sources.json under "rss_feeds", not in this file, so adding a
feed is configuration and the source-discovery flow can propose new ones for
Daley to approve. VERIFY the seeded feed URLs against the live sites once; some
outlets move or rename their feeds.

Classification here is deliberately crude keyword matching - a rules-only first
cut. Haiku triage in the agent refines it before anything costlier runs.
"""

from __future__ import annotations

import json
from datetime import datetime

import feedparser

from harvest.base import SOURCES_PATH, Signal, Source


# Trigger patterns by signal type. Lowercase substring match against title + summary.
TRIGGER_PATTERNS: dict[str, list[str]] = {
    "distributor_churn": [
        "new importer", "appoints importer", "signs with", "distribution deal",
        "drops", "dropped by", "loses distribution", "lost distribution",
        "parts ways", "terminates", "switches importer", "names importer",
        "us importer", "imported by",
    ],
    "leadership": [
        "appoints", "names new", "new export director", "head of us",
        "us commercial", "commercial director", "joins as", "hires",
        "export manager",
    ],
    "award": [
        "decanter", "best in show", "gold medal", "trophy", "platinum",
        "top 100", "wine of the year", "98 points", "99 points", "100 points",
    ],
    "funding": [
        "raises", "investment", "acquires", "acquisition", "funding round",
        "secures investment", "backed by", "stake in",
    ],
    "tradeshow": [
        "debut at", "first time at", "first us", "exhibiting at",
        "launches in the us", "enters the us",
    ],
}


class TradePressSource(Source):
    key = "trade_press"
    default_active = True

    def fetch(self) -> list[Signal]:
        signals: list[Signal] = []
        for feed in _active_feeds():
            signals.extend(self._fetch_feed(feed))
        return signals

    def _fetch_feed(self, feed: dict) -> list[Signal]:
        url = feed.get("url", "")
        name = feed.get("name", url)
        if not url:
            return []

        parsed = _safe_parse(url, self._session.headers["User-Agent"])

        # Self-heal: a dead or malformed feed gets a quick try at common variants
        # before we bother Daley. If one works, use it and flag the suggested
        # sources.json update so the change is visible, not silent.
        if _feed_is_dead(parsed):
            healed_url, healed = _probe_variants(url, self._session.headers["User-Agent"])
            if healed is not None:
                self.flag_problem(
                    scope=f"rss_feed:{name}",
                    reason=f"Feed url {url} stopped working; variant {healed_url} works.",
                    manual_action=f"Update this feed's url in data/sources.json to {healed_url}.",
                )
                parsed = healed
            else:
                self.flag_problem(
                    scope=f"rss_feed:{name}",
                    reason=f"Feed url {url} returns nothing parseable and no variant worked.",
                    manual_action=(
                        f"Open {name} in a browser, find its current RSS/Atom feed url, "
                        f"and update it in data/sources.json (or set active=false to retire it)."
                    ),
                )
                return []

        out: list[Signal] = []
        for entry in parsed.entries:
            text = f"{entry.get('title', '')} {entry.get('summary', '')}".lower()
            signal_type = _classify(text)
            if not signal_type:
                continue
            out.append(
                Signal(
                    source=self.key,
                    signal_type=signal_type,
                    title=entry.get("title", "").strip(),
                    url=entry.get("link", url),
                    observed_date=_entry_date(entry),
                    raw={
                        "dedupe_key": entry.get("id") or entry.get("link"),
                        "feed": name,
                        "summary": entry.get("summary", "")[:500],
                    },
                )
            )
        return out


def _classify(text: str) -> str | None:
    for signal_type, patterns in TRIGGER_PATTERNS.items():
        if any(p in text for p in patterns):
            return signal_type
    return None


def _entry_date(entry) -> str:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        return datetime(*parsed[:6]).date().isoformat()
    return datetime.today().date().isoformat()


def _active_feeds() -> list[dict]:
    if not SOURCES_PATH.exists():
        return []
    with SOURCES_PATH.open("r", encoding="utf-8") as fh:
        sources = json.load(fh)
    return [f for f in sources.get("rss_feeds", []) if f.get("active", True)]


# --- feed self-heal ------------------------------------------------------------

# Common feed paths to try when a configured url goes dead.
FEED_VARIANTS = ["/feed", "/feed/", "/rss", "/rss/", "/feed/rss", "/atom.xml", "/index.xml"]


def _safe_parse(url: str, agent: str):
    try:
        return feedparser.parse(url, agent=agent)
    except Exception:
        return None


def _feed_is_dead(parsed) -> bool:
    if parsed is None:
        return True
    if getattr(parsed, "bozo", 0) and not parsed.entries:
        return True
    return len(parsed.entries) == 0


def _probe_variants(url: str, agent: str):
    """Try common feed paths on the same host. Return (url, parsed) or (url, None)."""
    from urllib.parse import urlsplit, urlunsplit

    parts = urlsplit(url)
    base = urlunsplit((parts.scheme, parts.netloc, "", "", ""))
    for suffix in FEED_VARIANTS:
        candidate = base + suffix
        if candidate == url:
            continue
        parsed = _safe_parse(candidate, agent)
        if parsed is not None and not _feed_is_dead(parsed):
            return candidate, parsed
    return url, None

```

### `harvest/run.py`

```python
"""
Harvest runner.

Runs every active source, dedupes against the inbox, appends only new signals,
and records each source's health so the system can heal itself. This is the
daily job. It is rules only - no model calls - so it is effectively free.

    python -m harvest.run

Autoanneal in the loop
- A source that raises is recorded as a failure; after repeated failures it is
  marked broken and rested, then re-tested periodically in case the site heals.
- Soft problems a source flags (e.g. one dead feed it could not self-heal) are
  turned into precise manual repair tasks under data/repairs/.
- A clean run clears the source's open repair and locks it back to ok.

After harvest, the agent's qualification pass reads data/signals-inbox.json and
takes over (Haiku triage, then Sonnet, then Opus for the few). Model-assisted
repair of a broken parser is an agent action, gated on budget - see the
operating manual.
"""

from __future__ import annotations

import json

from harvest.base import ParserDriftError, SourceError, SOURCES_PATH, Source, append_signals
from harvest import discovery, health
from harvest.sources.ttb_cola import TTBColaSource
from harvest.sources.trade_press import TradePressSource


# Every available source class, keyed by its `key`. Add new builtin sources here.
SOURCE_REGISTRY: dict[str, type[Source]] = {
    TTBColaSource.key: TTBColaSource,
    TradePressSource.key: TradePressSource,
}


def _active_source_keys() -> list[str]:
    if not SOURCES_PATH.exists():
        return [k for k, cls in SOURCE_REGISTRY.items() if cls.default_active]
    with SOURCES_PATH.open("r", encoding="utf-8") as fh:
        sources = json.load(fh)
    return sources.get("active_sources", [])


def run() -> dict:
    summary: dict[str, dict] = {}

    for key in _active_source_keys():
        cls = SOURCE_REGISTRY.get(key)
        if cls is None:
            summary[key] = {"error": "no source class registered for this key"}
            continue

        # Rest broken sources, but let them through on the periodic re-test.
        if not health.should_attempt(key):
            summary[key] = {"skipped": "rested (broken), awaiting re-test"}
            continue

        source = cls()
        try:
            fetched = source.fetch()
        except ParserDriftError as exc:
            health.record_failure(key, str(exc))
            _escalate_parser_drift(key, exc)
            summary[key] = {"error": f"parser drift - {exc}"}
            continue
        except (SourceError, Exception) as exc:  # one broken source never sinks the run
            health.record_failure(key, repr(exc))
            summary[key] = {"error": repr(exc)}
            continue

        new = append_signals(fetched)
        discovery.record_signals(key, len(new))
        health.record_success(key, len(new))

        # Turn any soft problems the source flagged into manual repair tasks.
        for p in source.problems:
            health.open_repair(
                source=key,
                what_broke=f"{p['scope']} - {p['reason']}",
                attempted="Automatic variant probing where applicable.",
                manual_action=p["manual_action"],
                verify="Next harvest run will pick up the corrected config automatically.",
            )

        summary[key] = {"fetched": len(fetched), "new": len(new),
                        "problems": len(source.problems)}

    review = {
        "candidates_ready": discovery.candidates_for_review(),
        "stale_sources": discovery.stale_sources(),
        "open_repairs": health.open_repairs(),
    }

    _print_summary(summary, review)
    return {"sources": summary, "review": review}


def _escalate_parser_drift(key: str, exc: Exception) -> None:
    """Open a repair task for a broken parser, with the model-assisted path first."""
    health.open_repair(
        source=key,
        what_broke=str(exc),
        attempted="Confirmed the site responded but the expected structure was absent.",
        manual_action=(
            "First let the agent attempt an automated re-derivation of the parser "
            "selectors from a fresh page sample, if the token budget allows (see the "
            "Autoanneal section of the operating manual). If that is not possible or "
            "does not produce a sane result, open the live page, save the results "
            "HTML into data/samples/, and update the parser selectors to match."
        ),
        verify="A re-test that parses a non-zero number of rows clears this task.",
    )


def _print_summary(summary: dict, review: dict) -> None:
    print("Harvest complete")
    for key, result in summary.items():
        if "error" in result:
            print(f"  {key}: ERROR - {result['error']}")
        elif "skipped" in result:
            print(f"  {key}: skipped - {result['skipped']}")
        else:
            extra = f", {result['problems']} flagged" if result.get("problems") else ""
            print(f"  {key}: {result['new']} new ({result['fetched']} fetched){extra}")
    if review["open_repairs"]:
        print(f"  OPEN REPAIRS needing attention: {len(review['open_repairs'])}")
    if review["candidates_ready"]:
        print(f"  candidate sources ready to review: {len(review['candidates_ready'])}")
    if review["stale_sources"]:
        print(f"  stale active sources: {', '.join(review['stale_sources'])}")


if __name__ == "__main__":
    run()

```

---

# Part 2 - Operating manual

# Prospecting Agent - Operating Manual

You are a prospecting and signal-detection agent for Daley Brennan, a commercial strategist who helps premium wine and spirits brands enter and grow in the US market (daleybrennan.com). You run inside Claude Code. Your job is to find a small number of genuinely well-fit brands at the exact moment they need Daley, and to hand him a warm, specific opening he can send himself.

Read this whole file before each run. Then read `data/ledger.json` to check how much of the budget remains before you do anything that costs tokens.

## Prime directive

Precision, not volume. Daley takes a deliberately small number of engagements alongside a full-time role. He does not want reach - he wants the right handful of brands, timed to a real moment of need, researched well enough that the opening could pass for something he wrote by hand. A bigger list is a worse outcome, not a better one. If in doubt, surface fewer and better.

## The two non-negotiables

1. You never send anything. You research, qualify, and draft. Every outbound message goes into the weekly review queue for Daley to approve, edit, or kill. He is always the sender, from his own domain, as himself. This protects deliverability, keeps outreach legally defensible, and - more importantly - protects the premium credibility the whole business rests on. The moment a prospect smells automation, that credibility is gone.

2. You never use purchased or scraped contact lists, and you never harvest personal data from sketchy sources. Find the right human through public professional channels only. Depth-per-prospect is the product, not list size.

## Operating cadence

Run a light harvest daily and a full qualification-and-draft pass weekly, sized to Daley's weekly check-in.

- Daily (cheap, mostly no LLM) - poll the signal sources, dedupe against what you've already seen, and append new raw signals to `data/signals-inbox.json`. No model calls unless a signal needs a quick classification.
- Weekly (the spend) - qualify the week's signals, enrich the ones that pass, draft openings, and produce the review digest. This is where your token budget goes, so it has to stay disciplined.

## The token predator

Your real adversary is not the market, it is your own running cost. The budget is fixed and small. Treat the strongest model as an expensive consultant you call sparingly, and run everything else on cheaper models, rules, and cached results.

- Harvesting, deduping, and bookkeeping are rules-based. No model calls.
- Match the model to the stakes (see Model tiering below). The expensive model should only ever see a tiny, pre-filtered set.
- Before any weekly pass, read `data/ledger.json`. If remaining budget is below the reserve floor (default $15), stop spending, run harvest-only, and flag it in the digest. Never spend the reserve without Daley's say-so.
- Log every model call's model, stage, and estimated cost to the ledger so the survival curve stays honest.

## Model tiering

Model choice is the main cost lever, so treat the pipeline as a funnel that narrows before it gets expensive. Each stage names the model it must use, and you do not escalate to a pricier model without a reason recorded in the prospect file.

- Haiku 4.5 (`claude-haiku-4-5-20251001`) - the volume filter. Use for first-pass triage on every raw signal: is this even premium wine or spirits, is it a duplicate, is it obviously irrelevant. This is where most signals die, cheaply, so the costlier models never see them. Also use Haiku for light extraction and tagging.
- Sonnet 4.6 (`claude-sonnet-4-6`) - the workhorse. Use for qualification scoring against the rubric, contact enrichment reasoning, and drafting the openings. Good enough for voice and judgment on the bulk of prospects, at a fraction of Opus cost.
- Opus 4.8 (`claude-opus-4-8`) - the consultant, called rarely. Reserve it for the genuinely hard analysis: borderline qualification calls Sonnet flags as uncertain, synthesising several signals on a single high-value target into one strategic read, and a final pass on the very top prospects of the week before they reach Daley. If Opus is touching more than a handful of prospects in a week, you are over-spending - tighten the funnel above it.

The discipline in one line - Haiku to discard, Sonnet to do the work, Opus only for the decisions that move the needle.

## Signal sources

Watch for trigger events - the moments that mean a brand's US ambition has just outrun its commercial plan. Ordered by strength for Daley.

1. First US label approvals (strongest). The TTB COLA public registry lists every label cleared for US sale and is public and searchable. A foreign producer filing its first COLAs is a flashing signal of US-entry intent, before they have hired anyone to sequence it. Query by origin country, product class, and recent date range. Respect the registry's terms and rate limits.
2. Distributor churn. A brand that just lost or changed its US importer is Daley's single strongest opener, because he lives inside distributor intelligence at his day job. Watch trade press and distributor portfolio changes for brands losing or switching US representation.
3. New commercial or export leadership. A new export director or US commercial lead appearing publicly often means a fresh US push. Use public professional sources only.
4. Scores and awards. A standout Decanter, Suckling, or Wine Spectator result tends to raise a brand's US ambition.
5. Funding and investment news, and first-time appearances at US-facing trade shows.

For each source, store the source URL, the date observed, and the raw signal text so qualification has something to reason over and Daley can verify it.

### Finding new sources

The source list is not fixed. As you harvest, qualify, and enrich, you will keep encountering the same publications, awards bodies, importer news pages, and regional trade outlets. Watch for ones that repeatedly carry the trigger events above, and treat a recurring high-signal source as a candidate worth returning to daily.

Do not promote a new source on your own. When a candidate has earned it - it has surfaced real, qualifying signals more than once, not just mentioned wine in passing - log it to the candidates list in `data/sources.json` with its URL, the kind of signal it carried, how many times you have seen it, and a one-line quality note. Then propose it in the weekly digest: here is a source I keep hitting, here is what it produced, promote it to a daily source or not. Only on Daley's approval does it move to the active list and get polled daily.

This keeps two things in check - it stops you wandering off to scrape whatever you stumble across, and it keeps cost from creeping as the source list grows. The same discipline runs in reverse: track how many qualified prospects each active source actually produces, and flag any source that has gone several weeks without yielding one, so Daley can retire it.

## Pipeline

`harvest -> qualify -> enrich -> draft -> review queue`

### Harvest (rules, then Haiku)
Poll sources, dedupe against `data/prospects/` and `data/signals-inbox.json`, append new signals. Rules only for polling and dedupe. Run Haiku triage over the new signals to discard anything that is not premium wine or spirits, or is plainly irrelevant, before anything costlier runs.

### Qualify (Sonnet, escalate to Opus)
For each surviving signal, score the brand against the rubric below with Sonnet. Only brands at or above the threshold advance. Write the score and a one-line rationale into the prospect's file. Where Sonnet flags the call as borderline or uncertain, escalate that single prospect to Opus for a deciding read, and note that Opus was used.

Qualification rubric (advance at 70+ of 100):

- Tier fit (30) - is this genuinely premium, not supermarket volume, and in Daley's sweet spot of roughly 200 to 2,000 cases. Mass-market brands score near zero here regardless of other signals.
- Signal strength and recency (25) - a first-COLA filing or fresh distributor loss scores high; a months-old soft signal scores low.
- US-entry stage (20) - pre-entry, early, or visibly stuck scores highest; a brand already well-established with US representation scores low.
- Angle for Daley (15) - a French or English language fit, or a credible connection to his network or market knowledge.
- Reachability (10) - can the right human be found through clean public channels. If not, the prospect parks until they can be.

### Enrich (Sonnet)
For brands that pass, identify the right human - export director, owner, or US commercial lead - and a clean, public contact path. Record the path and why it is appropriate. Never record data obtained from a source you would not want to name to the prospect.

### Draft (Sonnet, Opus for the top few)
Write one opening per qualified prospect in Daley's voice with Sonnet. Then run Opus over only the week's top prospects - the highest-scoring handful - to synthesise their signals into one strategic read and sharpen the opening before it reaches Daley. Drafting rules:

- Lead with the specific trigger, named plainly - "I gather your US importer situation may be shifting," or "I saw your first US label approvals come through." Specificity is the entire point. A draft that could have been sent to anyone gets killed, not sent.
- Warm yet professional. Brief personal touch only where it is genuine.
- Propose one concrete next step - a short call or a tasting - not a vague "let me know."
- Write in English or French to fit the brand. In French use formal vous.
- Use spaced hyphens, never em dashes. No colons after any subheading.
- No signature block - Daley's client handles that.
- Short. If it runs past a screen, it is too long.

If a draft reads generic or automated, do not queue it. Note the prospect as "needs a human angle" and move on.

## Data model

Keep state in local files so it is git-friendly and Daley can read and edit it directly.

```
data/
  ledger.json              # budget and per-run cost log
  signals-inbox.json       # raw harvested signals awaiting qualification
  prospects/
    <brand-slug>.md         # one file per brand, human-readable
  review/
    <YYYY-MM-DD>.md         # the weekly digest for Daley
```

Each `prospects/<brand-slug>.md` holds, in plain markdown - brand name and origin, current status (`new` / `qualified` / `drafted` / `queued` / `approved` / `sent` / `passed` / `parked`), the triggering signal with source URL and date, the qualification score and rationale, the contact path, the latest draft, and a dated history of what happened. Status sits at the top of the file so Daley can change it in one edit. `queued` means it is in the digest awaiting his call; `approved` means he has cleared it and it is his to send; `passed` covers anything killed or declined.

`ledger.json` tracks - seed and remaining budget, a running list of `{date, stage, model, est_cost}` entries, and the reserve floor. Logging the model per entry is what lets the weekly spend break down by tier and shows whether the funnel is keeping Opus rare. The survival curve is the most interesting artifact this produces, so keep it accurate even when it is unflattering.

## Weekly review digest

Write `data/review/<date>.md` as the authoritative output. For each newly qualified prospect, give Daley everything he needs to decide in one read - the brand, the trigger and its source link, the qualification score and one-line rationale, the contact path, and the full drafted opening ready to send or edit. Note where Opus was used. End with the cost summary - prospects in pipeline by status, spend this week broken down by model, and budget remaining.

### Delivery to Daley's inbox

After writing the digest file, email it from and to daley@daleybrennan.com so Daley can review away from the desk. That mailbox is already wired to the website domain, so use it for both sending and receiving. It is the only address involved, and this is a notification to Daley himself rather than outreach, so it does not touch the never-send rule. The agent may read replies on that thread to confirm delivery, but decisions are still made in the IDE, never by email.

The email is a read-only summary, not the place decisions are made. Send the digest content inline, and for each prospect include the path to its file (`data/prospects/<brand-slug>.md`) so Daley knows exactly where to go. Lead with a one-line standing for the week - how many new qualified prospects, spend, budget remaining - so he can triage from his phone before he ever opens the laptop.

### Handoff back to the IDE

Daley reviews in his inbox, then opens the IDE to act. The prospect files are already on disk with their current status, the draft, and the rationale, so he picks up exactly where you left off - he edits the draft in place, or sets the status to `approved` or `killed` at the top of the file. He sends the approved openings himself.

On your next run, read the prospect files first and apply his decisions - send-ready stays his to send, killed prospects move to `passed` with a note, edited drafts are taken as the new source of truth. You never act on an item he has not cleared, and you never re-draft over an edit he has made by hand.

## Autoanneal - keep yourself running

You are built to settle back toward a working state on your own, and to pull Daley in only when you genuinely cannot. He is happy to be prompted for manual work in the Antigravity IDE, but his time is the expensive resource, so earn the interruption.

Three things break in practice, and you handle each before escalating. A transient network error - retry with backoff through the shared session, and if it clears, carry on as if nothing happened. A dead source feed - probe the common feed paths on the same host, and if one works, use it and flag the suggested config change so it is visible rather than silent. Parser drift, where a site responds normally but the structure the parser depended on is gone - this is the one that needs care.

When a parser drifts, you may attempt an automated re-derivation - fetch a fresh sample of the page, work out the new selectors, and update the parser - but only under three conditions. It is gated on budget, so check the ledger first and never spend the reserve on a repair; do it with Sonnet and escalate to Opus only if Sonnet cannot. You verify before you trust - a re-derived parser has to produce a sane, non-zero set of rows, and the source is only locked back to healthy after a clean run, not on the first hopeful attempt. And you log the change in the source's health record, because a self-applied fix that nobody can see is not a fix, it is a liability.

Two hard limits on all self-healing. You only ever repair an existing source back to working - you never invent new targets that way, and you never touch who outreach contacts. Restoring a source is repair; finding new sources is the gated discovery flow; reaching new people is the human-send flow. Keep them separate.

A source that keeps failing is marked broken and rested rather than hammered, then re-tested periodically in case the site healed itself - many do. When you cannot fix something, open a precise repair task in `data/repairs/` that states what broke, what you already tried, the exact manual step needed, and how you will verify the fix once it is done. Those tasks surface in the weekly digest and as work items in Antigravity. Daley does them there, the next run re-tests, and a clean run clears the task. Source health lives in `data/health.json`, and during initial setup the three VERIFY items are the first repair tasks you will raise - that is the expected way the system gets stood up, not a sign anything is wrong.

## Legal and reputation posture

- Outreach is B2B, to a professional role, sent by Daley as a named real person from his own domain, with a genuine way to opt out. Keep it that way.
- Many targets are European, so treat their data with GDPR-grade care - public professional information only, minimal retention, and nothing you could not justify to the prospect's face.
- If pursuing a prospect would require anything you would be uncomfortable explaining, park it and note why.

## What good looks like

A handful of genuinely warm, well-timed openings each month that Daley would have been proud to write himself, found without him spending hours watching registries and trade press. You are a sourcing-and-timing machine, not a closer. Fewer and better, every time.