# Crypto Radar 维护交接

核对日期：2026-08-14

## 唯一真源与范围

- 公开产品仓库：`zwmopen/zwmopen.github.io`
- 公开入口：`crypto-radar/`
- 旧版 OKX 带单雷达：`trader-radar/`，不得删除
- 私有采集与研究仓库：`zwmopen/Obsidiansy`
- 本轮分支：`codex/okx-personal-trader-radar`

## 当前数据边界

`trader-radar/data/traders.json` 和 `changes.json` 是 OKX Lead Trader / Copy Trading 数据；页面使用 `/api/v5/copytrading/*` 及已存在的 OKX client ecotrade 采集结果，不得将其字段改名后冒充 Personal Trader。

`crypto-radar/data/okx-personal.json` 是独立 Personal Trader 数据契约。当前状态为 `unavailable`：

- `/en-us/leaderboard` 与 `/leaderboard` 当前匿名返回 404；
- `/orbit` 匿名页有社区流，但没有公开 Top Trader 数据接口；
- `/priapi/v5/ecotrade/public/follow-rank` 虽可匿名返回排名，但响应包含 `followerLimit`、`followPnl`、`copyRelId`、`totalLeadInstNum`，被探测器拒绝为 Copy Trading 候选源。

截图中的 3 人数据仍保留在 `okx-dual-board.js` 的 `PERSONAL_FIXTURE` 中，仅 `?fixture=1` 用于回归验证，不参与正式榜单。

## 关键链路

```text
OKX Copy Trading API
  -> scripts/run_trader_radar.py
  -> trader-radar/data/{traders,changes,history}
  -> Lead Trader board

OKX Personal source probe
  -> scripts/probe_okx_personal.py
  -> crypto-radar/data/okx-personal.json
  -> Personal Trader board
```

Personal schema至少保留：`platform`、`trader_type`、`trader_id`、`name`、`rank`、`pnl_usd`、`roi_pct`、`assets_usd`、`max_drawdown_pct`、`win_rate_pct`、`positions`、`roi_series`、`source_url`、`source_type`、`updated_at`、`raw_metrics`。禁止用 `0` 填充未知字段。

## 验证命令

```bash
node --check crypto-radar/okx-dual-board.js
python -m pytest -q scripts/test_personal_radar.py
python scripts/probe_okx_personal.py
python -m pytest -q
python scripts/run_trader_radar.py
```

页面回归：桌面和 390px 手机宽度进入 OKX；验证 Lead Trader 卡片、带单周期、曲线跳转 `trader-radar/chart.html?id=<id>&period=<period>`；再进入 Personal Trader，确认无源时显示空状态，`?fixture=1` 才出现 3 个回归卡片。

## 已知未完成事项

1. 尚未发现可匿名、可持续且能证明为 Personal Trader 的官方排行榜接口。
2. 尚未把 Personal Trader 详情页接到独立公开 profile URL；必须等稳定源提供 profile/id。
3. 本轮尚未推送、合并或验证 GitHub Pages；当前结论不能写成已上线。

后续唯一优先动作：继续跟踪 OKX 官方 Web/App 的 Personal Trader 或 Orbit Top Trader 数据请求，发现新候选后先通过语义拒绝测试，再接入正式 JSON。
