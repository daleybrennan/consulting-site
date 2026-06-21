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
