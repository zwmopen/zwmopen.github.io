from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "trader-radar" / "data" / "client-probe.json"
BASES = ["https://www.okx.com", "https://aws.okx.com", "https://okx.com"]
PATH = "/priapi/v5/ecotrade/public/follow-rank"
HEADERS = {
    "accept": "application/json",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "user-agent": "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36",
}


def request_page(page: int) -> dict:
    params = {
        "size": "20",
        "type": "",
        "start": str(page),
        "latestNum": "90",
        "fullState": "2",
        "apiTrader": "0",
        "instNumLimit": "4",
        "t": str(int(time.time() * 1000)),
    }
    errors = []
    for base in BASES:
        url = f"{base}{PATH}?{urllib.parse.urlencode(params)}"
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as response:
                body = response.read().decode("utf-8")
                payload = json.loads(body)
            return {
                "base": base,
                "url": url,
                "http_status": response.status,
                "payload": payload,
            }
        except Exception as exc:  # noqa: BLE001
            errors.append({"base": base, "error": f"{type(exc).__name__}: {exc}"})
    return {"errors": errors}


def compact_rank(row: dict) -> dict:
    keys = [
        "uniqueName",
        "nickName",
        "followerNum",
        "followerLimit",
        "historyFollowerNum",
        "initialDay",
        "pnl",
        "yieldRatio",
        "aum",
        "fullState",
        "copyState",
    ]
    return {key: row.get(key) for key in keys if key in row}


def main() -> int:
    output = {"generated_at_ms": int(time.time() * 1000), "pages": []}
    all_rows = []

    for page in range(1, 11):
        result = request_page(page)
        payload = result.get("payload") or {}
        data = payload.get("data") or []
        block = data[0] if data and isinstance(data[0], dict) else {}
        ranks = block.get("ranks") or []
        output["pages"].append(
            {
                "page": page,
                "base": result.get("base"),
                "http_status": result.get("http_status"),
                "code": payload.get("code"),
                "msg": payload.get("msg"),
                "reported_pages": block.get("pages"),
                "reported_total": block.get("total"),
                "rank_count": len(ranks),
                "errors": result.get("errors"),
                "sample_keys": sorted(ranks[0].keys()) if ranks else [],
                "ranks": [compact_rank(row) for row in ranks],
            }
        )
        all_rows.extend(ranks)
        if not ranks:
            break
        time.sleep(0.4)

    output["matches"] = [
        compact_rank(row)
        for row in all_rows
        if any(token in str(row.get("nickName") or "") for token in ("平凡", "知行", "天道", "小周"))
    ]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(output["matches"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
