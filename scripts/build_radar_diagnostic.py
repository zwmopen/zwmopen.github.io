from __future__ import annotations

import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / "trader-radar" / "data" / "traders.json"
target = root / "trader-radar" / "data" / "ranking-diagnostic.json"

payload = json.loads(source.read_text(encoding="utf-8"))
traders = payload.get("traders") or []


def row(item: dict) -> dict:
    metrics = item.get("metrics") or {}
    return {
        "name": item.get("name"),
        "unique_code": item.get("unique_code"),
        "followers": metrics.get("followers"),
        "followers_capacity": metrics.get("followers_capacity"),
        "aum_usd": metrics.get("aum_usd"),
        "lead_days": metrics.get("lead_days"),
        "is_deep": item.get("is_deep"),
        "activity_status": metrics.get("activity_status"),
    }

followers = sorted(
    traders,
    key=lambda item: (item.get("metrics") or {}).get("followers") or 0,
    reverse=True,
)
name_matches = [
    item
    for item in traders
    if any(token in str(item.get("name") or "") for token in ("天道", "小周", "平凡", "知行"))
]

result = {
    "generated_at": payload.get("generated_at"),
    "leaderboard_count": len(traders),
    "top_followers": [row(item) for item in followers[:30]],
    "name_matches": [row(item) for item in name_matches],
}
target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(target)
