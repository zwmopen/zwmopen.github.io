from __future__ import annotations

import json
from datetime import datetime, timezone

import collect_trader_radar as radar

_original_get_json = radar.get_json
_original_history_stats = radar.history_stats
_original_position_stats = radar.position_stats
_original_normalize = radar.normalize
_original_score = radar.score

# OKX's documented public sort types. Current follower count is not a public
# sortType, so it must be derived from the complete leaderboard using
# copyTraderNum rather than guessed API aliases.
OFFICIAL_SORT_SPECS = [
    ("overview", ["overview"]),
    ("pnl", ["pnl"]),
    ("aum", ["aum"]),
    ("win_ratio", ["win_ratio"]),
    ("pnl_ratio", ["pnl_ratio"]),
    ("copy_pnl", ["current_copy_trader_pnl"]),
]
DETAIL_LIMIT = 80


def tolerant_get_json(path: str, params: dict):
    try:
        return _original_get_json(path, params)
    except Exception as exc:  # noqa: BLE001
        if path == radar.LEADERBOARD:
            print(
                "skip unavailable leaderboard request:",
                params.get("sortType"),
                "page",
                params.get("page"),
                type(exc).__name__,
                exc,
            )
            return {"code": "0", "data": []}
        raise


def valid_position(item: dict) -> bool:
    instrument = str(item.get("instId") or "").strip()
    margin = radar.number(item.get("margin")) or 0
    return bool(instrument) and margin > 0


def history_stats(history: list[dict]) -> dict:
    result = _original_history_stats(history)
    now = datetime.now(timezone.utc)
    trade_times = []

    for trade in history:
        closed = radar.timestamp(trade.get("closeTime"))
        opened = radar.timestamp(trade.get("openTime"))
        latest = closed or opened
        if latest:
            trade_times.append(latest)

    most_recent = max(trade_times) if trade_times else None
    result["last_trade_time"] = most_recent.isoformat() if most_recent else None
    result["days_since_last_trade"] = (
        round((now - most_recent).total_seconds() / 86400, 2)
        if most_recent
        else None
    )
    result["trades_last_7d"] = sum(
        (now - value).total_seconds() <= 7 * 86400 for value in trade_times
    )
    result["trades_last_30d"] = sum(
        (now - value).total_seconds() <= 30 * 86400 for value in trade_times
    )
    result["trades_last_60d"] = sum(
        (now - value).total_seconds() <= 60 * 86400 for value in trade_times
    )
    result["trades_last_90d"] = sum(
        (now - value).total_seconds() <= 90 * 86400 for value in trade_times
    )
    return result


def position_stats(positions: list[dict]) -> dict:
    valid = [item for item in positions if valid_position(item)]
    result = _original_position_stats(valid)
    result["raw_current_positions_count"] = len(positions)
    result["invalid_current_positions_count"] = len(positions) - len(valid)
    return result


def normalize(rank: dict, detail: dict[str, list[dict]]) -> dict:
    trader = _original_normalize(rank, detail)
    normalized_positions = trader.get("current_positions") or []
    sources = detail.get("positions") or []
    trader["current_positions"] = [
        position
        for source, position in zip(sources, normalized_positions)
        if valid_position(source)
    ]
    trader["metrics"]["current_positions_count"] = len(trader["current_positions"])
    trader["is_deep"] = True
    return trader


def activity_status(metrics: dict) -> tuple[str, int]:
    current_positions = metrics.get("current_positions_count") or 0
    last_30d = metrics.get("trades_last_30d") or 0
    last_60d = metrics.get("trades_last_60d") or 0
    last_90d = metrics.get("trades_last_90d") or 0
    days_since = metrics.get("days_since_last_trade")

    if current_positions > 0 or last_30d > 0:
        return "活跃", 3
    if last_60d > 0 or (days_since is not None and days_since <= 60):
        return "近期低活跃", 2
    if last_90d > 0 or (days_since is not None and days_since <= 90):
        return "疑似停单", 1
    if days_since is not None and days_since > 90:
        return "长期未开单", 0
    return "活跃度未知", -1


def score(trader: dict):
    # Accumulated followers are background information only.
    original_accumulated = trader["metrics"].get("followers_accumulated")
    trader["metrics"]["followers_accumulated"] = 0
    scores, flags, recommendation, _ = _original_score(trader)
    trader["metrics"]["followers_accumulated"] = original_accumulated

    status, activity_tier = activity_status(trader["metrics"])
    trader["metrics"]["activity_status"] = status
    trader["metrics"]["activity_tier"] = activity_tier
    trader["metrics"]["current_follower_validation"] = (
        trader["metrics"].get("followers") or 0
    )

    flags = [
        flag
        for flag in flags
        if "累计" not in flag and "疑似失活" not in flag
    ]

    if status == "近期低活跃":
        flags.append("最近30天无新单，但60天内仍有交易")
        scores["overall"] = min(scores.get("overall", 0), 72)
        recommendation = "小额观察"
    elif status == "疑似停单":
        flags.append("最近60天无新单，但90天内仍有交易")
        scores["overall"] = min(scores.get("overall", 0), 52)
        recommendation = "高风险观察"
    elif status == "长期未开单":
        flags.append("超过90天无新单且无有效当前仓位")
        scores["overall"] = min(scores.get("overall", 0), 35)
        recommendation = "不建议跟单"
    elif status == "活跃度未知":
        flags.append("公开接口未返回可验证的最近交易时间，不能判定失活")
        recommendation = "数据不足/暂不判断"

    ranking_tier = activity_tier * 100 + (
        10
        if recommendation not in {"不建议跟单", "数据不足/暂不判断"}
        else 0
    )
    return scores, sorted(set(flags)), recommendation, ranking_tier


def normalize_shallow(rank: dict) -> dict:
    code = rank["uniqueCode"]
    curve_metrics, roi_series = radar.curve_stats(rank.get("pnlRatios") or [])
    return {
        "id": code,
        "unique_code": code,
        "name": rank.get("nickName") or code,
        "profile_url": f"https://www.okx.com/copy-trading/account/{code}",
        "avatar_url": rank.get("portLink"),
        "source_ranks": rank.get("sourceRanks") or {},
        "source_sorts": sorted(set(rank.get("sourceSorts") or [])),
        "source_aliases": sorted(set(rank.get("sourceAliases") or [])),
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


def sort_ranks(ranks: dict[str, dict], field: str) -> list[dict]:
    return sorted(
        ranks.values(),
        key=lambda item: (
            radar.number(item.get(field)) or 0,
            -(item.get("sourceRanks", {}).get("overview") or 10**9),
        ),
        reverse=True,
    )


def assign_derived_ranks(ranks: dict[str, dict]) -> dict[str, list[str]]:
    definitions = {
        "aum": "aum",
        "followers": "copyTraderNum",
        "days": "leadDays",
        "roi": "pnlRatio",
        "pnl": "pnl",
    }
    orders: dict[str, list[str]] = {}
    for label, field in definitions.items():
        ordered = sort_ranks(ranks, field)
        orders[label] = [item["uniqueCode"] for item in ordered]
        for index, item in enumerate(ordered, 1):
            item.setdefault("sourceRanks", {})[label] = index
    return orders


def detail_candidates(ranks: dict[str, dict]) -> list[dict]:
    selected: dict[str, dict] = {}
    buckets = [
        ("aum", 35),
        ("copyTraderNum", 35),
        ("leadDays", 20),
        ("pnl", 15),
    ]
    for field, limit in buckets:
        for item in sort_ranks(ranks, field)[:limit]:
            selected.setdefault(item["uniqueCode"], item)
            if len(selected) >= DETAIL_LIMIT:
                return list(selected.values())
    return list(selected.values())[:DETAIL_LIMIT]


def custom_rank_key(item: dict) -> tuple[float, float, float, float, float]:
    metrics = item["metrics"]
    return (
        metrics.get("activity_tier", -1),
        1
        if item.get("recommendation")
        not in {"不建议跟单", "数据不足/暂不判断", "未深度分析"}
        else 0,
        metrics.get("aum_usd") or 0,
        metrics.get("followers") or 0,
        metrics.get("lead_days") or 0,
    )


def preview(traders: list[dict], key: str, limit: int = 5) -> list[dict]:
    field_map = {
        "aum": "aum_usd",
        "followers": "followers",
        "days": "lead_days",
    }
    field = field_map[key]
    ordered = sorted(
        traders,
        key=lambda item: item.get("metrics", {}).get(field) or 0,
        reverse=True,
    )[:limit]
    return [
        {
            "name": item["name"],
            "unique_code": item["unique_code"],
            "value": item["metrics"].get(field),
        }
        for item in ordered
    ]


def run() -> int:
    radar.SORT_SPECS = OFFICIAL_SORT_SPECS
    radar.DETAIL_LIMIT = DETAIL_LIMIT

    ranks, diagnostics = radar.fetch_rankings()
    if not ranks:
        raise RuntimeError("OKX leaderboard collection returned no traders")

    official_orders = assign_derived_ranks(ranks)
    traders_by_code = {
        code: normalize_shallow(rank)
        for code, rank in ranks.items()
    }

    candidates = detail_candidates(ranks)
    for index, rank in enumerate(candidates, 1):
        print(
            f"[{index}/{len(candidates)}] deep analyze "
            f"{rank.get('nickName') or rank['uniqueCode']}"
        )
        trader = normalize(rank, radar.fetch_details(rank["uniqueCode"]))
        (
            trader["scores"],
            trader["flags"],
            trader["recommendation"],
            trader["ranking_tier"],
        ) = score(trader)
        traders_by_code[rank["uniqueCode"]] = trader

    traders = list(traders_by_code.values())
    traders.sort(key=custom_rank_key, reverse=True)

    payload = {
        "schema_version": 8,
        "generated_at": radar.now_iso(),
        "source": "OKX public copy-trading API",
        "source_endpoints": [
            radar.LEADERBOARD,
            radar.POSITIONS,
            radar.HISTORY,
            radar.FOLLOWERS,
        ],
        "leaderboard_count": len(traders),
        "leaderboard_union_count": len(ranks),
        "detail_count": sum(bool(item.get("is_deep")) for item in traders),
        "official_orders": official_orders,
        "official_top_preview": {
            "aum": preview(traders, "aum"),
            "followers": preview(traders, "followers"),
            "days": preview(traders, "days"),
        },
        "collection_diagnostics": diagnostics,
        "ranking_logic": [
            "官方带单规模：完整榜单按 aum 降序，不附加活跃或风险过滤",
            "官方当前跟单人数：完整榜单按 copyTraderNum 降序，不使用 accCopyTraderNum",
            "自定义综合排序：已验证活跃优先，再按 AUM、当前跟单人数、带单天数",
            "深度样本只补充仓位、历史订单与风险，不决定是否进入官方榜单",
        ],
        "activity_rules": {
            "active": "存在有效公开仓位，或最近30天有历史订单",
            "low_activity": "最近30天无单，但最近60天仍有订单",
            "suspected_stopped": "最近60天无单，但最近90天仍有订单",
            "inactive": "最近一次可验证交易超过90天，且没有有效当前仓位",
            "unknown": "未深度分析或接口缺少时间时，不判定失活",
        },
        "follower_basis": (
            "主榜当前人数只使用 copyTraderNum；"
            "accCopyTraderNum 只在详情中作为历史背景"
        ),
        "chart_periods": {
            "total": "当前已采集的完整公开曲线",
            "year": "最近365天",
            "month": "最近30天",
            "week": "最近7天",
            "day": "最近1天",
            "order": ["total", "year", "month", "week", "day"],
            "fallback": "不足两个真实点时显示暂无数据",
        },
        "traders": traders,
    }

    radar.OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    radar.OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        "updated",
        radar.OUTPUT.relative_to(radar.ROOT),
        "with",
        len(traders),
        "leaderboard rows and",
        payload["detail_count"],
        "deep profiles",
    )
    return 0


radar.get_json = tolerant_get_json
radar.history_stats = history_stats
radar.position_stats = position_stats
radar.normalize = normalize
radar.score = score

if __name__ == "__main__":
    raise SystemExit(run())
