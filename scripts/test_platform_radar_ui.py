from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
V3 = (ROOT / "crypto-radar" / "platform-v3.js").read_text(encoding="utf-8")
V2 = (ROOT / "crypto-radar" / "platform-v2.js").read_text(encoding="utf-8")


def test_short_cross_platform_history_is_not_rendered_as_a_trend() -> None:
    assert "HISTORY_RULES" in V3
    assert "historyReady" in V3
    assert "真实历史不足，暂不绘图" in V3


def test_platform_cards_expose_a_clear_detail_action() -> None:
    assert "查看详情 ↗" in V3
    assert "暂无可验证用户主页链接" in V3


def test_empty_platform_state_exposes_capture_diagnostics() -> None:
    assert "syncDiagnostic(platform,mode)" in V3
    assert "抓取诊断" in V3


def test_seed_users_are_not_presented_as_current_when_live_board_is_empty() -> None:
    assert "if(!live)return{...fallback,users:[],_origin:'empty'" in V2
