from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "crypto-radar" / "data" / "okx-personal.json"
BASE = "https://www.okx.com"
PERSONAL_API = "/priapi/v5/ecotrade/public/follow-rank"
PAGE_CANDIDATES = [
    ("https://www.okx.com/en-us/leaderboard", "official_page"),
    ("https://www.okx.com/leaderboard", "official_page"),
    ("https://www.okx.com/orbit", "official_page"),
]
COPY_SEMANTIC_KEYS = {
    "followerLimit",
    "followPnl",
    "copyRelId",
    "totalLeadInstNum",
    "currentFollowPnl",
}
HEADERS = {
    "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 Chrome/126 Safari/537.36",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def number(value: Any) -> float | None:
    if value in (None, "") or isinstance(value, bool):
        return None
    try:
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return None


def first(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if row.get(key) not in (None, ""):
            return row[key]
    return None


def get(url: str, params: dict[str, Any] | None = None) -> tuple[int, str, Any]:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(url + query, headers=HEADERS)
    try:
        with urlopen(request, timeout=25) as response:
            body = response.read().decode("utf-8", errors="replace")
            content_type = response.headers.get("Content-Type", "")
            if "json" in content_type or body.lstrip().startswith(("{", "[")):
                try:
                    return response.status, content_type, json.loads(body)
                except json.JSONDecodeError:
                    pass
            return response.status, content_type, body
    except HTTPError as exc:
        return exc.code, exc.headers.get("Content-Type", ""), {"error": f"HTTP {exc.code}"}
    except Exception as exc:  # noqa: BLE001
        return 0, "", {"error": f"{type(exc).__name__}: {exc}"}


def extract_rows(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    data = payload.get("data") or []
    root = data[0] if data and isinstance(data[0], dict) else {}
    rows = root.get("ranks") if isinstance(root, dict) else None
    if isinstance(rows, list):
        return [row for row in rows if isinstance(row, dict)]
    return [row for row in data if isinstance(row, dict)]


def copy_semantics(rows: list[dict[str, Any]]) -> list[str]:
    seen = set()
    for row in rows[:5]:
        seen.update(key for key in row if key in COPY_SEMANTIC_KEYS)
    return sorted(seen)


def normalize_personal_row(
    row: dict[str, Any], rank: int, source_url: str, source_at: str
) -> dict[str, Any]:
    trader_id = first(row, "trader_id", "traderId", "uniqueName", "uniqueCode", "id")
    if not trader_id:
        raise ValueError("personal row has no stable trader id")
    series = row.get("roi_series") or row.get("roiSeries") or []
    return {
        "platform": "okx",
        "trader_type": "personal",
        "trader_id": str(trader_id),
        "unique_code": str(first(row, "unique_code", "uniqueCode", "uniqueName") or trader_id),
        "name": first(row, "name", "nickName", "nickname") or str(trader_id),
        "avatar_url": first(row, "avatar_url", "avatar", "portrait"),
        "profile_url": first(row, "profile_url", "profileUrl"),
        "rank": rank,
        "period": first(row, "period") or "official",
        "pnl_usd": number(first(row, "pnl_usd", "pnlUsd", "pnl")),
        "roi_pct": number(first(row, "roi_pct", "roiPct", "roi", "yieldRatio")),
        "assets_usd": number(first(row, "assets_usd", "assetsUsd", "assets")),
        "max_drawdown_pct": number(first(row, "max_drawdown_pct", "maxDrawdownPct", "drawdown")),
        "win_rate_pct": number(first(row, "win_rate_pct", "winRatePct", "winRate")),
        "profit_loss_ratio": first(row, "profit_loss_ratio", "profitLossRatio", "pnlRatio"),
        "total_performance_pct": number(first(row, "total_performance_pct", "totalPerformancePct")),
        "followers": first(row, "followers", "followerCount"),
        "following": first(row, "following", "followingCount"),
        "positions": row.get("positions") if isinstance(row.get("positions"), list) else [],
        "current_positions": row.get("current_positions") if isinstance(row.get("current_positions"), list) else [],
        "history_positions": row.get("history_positions") if isinstance(row.get("history_positions"), list) else [],
        "roi_series": series if isinstance(series, list) else [],
        "source_url": source_url,
        "source_type": "official_api",
        "source_at": source_at,
        "updated_at": source_at,
        "data_freshness": "live_capture",
        "reliability": "verified_source",
        "raw_metrics": row,
    }


def probe() -> dict[str, Any]:
    checked_at = now_iso()
    candidates: list[dict[str, Any]] = []
    for url, source_type in PAGE_CANDIDATES:
        status, _, body = get(url)
        text = body if isinstance(body, str) else ""
        candidates.append(
            {
                "url": url,
                "source_type": source_type,
                "status": status or None,
                "reason": (
                    "anonymous page exposes community feed, not a public Top Trader data feed"
                    if "/orbit" in url and status == 200
                    else "official leaderboard route is not currently available anonymously"
                    if status != 200
                    else "page requires browser inspection before it can be promoted"
                ),
                "contains_leaderboard_text": "leaderboard" in text.lower(),
            }
        )

    status, _, payload = get(
        BASE + PERSONAL_API,
        {
            "size": 20,
            "type": "",
            "start": 1,
            "latestNum": 90,
            "fullState": 2,
            "apiTrader": 0,
            "instNumLimit": 4,
            "t": int(time.time() * 1000),
        },
    )
    rows = extract_rows(payload)
    rejected_keys = copy_semantics(rows)
    candidates.append(
        {
            "url": BASE + PERSONAL_API,
            "source_type": "official_api",
            "status": status or None,
            "reason": (
                "rejected: response contains Copy Trading semantics"
                if rejected_keys
                else "no stable Personal Trader rows found"
                if not rows
                else "candidate requires field-level verification"
            ),
            "rejected_keys": rejected_keys,
            "row_count": len(rows),
        }
    )
    if rejected_keys or not rows:
        return {
            "schema_version": 1,
            "status": "unavailable",
            "trader_type": "personal",
            "source_type": "official_api",
            "updated_at": checked_at,
            "period": None,
            "traders": [],
            "source_candidates": candidates,
            "disclaimer": "No anonymous Personal Trader source is published until independently verified. Screenshot values remain regression-only fixture data.",
        }
    normalized = [normalize_personal_row(row, index, BASE + PERSONAL_API, checked_at) for index, row in enumerate(rows, 1)]
    return {
        "schema_version": 1,
        "status": "ready",
        "trader_type": "personal",
        "source_type": "official_api",
        "updated_at": checked_at,
        "period": "official",
        "traders": normalized,
        "source_candidates": candidates,
        "disclaimer": "Public OKX data only; no Copy Trading fields are used in the Personal Trader schema.",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    payload = probe()
    if args.output.exists():
        try:
            previous = json.loads(args.output.read_text(encoding="utf-8"))
            comparable = {key: value for key, value in payload.items() if key != "updated_at"}
            previous_comparable = {key: value for key, value in previous.items() if key != "updated_at"}
            if comparable == previous_comparable and previous.get("updated_at"):
                payload["updated_at"] = previous["updated_at"]
        except (OSError, json.JSONDecodeError):
            pass
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": payload["status"], "traders": len(payload["traders"]), "output": str(args.output)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
