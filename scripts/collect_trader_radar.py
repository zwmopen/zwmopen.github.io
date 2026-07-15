from __future__ import annotations

import json
import math
import statistics
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "trader-radar" / "data" / "traders.json"
BASE_URLS = ["https://www.okx.com", "https://aws.okx.com", "https://okx.com"]
SORT_TYPES = ["overview", "pnl", "aum", "win_ratio", "pnl_ratio", "current_copy_trader_pnl"]
HEADERS = {
    "Accept": "application/json",
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


def integer(value: Any) -> int | None:
    parsed = number(value)
    return int(parsed) if parsed is not None else None


def pct(value: Any) -> float | None:
    parsed = number(value)
    return round(parsed * 100, 4) if parsed is not None else None


def timestamp(value: Any) -> datetime | None:
    parsed = number(value)
    if not parsed:
        return None
    try:
        return datetime.fromtimestamp(parsed / 1000, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


def elapsed_days(value: Any) -> float | None:
    parsed = timestamp(value)
    return round(max(0.0, (datetime.now(timezone.utc) - parsed).total_seconds() / 86400), 4) if parsed else None


def mean(values: list[float]) -> float | None:
    return round(statistics.fmean(values), 4) if values else None


def median(values: list[float]) -> float | None:
    return round(statistics.median(values), 4) if values else None


def bound(value: float) -> float:
    return round(max(0, min(100, value)), 1)


def get_json(path: str, params: dict[str, Any]) -> dict[str, Any]:
    query = urllib.parse.urlencode(params)
    errors: list[str] = []
    for base in BASE_URLS:
        url = f"{base}{path}?{query}"
        request = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if str(payload.get("code", "0")) == "0":
                time.sleep(0.22)
                return payload
            errors.append(f"{base}:{payload.get('code')}:{payload.get('msg')}")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{base}:{type(exc).__name__}:{exc}")
            time.sleep(0.4)
    raise RuntimeError(" | ".join(errors))


def rank_rows(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], str | None]:
    data = payload.get("data") or []
    if data and isinstance(data[0], dict) and "ranks" in data[0]:
        return data[0].get("ranks") or [], data[0].get("dataVer")
    return [item for item in data if isinstance(item, dict)], None


def fetch_rankings() -> dict[str, dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for sort_type in SORT_TYPES:
        rows, data_version = rank_rows(get_json(
            "/api/v5/copytrading/public-lead-traders",
            {"instType": "SWAP", "sortType": sort_type, "state": "0", "page": "1", "limit": "20"},
        ))
        for index, incoming in enumerate(rows):
            code = str(incoming.get("uniqueCode") or "").upper()
            if len(code) != 16 or not code.isalnum():
                continue
            item = merged.setdefault(code, {"uniqueCode": code, "sourceRanks": {}, "sourceSorts": []})
            for key, value in incoming.items():
                if value not in (None, "", [], {}):
                    item[key] = value
            item["sourceRanks"][sort_type] = index + 1
            item["sourceSorts"].append(sort_type)
            if data_version:
                item.setdefault("dataVersions", {})[sort_type] = data_version
    return merged


def details(code: str) -> dict[str, list[dict[str, Any]]]:
    calls = {
        "positions": ("/api/v5/copytrading/public-current-subpositions", {"instType": "SWAP", "uniqueCode": code, "limit": "100"}),
        "history": ("/api/v5/copytrading/public-subpositions-history", {"instType": "SWAP", "uniqueCode": code, "limit": "100"}),
        "followers": ("/api/v5/copytrading/public-copy-traders", {"instType": "SWAP", "uniqueCode": code, "limit": "100"}),
    }
    result: dict[str, list[dict[str, Any]]] = {}
    for name, (path, params) in calls.items():
        try:
            result[name] = get_json(path, params).get("data") or []
        except Exception as exc:  # noqa: BLE001
            print(f"warning {code} {name}: {exc}")
            result[name] = []
    return result


def curve_stats(points: list[dict[str, Any]]) -> dict[str, Any]:
    series: list[tuple[float, float]] = []
    for index, item in enumerate(points or []):
        value = pct(item.get("pnlRatio"))
        if value is None:
            continue
        ts = number(item.get("beginTs"))
        series.append((ts if ts is not None else float(index), value))
    series.sort(key=lambda pair: pair[0])
    values = [value for _, value in series]
    if not values:
        return {
            "max_drawdown_pct": None,
            "curve_upward_ratio_pct": None,
            "curve_direction_change_pct": None,
            "curve_step_volatility": None,
        }
    peak = values[0]
    drawdown = 0.0
    rising = 0
    changes: list[float] = []
    directions: list[int] = []
    for previous, current in zip(values, values[1:]):
        peak = max(peak, current)
        drawdown = max(drawdown, peak - current)
        delta = current - previous
        changes.append(abs(delta))
        rising += int(delta >= 0)
        directions.append(1 if delta > 0 else -1 if delta < 0 else 0)
    nonzero = [value for value in directions if value]
    reversals = sum(a != b for a, b in zip(nonzero, nonzero[1:]))
    return {
        "max_drawdown_pct": round(drawdown, 4),
        "curve_upward_ratio_pct": round(rising / len(changes) * 100, 4) if changes else None,
        "curve_direction_change_pct": round(reversals / max(1, len(nonzero) - 1) * 100, 4) if len(nonzero) > 1 else 0.0,
        "curve_step_volatility": mean(changes),
    }


def history_stats(history: list[dict[str, Any]]) -> dict[str, Any]:
    ratios: list[float] = []
    levers: list[float] = []
    holds: list[float] = []
    wins = losses = 0
    profit = loss = 0.0
    for trade in history:
        trade_pnl = number(trade.get("pnl"))
        trade_ratio = pct(trade.get("pnlRatio"))
        lever = number(trade.get("lever"))
        opened, closed = timestamp(trade.get("openTime")), timestamp(trade.get("closeTime"))
        if trade_pnl is not None:
            if trade_pnl > 0:
                wins += 1
                profit += trade_pnl
            elif trade_pnl < 0:
                losses += 1
                loss += abs(trade_pnl)
        if trade_ratio is not None:
            ratios.append(trade_ratio)
        if lever is not None:
            levers.append(lever)
        if opened and closed and closed > opened:
            holds.append((closed - opened).total_seconds() / 3600)
    decisive = wins + losses
    count = len(history)
    return {
        "history_trade_count": count,
        "history_trades_per_day_90d": round(count / 90, 4),
        "history_win_rate_pct": round(wins / decisive * 100, 4) if decisive else None,
        "profit_factor": round(profit / loss, 4) if loss else (99.0 if profit else None),
        "avg_holding_hours": mean(holds),
        "median_holding_hours": median(holds),
        "max_trade_loss_pct": round(abs(min(ratios)), 4) if ratios and min(ratios) < 0 else 0.0,
        "max_history_leverage": round(max(levers), 4) if levers else None,
    }


def position_stats(positions: list[dict[str, Any]]) -> dict[str, Any]:
    levers = [v for item in positions if (v := number(item.get("lever"))) is not None]
    margins = [v for item in positions if (v := number(item.get("margin"))) is not None]
    upls = [v for item in positions if (v := number(item.get("upl"))) is not None]
    return {
        "current_positions_count": len(positions),
        "current_max_leverage": round(max(levers), 4) if levers else None,
        "current_total_margin_usd": round(sum(margins), 4) if margins else None,
        "current_total_upl_usd": round(sum(upls), 4) if upls else None,
        "current_upl_pct": round(sum(upls) / sum(margins) * 100, 4) if margins and sum(margins) else None,
    }


def follower_stats(data: list[dict[str, Any]]) -> dict[str, Any]:
    if not data:
        return {"copy_pnl_usd": None, "avg_follow_days": None, "median_follow_days": None, "follower_profitable_pct": None}
    root = data[0]
    followers = root.get("copyTraders") or []
    durations = [v for item in followers if (v := elapsed_days(item.get("beginCopyTime"))) is not None]
    pnls = [v for item in followers if (v := number(item.get("pnl"))) is not None]
    return {
        "copy_pnl_usd": number(root.get("copyTotalPnl")),
        "avg_follow_days": mean(durations),
        "median_follow_days": median(durations),
        "follower_profitable_pct": round(sum(v > 0 for v in pnls) / len(pnls) * 100, 4) if pnls else None,
    }


def normalize(rank: dict[str, Any], detail: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    code = rank["uniqueCode"]
    metrics = {
        "roi_pct": pct(rank.get("pnlRatio")),
        "pnl_usd": number(rank.get("pnl")),
        "aum_usd": number(rank.get("aum")),
        "followers": integer(rank.get("copyTraderNum")),
        "followers_accumulated": integer(rank.get("accCopyTraderNum")),
        "lead_days": integer(rank.get("leadDays")),
        "win_rate_pct": pct(rank.get("winRatio")),
        **curve_stats(rank.get("pnlRatios") or []),
        **history_stats(detail.get("history") or []),
        **position_stats(detail.get("positions") or []),
        **follower_stats(detail.get("followers") or []),
    }
    positions = [{
        "instrument": item.get("instId"),
        "side": item.get("posSide"),
        "leverage": number(item.get("lever")),
        "margin_usd": number(item.get("margin")),
        "upl_usd": number(item.get("upl")),
        "upl_pct": pct(item.get("uplRatio")),
    } for item in (detail.get("positions") or [])[:20]]
    return {
        "id": code,
        "unique_code": code,
        "name": rank.get("nickName") or code,
        "profile_url": f"https://www.okx.com/copy-trading/account/{code}",
        "avatar_url": rank.get("portLink"),
        "source_ranks": rank.get("sourceRanks") or {},
        "metrics": metrics,
        "current_positions": positions,
    }


def score(trader: dict[str, Any]) -> tuple[dict[str, float], list[str], str, int]:
    m = trader["metrics"]
    flags: list[str] = []
    lead_days = m.get("lead_days") or 0
    aum = max(0.0, m.get("aum_usd") or 0.0)
    followers = max(0, m.get("followers") or 0)
    accumulated = max(0, m.get("followers_accumulated") or 0)
    roi = m.get("roi_pct") or 0.0
    drawdown = m.get("max_drawdown_pct")
    upward = m.get("curve_upward_ratio_pct")
    reversals = m.get("curve_direction_change_pct")
    median_hold = m.get("median_holding_hours")
    trades = m.get("history_trade_count") or 0

    core = ["aum_usd", "followers", "followers_accumulated", "lead_days", "history_trade_count", "copy_pnl_usd"]
    reliability = 35 + sum(m.get(key) is not None for key in core) / len(core) * 55
    if lead_days >= 180 and trades == 0 and (m.get("current_positions_count") or 0) == 0:
        reliability -= 30
        flags.append("长期带单但近3个月无公开订单，疑似失活")

    if lead_days < 180:
        maturity_tier = 0
        flags.append("带单时间不足 180 天，尚未经历完整心理周期")
    elif lead_days < 365:
        maturity_tier = 1
        flags.append("带单时间不足 1 年，只进入观察池")
    else:
        maturity_tier = 2

    if lead_days < 90:
        longevity = 12 + lead_days / 90 * 13
    elif lead_days < 180:
        longevity = 25 + (lead_days - 90) / 90 * 20
    elif lead_days < 365:
        longevity = 50 + (lead_days - 180) / 185 * 20
    elif lead_days < 730:
        longevity = 78 + (lead_days - 365) / 365 * 14
    else:
        longevity = min(100, 94 + math.log1p(lead_days - 730) * 1.1)

    capital_trust = min(100, math.log10(aum + 1) * 18) if aum else 0.0
    crowd_validation = min(100, math.log1p(followers) * 11 + math.log1p(accumulated) * 6)

    curve_quality = 72.0
    if drawdown is None:
        curve_quality -= 18
        flags.append("缺少可计算的收益曲线回撤")
    else:
        curve_quality -= min(55, max(0, drawdown - 3) * 1.55)
        if 3 <= drawdown <= 20 and lead_days >= 365:
            curve_quality += 8
        if drawdown >= 25:
            flags.append("收益曲线回撤偏大")
        if drawdown >= 50:
            flags.append("收益曲线出现极端回撤")
    if upward is not None:
        curve_quality += max(-12, min(12, (upward - 55) * 0.35))
    if reversals is not None and reversals >= 55 and (drawdown or 0) >= 12:
        curve_quality -= 14
        flags.append("曲线反复起落，疑似仓位或心态不稳定")

    high_frequency = trades >= 80 and median_hold is not None and median_hold <= 8
    if high_frequency:
        curve_quality -= 18
        flags.append("高频短持仓，疑似量化或蚂蚁仓策略")

    perfect_short_curve = (
        lead_days <= 365
        and roi >= 20
        and drawdown is not None
        and drawdown <= 5
        and upward is not None
        and upward >= 75
    )
    if perfect_short_curve:
        curve_quality -= 22
        flags.append("短期完美曲线，可被对冲或展示策略设计")

    rapid_profit = (lead_days < 365 and roi >= 100) or (lead_days < 180 and roi >= 50)
    if rapid_profit:
        curve_quality -= 20
        flags.append("短期快速盈利，收益与爆雷风险同步放大")

    risk = 90.0
    max_loss = m.get("max_trade_loss_pct")
    if max_loss is not None:
        risk -= min(35, max_loss * 0.7)
        if max_loss >= 25:
            flags.append("近3个月存在大额单笔亏损")
        if max_loss >= 60:
            flags.append("近3个月存在接近爆仓级单笔亏损")
    max_leverage = max(m.get("max_history_leverage") or 0, m.get("current_max_leverage") or 0)
    if max_leverage > 10:
        risk -= min(38, (max_leverage - 10) * 1.2)
        flags.append(f"存在较高杠杆（最高 {max_leverage:g}x）")
    if max_leverage >= 30:
        flags.append("杠杆风险极高")
    if m.get("current_upl_pct") is not None and m["current_upl_pct"] < -15:
        risk -= min(35, abs(m["current_upl_pct"]) * 0.65)
        flags.append("当前持仓浮亏较大")
    if m.get("profit_factor") is not None and m["profit_factor"] < 1:
        risk -= 20
        flags.append("近3个月盈利因子低于 1")
    if m.get("copy_pnl_usd") is not None and m["copy_pnl_usd"] < 0:
        flags.append("公开跟单用户样本总盈亏为负")
        risk -= 20

    scores = {
        "longevity": bound(longevity),
        "capital_trust": bound(capital_trust),
        "crowd_validation": bound(crowd_validation),
        "curve_quality": bound(curve_quality),
        "risk_control": bound(risk),
        "data_reliability": bound(reliability),
    }
    overall = (
        scores["longevity"] * 0.40
        + scores["capital_trust"] * 0.30
        + scores["crowd_validation"] * 0.20
        + scores["curve_quality"] * 0.10
    )
    overall *= 0.75 + scores["data_reliability"] / 400

    hard_markers = ("极端回撤", "接近爆仓级", "杠杆风险极高", "疑似失活", "跟单用户样本总盈亏为负")
    hard_risk = any(any(marker in flag for marker in hard_markers) for flag in flags)
    if hard_risk:
        overall = min(overall, 40)
    if rapid_profit or perfect_short_curve:
        overall = min(overall, 57)
    if lead_days < 180:
        overall = min(overall, 49)
    elif lead_days < 365:
        overall = min(overall, 69)
    scores["overall"] = bound(overall)

    if scores["data_reliability"] < 40:
        recommendation = "数据不足/暂不判断"
    elif hard_risk or scores["overall"] < 42:
        recommendation = "不建议跟单"
    elif scores["overall"] < 58:
        recommendation = "高风险观察"
    elif scores["overall"] < 72:
        recommendation = "小额观察"
    elif scores["overall"] < 84:
        recommendation = "重点观察"
    else:
        recommendation = "长期候选"

    safe_tier = 0 if hard_risk else 1
    ranking_tier = safe_tier * 10 + maturity_tier
    return scores, sorted(set(flags)), recommendation, ranking_tier


def preliminary_rank_key(item: dict[str, Any]) -> tuple[float, float, float, float, float]:
    lead_days = number(item.get("leadDays")) or 0
    maturity = 2 if lead_days >= 365 else 1 if lead_days >= 180 else 0
    return (
        maturity,
        lead_days,
        number(item.get("aum")) or 0,
        number(item.get("copyTraderNum")) or 0,
        number(item.get("accCopyTraderNum")) or 0,
    )


def final_rank_key(item: dict[str, Any]) -> tuple[float, float, float, float, float, float]:
    m = item["metrics"]
    return (
        item.get("ranking_tier", 0),
        m.get("lead_days") or 0,
        m.get("aum_usd") or 0,
        m.get("followers") or 0,
        m.get("followers_accumulated") or 0,
        item["scores"]["overall"],
    )


def main() -> int:
    ranks = fetch_rankings()
    ordered = sorted(ranks.values(), key=preliminary_rank_key, reverse=True)[:30]
    traders: list[dict[str, Any]] = []
    for index, rank in enumerate(ordered, 1):
        print(f"[{index}/{len(ordered)}] {rank.get('nickName') or rank['uniqueCode']}")
        trader = normalize(rank, details(rank["uniqueCode"]))
        trader["scores"], trader["flags"], trader["recommendation"], trader["ranking_tier"] = score(trader)
        traders.append(trader)
    traders.sort(key=final_rank_key, reverse=True)
    payload = {
        "schema_version": 2,
        "generated_at": now_iso(),
        "source": "OKX public copy-trading API",
        "time_basis": "OKX public leadDays（公开带单时长；不等同于无法公开核验的真实开户日期）",
        "ranking_logic": [
            "风险硬淘汰",
            "带单时长分档：1年以上 > 180至364天 > 180天以下",
            "同档按带单天数、AUM、当前跟单人数、累计跟单人数依次排序",
            "曲线只用于识别爆雷、高频量化、短期完美展示和心态不稳定风险",
        ],
        "leaderboard_union_count": len(ranks),
        "detail_count": len(traders),
        "traders": traders,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"updated {OUTPUT.relative_to(ROOT)} with {len(traders)} traders")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
