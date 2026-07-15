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

# Documented public leaderboard: reliable for AUM and public metrics.
PUBLIC_SORT_SPECS = [
    ("overview", ["overview"]),
    ("pnl", ["pnl"]),
    ("aum", ["aum"]),
    ("win_ratio", ["win_ratio"]),
    ("pnl_ratio", ["pnl_ratio"]),
    ("copy_pnl", ["current_copy_trader_pnl"]),
]

# Undocumented leaderboard used by the OKX client/web experience. Its member
# pool is materially wider than public-lead-traders and includes accounts that
# are absent from the documented public API.
CLIENT_RANK_PATH = "/priapi/v5/ecotrade/public/follow-rank"
CLIENT_TRADE_DATA_PATH = "/priapi/v5/ecotrade/public/trader/trade-data"
CLIENT_PAGE_SIZE = 20
CLIENT_MAX_PAGES = 120
CLIENT_DETAIL_LIMIT = 100
DETAIL_LIMIT = 90


def tolerant_get_json(path: str, params: dict[str, Any]):
    try:
        return _original_get_json(path, params)
    except Exception as exc:  # noqa: BLE001
        if path in {radar.LEADERBOARD, CLIENT_RANK_PATH, CLIENT_TRADE_DATA_PATH}:
            print(
                "skip unavailable OKX request:",
                path,
                params,
                type(exc).__name__,
                exc,
            )
            return {"code": "0", "data": []}
        raise


def valid_position(item: dict[str, Any]) -> bool:
    instrument = str(item.get("instId") or "").strip()
    margin = radar.number(item.get("margin")) or 0
    return bool(instrument) and margin > 0


def history_stats(history: list[dict[str, Any]]) -> dict[str, Any]:
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


def position_stats(positions: list[dict[str, Any]]) -> dict[str, Any]:
    valid = [item for item in positions if valid_position(item)]
    result = _original_position_stats(valid)
    result["raw_current_positions_count"] = len(positions)
    result["invalid_current_positions_count"] = len(positions) - len(valid)
    return result


def normalize(rank: dict[str, Any], detail: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
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


def activity_status(metrics: dict[str, Any]) -> tuple[str, int]:
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


def score(trader: dict[str, Any]):
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
        flags.append("接口未返回可验证的最近交易时间，不能判定失活")
        recommendation = "数据不足/暂不判断"

    ranking_tier = activity_tier * 100 + (
        10
        if recommendation not in {"不建议跟单", "数据不足/暂不判断"}
        else 0
    )
    return scores, sorted(set(flags)), recommendation, ranking_tier


def parse_follower_value(value: Any) -> tuple[int | None, int | None]:
    if isinstance(value, str) and "/" in value:
        current_raw, capacity_raw = value.split("/", 1)
        return radar.integer(current_raw), radar.integer(capacity_raw)
    return radar.integer(value), None


def fetch_client_rankings() -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    rows_by_code: dict[str, dict[str, Any]] = {}
    diagnostics: dict[str, Any] = {"pages": 0, "reported_pages": None, "rows": 0}
    page = 1
    reported_pages = 1

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

        if not page_rows:
            break

        for index, incoming in enumerate(page_rows):
            code = str(incoming.get("uniqueName") or "").strip().upper()
            if not code:
                continue
            current_followers, capacity = parse_follower_value(
                incoming.get("followerNum")
            )
            item = dict(incoming)
            item["uniqueName"] = code
            item["clientRank"] = (page - 1) * CLIENT_PAGE_SIZE + index + 1
            item["parsedFollowerNum"] = current_followers
            item["parsedFollowerLimit"] = (
                capacity
                if capacity is not None
                else radar.integer(incoming.get("followerLimit"))
            )
            rows_by_code[code] = item

        diagnostics["pages"] = page
        diagnostics["rows"] = len(rows_by_code)
        page += 1

    return rows_by_code, diagnostics


def function_map(parts: Any) -> dict[str, Any]:
    if not isinstance(parts, list):
        return {}
    return {
        str(item.get("functionId")): item.get("value")
        for item in parts
        if isinstance(item, dict) and item.get("functionId")
    }


def fetch_client_trade_data(code: str) -> dict[str, Any]:
    payload = radar.get_json(
        CLIENT_TRADE_DATA_PATH,
        {
            "latestNum": "0",
            "bizType": "SWAP",
            "uniqueName": code,
            "t": int(time.time() * 1000),
        },
    )
    data = payload.get("data") or []
    root = data[0] if data and isinstance(data[0], dict) else {}
    non_periodic = function_map(root.get("nonPeriodicPart"))
    periodic = function_map(root.get("periodicPart"))
    return {"non_periodic": non_periodic, "periodic": periodic}


def enrich_client_leaders(client_rows: dict[str, dict[str, Any]]) -> None:
    ordered = sorted(
        client_rows.values(),
        key=lambda item: (
            item.get("parsedFollowerNum") or 0,
            radar.number(item.get("pnl")) or 0,
        ),
        reverse=True,
    )[:CLIENT_DETAIL_LIMIT]

    for index, item in enumerate(ordered, 1):
        code = item["uniqueName"]
        detail = fetch_client_trade_data(code)
        non_periodic = detail["non_periodic"]
        periodic = detail["periodic"]

        current, capacity = parse_follower_value(non_periodic.get("followerNum"))
        if current is not None:
            item["parsedFollowerNum"] = current
        if capacity is not None:
            item["parsedFollowerLimit"] = capacity

        if non_periodic.get("aum") not in (None, ""):
            item["aum"] = non_periodic.get("aum")
        if non_periodic.get("initialDay") not in (None, ""):
            item["initialDay"] = non_periodic.get("initialDay")
        if non_periodic.get("currentFollowPnl") not in (None, ""):
            item["currentFollowPnl"] = non_periodic.get("currentFollowPnl")
        if periodic.get("winRatio") not in (None, ""):
            item["winRatio"] = periodic.get("winRatio")

        print(
            f"[{index}/{len(ordered)}] client detail "
            f"{item.get('nickName') or code}"
        )


def merge_client_into_public(
    public_ranks: dict[str, dict[str, Any]],
    client_rows: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    merged = public_ranks

    for code, client in client_rows.items():
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
        item["clientRank"] = client.get("clientRank")
        item["clientRaw"] = {
            "followerNum": client.get("followerNum"),
            "historyFollowerNum": client.get("historyFollowerNum"),
            "followerLimit": client.get("followerLimit"),
        }

        # Client values are the source of truth for client-current metrics.
        if client.get("nickName"):
            item["nickName"] = client.get("nickName")
        if client.get("portrait"):
            item["portLink"] = client.get("portrait")
        if client.get("pnl") not in (None, ""):
            item["pnl"] = client.get("pnl")
        if client.get("yieldRatio") not in (None, ""):
            item["pnlRatio"] = client.get("yieldRatio")
        if client.get("parsedFollowerNum") is not None:
            item["copyTraderNum"] = client.get("parsedFollowerNum")
        if client.get("parsedFollowerLimit") is not None:
            item["maxCopyTraderNum"] = client.get("parsedFollowerLimit")
        if client.get("historyFollowerNum") not in (None, ""):
            item["accCopyTraderNum"] = client.get("historyFollowerNum")
        if client.get("initialDay") not in (None, ""):
            item["leadDays"] = client.get("initialDay")
        if client.get("aum") not in (None, ""):
            item["aum"] = client.get("aum")
        if client.get("winRatio") not in (None, ""):
            item["winRatio"] = client.get("winRatio")
        if client.get("currentFollowPnl") not in (None, ""):
            item["clientCurrentFollowPnl"] = client.get("currentFollowPnl")

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
        "source_ranks": rank.get("sourceRanks") or {},
        "source_sorts": sorted(set(rank.get("sourceSorts") or [])),
        "source_aliases": sorted(set(rank.get("sourceAliases") or [])),
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


def sort_ranks(ranks: dict[str, dict[str, Any]], field: str) -> list[dict[str, Any]]:
    return sorted(
        ranks.values(),
        key=lambda item: (
            radar.number(item.get(field)) or 0,
            -(item.get("sourceRanks", {}).get("overview") or 10**9),
        ),
        reverse=True,
    )


def assign_orders(
    ranks: dict[str, dict[str, Any]],
    client_rows: dict[str, dict[str, Any]],
) -> dict[str, list[str]]:
    orders: dict[str, list[str]] = {}

    public_definitions = {
        "aum": "aum",
        "days": "leadDays",
        "roi": "pnlRatio",
        "pnl": "pnl",
    }
    for label, field in public_definitions.items():
        ordered = sort_ranks(ranks, field)
        orders[label] = [item["uniqueCode"] for item in ordered]

    # Match the client membership pool, then sort strictly by current follower
    # count. Accumulated historyFollowerNum is never used here.
    client_ordered = sorted(
        client_rows.values(),
        key=lambda item: (
            item.get("parsedFollowerNum") or 0,
            -(item.get("clientRank") or 10**9),
        ),
        reverse=True,
    )
    orders["followers"] = [item["uniqueName"] for item in client_ordered]
    orders["client_default"] = [
        item["uniqueName"]
        for item in sorted(
            client_rows.values(),
            key=lambda item: item.get("clientRank") or 10**9,
        )
    ]
    return orders


def detail_candidates(
    ranks: dict[str, dict[str, Any]],
    client_rows: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    selected: dict[str, dict[str, Any]] = {}

    buckets = [
        (sort_ranks(ranks, "aum"), 35),
        (sort_ranks(ranks, "copyTraderNum"), 45),
        (sort_ranks(ranks, "leadDays"), 20),
    ]
    client_followers = sorted(
        client_rows.values(),
        key=lambda item: item.get("parsedFollowerNum") or 0,
        reverse=True,
    )
    buckets.insert(
        1,
        ([ranks[item["uniqueName"]] for item in client_followers if item["uniqueName"] in ranks], 55),
    )

    for ordered, limit in buckets:
        for item in ordered[:limit]:
            selected.setdefault(item["uniqueCode"], item)
            if len(selected) >= DETAIL_LIMIT:
                return list(selected.values())
    return list(selected.values())[:DETAIL_LIMIT]


def custom_rank_key(item: dict[str, Any]) -> tuple[float, float, float, float, float]:
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


def preview(
    traders_by_code: dict[str, dict[str, Any]],
    codes: list[str],
    field: str,
    limit: int = 8,
) -> list[dict[str, Any]]:
    result = []
    for code in codes[:limit]:
        item = traders_by_code.get(code)
        if not item:
            continue
        result.append(
            {
                "name": item["name"],
                "unique_code": item["unique_code"],
                "value": item.get("metrics", {}).get(field),
                "client_member": item.get("client_member"),
            }
        )
    return result


def run() -> int:
    radar.SORT_SPECS = PUBLIC_SORT_SPECS
    radar.DETAIL_LIMIT = DETAIL_LIMIT

    public_ranks, public_diagnostics = radar.fetch_rankings()
    client_rows, client_diagnostics = fetch_client_rankings()
    if not public_ranks and not client_rows:
        raise RuntimeError("OKX leaderboard collection returned no traders")

    enrich_client_leaders(client_rows)
    ranks = merge_client_into_public(public_ranks, client_rows)
    orders = assign_orders(ranks, client_rows)

    traders_by_code = {
        code: normalize_shallow(rank)
        for code, rank in ranks.items()
    }

    candidates = detail_candidates(ranks, client_rows)
    for index, rank in enumerate(candidates, 1):
        print(
            f"[{index}/{len(candidates)}] deep analyze "
            f"{rank.get('nickName') or rank['uniqueCode']}"
        )
        trader = normalize(rank, radar.fetch_details(rank["uniqueCode"]))
        trader["client_member"] = bool(rank.get("clientMember"))
        trader["client_rank"] = rank.get("clientRank")
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
        "schema_version": 9,
        "generated_at": radar.now_iso(),
        "source": "OKX public API + OKX client ecotrade leaderboard",
        "source_endpoints": [
            radar.LEADERBOARD,
            CLIENT_RANK_PATH,
            CLIENT_TRADE_DATA_PATH,
            radar.POSITIONS,
            radar.HISTORY,
            radar.FOLLOWERS,
        ],
        "leaderboard_count": len(traders),
        "public_leaderboard_count": len(public_ranks),
        "client_leaderboard_count": len(client_rows),
        "detail_count": sum(bool(item.get("is_deep")) for item in traders),
        "official_orders": orders,
        "official_top_preview": {
            "aum": preview(traders_by_code, orders.get("aum", []), "aum_usd"),
            "followers": preview(
                traders_by_code,
                orders.get("followers", []),
                "followers",
            ),
            "days": preview(traders_by_code, orders.get("days", []), "lead_days"),
        },
        "collection_diagnostics": {
            "public": public_diagnostics,
            "client": client_diagnostics,
        },
        "ranking_logic": [
            "客户端当前跟单人数榜：客户端成员池按 followerNum 降序",
            "带单规模榜：合并后的完整成员池按 AUM 降序",
            "当前跟单人数只使用 followerNum/copyTraderNum，不使用历史累计人数",
            "自定义综合排序：已验证活跃优先，再按 AUM、当前人数、带单天数",
            "深度样本只补充仓位、历史订单与风险，不决定榜单成员资格",
        ],
        "activity_rules": {
            "active": "存在有效公开仓位，或最近30天有历史订单",
            "low_activity": "最近30天无单，但最近60天仍有订单",
            "suspected_stopped": "最近60天无单，但最近90天仍有订单",
            "inactive": "最近一次可验证交易超过90天，且没有有效当前仓位",
            "unknown": "未深度分析或接口缺少时间时，不判定失活",
        },
        "follower_basis": (
            "客户端榜使用 followerNum；公开详情使用 copyTraderNum；"
            "historyFollowerNum/accCopyTraderNum 仅作历史背景"
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
        "merged rows,",
        len(client_rows),
        "client rows and",
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
