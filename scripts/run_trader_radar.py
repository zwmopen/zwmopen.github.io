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
    closed_times = []
    for trade in history:
        closed = radar.timestamp(trade.get("closeTime")) or radar.timestamp(trade.get("openTime"))
        if closed:
            closed_times.append(closed)

    latest = max(closed_times) if closed_times else None
    result["last_trade_time"] = latest.isoformat() if latest else None
    result["days_since_last_trade"] = round((now - latest).total_seconds() / 86400, 2) if latest else None
    result["trades_last_7d"] = sum((now - value).total_seconds() <= 7 * 86400 for value in closed_times)
    result["trades_last_30d"] = sum((now - value).total_seconds() <= 30 * 86400 for value in closed_times)
    result["trades_last_60d"] = sum((now - value).total_seconds() <= 60 * 86400 for value in closed_times)
    return result


def position_stats(positions: list[dict]) -> dict:
    valid = [item for item in positions if valid_position(item)]
    result = _original_position_stats(valid)
    result["raw_current_positions_count"] = len(positions)
    result["invalid_current_positions_count"] = len(positions) - len(valid)
    return result


def normalize(rank: dict, detail: dict[str, list[dict]]) -> dict:
    trader = _original_normalize(rank, detail)
    trader["current_positions"] = [
        position
        for source, position in zip(detail.get("positions") or [], trader.get("current_positions") or [])
        if valid_position(source)
    ]
    trader["metrics"]["current_positions_count"] = len(trader["current_positions"])
    return trader


def activity_status(metrics: dict) -> tuple[str, int]:
    current_positions = metrics.get("current_positions_count") or 0
    last_30d = metrics.get("trades_last_30d") or 0
    last_60d = metrics.get("trades_last_60d") or 0
    days_since = metrics.get("days_since_last_trade")

    if current_positions > 0 or last_30d > 0:
        return "活跃", 3
    if last_60d > 0 or (days_since is not None and days_since <= 60):
        return "近期低活跃", 2
    if days_since is not None and days_since <= 90:
        return "疑似停单", 1
    return "长期未开单", 0


def score(trader: dict):
    # 累计历史跟单人数不参与评分，只看当前跟单人数。
    original_accumulated = trader["metrics"].get("followers_accumulated")
    trader["metrics"]["followers_accumulated"] = 0
    scores, flags, recommendation, ranking_tier = _original_score(trader)
    trader["metrics"]["followers_accumulated"] = original_accumulated

    status, activity_tier = activity_status(trader["metrics"])
    trader["metrics"]["activity_status"] = status
    trader["metrics"]["activity_tier"] = activity_tier

    flags = [flag for flag in flags if "累计" not in flag]
    if status == "近期低活跃":
        flags.append("最近30天无新单，当前仅低活跃")
        scores["overall"] = min(scores.get("overall", 0), 72)
        recommendation = "小额观察"
    elif status == "疑似停单":
        flags.append("最近60天无新单，疑似已经停单")
        scores["overall"] = min(scores.get("overall", 0), 52)
        recommendation = "高风险观察"
    elif status == "长期未开单":
        flags.append("超过90天无新单或无可验证近期订单，按失活处理")
        scores["overall"] = min(scores.get("overall", 0), 35)
        recommendation = "不建议跟单"

    trader["metrics"]["current_follower_validation"] = trader["metrics"].get("followers") or 0
    ranking_tier = activity_tier * 100 + (10 if recommendation not in {"不建议跟单", "数据不足/暂不判断"} else 0)
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
        metrics.get("activity_tier") or 0,
        1 if item.get("recommendation") not in {"不建议跟单", "数据不足/暂不判断"} else 0,
        metrics.get("aum_usd") or 0,
        metrics.get("followers") or 0,
        metrics.get("lead_days") or 0,
    )


def run() -> int:
    result = radar.main()
    payload = json.loads(radar.OUTPUT.read_text(encoding="utf-8"))
    payload["schema_version"] = max(5, int(payload.get("schema_version", 0)))
    payload["ranking_logic"] = [
        "第一道门槛：最近是否仍有有效仓位或近期真实订单",
        "第二道门槛：硬风险账户排在正常账户之后",
        "综合排序第一：带单规模 AUM",
        "综合排序第二：当前跟单人数 copyTraderNum；累计历史人数不参与",
        "综合排序第三：公开带单天数",
        "超过90天无可验证新单的账户按失活处理并排到末尾",
    ]
    payload["activity_rules"] = {
        "active": "存在有效公开仓位，或最近30天有历史订单",
        "low_activity": "最近30天无单，但最近60天仍有订单",
        "suspected_stopped": "最近60天无单，但最近90天有订单",
        "inactive": "超过90天无新单，或没有可验证近期订单",
        "invalid_position": "合约代码为空或保证金无效的仓位不算正在开单",
    }
    payload["follower_basis"] = "只使用当前跟单人数 copyTraderNum；accCopyTraderNum 不参与排序和评分"
    payload["chart_periods"] = {
        "total": "当前已采集的完整公开曲线",
        "year": "按公开曲线时间戳截取最近365天",
        "month": "按公开曲线时间戳截取最近30天",
        "fallback": "对应周期数据不足时明确提示，不生成虚假历史",
    }
    radar.OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
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
