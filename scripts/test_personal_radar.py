from __future__ import annotations

from probe_okx_personal import copy_semantics, extract_rows, normalize_personal_row


def test_copy_candidate_is_rejected_by_semantics() -> None:
    rows = [{"uniqueName": "abc", "followerLimit": "600", "followPnl": "12", "pnl": "3"}]
    assert copy_semantics(rows) == ["followPnl", "followerLimit"]


def test_normalized_personal_row_never_adds_lead_fields() -> None:
    row = {
        "traderId": "personal-1",
        "name": "verified trader",
        "pnlUsd": "123.45",
        "roiPct": "12.5",
        "assetsUsd": "9000",
        "winRatePct": "57.1",
        "maxDrawdownPct": "3.2",
    }
    trader = normalize_personal_row(row, 1, "https://example.test/personal-1", "2026-08-14T00:00:00+00:00")
    assert trader["trader_type"] == "personal"
    assert trader["pnl_usd"] == 123.45
    assert trader["assets_usd"] == 9000
    assert "aum_usd" not in trader
    assert "lead_days" not in trader
    assert "follower_limit" not in trader


def test_extract_rows_supports_okx_rank_block() -> None:
    payload = {"data": [{"ranks": [{"uniqueName": "one"}, {"uniqueName": "two"}]}]}
    assert [row["uniqueName"] for row in extract_rows(payload)] == ["one", "two"]
