from __future__ import annotations

import json
import math
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
DEEP_LIMIT = 10
HISTORY_KEEP_DAYS = 400
HISTORY_PATH = radar.ROOT / "trader-radar" / "data" / "history.json"


def tolerant_get_json(path: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        return _original_get_json(path, params)
    except Exception as exc:  # noqa: BLE001
        if path.startswith("/priapi/") or path == radar.LEADERBOARD:
            print("skip unavailable OKX request:", path, params, type(exc).__name__, exc)
            return {"code": "0", "data": []}
        raise


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


def curve_points_from_rank(rank: dict[str, Any]) -> list[dict[str, Any]]:
    points = []
    for item in rank.get("rates") or []:
        raw_time = radar.number(item.get("statTime"))
        raw_ratio = radar.number(item.get("ratio"))
        if raw_ratio is None:
            continue
        points.append(
            {
                "time": datetime.fromtimestamp(raw_time / 1000, tz=timezone.utc).isoformat()
                if raw_time
                else None,
                "roi_pct": round(raw_ratio * 100, 6),
                "pnl_usd": None,
            }
        )
    return sorted(points, key=lambda item: item.get("time") or "")


def curve_points_from_yield(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    points = []
    for item in rows:
        raw_time = radar.number(item.get("statTime"))
        raw_ratio = radar.number(item.get("ratio"))
        if raw_time is None or raw_ratio is None:
            continue
        points.append(
            {
                "time": datetime.fromtimestamp(raw_time / 1000, tz=timezone.utc).isoformat(),
                "roi_pct": round(raw_ratio * 100, 6),
                "pnl_usd": radar.number(item.get("pnl")),
            }
        )
    return sorted(points, key=lambda item: item["time"])


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

    peak = values[0]
    max_drawdown = 0.0
    changes: list[float] = []
    directions: list[int] = []
    rising = 0
    for previous, current in zip(values, values[1:]):
        peak = max(peak, current)
        max_drawdown = max(max_drawdown, peak - current)
        delta = current - previous
        changes.append(delta)
        rising += int(delta >= 0)
        directions.append(1 if delta > 0 else -1 if delta < 0 else 0)

    nonzero = [value for value in directions if value]
    reversals = sum(a != b for a, b in zip(nonzero, nonzero[1:]))
    return {
        "max_drawdown_pct": round(max_drawdown, 4),
        "curve_upward_ratio_pct": round(rising / len(changes) * 100, 4) if changes else None,
        "curve_direction_change_pct": round(reversals / max(1, len(nonzero) - 1) * 100, 4)
        if len(nonzero) > 1
        else 0.0,
        "curve_step_volatility": round(sum(abs(value) for value in changes) / len(changes), 4)
        if changes
        else None,
        "daily_worst_move_pct": round(min(changes), 4) if changes else None,
    }


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
        positions.append(
            {
                "instrument": item.get("instId"),
                "side": item.get("posSide") or item.get("side"),
                "leverage": leverage,
                "margin_usd": margin,
                "upl_usd": pnl,
                "upl_pct": radar.pct(item.get("pnlRatio")),
                "open_time": radar.timestamp(item.get("openTime")).isoformat()
                if radar.timestamp(item.get("openTime"))
                else None,
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


def score_without_activity(trader: dict[str, Any]) -> tuple[dict[str, Any], list[str], str, int]:
    accumulated = trader["metrics"].get("followers_accumulated")
    trader["metrics"]["followers_accumulated"] = 0
    scores, flags, recommendation, _ = _original_score(trader)
    trader["metrics"]["followers_accumulated"] = accumulated
    flags = [
        flag
        for flag in flags
        if "累计" not in flag and "疑似失活" not in flag and "长期带单但" not in flag
    ]
    return scores, sorted(set(flags)), recommendation, 1


def fetch_client_rankings() -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    page = 1
    reported_pages = 1
    diagnostics = {"pages": 0, "reported_pages": None, "reported_total": None, "rows": 0}

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
                "t": int(time.time() * 1000),
            },
        )
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
        "is_deep": False,
        "metrics": metrics,
        "roi_series": series,
        "weekly_roi_series": [],
        "current_positions": [],
        "scores": {},
        "flags": [],
        "recommendation": "榜单数据",
        "alerts": [],
        "alert_level": "none",
    }


def fetch_internal_deep(code: str) -> dict[str, Any]:
    common = {"uniqueName": code, "t": int(time.time() * 1000)}
    trade_data = radar.get_json(
        TRADE_DATA_PATH,
        {"latestNum": "0", "bizType": "SWAP", **common},
    ).get("data") or []
    daily_curve = radar.get_json(
        YIELD_PNL_PATH,
        {"latestNum": "0", **common},
    ).get("data") or []
    weekly_curve = radar.get_json(WEEK_PNL_PATH, common).get("data") or []
    positions = radar.get_json(POSITION_DETAIL_PATH, common).get("data") or []
    history = radar.get_json(
        POSITION_HISTORY_PATH,
        {"size": "200", **common},
    ).get("data") or []
    return {
        "trade_data": trade_data,
        "daily_curve": daily_curve,
        "weekly_curve": weekly_curve,
        "positions": positions,
        "history": history,
    }


def apply_deep(trader: dict[str, Any], deep: dict[str, Any]) -> dict[str, Any]:
    section = deep.get("trade_data") or []
    root = section[0] if section and isinstance(section[0], dict) else {}
    non_periodic = map_metrics(root.get("nonPeriodicPart"))
    periodic = map_metrics(root.get("periodicPart"))

    series = curve_points_from_yield(deep.get("daily_curve") or [])
    weekly_series = curve_points_from_yield(deep.get("weekly_curve") or [])
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

    if series:
        trader["roi_series"] = series
        metrics.update(curve_metrics(series))
    trader["weekly_roi_series"] = weekly_series
    trader["current_positions"] = positions
    metrics.update(position_metrics)
    metrics.update(history_metrics)
    trader["is_deep"] = True
    trader["scores"], trader["flags"], trader["recommendation"], _ = score_without_activity(trader)
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


def load_history() -> dict[str, Any]:
    if not HISTORY_PATH.exists():
        return {"schema_version": 1, "snapshots": []}
    try:
        payload = json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
        if not isinstance(payload.get("snapshots"), list):
            raise ValueError("invalid snapshots")
        return payload
    except (OSError, ValueError, json.JSONDecodeError):
        return {"schema_version": 1, "snapshots": []}


def snapshot_date(snapshot: dict[str, Any]) -> date | None:
    try:
        return date.fromisoformat(str(snapshot.get("date")))
    except ValueError:
        return None


def pick_snapshot(snapshots: list[dict[str, Any]], days_back: int) -> dict[str, Any] | None:
    target = datetime.now(timezone.utc).date() - timedelta(days=days_back)
    candidates = [
        item
        for item in snapshots
        if snapshot_date(item) is not None and snapshot_date(item) <= target
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda item: snapshot_date(item) or date.min)


def safe_pct_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous in (None, 0):
        return None
    return round((current - previous) / abs(previous) * 100, 4)


def build_snapshot(
    traders: list[dict[str, Any]], orders: dict[str, list[str]], generated_at: str
) -> dict[str, Any]:
    rank_aum = {code: index + 1 for index, code in enumerate(orders.get("aum") or [])}
    rank_followers = {
        code: index + 1 for index, code in enumerate(orders.get("followers") or [])
    }
    return {
        "date": datetime.now(timezone.utc).date().isoformat(),
        "generated_at": generated_at,
        "traders": {
            item["unique_code"]: {
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


def period_change(current: dict[str, Any], previous: dict[str, Any] | None) -> dict[str, Any] | None:
    if not previous:
        return None
    result = {
        "aum_usd": None,
        "aum_pct": None,
        "followers": None,
        "followers_pct": None,
        "rank_aum": None,
        "rank_followers": None,
        "roi_pct": None,
    }
    for key in ("aum_usd", "followers", "roi_pct"):
        current_value = radar.number(current.get(key))
        previous_value = radar.number(previous.get(key))
        if current_value is not None and previous_value is not None:
            result[key] = round(current_value - previous_value, 4)
    result["aum_pct"] = safe_pct_change(
        radar.number(current.get("aum_usd")), radar.number(previous.get("aum_usd"))
    )
    result["followers_pct"] = safe_pct_change(
        radar.number(current.get("followers")), radar.number(previous.get("followers"))
    )
    for key in ("rank_aum", "rank_followers"):
        current_value = radar.integer(current.get(key))
        previous_value = radar.integer(previous.get(key))
        if current_value is not None and previous_value is not None:
            result[key] = previous_value - current_value
    return result


def attach_changes(
    traders: list[dict[str, Any]], current_snapshot: dict[str, Any], history: dict[str, Any]
) -> None:
    snapshots = history.get("snapshots") or []
    references = {days: pick_snapshot(snapshots, days) for days in (1, 7, 30)}
    for trader in traders:
        code = trader["unique_code"]
        current = current_snapshot["traders"].get(code) or {}
        changes = {}
        for days, snapshot in references.items():
            previous = (snapshot or {}).get("traders", {}).get(code) if snapshot else None
            changes[f"{days}d"] = period_change(current, previous)
        trader["changes"] = changes


def build_alerts(trader: dict[str, Any]) -> tuple[list[dict[str, str]], str]:
    alerts: list[dict[str, str]] = []
    changes = trader.get("changes") or {}
    metrics = trader.get("metrics") or {}

    one_day = changes.get("1d") or {}
    seven_day = changes.get("7d") or {}
    thirty_day = changes.get("30d") or {}

    if radar.number(one_day.get("aum_pct")) is not None and one_day["aum_pct"] <= -20:
        alerts.append({"severity": "high", "type": "capital", "message": f"AUM 单日下降 {abs(one_day['aum_pct']):.1f}%"})
    elif radar.number(seven_day.get("aum_pct")) is not None and seven_day["aum_pct"] <= -30:
        alerts.append({"severity": "high", "type": "capital", "message": f"AUM 7日下降 {abs(seven_day['aum_pct']):.1f}%"})
    elif radar.number(thirty_day.get("aum_pct")) is not None and thirty_day["aum_pct"] <= -40:
        alerts.append({"severity": "medium", "type": "capital", "message": f"AUM 30日下降 {abs(thirty_day['aum_pct']):.1f}%"})

    follower_change = radar.number(one_day.get("followers"))
    follower_pct = radar.number(one_day.get("followers_pct"))
    if follower_change is not None and follower_change <= -50:
        alerts.append({"severity": "high", "type": "followers", "message": f"当前跟单人数单日减少 {abs(int(follower_change))}"})
    elif follower_pct is not None and follower_pct <= -15:
        alerts.append({"severity": "medium", "type": "followers", "message": f"当前跟单人数单日下降 {abs(follower_pct):.1f}%"})

    roi_change = radar.number(one_day.get("roi_pct"))
    if roi_change is not None and roi_change <= -15:
        alerts.append({"severity": "high", "type": "return", "message": f"收益率单日回落 {abs(roi_change):.1f} 个百分点"})

    if radar.number(metrics.get("daily_worst_move_pct")) is not None and metrics["daily_worst_move_pct"] <= -20:
        alerts.append({"severity": "high", "type": "curve", "message": f"历史单日最大回落 {abs(metrics['daily_worst_move_pct']):.1f} 个百分点"})
    if radar.number(metrics.get("max_drawdown_pct")) is not None and metrics["max_drawdown_pct"] >= 35:
        alerts.append({"severity": "high", "type": "drawdown", "message": f"累计曲线最大回撤 {metrics['max_drawdown_pct']:.1f}%"})
    if radar.number(metrics.get("current_max_leverage")) is not None and metrics["current_max_leverage"] >= 20:
        alerts.append({"severity": "high", "type": "leverage", "message": f"当前最高杠杆 {metrics['current_max_leverage']:g}x"})
    if radar.number(metrics.get("current_upl_pct")) is not None and metrics["current_upl_pct"] <= -20:
        alerts.append({"severity": "high", "type": "position", "message": f"当前持仓浮亏 {abs(metrics['current_upl_pct']):.1f}%"})
    if radar.number(metrics.get("max_trade_loss_pct")) is not None and metrics["max_trade_loss_pct"] >= 30:
        alerts.append({"severity": "medium", "type": "trade", "message": f"近期开单最大亏损 {metrics['max_trade_loss_pct']:.1f}%"})

    seen = set()
    unique = []
    for item in alerts:
        key = item["message"]
        if key not in seen:
            seen.add(key)
            unique.append(item)
    level = "high" if any(item["severity"] == "high" for item in unique) else "medium" if unique else "none"
    return unique, level


def save_history(history: dict[str, Any], current_snapshot: dict[str, Any]) -> None:
    snapshots = [
        item
        for item in history.get("snapshots") or []
        if item.get("date") != current_snapshot.get("date")
    ]
    snapshots.append(current_snapshot)
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=HISTORY_KEEP_DAYS)
    snapshots = [
        item
        for item in snapshots
        if snapshot_date(item) is not None and snapshot_date(item) >= cutoff
    ]
    snapshots.sort(key=lambda item: item.get("date") or "")
    payload = {"schema_version": 1, "snapshots": snapshots}
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


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
    public, public_diagnostics = radar.fetch_rankings()
    public_count = len(public)
    client, client_diagnostics = fetch_client_rankings()
    if not public and not client:
        raise RuntimeError("OKX leaderboard collection returned no traders")

    ranks = merge_rankings(public, client)
    orders = build_orders(ranks, client)
    by_code = {code: normalize_shallow(rank) for code, rank in ranks.items()}

    deep_codes = [
        item["unique_code"]
        for item in sorted(by_code.values(), key=comprehensive_key, reverse=True)[:DEEP_LIMIT]
    ]
    for index, code in enumerate(deep_codes, 1):
        trader = by_code[code]
        print(f"[{index}/{len(deep_codes)}] OKX native deep analyze {trader['name']}")
        by_code[code] = apply_deep(trader, fetch_internal_deep(code))

    traders = sorted(by_code.values(), key=comprehensive_key, reverse=True)
    generated_at = radar.now_iso()
    history = load_history()
    current_snapshot = build_snapshot(traders, orders, generated_at)
    attach_changes(traders, current_snapshot, history)

    for trader in traders:
        trader["alerts"], trader["alert_level"] = build_alerts(trader)

    payload = {
        "schema_version": 10,
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
        "public_leaderboard_count": public_count,
        "client_leaderboard_count": len(client),
        "detail_count": len(deep_codes),
        "deep_limit": DEEP_LIMIT,
        "deep_codes": deep_codes,
        "official_orders": orders,
        "official_top_preview": {
            "aum": preview(by_code, orders["aum"], "aum_usd"),
            "followers": preview(by_code, orders["followers"], "followers"),
            "days": preview(by_code, orders["days"], "lead_days"),
        },
        "collection_diagnostics": {"public": public_diagnostics, "client": client_diagnostics},
        "ranking_logic": [
            "综合排序：带单规模 AUM 第一、当前跟单人数第二、带单天数第三",
            "当前人数不使用 historyFollowerNum 或 accCopyTraderNum",
            "风险预警只提示，不改变官方排序与综合排序",
            "每日深度采集综合排序前10名",
        ],
        "change_windows": ["1d", "7d", "30d"],
        "chart_periods": {
            "source": "OKX yield-pnl 每日原始序列；周线同时保存 OKX week-pnl 原始序列",
            "total": "OKX 当前返回的完整每日曲线",
            "year": "完整日线中最近365天",
            "month": "完整日线中最近30天",
            "week": "完整日线中最近7天",
            "day": "完整日线最后两个日点的单日变化",
            "order": ["total", "year", "month", "week", "day"],
        },
        "alert_rules": [
            "AUM 单日下降20%或7日下降30%",
            "当前跟单人数单日大幅下降",
            "收益率单日回落15个百分点",
            "曲线最大回撤35%",
            "当前杠杆20x以上或持仓浮亏20%以上",
        ],
        "traders": traders,
    }

    radar.OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    radar.OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    save_history(history, current_snapshot)
    print(
        "updated",
        radar.OUTPUT.relative_to(radar.ROOT),
        "with",
        len(traders),
        "rows and",
        len(deep_codes),
        "OKX-native deep profiles",
    )
    return 0


radar.get_json = tolerant_get_json

if __name__ == "__main__":
    raise SystemExit(run())
