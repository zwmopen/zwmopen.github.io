from __future__ import annotations

import json

import collect_trader_radar as radar

_original_get_json = radar.get_json


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


def preliminary_rank_key(item: dict) -> tuple[float, float, float, float, float]:
    """Expand details for the largest and most socially validated accounts first."""
    return (
        radar.number(item.get("aum")) or 0,
        radar.number(item.get("copyTraderNum")) or 0,
        radar.number(item.get("accCopyTraderNum")) or 0,
        radar.number(item.get("leadDays")) or 0,
        radar.number(item.get("pnl")) or 0,
    )


def final_rank_key(item: dict) -> tuple[float, float, float, float, float, float]:
    """Hard-risk accounts stay behind; otherwise capital, people, then time."""
    metrics = item["metrics"]
    return (
        1 if item.get("ranking_tier", 0) >= 10 else 0,
        metrics.get("aum_usd") or 0,
        metrics.get("followers") or 0,
        metrics.get("followers_accumulated") or 0,
        metrics.get("lead_days") or 0,
        item.get("scores", {}).get("overall") or 0,
    )


def run() -> int:
    result = radar.main()
    payload = json.loads(radar.OUTPUT.read_text(encoding="utf-8"))
    payload["schema_version"] = max(4, int(payload.get("schema_version", 0)))
    payload["ranking_logic"] = [
        "硬风险账户排在正常账户之后",
        "综合排序第一：带单规模 AUM",
        "综合排序第二：当前跟单人数，其次累计跟单人数",
        "综合排序第三：公开带单天数",
        "曲线、杠杆和亏损特征只用于风险淘汰与提示",
    ]
    payload["chart_periods"] = {
        "total": "当前已采集的完整公开曲线",
        "year": "按公开曲线时间戳截取最近 365 天",
        "month": "按公开曲线时间戳截取最近 30 天",
        "fallback": "对应周期数据不足时显示当前可用完整曲线，不生成虚假历史",
    }
    radar.OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


radar.get_json = tolerant_get_json
radar.preliminary_rank_key = preliminary_rank_key
radar.final_rank_key = final_rank_key

if __name__ == "__main__":
    raise SystemExit(run())
