# ZWM · AI 工作台

这是 ZWM 的公开个人主页、产品入口与构建日志，由 GitHub Pages 托管。

访问地址：

https://zwmopen.github.io

## 当前定位

**内容增长 × AI 系统 × 自动化产品**

我把内容运营、客户转化和个人管理中的高频问题，持续产品化为：

- AI Gateway / Remote MCP
- 业务知识库与本地检索系统
- Windows、Android 与 iPhone 工具
- 可供 Codex、OpenClaw、Claude Code 调用的 Skill
- 面向真实工作的脚本与自动化流程

## 公开产品

### MD2Card Studio

把 Markdown 长文拆成多页视觉卡片，支持自动分页、多主题、多比例、批量导入以及 PNG / ZIP 导出。

- 在线入口：https://zwmopen.github.io/md2card-lite/
- 源码：`zwmopen/md2card-markdown-to-image-converter`

### OwlReader Next

支持开放许可作品搜索、TXT 导入、本地书架、阅读进度与阅读设置。

- 在线入口：https://zwmopen.github.io/owlreader/

### xhs-dl

面向有权保存的公开笔记，批量提取原始图片、视频与文案。

- Windows 便携桌面版：V2.3.1
- Android 客户端：V1.0.0
- 公开仓库：`zwmopen/xhs-dl`

### 相册 · Gallery

跨设备素材预览与交付客户端。公开仓库只保存安装包、版本信息和自动更新清单，不保存用户素材。

- Android：V0.3.9
- 版本仓库：`zwmopen/gallery-updates`

## 五层个人 AI 操作系统

1. **输入层**：ChatGPT、语音、手机和自然语言命令
2. **控制平面**：统一鉴权、路由、计划、日志与执行状态
3. **Skill 层**：Codex、OpenClaw、Claude Code 的规范化执行规则
4. **工具层**：脚本、桌面应用和移动客户端
5. **业务系统**：内容生产、客户转化、知识检索与个人管理

## 最近项目

- **Dida AI Gateway 2.5.0**：Cloudflare Workers、REST / OpenAPI、Remote MCP、滴答清单 OAuth 与安全任务读写
- **素材投送中控**：Windows 便携端 + Android / iPhone，局域网自动发现、拖拽投送、SHA-256 校验与文案同步
- **团建企业转化知识库**：300 个有效会话、12,478 条消息、2,237 组真实问答、241 份正式方案索引
- **Scripts & Desktop Utilities**：窗口恢复、文件整理、图片处理与内容生产自动化

## 页面结构

1. 首页：当前定位与主要入口
2. 产品：已经可打开或下载的公开产品
3. 系统：五层个人 AI 操作系统
4. 项目：公开项目与内部项目的非敏感能力说明
5. 真实工作：内容、转化、AI 总控与跨设备协作案例
6. 最近更新：已经落地的版本与系统变化
7. 构建原则：单一事实源、本地优先、人掌握判断、安全执行

## 文件

- `index.html`：主页、样式、响应式布局、主题交互与结构化数据
- `icon.svg`：站点图标
- `og-card.svg`：社交分享卡片
- `sitemap.xml`：主页与在线工具索引
- `robots.txt`：搜索引擎抓取策略
- `404.html`：自定义错误页
- `.nojekyll`：按纯静态站点发布

## 维护规则

1. 本仓是线上发布入口。
2. 私有设计镜像为 `zwmopen/xiangruiai-like-homepage`。
3. 不公开私有仓库地址、客户原始数据、个人记忆、令牌或密钥。
4. 新增公开产品时，同步更新主页产品区、最近更新、README 与必要的 sitemap。
5. 只有已经可运行、可下载或完成验证的能力才标记为已完成。
6. 在线入口优先于源码入口；内部业务系统只展示脱敏后的规模与能力。

## 最近更新

- **2026-07-19**：xhs-dl 发布桌面 2.3.1 与 Android 1.0.0
- **2026-07-19**：跨设备相册与素材投送扩展到 iPhone
- **2026-07-18**：团建企业转化知识库封装为便携应用并建立自动更新
- **2026-07-18**：相册发布 Android V0.3.9 与独立公开更新通道
- **2026-07-15**：AI 总控接入受限本地 OpenClaw Bridge
