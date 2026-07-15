from __future__ import annotations

import json
from datetime import datetime, timezone

import collect_trader_radar as radar

_original_get_json = radar.get_json
_original_history_stats = radar.history_stats
_original_position_stats = radar.position_stats
_original_normalize = radar.normalize
_original_score = radar.score


def tolerant_get_json(path: str, params: dict):
    try:
        return _original_get_json(path, params)
    except Exception as exc:  # noqa: BLE001
        if path == radar.LEADERBOARD:
            print(
                "skip unsupported or unavailable leaderboard request:",
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


def preliminary_rank_key(item: dict) -> tuple[float, float, float, float]:
    return (
        radar.number(item.get("aum")) or 0,
        radar.number(item.get("copyTraderNum")) or 0,
        radar.number(item.get("leadDays")) or 0,
        radar.number(item.get("pnl")) or 0,
    )


def final_rank_key(item: dict) -> tuple[float, float, float, float, float]:
    metrics = item["metrics"]
    return (
        metrics.get("activity_tier", -1),
        1
        if item.get("recommendation")
        not in {"不建议跟单", "数据不足/暂不判断"}
        else 0,
        metrics.get("aum_usd") or 0,
        metrics.get("followers") or 0,
        metrics.get("lead_days") or 0,
    )


def run() -> int:
    result = radar.main()
    payload = json.loads(radar.OUTPUT.read_text(encoding="utf-8"))
    payload["schema_version"] = max(7, int(payload.get("schema_version", 0)))
    payload["ranking_logic"] = [
        "第一道门槛：确认最近仍有有效仓位或近期真实订单",
        "已确认活跃的账户进入主排序；活跃度未知不等于失活",
        "综合排序第一：带单规模 AUM",
        "综合排序第二：当前跟单人数 copyTraderNum",
        "综合排序第三：公开带单天数 leadDays",
        "累计历史人数 accCopyTraderNum 不参与排序和评分",
        "曲线、杠杆、亏损和高频特征只用于风险排雷",
    ]
    payload["activity_rules"] = {
        "active": "存在有效公开仓位，或最近30天有历史订单",
        "low_activity": "最近30天无单，但最近60天仍有订单",
        "suspected_stopped": "最近60天无单，但最近90天仍有订单",
        "inactive": "最近一次可验证交易超过90天，且没有有效当前仓位",
        "unknown": "接口未返回可验证的当前仓位和最近交易时间，只能标记活跃度未知",
    }
    payload["follower_basis"] = (
        "主界面和综合排序只使用当前跟单人数 copyTraderNum；"
        "accCopyTraderNum 只在详情中作为历史背景展示"
    )
    payload["chart_periods"] = {
        "total": "当前已采集的完整公开曲线",
        "year": "按公开曲线时间戳截取最近365天",
        "month": "按公开曲线时间戳截取最近30天",
        "week": "按公开曲线时间戳截取最近7天",
        "day": "按公开曲线时间戳截取最近1天",
        "order": ["total", "year", "month", "week", "day"],
        "fallback": "对应周期不足两个真实数据点时显示暂无数据，不复用其他周期曲线",
    }
    radar.OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return result


radar.get_json = tolerant_get_json
radar.history_stats = history_stats
radar.position_stats = position_stats
radar.normalize = normalize
radar.score = score
radar.preliminary_rank_key = preliminary_rank_key
radar.final_rank_key = final_rank_key

if __name__ == "__main__":
    raise SystemExit(run())
