from __future__ import annotations

import json
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import collect_trader_radar as radar

_original_get_json = radar.get_json
_original_history_stats = radar.history_stats
_original_score = radar.score

PUBLIC_SORT_SPECS = [
    ("overview", ["overview"]),
    ("pnl", ["pnl"]),
    ("aum", ["aum"]),
    ("win_ratio", ["win_ratio"]),
    ("pnl_ratio", ["pnl_ratio"]),
    ("copy_pnl", ["current_copy_trader_pnl"]),
]

CLIENT_RANK_PATH = "/priapi/v5/ecotrade/public/follow-rank"
TRADE_DATA_PATH = "/priapi/v5/ecotrade/public/trader/trade-data"
YIELD_PNL_PATH = "/priapi/v5/ecotrade/public/yield-pnl"
WEEK_PNL_PATH = "/priapi/v5/ecotrade/public/week-pnl"
POSITION_DETAIL_PATH = "/priapi/v5/ecotrade/public/position-detail"
POSITION_HISTORY_PATH = "/priapi/v5/ecotrade/public/position-history"

CLIENT_PAGE_SIZE = 20
CLIENT_MAX_PAGES = 120
CURVE_LIMIT = 50
DEEP_BASE_LIMIT = 10
DEEP_MAX_LIMIT = 20
HISTORY_KEEP_DAYS = 400
DATA_DIR = radar.ROOT / "trader-radar" / "data"
HISTORY_DIR = DATA_DIR / "history"
CHANGES_PATH = DATA_DIR / "changes.json"
WATCHLIST_PATH = DATA_DIR / "watchlist.json"
LEGACY_HISTORY_PATH = DATA_DIR / "history.json"


def now_ms() -> int:
    return int(time.time() * 1000)


def tolerant_get_json(path: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        return _original_get_json(path, params)
    except Exception as exc:  # noqa: BLE001
        if path.startswith("/priapi/") or path == radar.LEADERBOARD:
            print("skip unavailable OKX request:", path, params, type(exc).__name__, exc)
            return {"code": "-1", "data": [], "_error": f"{type(exc).__name__}: {exc}"}
        raise


def response_data(path: str, params: dict[str, Any]) -> tuple[list[Any], dict[str, Any]]:
    payload = radar.get_json(path, params)
    data = payload.get("data") or []
    ok = str(payload.get("code", "0")) == "0" and isinstance(data, list)
    return data if isinstance(data, list) else [], {
        "ok": ok,
        "count": len(data) if isinstance(data, list) else 0,
        "code": payload.get("code"),
        "error": payload.get("_error") or payload.get("msg"),
    }


def map_metrics(parts: Any) -> dict[str, Any]:
    if not isinstance(parts, list):
        return {}
    return {
        str(item.get("functionId")): item.get("value")
        for item in parts
        if isinstance(item, dict) and item.get("functionId")
    }


def first_number(value: Any) -> float | None:
    if isinstance(value, str) and "/" in value:
        value = value.split("/", 1)[0]
    return radar.number(value)


def iso_from_ms(value: Any) -> str | None:
    raw = radar.number(value)
    if raw is None:
        return None
    return datetime.fromtimestamp(raw / 1000, tz=timezone.utc).isoformat()


def curve_points_from_rank(rank: dict[str, Any]) -> list[dict[str, Any]]:
    points = []
    for item in rank.get("rates") or []:
        raw_ratio = radar.number(item.get("ratio"))
        if raw_ratio is None:
            continue
        points.append(
            {
                "time": iso_from_ms(item.get("statTime")),
                "roi_pct": round(raw_ratio * 100, 6),
                "pnl_usd": radar.number(item.get("pnl")),
            }
        )
    return sorted(points, key=lambda item: item.get("time") or "")


def curve_points_from_yield(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    points = []
    for item in rows:
        raw_time = iso_from_ms(item.get("statTime"))
        raw_ratio = radar.number(item.get("ratio"))
        if raw_time is None or raw_ratio is None:
            continue
        points.append(
            {
                "time": raw_time,
                "roi_pct": round(raw_ratio * 100, 6),
                "pnl_usd": radar.number(item.get("pnl")),
            }
        )
    return sorted(points, key=lambda item: item["time"])


def standard_drawdown_pct(values: list[float]) -> float | None:
    if not values:
        return None
    navs = [max(1e-9, 1 + value / 100) for value in values]
    peak = navs[0]
    worst = 0.0
    for nav in navs:
        peak = max(peak, nav)
        worst = max(worst, (peak - nav) / peak * 100)
    return round(worst, 4)


def curve_metrics(series: list[dict[str, Any]]) -> dict[str, Any]:
    values = [radar.number(item.get("roi_pct")) for item in series]
    values = [value for value in values if value is not None]
    if not values:
        return {
            "max_drawdown_pct": None,
            "curve_upward_ratio_pct": None,
            "curve_direction_change_pct": None,
            "curve_step_volatility": None,
            "daily_worst_move_pct": None,
        }
    changes = [current - previous for previous, current in zip(values, values[1:])]
    directions = [1 if value > 0 else -1 if value < 0 else 0 for value in changes]
    nonzero = [value for value in directions if value]
    reversals = sum(a != b for a, b in zip(nonzero, nonzero[1:]))
    return {
        "max_drawdown_pct": standard_drawdown_pct(values),
        "curve_upward_ratio_pct": round(sum(value >= 0 for value in changes) / len(changes) * 100, 4)
        if changes
        else None,
        "curve_direction_change_pct": round(reversals / max(1, len(nonzero) - 1) * 100, 4)
        if len(nonzero) > 1
        else 0.0,
        "curve_step_volatility": round(sum(abs(value) for value in changes) / len(changes), 4)
        if changes
        else None,
        "daily_worst_move_pct": round(min(changes), 4) if changes else None,
    }


def slice_by_days(series: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
    timed = []
    for item in series:
        try:
            timestamp = datetime.fromisoformat(str(item.get("time"))).timestamp()
        except (TypeError, ValueError):
            continue
        timed.append((timestamp, item))
    if not timed:
        return []
    latest = timed[-1][0]
    cutoff = latest - days * 86400
    return [item for timestamp, item in timed if timestamp >= cutoff]


def period_return(series: list[dict[str, Any]]) -> tuple[float | None, float | None]:
    if len(series) < 2:
        return None, None
    start_roi = radar.number(series[0].get("roi_pct"))
    end_roi = radar.number(series[-1].get("roi_pct"))
    if start_roi is None or end_roi is None:
        roi = None
    else:
        start_nav = max(1e-9, 1 + start_roi / 100)
        end_nav = max(1e-9, 1 + end_roi / 100)
        roi = round((end_nav / start_nav - 1) * 100, 4)
    start_pnl = radar.number(series[0].get("pnl_usd"))
    end_pnl = radar.number(series[-1].get("pnl_usd"))
    pnl = round(end_pnl - start_pnl, 4) if start_pnl is not None and end_pnl is not None else None
    return roi, pnl


def make_period_payload(
    daily: list[dict[str, Any]], weekly: list[dict[str, Any]], scope: str
) -> dict[str, dict[str, Any]]:
    periods: dict[str, tuple[list[dict[str, Any]], str]] = {
        "total": (daily, "OKX完整日线" if scope == "full" else "OKX榜单曲线"),
        "year": (slice_by_days(daily, 365), "OKX最近365天"),
        "month": (slice_by_days(daily, 30), "OKX最近30天"),
        "week": (weekly, "OKX原生周线"),
        "day": (daily[-2:] if len(daily) >= 2 else [], "OKX最近两个日点"),
    }
    result = {}
    for key, (series, source) in periods.items():
        roi, pnl = period_return(series)
        result[key] = {
            "available": len(series) >= 2,
            "source": source,
            "roi_pct": roi,
            "pnl_usd": pnl,
            "max_drawdown_pct": standard_drawdown_pct(
                [value for value in (radar.number(item.get("roi_pct")) for item in series) if value is not None]
            ),
            "points": len(series),
        }
    return result


def valid_position(item: dict[str, Any]) -> bool:
    instrument = str(item.get("instId") or "").strip()
    margin = radar.number(item.get("margin")) or 0
    return bool(instrument) and margin > 0


def normalize_positions(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    positions = []
    levers: list[float] = []
    margins: list[float] = []
    pnls: list[float] = []
    for item in rows:
        if not valid_position(item):
            continue
        leverage = radar.number(item.get("lever"))
        margin = radar.number(item.get("margin"))
        pnl = radar.number(item.get("pnl"))
        if leverage is not None:
            levers.append(leverage)
        if margin is not None:
            margins.append(margin)
        if pnl is not None:
            pnls.append(pnl)
        open_time = radar.timestamp(item.get("openTime"))
        positions.append(
            {
                "instrument": item.get("instId"),
                "side": item.get("posSide") or item.get("side"),
                "leverage": leverage,
                "margin_usd": margin,
                "upl_usd": pnl,
                "upl_pct": radar.pct(item.get("pnlRatio")),
                "open_time": open_time.isoformat() if open_time else None,
            }
        )
    total_margin = sum(margins)
    total_pnl = sum(pnls)
    return positions, {
        "current_positions_count": len(positions),
        "current_max_leverage": round(max(levers), 4) if levers else None,
        "current_total_margin_usd": round(total_margin, 4) if margins else None,
        "current_total_upl_usd": round(total_pnl, 4) if pnls else None,
        "current_upl_pct": round(total_pnl / total_margin * 100, 4) if total_margin else None,
    }


def normalize_history(rows: list[dict[str, Any]]) -> dict[str, Any]:
    translated = [
        {
            "pnl": item.get("pnl"),
            "pnlRatio": item.get("pnlRatio"),
            "lever": item.get("lever"),
            "openTime": item.get("openTime"),
            "closeTime": item.get("uTime") or item.get("closeTime"),
        }
        for item in rows
    ]
    result = _original_history_stats(translated)
    times = []
    now = datetime.now(timezone.utc)
    for item in translated:
        value = radar.timestamp(item.get("closeTime")) or radar.timestamp(item.get("openTime"))
        if value:
            times.append(value)
    latest = max(times) if times else None
    result["last_trade_time"] = latest.isoformat() if latest else None
    result["days_since_last_trade"] = round((now - latest).total_seconds() / 86400, 2) if latest else None
    for days in (7, 30, 60, 90):
        result[f"trades_last_{days}d"] = sum(
            (now - value).total_seconds() <= days * 86400 for value in times
        )
    return result


def score_without_activity(trader: dict[str, Any]) -> tuple[dict[str, Any], list[str], str]:
    accumulated = trader["metrics"].get("followers_accumulated")
    trader["metrics"]["followers_accumulated"] = 0
    scores, flags, recommendation, _ = _original_score(trader)
    trader["metrics"]["followers_accumulated"] = accumulated
    flags = [
        flag
        for flag in flags
        if "累计" not in flag and "疑似失活" not in flag and "长期带单但" not in flag
    ]
    return scores, sorted(set(flags)), recommendation


def fetch_client_rankings() -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    page = 1
    reported_pages = 1
    diagnostics = {"ok": True, "pages": 0, "reported_pages": None, "reported_total": None, "rows": 0}
    while page <= min(reported_pages, CLIENT_MAX_PAGES):
        payload = radar.get_json(
            CLIENT_RANK_PATH,
            {
                "size": CLIENT_PAGE_SIZE,
                "type": "",
                "start": page,
                "latestNum": "90",
                "fullState": "2",
                "apiTrader": "0",
                "instNumLimit": "4",
                "t": now_ms(),
            },
        )
        if payload.get("_error"):
            diagnostics["ok"] = False
            diagnostics["error"] = payload.get("_error")
            break
        data = payload.get("data") or []
        block = data[0] if data and isinstance(data[0], dict) else {}
        page_rows = block.get("ranks") or []
        reported_pages = radar.integer(block.get("pages")) or reported_pages
        diagnostics["reported_pages"] = reported_pages
        diagnostics["reported_total"] = radar.integer(block.get("total"))
        if not page_rows:
            break
        for index, incoming in enumerate(page_rows):
            code = str(incoming.get("uniqueName") or "").strip().upper()
            if not code:
                continue
            item = dict(incoming)
            item["uniqueName"] = code
            item["clientRank"] = (page - 1) * CLIENT_PAGE_SIZE + index + 1
            rows[code] = item
        diagnostics["pages"] = page
        diagnostics["rows"] = len(rows)
        page += 1
    diagnostics["ok"] = diagnostics["ok"] and bool(rows)
    return rows, diagnostics


def merge_rankings(
    public: dict[str, dict[str, Any]], client: dict[str, dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    merged = public
    for code, source in client.items():
        item = merged.setdefault(
            code,
            {
                "uniqueCode": code,
                "sourceRanks": {},
                "sourceSorts": [],
                "sourceAliases": [],
                "dataVersions": {},
            },
        )
        item["clientMember"] = True
        item["clientRank"] = source.get("clientRank")
        mapping = {
            "nickName": "nickName",
            "portrait": "portLink",
            "pnl": "pnl",
            "yieldRatio": "pnlRatio",
            "followerNum": "copyTraderNum",
            "followerLimit": "maxCopyTraderNum",
            "historyFollowerNum": "accCopyTraderNum",
            "initialDay": "leadDays",
            "aum": "aum",
            "winRatio": "winRatio",
            "followPnl": "clientCurrentFollowPnl",
        }
        for source_key, target_key in mapping.items():
            value = source.get(source_key)
            if value not in (None, ""):
                item[target_key] = value
        if source.get("rates"):
            item["rates"] = source.get("rates")
    return merged


def normalize_shallow(rank: dict[str, Any]) -> dict[str, Any]:
    code = rank["uniqueCode"]
    series = curve_points_from_rank(rank)
    metrics = {
        "roi_pct": radar.pct(rank.get("pnlRatio")),
        "pnl_usd": radar.number(rank.get("pnl")),
        "aum_usd": radar.number(rank.get("aum")),
        "followers": radar.integer(rank.get("copyTraderNum")),
        "followers_capacity": radar.integer(rank.get("maxCopyTraderNum")),
        "followers_accumulated": radar.integer(rank.get("accCopyTraderNum")),
        "lead_days": radar.integer(rank.get("leadDays")),
        "win_rate_pct": radar.pct(rank.get("winRatio")),
        "copy_pnl_usd": radar.number(rank.get("clientCurrentFollowPnl")),
        **curve_metrics(series),
    }
    return {
        "id": code,
        "unique_code": code,
        "name": rank.get("nickName") or code,
        "profile_url": f"https://www.okx.com/copy-trading/account/{code}?tab=swap",
        "avatar_url": rank.get("portLink"),
        "client_member": bool(rank.get("clientMember")),
        "client_rank": rank.get("clientRank"),
        "curve_scope": "leaderboard_90d",
        "is_curve_full": False,
        "is_deep": False,
        "metrics": metrics,
        "roi_series": series,
        "weekly_roi_series": [],
        "period_metrics": make_period_payload(series, [], "leaderboard"),
        "current_positions": [],
        "scores": {},
        "flags": [],
        "recommendation": "榜单数据",
        "alerts": [],
        "alert_level": "none",
        "data_quality": {"status": "basic", "fresh": True, "endpoints": {}},
    }


def fetch_curve_data(code: str) -> dict[str, Any]:
    common = {"uniqueName": code, "t": now_ms()}
    daily, daily_status = response_data(YIELD_PNL_PATH, {"latestNum": "0", **common})
    weekly, weekly_status = response_data(WEEK_PNL_PATH, common)
    return {
        "daily_curve": daily,
        "weekly_curve": weekly,
        "status": {"yield_pnl": daily_status, "week_pnl": weekly_status},
    }


def fetch_deep_data(code: str, curve: dict[str, Any] | None = None) -> dict[str, Any]:
    common = {"uniqueName": code, "t": now_ms()}
    curve = curve or fetch_curve_data(code)
    trade_data, trade_status = response_data(
        TRADE_DATA_PATH, {"latestNum": "0", "bizType": "SWAP", **common}
    )
    positions, positions_status = response_data(POSITION_DETAIL_PATH, common)
    history, history_status = response_data(
        POSITION_HISTORY_PATH, {"size": "200", **common}
    )
    status = dict(curve.get("status") or {})
    status.update(
        {
            "trade_data": trade_status,
            "positions": positions_status,
            "history": history_status,
        }
    )
    return {
        "trade_data": trade_data,
        "daily_curve": curve.get("daily_curve") or [],
        "weekly_curve": curve.get("weekly_curve") or [],
        "positions": positions,
        "history": history,
        "status": status,
    }


def apply_curve(trader: dict[str, Any], curve: dict[str, Any]) -> dict[str, Any]:
    daily = curve_points_from_yield(curve.get("daily_curve") or [])
    weekly = curve_points_from_yield(curve.get("weekly_curve") or [])
    endpoints = curve.get("status") or {}
    if daily:
        trader["roi_series"] = daily
        trader["weekly_roi_series"] = weekly
        trader["curve_scope"] = "full"
        trader["is_curve_full"] = True
        trader["metrics"].update(curve_metrics(daily))
        trader["period_metrics"] = make_period_payload(daily, weekly, "full")
    trader["data_quality"] = {
        "status": "curve_full" if daily else "curve_failed",
        "fresh": bool(daily),
        "endpoints": endpoints,
        "success_count": sum(bool(item.get("ok")) for item in endpoints.values()),
        "expected_count": 2,
    }
    return trader


def merge_previous_deep(current: dict[str, Any], previous: dict[str, Any]) -> dict[str, Any]:
    preserved = dict(current)
    for key in (
        "current_positions",
        "scores",
        "flags",
        "recommendation",
        "roi_series",
        "weekly_roi_series",
        "period_metrics",
        "curve_scope",
        "is_curve_full",
    ):
        if previous.get(key) not in (None, [], {}):
            preserved[key] = previous.get(key)
    merged_metrics = dict(previous.get("metrics") or {})
    merged_metrics.update(current.get("metrics") or {})
    for key in (
        "current_positions_count",
        "current_max_leverage",
        "current_total_margin_usd",
        "current_total_upl_usd",
        "current_upl_pct",
        "last_trade_time",
        "days_since_last_trade",
        "trades_last_7d",
        "trades_last_30d",
        "trades_last_60d",
        "trades_last_90d",
        "max_trade_loss_pct",
        "avg_trade_leverage",
        "max_trade_leverage",
    ):
        if key in (previous.get("metrics") or {}):
            merged_metrics[key] = previous["metrics"][key]
    preserved["metrics"] = merged_metrics
    preserved["is_deep"] = True
    preserved["data_quality"] = {
        "status": "stale_preserved",
        "fresh": False,
        "stale_from": previous.get("data_quality", {}).get("collected_at"),
        "endpoints": current.get("data_quality", {}).get("endpoints", {}),
    }
    return preserved


def apply_deep(
    trader: dict[str, Any], deep: dict[str, Any], previous: dict[str, Any] | None
) -> dict[str, Any]:
    status = deep.get("status") or {}
    success_count = sum(bool(item.get("ok")) for item in status.values())
    required_ok = bool(status.get("yield_pnl", {}).get("ok")) and bool(
        status.get("trade_data", {}).get("ok")
    )
    complete_enough = success_count >= 4 and required_ok

    trader = apply_curve(trader, deep)
    trader["data_quality"] = {
        "status": "deep_fresh" if complete_enough else "deep_partial",
        "fresh": complete_enough,
        "endpoints": status,
        "success_count": success_count,
        "expected_count": 5,
        "collected_at": radar.now_iso(),
    }
    if not complete_enough and previous and previous.get("is_deep"):
        return merge_previous_deep(trader, previous)

    section = deep.get("trade_data") or []
    root = section[0] if section and isinstance(section[0], dict) else {}
    non_periodic = map_metrics(root.get("nonPeriodicPart"))
    periodic = map_metrics(root.get("periodicPart"))
    positions, position_metrics = normalize_positions(deep.get("positions") or [])
    history_metrics = normalize_history(deep.get("history") or [])

    metrics = trader["metrics"]
    if first_number(non_periodic.get("aum")) is not None:
        metrics["aum_usd"] = first_number(non_periodic.get("aum"))
    if first_number(non_periodic.get("followerNum")) is not None:
        metrics["followers"] = int(first_number(non_periodic.get("followerNum")) or 0)
    if first_number(non_periodic.get("initialDay")) is not None:
        metrics["lead_days"] = int(first_number(non_periodic.get("initialDay")) or 0)
    if radar.number(non_periodic.get("currentFollowPnl")) is not None:
        metrics["copy_pnl_usd"] = radar.number(non_periodic.get("currentFollowPnl"))
    if radar.number(periodic.get("winRatio")) is not None:
        metrics["win_rate_pct"] = radar.pct(periodic.get("winRatio"))
    if radar.number(periodic.get("avgPositionValue")) is not None:
        metrics["avg_position_value_usd"] = radar.number(periodic.get("avgPositionValue"))

    trader["current_positions"] = positions
    metrics.update(position_metrics)
    metrics.update(history_metrics)
    trader["is_deep"] = True
    trader["scores"], trader["flags"], trader["recommendation"] = score_without_activity(trader)
    return trader


def sorted_codes(ranks: dict[str, dict[str, Any]], field: str) -> list[str]:
    return [
        item["uniqueCode"]
        for item in sorted(
            ranks.values(),
            key=lambda item: radar.number(item.get(field)) or 0,
            reverse=True,
        )
    ]


def build_orders(
    ranks: dict[str, dict[str, Any]], client: dict[str, dict[str, Any]]
) -> dict[str, list[str]]:
    followers = sorted(
        client.values(),
        key=lambda item: radar.number(item.get("followerNum")) or 0,
        reverse=True,
    )
    return {
        "aum": sorted_codes(ranks, "aum"),
        "followers": [item["uniqueName"] for item in followers],
        "days": sorted_codes(ranks, "leadDays"),
        "roi": sorted_codes(ranks, "pnlRatio"),
        "pnl": sorted_codes(ranks, "pnl"),
        "client_default": [
            item["uniqueName"]
            for item in sorted(client.values(), key=lambda item: item.get("clientRank") or 10**9)
        ],
    }


def comprehensive_key(item: dict[str, Any]) -> tuple[float, float, float]:
    metrics = item.get("metrics") or {}
    return (
        metrics.get("aum_usd") or 0,
        metrics.get("followers") or 0,
        metrics.get("lead_days") or 0,
    )


def load_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def snapshot_date(snapshot: dict[str, Any]) -> date | None:
    try:
        return date.fromisoformat(str(snapshot.get("date")))
    except ValueError:
        return None


def migrate_legacy_history() -> None:
    if not LEGACY_HISTORY_PATH.exists():
        return
    legacy = load_json(LEGACY_HISTORY_PATH, {})
    for snapshot in legacy.get("snapshots") or []:
        value = snapshot_date(snapshot)
        if not value:
            continue
        target = HISTORY_DIR / f"{value.isoformat()}.json"
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")


def load_snapshots() -> list[dict[str, Any]]:
    migrate_legacy_history()
    snapshots = []
    if not HISTORY_DIR.exists():
        return snapshots
    for path in sorted(HISTORY_DIR.glob("*.json")):
        payload = load_json(path, {})
        if snapshot_date(payload):
            snapshots.append(payload)
    return snapshots


def pick_snapshot(snapshots: list[dict[str, Any]], days_back: int) -> dict[str, Any] | None:
    target = datetime.now(timezone.utc).date() - timedelta(days=days_back)
    candidates = [
        item
        for item in snapshots
        if snapshot_date(item) is not None and snapshot_date(item) <= target
    ]
    return max(candidates, key=lambda item: snapshot_date(item) or date.min) if candidates else None


def build_snapshot(
    traders: list[dict[str, Any]], orders: dict[str, list[str]], generated_at: str
) -> dict[str, Any]:
    rank_aum = {code: index + 1 for index, code in enumerate(orders.get("aum") or [])}
    rank_followers = {
        code: index + 1 for index, code in enumerate(orders.get("followers") or [])
    }
    return {
        "schema_version": 2,
        "date": datetime.now(timezone.utc).date().isoformat(),
        "generated_at": generated_at,
        "traders": {
            item["unique_code"]: {
                "name": item.get("name"),
                "aum_usd": item.get("metrics", {}).get("aum_usd"),
                "followers": item.get("metrics", {}).get("followers"),
                "lead_days": item.get("metrics", {}).get("lead_days"),
                "roi_pct": item.get("metrics", {}).get("roi_pct"),
                "rank_aum": rank_aum.get(item["unique_code"]),
                "rank_followers": rank_followers.get(item["unique_code"]),
            }
            for item in traders
        },
    }


def safe_pct_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous in (None, 0):
        return None
    return round((current - previous) / abs(previous) * 100, 4)


def period_change(current: dict[str, Any], previous: dict[str, Any] | None) -> dict[str, Any] | None:
    if not previous:
        return None
    result: dict[str, Any] = {}
    for key in ("aum_usd", "followers", "roi_pct"):
        current_value = radar.number(current.get(key))
        previous_value = radar.number(previous.get(key))
        result[key] = (
            round(current_value - previous_value, 4)
            if current_value is not None and previous_value is not None
            else None
        )
    result["aum_pct"] = safe_pct_change(
        radar.number(current.get("aum_usd")), radar.number(previous.get("aum_usd"))
    )
    result["followers_pct"] = safe_pct_change(
        radar.number(current.get("followers")), radar.number(previous.get("followers"))
    )
    for key in ("rank_aum", "rank_followers"):
        current_value = radar.integer(current.get(key))
        previous_value = radar.integer(previous.get(key))
        result[key] = previous_value - current_value if current_value is not None and previous_value is not None else None
    if previous.get("aum_usd") not in (None, 0):
        prior_aum = float(previous["aum_usd"])
        roi_delta = radar.number(result.get("roi_pct")) or 0
        result["estimated_net_flow_usd"] = round((radar.number(result.get("aum_usd")) or 0) - prior_aum * roi_delta / 100, 4)
    else:
        result["estimated_net_flow_usd"] = None
    return result


def build_changes(
    traders: list[dict[str, Any]], current_snapshot: dict[str, Any], snapshots: list[dict[str, Any]]
) -> dict[str, Any]:
    references = {days: pick_snapshot(snapshots, days) for days in (1, 7, 30)}
    changes: dict[str, Any] = {}
    for trader in traders:
        code = trader["unique_code"]
        current = current_snapshot["traders"].get(code) or {}
        trader_changes = {}
        for days, snapshot in references.items():
            previous = (snapshot or {}).get("traders", {}).get(code) if snapshot else None
            trader_changes[f"{days}d"] = period_change(current, previous)
        changes[code] = trader_changes
        trader["changes"] = trader_changes
    return {
        "schema_version": 2,
        "generated_at": current_snapshot["generated_at"],
        "source_dates": {
            f"{days}d": (snapshot or {}).get("date") if snapshot else None
            for days, snapshot in references.items()
        },
        "traders": changes,
    }


def load_watchlist() -> list[str]:
    payload = load_json(WATCHLIST_PATH, {})
    return [str(code).upper() for code in payload.get("traders") or []]


def choose_deep_codes(
    traders: list[dict[str, Any]], changes: dict[str, Any], previous_payload: dict[str, Any]
) -> list[str]:
    selected: list[str] = []

    def add(code: str | None) -> None:
        if code and code not in selected and len(selected) < DEEP_MAX_LIMIT:
            selected.append(code)

    ordered = sorted(traders, key=comprehensive_key, reverse=True)
    for item in ordered[:DEEP_BASE_LIMIT]:
        add(item["unique_code"])
    for code in load_watchlist():
        add(code)

    anomaly_rows = []
    for item in traders:
        code = item["unique_code"]
        one_day = (changes.get("traders", {}).get(code) or {}).get("1d") or {}
        anomaly_rows.append(
            (
                max(
                    abs(radar.number(one_day.get("aum_pct")) or 0),
                    abs(radar.number(one_day.get("followers_pct")) or 0),
                ),
                code,
            )
        )
    for _, code in sorted(anomaly_rows, reverse=True)[:6]:
        add(code)

    for item in previous_payload.get("traders") or []:
        if item.get("alert_level") == "high":
            add(item.get("unique_code"))
    return selected


def build_alerts(trader: dict[str, Any]) -> tuple[list[dict[str, str]], str]:
    alerts: list[dict[str, str]] = []
    changes = trader.get("changes") or {}
    metrics = trader.get("metrics") or {}
    quality = trader.get("data_quality") or {}
    one_day = changes.get("1d") or {}
    seven_day = changes.get("7d") or {}
    thirty_day = changes.get("30d") or {}

    def add(category: str, severity: str, message: str) -> None:
        alerts.append({"category": category, "severity": severity, "message": message})

    if radar.number(one_day.get("aum_pct")) is not None and one_day["aum_pct"] <= -20:
        add("capital", "high", f"AUM 单日下降 {abs(one_day['aum_pct']):.1f}%")
    elif radar.number(seven_day.get("aum_pct")) is not None and seven_day["aum_pct"] <= -30:
        add("capital", "high", f"AUM 7日下降 {abs(seven_day['aum_pct']):.1f}%")
    elif radar.number(thirty_day.get("aum_pct")) is not None and thirty_day["aum_pct"] <= -40:
        add("capital", "medium", f"AUM 30日下降 {abs(thirty_day['aum_pct']):.1f}%")

    follower_change = radar.number(one_day.get("followers"))
    follower_pct = radar.number(one_day.get("followers_pct"))
    if follower_change is not None and follower_change <= -50:
        add("capital", "high", f"当前跟单人数单日减少 {abs(int(follower_change))}")
    elif follower_pct is not None and follower_pct <= -15:
        add("capital", "medium", f"当前跟单人数单日下降 {abs(follower_pct):.1f}%")

    roi_change = radar.number(one_day.get("roi_pct"))
    if roi_change is not None and roi_change <= -15:
        add("trading", "high", f"收益率单日回落 {abs(roi_change):.1f} 个百分点")
    if radar.number(metrics.get("daily_worst_move_pct")) is not None and metrics["daily_worst_move_pct"] <= -20:
        add("trading", "high", f"历史单日最大回落 {abs(metrics['daily_worst_move_pct']):.1f} 个百分点")
    if radar.number(metrics.get("max_drawdown_pct")) is not None and metrics["max_drawdown_pct"] >= 35:
        add("trading", "high", f"标准最大回撤 {metrics['max_drawdown_pct']:.1f}%")
    if radar.number(metrics.get("current_max_leverage")) is not None and metrics["current_max_leverage"] >= 20:
        add("trading", "high", f"当前最高杠杆 {metrics['current_max_leverage']:g}x")
    if radar.number(metrics.get("current_upl_pct")) is not None and metrics["current_upl_pct"] <= -20:
        add("trading", "high", f"当前持仓浮亏 {abs(metrics['current_upl_pct']):.1f}%")
    if radar.number(metrics.get("max_trade_loss_pct")) is not None and metrics["max_trade_loss_pct"] >= 30:
        add("trading", "medium", f"近期单笔最大亏损 {metrics['max_trade_loss_pct']:.1f}%")

    if quality.get("status") in {"curve_failed", "deep_partial", "stale_preserved"}:
        add("data", "medium", "本轮部分接口失败，已保留可用旧数据")

    seen = set()
    unique = []
    for item in alerts:
        key = (item["category"], item["message"])
        if key not in seen:
            seen.add(key)
            unique.append(item)
    level = (
        "high"
        if any(item["severity"] == "high" for item in unique)
        else "medium"
        if any(item["severity"] == "medium" for item in unique)
        else "low"
        if unique
        else "none"
    )
    return unique, level


def validate_dataset_health(
    traders: list[dict[str, Any]], client_diagnostics: dict[str, Any], previous_payload: dict[str, Any]
) -> dict[str, Any]:
    alerts = []
    previous_count = radar.integer(previous_payload.get("client_leaderboard_count"))
    current_count = radar.integer(client_diagnostics.get("rows")) or 0
    if not client_diagnostics.get("ok"):
        alerts.append({"severity": "high", "message": "OKX客户端榜单接口失败"})
    if previous_count and current_count < previous_count * 0.7:
        alerts.append(
            {
                "severity": "high",
                "message": f"客户端榜单人数从 {previous_count} 异常降至 {current_count}",
            }
        )
    missing_core = sum(
        1
        for item in traders
        if item.get("metrics", {}).get("aum_usd") is None
        or item.get("metrics", {}).get("followers") is None
    )
    if missing_core > max(5, len(traders) * 0.05):
        alerts.append({"severity": "high", "message": f"核心字段缺失账户达到 {missing_core} 个"})
    status = "failed" if any(item["severity"] == "high" for item in alerts) else "ok"
    return {"status": status, "alerts": alerts, "missing_core_count": missing_core}


def save_snapshot(snapshot: dict[str, Any]) -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    target = HISTORY_DIR / f"{snapshot['date']}.json"
    target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=HISTORY_KEEP_DAYS)
    for path in HISTORY_DIR.glob("*.json"):
        try:
            value = date.fromisoformat(path.stem)
        except ValueError:
            continue
        if value < cutoff:
            path.unlink()


def preview(
    by_code: dict[str, dict[str, Any]], codes: list[str], field: str
) -> list[dict[str, Any]]:
    output = []
    for code in codes[:8]:
        item = by_code.get(code)
        if item:
            output.append(
                {
                    "name": item["name"],
                    "unique_code": code,
                    "value": item.get("metrics", {}).get(field),
                }
            )
    return output


def run() -> int:
    radar.SORT_SPECS = PUBLIC_SORT_SPECS
    previous_payload = load_json(radar.OUTPUT, {})
    previous_by_code = {
        item.get("unique_code"): item for item in previous_payload.get("traders") or []
    }

    public, public_diagnostics = radar.fetch_rankings()
    client, client_diagnostics = fetch_client_rankings()
    if not public and not client:
        raise RuntimeError("OKX leaderboard collection returned no traders")

    ranks = merge_rankings(public, client)
    orders = build_orders(ranks, client)
    by_code = {code: normalize_shallow(rank) for code, rank in ranks.items()}
    traders = sorted(by_code.values(), key=comprehensive_key, reverse=True)

    health = validate_dataset_health(traders, client_diagnostics, previous_payload)
    if health["status"] == "failed" and previous_payload.get("traders"):
        raise RuntimeError("dataset health check failed: " + "; ".join(item["message"] for item in health["alerts"]))

    generated_at = radar.now_iso()
    snapshots = load_snapshots()
    provisional_snapshot = build_snapshot(traders, orders, generated_at)
    provisional_changes = build_changes(traders, provisional_snapshot, snapshots)

    curve_codes = [item["unique_code"] for item in traders[:CURVE_LIMIT]]
    curve_cache: dict[str, dict[str, Any]] = {}
    for index, code in enumerate(curve_codes, 1):
        print(f"[{index}/{len(curve_codes)}] full curve {by_code[code]['name']}")
        curve_cache[code] = fetch_curve_data(code)
        by_code[code] = apply_curve(by_code[code], curve_cache[code])

    traders = sorted(by_code.values(), key=comprehensive_key, reverse=True)
    current_snapshot = build_snapshot(traders, orders, generated_at)
    changes_payload = build_changes(traders, current_snapshot, snapshots)
    deep_codes = choose_deep_codes(traders, changes_payload, previous_payload)

    for index, code in enumerate(deep_codes, 1):
        if code not in by_code:
            continue
        print(f"[{index}/{len(deep_codes)}] deep analyze {by_code[code]['name']}")
        deep = fetch_deep_data(code, curve_cache.get(code))
        by_code[code] = apply_deep(by_code[code], deep, previous_by_code.get(code))

    traders = sorted(by_code.values(), key=comprehensive_key, reverse=True)
    current_snapshot = build_snapshot(traders, orders, generated_at)
    changes_payload = build_changes(traders, current_snapshot, snapshots)
    for trader in traders:
        trader["alerts"], trader["alert_level"] = build_alerts(trader)

    payload = {
        "schema_version": 11,
        "generated_at": generated_at,
        "source": "OKX public API + OKX client ecotrade leaderboard",
        "source_endpoints": [
            radar.LEADERBOARD,
            CLIENT_RANK_PATH,
            TRADE_DATA_PATH,
            YIELD_PNL_PATH,
            WEEK_PNL_PATH,
            POSITION_DETAIL_PATH,
            POSITION_HISTORY_PATH,
        ],
        "leaderboard_count": len(traders),
        "public_leaderboard_count": len(public),
        "client_leaderboard_count": len(client),
        "curve_count": sum(bool(item.get("is_curve_full")) for item in traders),
        "curve_limit": CURVE_LIMIT,
        "detail_count": sum(bool(item.get("is_deep")) for item in traders),
        "deep_base_limit": DEEP_BASE_LIMIT,
        "deep_max_limit": DEEP_MAX_LIMIT,
        "deep_codes": deep_codes,
        "official_orders": orders,
        "official_top_preview": {
            "aum": preview(by_code, orders["aum"], "aum_usd"),
            "followers": preview(by_code, orders["followers"], "followers"),
            "days": preview(by_code, orders["days"], "lead_days"),
        },
        "collection_diagnostics": {"public": public_diagnostics, "client": client_diagnostics},
        "dataset_health": health,
        "ranking_logic": [
            "综合排序：带单规模 AUM 第一、当前跟单人数第二、带单天数第三",
            "当前人数不使用 historyFollowerNum 或 accCopyTraderNum",
            "风险预警只提示，不改变官方排序与综合排序",
            "前50采集OKX完整收益曲线",
            "综合前10、异常变化账户、历史高风险账户和自选账户进入深度采集",
        ],
        "change_windows": ["1d", "7d", "30d"],
        "chart_periods": {
            "total": "OKX完整日线",
            "year": "OKX完整日线最近365天",
            "month": "OKX完整日线最近30天",
            "week": "OKX原生week-pnl周线",
            "day": "OKX完整日线最后两个日点",
            "order": ["total", "year", "month", "week", "day"],
        },
        "alert_categories": {
            "capital": "资金异常",
            "trading": "交易风险",
            "data": "数据异常",
        },
        "traders": traders,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    radar.OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    CHANGES_PATH.write_text(json.dumps(changes_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    save_snapshot(current_snapshot)
    print(
        "updated",
        radar.OUTPUT.relative_to(radar.ROOT),
        "with",
        len(traders),
        "rows,",
        payload["curve_count"],
        "full curves and",
        payload["detail_count"],
        "deep profiles",
    )
    return 0


radar.get_json = tolerant_get_json

if __name__ == "__main__":
    raise SystemExit(run())
