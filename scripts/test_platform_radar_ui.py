from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
V3 = (ROOT / "crypto-radar" / "platform-v3.js").read_text(encoding="utf-8")
V2 = (ROOT / "crypto-radar" / "platform-v2.js").read_text(encoding="utf-8")
BASE_CSS = (ROOT / "crypto-radar" / "base.css").read_text(encoding="utf-8")
V3_CSS = (ROOT / "crypto-radar" / "platform-v3.css").read_text(encoding="utf-8")
COLLECTOR = (ROOT / "scripts" / "collect_platform_radar.mjs").read_text(encoding="utf-8")


def test_short_cross_platform_history_is_not_rendered_as_a_trend() -> None:
    assert "HISTORY_RULES" in V3
    assert "historyReady" in V3
    assert "真实历史不足，暂不绘图" in V3


def test_platform_cards_expose_a_clear_detail_action() -> None:
    assert "查看详情 ↗" in V3
    assert "暂无可验证用户主页链接" in V3


def test_incomplete_platforms_expose_quality_and_official_source() -> None:
    assert "暂无可验证用户 · 不展示假用户" in V3
    assert "头像 ${avatars}/${count} · 主页 ${profiles}/${count}" in V3
    assert "v3-source-link" in V3
    assert "核对官方榜 ↗" in V3


def test_empty_platforms_use_configured_official_fallback_instead_of_fake_cards() -> None:
    assert "const OFFICIAL_FALLBACK" in V3
    assert "data-official-frame" in V3
    assert "打开官方榜单 ↗" in V3
    assert "官方页面由平台自己渲染" in V3
    assert "www.gate.com/copytrading" in V3


def test_rank_markers_are_compact_metadata_not_large_buttons() -> None:
    assert "grid-template-columns:34px minmax(0,1fr)" in BASE_CSS
    assert ".ranknum{width:28px;height:28px" in BASE_CSS
    assert ".ranknum.top3{color:var(--blue2);background:rgba(91,112,235,.12)" in BASE_CSS
    assert "grid-template-columns:34px minmax(0,1fr)" in V3_CSS
    assert ".v3-rank{grid-column:1;grid-row:1;width:28px;height:28px" in V3_CSS
    assert "box-shadow:none" in V3_CSS
    assert "grid-template-columns:30px minmax(0,1fr)" in V3_CSS


def test_empty_platform_state_exposes_capture_diagnostics() -> None:
    assert "syncDiagnostic(platform,mode)" in V3
    assert "抓取诊断" in V3
    assert "diagnosticSummary(diag)" in V3
    assert "本轮官方抓取未通过 HTTP/2 或区域访问限制" in V3


def test_seed_users_are_not_presented_as_current_when_live_board_is_empty() -> None:
    assert "if(!live)return{...fallback,users:[],_origin:'empty'" in V2


def test_collector_enriches_json_users_from_official_card_dom() -> None:
    assert "domAvatarHints" in COLLECTOR
    assert "enrichUsersFromDom" in COLLECTOR
    assert "currentSrc" in COLLECTOR
    assert "profileUrl" in COLLECTOR
