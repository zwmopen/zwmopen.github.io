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


radar.get_json = tolerant_get_json

if __name__ == "__main__":
    raise SystemExit(radar.main())
