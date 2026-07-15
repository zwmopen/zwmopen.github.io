from __future__ import annotations

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


radar.get_json = tolerant_get_json
radar.preliminary_rank_key = preliminary_rank_key
radar.final_rank_key = final_rank_key

if __name__ == "__main__":
    raise SystemExit(radar.main())
