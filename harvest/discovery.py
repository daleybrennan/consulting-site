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
