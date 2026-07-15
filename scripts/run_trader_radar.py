from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any

import collect_trader_radar as radar

_original_get_json = radar.get_json
_original_history_stats = radar.history_stats
_original_position_stats = radar.position_stats
_original_normalize = radar.normalize
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
CLIENT_PAGE_SIZE = 20
CLIENT_MAX_PAGES = 120
DETAIL_LIMIT = 30


def tolerant_get_json(path: str, params: dict[str, Any]):
    try:
        return _original_get_json(path, params)
    except Exception as exc:  # noqa: BLE001
        if path in {radar.LEADERBOARD, CLIENT_RANK_PATH}:
            print("skip unavailable OKX request:", path, params, type(exc).__name__, exc)
            return {"code": "0", "data": []}
        raise


def valid_position(item: dict[str, Any]) -> bool:
    instrument = str(item.get("instId") or "").strip()
    margin = radar.number(item.get("margin")) or 0
    return bool(instrument) and margin > 0


def history_stats(history: list[dict[str, Any]]) -> dict[str, Any]:
    result = _original_history_stats(history)
    now = datetime.now(timezone.utc)
    times = []
    for trade in history:
        latest = radar.timestamp(trade.get("closeTime")) or radar.timestamp(trade.get("openTime"))
        if latest:
            times.append(latest)
    most_recent = max(times) if times else None
    result["last_trade_time"] = most_recent.isoformat() if most_recent else None
    result["days_since_last_trade"] = round((now - most_recent).total_seconds() / 86400, 2) if most_recent else None
    for days in (7, 30, 60, 90):
        result[f"trades_last_{days}d"] = sum((now - value).total_seconds() <= days * 86400 for value in times)
    return result


def position_stats(positions: list[dict[str, Any]]) -> dict[str, Any]:
    valid = [item for item in positions if valid_position(item)]
    result = _original_position_stats(valid)
    result["raw_current_positions_count"] = len(positions)
    result["invalid_current_positions_count"] = len(positions) - len(valid)
    return result


def normalize(rank: dict[str, Any], detail: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    trader = _original_normalize(rank, detail)
    sources = detail.get("positions") or []
    normalized = trader.get("current_positions") or []
    trader["current_positions"] = [
        position for source, position in zip(sources, normalized) if valid_position(source)
    ]
    trader["metrics"]["current_positions_count"] = len(trader["current_positions"])
    trader["is_deep"] = True
    return trader


def activity_status(metrics: dict[str, Any]) -> tuple[str, int]:
    current = metrics.get("current_positions_count") or 0
    days_since = metrics.get("days_since_last_trade")
    if current > 0 or (metrics.get("trades_last_30d") or 0) > 0:
        return "活跃", 3
    if (metrics.get("trades_last_60d") or 0) > 0 or (days_since is not None and days_since <= 60):
        return "近期低活跃", 2
    if (metrics.get("trades_last_90d") or 0) > 0 or (days_since is not None and days_since <= 90):
        return "疑似停单", 1
    if days_since is not None and days_since > 90:
        return "长期未开单", 0
    return "活跃度未知", -1


def score(trader: dict[str, Any]):
    accumulated = trader["metrics"].get("followers_accumulated")
    trader["metrics"]["followers_accumulated"] = 0
    scores, flags, recommendation, _ = _original_score(trader)
    trader["metrics"]["followers_accumulated"] = accumulated

    status, tier = activity_status(trader["metrics"])
    trader["metrics"]["activity_status"] = status
    trader["metrics"]["activity_tier"] = tier
    flags = [flag for flag in flags if "累计" not in flag and "疑似失活" not in flag]

    if status == "近期低活跃":
        flags.append("最近30天无新单，但60天内仍有交易")
    elif status == "疑似停单":
        flags.append("最近60天无新单，但90天内仍有交易")
        recommendation = "高风险观察"
    elif status == "长期未开单":
        flags.append("超过90天无新单且无有效当前仓位")
        recommendation = "不建议跟单"
    elif status == "活跃度未知":
        flags.append("接口未返回可验证的最近交易时间，不能判定失活")
        recommendation = "数据不足/暂不判断"

    ranking_tier = tier * 100 + (10 if recommendation not in {"不建议跟单", "数据不足/暂不判断"} else 0)
    return scores, sorted(set(flags)), recommendation, ranking_tier


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


def merge_rankings(public: dict[str, dict[str, Any]], client: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    merged = public
    for code, source in client.items():
        item = merged.setdefault(code, {"uniqueCode": code, "sourceRanks": {}, "sourceSorts": [], "sourceAliases": [], "dataVersions": {}})
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
    return merged


def normalize_shallow(rank: dict[str, Any]) -> dict[str, Any]:
    code = rank["uniqueCode"]
    curve_metrics, roi_series = radar.curve_stats(rank.get("pnlRatios") or [])
    return {
        "id": code,
        "unique_code": code,
        "name": rank.get("nickName") or code,
        "profile_url": f"https://www.okx.com/copy-trading/account/{code}?tab=swap",
        "avatar_url": rank.get("portLink"),
        "client_member": bool(rank.get("clientMember")),
        "client_rank": rank.get("clientRank"),
        "is_deep": False,
        "metrics": {
            "roi_pct": radar.pct(rank.get("pnlRatio")),
            "pnl_usd": radar.number(rank.get("pnl")),
            "aum_usd": radar.number(rank.get("aum")),
            "followers": radar.integer(rank.get("copyTraderNum")),
            "followers_capacity": radar.integer(rank.get("maxCopyTraderNum")),
            "followers_accumulated": radar.integer(rank.get("accCopyTraderNum")),
            "lead_days": radar.integer(rank.get("leadDays")),
            "win_rate_pct": radar.pct(rank.get("winRatio")),
            "copy_pnl_usd": radar.number(rank.get("clientCurrentFollowPnl")),
            "activity_status": "未深度分析",
            "activity_tier": -1,
            **curve_metrics,
        },
        "roi_series": roi_series,
        "current_positions": [],
        "scores": {},
        "flags": [],
        "recommendation": "未深度分析",
        "ranking_tier": -100,
    }


def preserve_existing(shallow: dict[str, Any], existing: dict[str, Any] | None) -> dict[str, Any]:
    if not existing or not existing.get("is_deep"):
        return shallow
    result = dict(shallow)
    result["is_deep"] = True
    result["current_positions"] = existing.get("current_positions") or []
    result["scores"] = existing.get("scores") or {}
    result["flags"] = existing.get("flags") or []
    result["recommendation"] = existing.get("recommendation") or "未深度分析"
    result["ranking_tier"] = existing.get("ranking_tier", -100)
    metrics = dict(existing.get("metrics") or {})
    for key, value in (shallow.get("metrics") or {}).items():
        if key not in {"activity_status", "activity_tier"}:
            metrics[key] = value
    result["metrics"] = metrics
    if not shallow.get("roi_series"):
        result["roi_series"] = existing.get("roi_series") or []
    return result


def sorted_codes(ranks: dict[str, dict[str, Any]], field: str) -> list[str]:
    return [item["uniqueCode"] for item in sorted(ranks.values(), key=lambda item: radar.number(item.get(field)) or 0, reverse=True)]


def build_orders(ranks: dict[str, dict[str, Any]], client: dict[str, dict[str, Any]]) -> dict[str, list[str]]:
    followers = sorted(client.values(), key=lambda item: radar.number(item.get("followerNum")) or 0, reverse=True)
    return {
        "aum": sorted_codes(ranks, "aum"),
        "followers": [item["uniqueName"] for item in followers],
        "days": sorted_codes(ranks, "leadDays"),
        "roi": sorted_codes(ranks, "pnlRatio"),
        "pnl": sorted_codes(ranks, "pnl"),
        "client_default": [item["uniqueName"] for item in sorted(client.values(), key=lambda item: item.get("clientRank") or 10**9)],
    }


def detail_candidates(ranks: dict[str, dict[str, Any]], public_codes: set[str]) -> list[dict[str, Any]]:
    selected: dict[str, dict[str, Any]] = {}
    for field, limit in (("aum", 15), ("copyTraderNum", 15), ("leadDays", 10)):
        ordered = sorted(ranks.values(), key=lambda item: radar.number(item.get(field)) or 0, reverse=True)
        for item in ordered[:limit]:
            code = item["uniqueCode"]
            if code in public_codes:
                selected.setdefault(code, item)
            if len(selected) >= DETAIL_LIMIT:
                return list(selected.values())
    return list(selected.values())[:DETAIL_LIMIT]


def custom_key(item: dict[str, Any]) -> tuple[float, float, float, float]:
    m = item.get("metrics") or {}
    return (m.get("activity_tier", -1), m.get("aum_usd") or 0, m.get("followers") or 0, m.get("lead_days") or 0)


def preview(by_code: dict[str, dict[str, Any]], codes: list[str], field: str) -> list[dict[str, Any]]:
    output = []
    for code in codes[:8]:
        item = by_code.get(code)
        if item:
            output.append({"name": item["name"], "unique_code": code, "value": item.get("metrics", {}).get(field)})
    return output


def run() -> int:
    radar.SORT_SPECS = PUBLIC_SORT_SPECS
    public, public_diagnostics = radar.fetch_rankings()
    public_codes = set(public)
    public_count = len(public)
    client, client_diagnostics = fetch_client_rankings()
    if not public and not client:
        raise RuntimeError("OKX leaderboard collection returned no traders")

    ranks = merge_rankings(public, client)
    orders = build_orders(ranks, client)

    existing_payload = {}
    if radar.OUTPUT.exists():
        try:
            existing_payload = json.loads(radar.OUTPUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing_payload = {}
    existing_by_code = {item.get("unique_code"): item for item in existing_payload.get("traders") or []}

    by_code = {code: preserve_existing(normalize_shallow(rank), existing_by_code.get(code)) for code, rank in ranks.items()}

    candidates = detail_candidates(ranks, public_codes)
    for index, rank in enumerate(candidates, 1):
        print(f"[{index}/{len(candidates)}] deep analyze {rank.get('nickName') or rank['uniqueCode']}")
        trader = normalize(rank, radar.fetch_details(rank["uniqueCode"]))
        trader["client_member"] = bool(rank.get("clientMember"))
        trader["client_rank"] = rank.get("clientRank")
        trader["scores"], trader["flags"], trader["recommendation"], trader["ranking_tier"] = score(trader)
        by_code[rank["uniqueCode"]] = trader

    traders = sorted(by_code.values(), key=custom_key, reverse=True)
    payload = {
        "schema_version": 9,
        "generated_at": radar.now_iso(),
        "source": "OKX public API + OKX client ecotrade leaderboard",
        "source_endpoints": [radar.LEADERBOARD, CLIENT_RANK_PATH, radar.POSITIONS, radar.HISTORY, radar.FOLLOWERS],
        "leaderboard_count": len(traders),
        "public_leaderboard_count": public_count,
        "client_leaderboard_count": len(client),
        "detail_count": sum(bool(item.get("is_deep")) for item in traders),
        "official_orders": orders,
        "official_top_preview": {
            "aum": preview(by_code, orders["aum"], "aum_usd"),
            "followers": preview(by_code, orders["followers"], "followers"),
            "days": preview(by_code, orders["days"], "lead_days"),
        },
        "collection_diagnostics": {"public": public_diagnostics, "client": client_diagnostics},
        "ranking_logic": [
            "客户端当前跟单人数榜：客户端成员池按 followerNum 降序",
            "带单规模榜：合并成员池按 AUM 降序",
            "当前人数不使用 historyFollowerNum 或 accCopyTraderNum",
            "自定义综合排序：活跃、AUM、当前人数、带单天数",
        ],
        "follower_basis": "客户端榜使用 followerNum；历史累计人数只作背景",
        "chart_periods": {"total": "完整曲线", "year": "365天", "month": "30天", "week": "7天", "day": "1天", "order": ["total", "year", "month", "week", "day"]},
        "traders": traders,
    }
    radar.OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    radar.OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("updated", radar.OUTPUT.relative_to(radar.ROOT), "with", len(traders), "rows")
    return 0


radar.get_json = tolerant_get_json
radar.history_stats = history_stats
radar.position_stats = position_stats
radar.normalize = normalize
radar.score = score

if __name__ == "__main__":
    raise SystemExit(run())
