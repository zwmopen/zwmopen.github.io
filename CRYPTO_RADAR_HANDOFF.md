# Crypto Radar 维护交接

核对日期：2026-08-19

## 唯一真源与范围

- 公开产品仓库：`zwmopen/zwmopen.github.io`
- 公开入口：`crypto-radar/`
- 旧版 OKX 带单雷达：`trader-radar/`，不得删除
- 私有采集与研究仓库：`zwmopen/Obsidiansy`
- 当前发布基线：`master`；跨平台数据源质量改动需通过独立 PR 发布

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

## 界面状态

- 顶栏右上角提供太阳/月亮主题按钮；浅色显示太阳、深色显示月亮，点击切换 `html[data-theme]`。
- 主题偏好保存在浏览器 `localStorage` 的 `crypto-radar-theme` 键中；默认浅色。深色覆盖主榜、OKX 双榜、表单控件与 Personal 详情抽屉。

## 跨平台数据与曲线边界

- `platforms-generated.js` 中有实时公开榜用户时才进入跨平台用户榜；实时抓取为空时不再把 `platform-seed.js` 的静态种子用户当作当前榜单展示，只保留平台入口和抓取诊断。
- 跨平台历史曲线必须至少有 5 个有效快照且覆盖至少 72 小时；不足时显示“真实历史不足，暂不绘图”，禁止把 1～3 个同日快照画成 30 天或 1 年趋势。
- 跨平台卡片使用明确的“查看详情 ↗”打开站内详情抽屉。只有采集源提供可验证 `profileUrl` 时才显示用户主页链接；没有链接时必须说明“暂无可验证用户主页链接”，不得拼接猜测地址。
- 历史积累期是正常状态：采集器按公开快照持续累积数据，达到曲线门槛后才显示趋势图。
- 采集器先读取官方公开 JSON，再读取官方用户卡片已经渲染出的 DOM 图片；Bitget、HTX 等平台的头像只存在于卡片 DOM 时，也必须回填到同一用户快照。诊断中记录 `domAvatarHints`、`avatarUsers`、`profileUsers`，便于区分“官方无图”和“采集器漏图”。
- 官方卡片中的默认头像仍属于官方返回的头像资源，但不等同于用户自定义头像；系统可以展示它，但不得把它描述成用户本人照片。

## 2026-08-17 跨平台接入状态

- KuCoin：官方公开快照当前有 12 位用户；头像字段仅覆盖 3/12，稳定用户主页链接为 0/12。页面保留这 12 行，但在平台头部明确显示覆盖率，缺失字段不补造。
- Bybit：官方全球 Copy Trading 页面可打开并能看到榜单内容，但当前采集器原始入口遇到 HTTP/2/区域访问限制，尚未取得可验证用户行。页面不展示静态种子用户，顶部只保留官方榜入口，并显示“暂无可验证用户 · 不展示假用户”。
- Gate：主域公开页面当前被 403 拦截；`gate.ac` 的替代官方页面虽可取得部分 SSR 内容，但浏览器自动化返回 Restricted Access，尚未形成稳定、可复验的采集链路。页面不展示静态种子用户，只保留官方榜入口。
- 第三方数据：本轮没有混入第三方用户数据。第三方源只有在能够同时证明来源、更新时间、用户身份/主页、字段口径和定时刷新后，才允许以独立来源标签接入，不与官方榜混排。
- 空榜展示：这是数据质量状态，不是故障占位；用户可以从平台头部或空状态直接打开官方榜核对。

## 2026-08-19 官方页面降级与真实浏览器验收

- 非 OKX 平台新增统一 `OFFICIAL_FALLBACK` 配置：有本站可验证用户快照时显示本站卡片；没有时底部只显示官方页面，不使用静态种子用户补齐。
- Bybit 改用可直接访问的区域官方排行榜 `https://www.bybit.com/copyTrading/en/leader-board`。390px 浏览器实测可内嵌，能读到 `Copy Trading Leaderboard`、用户名、7-Day Profit、Master Trader 与 `View` 等真实页面内容；官方页面仍保留新窗口直达按钮。
- Gate 的 `gate.ac` 在浏览器实测返回 EdgeOne 567 安全拦截，因此不再内嵌该地址；主域 `https://www.gate.com/copytrading` 会重定向到官方中文合约跟单页，实测能看到推荐交易员、30 日收益率、带单员盈亏、带单规模与跟单按钮，本站改为官方直达模式。
- 采集器目标同步改为 Bybit 区域官方排行榜与 Gate 主域官方排行榜；采集失败仍保持空榜，不把官方页面内容伪装成本地快照。
- 390px 验收：Gate 正文宽度 390、无 iframe 空框；Bybit 正文宽度 375，官方 iframe 可见；KuCoin 仍显示 12 个可验证用户并有 12 个“查看详情 ↗”；Bitget 详情按钮可打开站内抽屉；浏览器页面本身无横向溢出。
- 这次没有删除顶部平台入口：当前各平台至少有官方入口，且平台仍保留在全球总榜；只有未来连官方页面都无法稳定打开时，才按规则移除独立顶部 tab。

## 验证命令

```bash
node --check crypto-radar/okx-dual-board.js
python -m pytest -q scripts/test_personal_radar.py
python scripts/probe_okx_personal.py
python -m pytest -q
python scripts/run_trader_radar.py
python -m pytest -p no:xonsh -q
node --check crypto-radar/platform-v3.js
node --check scripts/collect_platform_radar.mjs
node scripts/test_platform_radar_dom.mjs
git diff --check
```

页面回归：桌面和 390px 手机宽度进入 OKX；验证 Lead Trader 卡片、带单周期、曲线跳转 `trader-radar/chart.html?id=<id>&period=<period>`；再进入 Personal Trader，确认无源时显示空状态，`?fixture=1` 才出现 3 个回归卡片。
跨平台回归：在 390px 宽度进入 KuCoin / Bybit / Gate，确认 KuCoin 显示 `12`、`头像 3/12`、`主页 0/12`；Bybit 显示官方 Leaderboard 内嵌内容；Gate 显示主域官方直达面板；顶部与正文均无横向溢出。

## 已知未完成事项

1. 尚未发现可匿名、可持续且能证明为 Personal Trader 的官方排行榜接口。
2. 尚未把 Personal Trader 详情页接到独立公开 profile URL；必须等稳定源提供 profile/id。
3. Bybit 与 Gate 的官方页面入口已经可视化降级，但本地采集链路仍可能受区域、HTTP/2、403 或安全防护影响；在稳定前保持空榜，不接入无法统一核验的第三方用户。
4. 本轮改动仍在 `codex/platform-source-quality` 分支；此前推送 GitHub 曾因 443 连接重置失败，未把本轮状态描述为已发布。

后续唯一优先动作：继续跟踪 OKX 官方 Web/App 的 Personal Trader 或 Orbit Top Trader 数据请求，发现新候选后先通过语义拒绝测试，再接入正式 JSON。
