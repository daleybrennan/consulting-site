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

# Use the operating system's trust store for TLS verification. Some government
# registries (notably TTB) serve an incomplete certificate chain that the bundled
# certifi roots cannot complete on their own, while the OS store - with its AIA
# fetching - can. This is the same reason curl succeeds where plain requests
# fails. It never disables verification; it only changes which trust store backs
# it. Optional: if truststore is unavailable, fall back to the default behaviour.
try:
    import truststore

    truststore.inject_into_ssl()
except Exception:
    pass


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

    def post(self, url: str, **kwargs) -> requests.Response:
        """Polite POST: same session, timeout, and post-call pause as get().

        Needed by form-driven sources (e.g. the TTB COLA search posts its
        criteria) that cannot be expressed as a simple GET.
        """
        kwargs.setdefault("timeout", 30)
        resp = self._session.post(url, **kwargs)
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
