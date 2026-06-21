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
