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
import unicodedata
from datetime import datetime

import feedparser

from harvest.base import SOURCES_PATH, Signal, Source


# Trigger patterns by signal type. Lowercase substring match against title + summary.
# French terms are included alongside the English so the France-based feeds in
# data/sources.json (Vitisphere, Terre de Vins, Reussir Vigne) actually surface
# signals - English-only keywords would discard every French entry before the
# Haiku triage ever saw it. Accents are stripped before matching (see _classify),
# so the French terms here are written without diacritics.
TRIGGER_PATTERNS: dict[str, list[str]] = {
    "distributor_churn": [
        "new importer", "appoints importer", "signs with", "distribution deal",
        "drops", "dropped by", "loses distribution", "lost distribution",
        "parts ways", "terminates", "switches importer", "names importer",
        "us importer", "imported by",
        # French
        "importateur", "nouvel importateur", "accord de distribution",
        "signe avec", "distribue par", "change de distributeur", "resilie",
        "rupture de contrat", "quitte son importateur",
    ],
    "leadership": [
        "appoints", "names new", "new export director", "head of us",
        "us commercial", "commercial director", "joins as", "hires",
        "export manager",
        # French
        "nomme", "nomination", "nouveau directeur", "nouvelle directrice",
        "directeur export", "directeur commercial", "directrice commerciale",
        "rejoint", "recrute", "responsable export",
    ],
    "award": [
        "decanter", "best in show", "gold medal", "trophy", "platinum",
        "top 100", "wine of the year", "98 points", "99 points", "100 points",
        # French
        "medaille d'or", "grand or", "coup de coeur", "meilleur vin",
        "concours", "prix d'excellence",
    ],
    "funding": [
        "raises", "investment", "acquires", "acquisition", "funding round",
        "secures investment", "backed by", "stake in",
        # French - keep these specific; a bare "leve" wrongly matches the
        # winemaking term "eleve"/"elevage", which is everywhere in wine French.
        "levee de fonds", "leve des fonds", "tour de table", "investissement",
        "rachete", "rachat", "prend une participation", "entre au capital",
    ],
    "tradeshow": [
        "debut at", "first time at", "first us", "exhibiting at",
        "launches in the us", "enters the us",
        # French - weighted toward US-entry intent, which is the signal that matters
        "etats-unis", "marche americain", "s'exporte aux etats-unis",
        "exporte aux etats-unis", "se lance aux etats-unis", "wine paris",
        "vinexpo", "premiere fois aux etats-unis",
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


def _strip_accents(text: str) -> str:
    """Fold accented characters to ASCII so unaccented patterns match French text."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


def _classify(text: str) -> str | None:
    text = _strip_accents(text)
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
