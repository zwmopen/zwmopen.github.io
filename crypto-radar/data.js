const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const EX=[
 {rank:1,key:'binance',name:'Binance',users:'3.0 亿+',note:'全球注册用户 3 亿+'},
 {rank:2,key:'okx',name:'OKX',users:'1.2 亿+',note:'全球用户 1.2 亿+'},
 {rank:2,key:'bitget',name:'Bitget',users:'1.2 亿+',note:'全球注册用户 1.2 亿+'},
 {rank:4,key:'crypto',name:'Crypto.com',users:'1.0 亿+',note:'公开里程碑 1 亿+'},
 {rank:5,key:'bybit',name:'Bybit',users:'0.8 亿+',note:'全球用户 8000 万+'},
 {rank:6,key:'htx',name:'HTX',users:'0.58 亿+',note:'注册用户约 5800 万'},
 {rank:7,key:'gate',name:'Gate',users:'0.50 亿+',note:'原 Gate.io，注册用户 5000 万+'},
 {rank:8,key:'kucoin',name:'KuCoin',users:'0.45 亿+',note:'公开披露突破 4500 万'},
 {rank:9,key:'mexc',name:'MEXC',users:'0.40 亿+',note:'全球用户 4000 万+'}
];
const TOP=[
 {key:'global',name:'全球总榜'},
 {key:'okx',name:'OKX'},
 {key:'binance',name:'Binance'},
 {key:'bitget',name:'Bitget'},
 {key:'bybit',name:'Bybit'},
 {key:'gate',name:'Gate'},
 {key:'kucoin',name:'KuCoin'},
 {key:'mexc',name:'MEXC'},
 {key:'htx',name:'HTX'},
 {key:'crypto',name:'Crypto.com'},
 {key:'watch',name:'自选'},
 {key:'alerts',name:'预警'}
];
const PLATFORM_INFO={
 binance:{name:'Binance',users:'3.0 亿+',tag:'COPY TRADING + WEB3',summary:'现货与合约 Copy Trading 都有 Lead Trader 目录；此外 Binance Web3 还有公开链上钱包排行榜，可按 PnL、胜率、交易量、交易次数等维度筛选。',status:'公开榜单已确认',leaderboards:[['Copy Trading Lead Traders','Spot / Futures；可按 30 天 PnL、ROI 等筛选'],['Web3 钱包排行榜','BSC / Solana / Base / Ethereum；7/30/90 天'],['链上交易员评分','PnL / 胜率 / 稳定性 / 回撤 / 标签']],metrics:['30天 PnL / ROI','胜率与风险等级','粉丝/跟随数据','链上成交量与交易次数'],links:[['Copy Trading','https://www.binance.com/en/copy-trading'],['官方指南','https://academy.binance.com/en/articles/your-guide-to-binance-copy-trading'],['Web3 Leaderboard','https://www.binance.com/zh-TC/skills/detail/binance-web3/binance-leaderboard']]},
 bitget:{name:'Bitget',users:'1.2 亿+',tag:'ELITE TRADER',summary:'公开 Elite Trader 排行体系覆盖 Futures、Spot、CFD。榜单和交易员卡片可查看 ROI、跟单人数等指标，部分商品页还会给出热门精英交易员。',status:'公开榜单已确认',leaderboards:[['Futures Elite Trader','合约精英交易员榜'],['Spot Elite Trader','现货精英交易员榜'],['CFD Elite Trader','CFD / MT5 精英交易员榜']],metrics:['30天 ROI','当前跟单人数','账户利润','交易员等级/分润'],links:[['Copy Trading','https://www.bitget.com/copy-trading'],['榜单规则','https://www.bitget.com/support/articles/12560603885593'],['Elite Trader 指南','https://www.bitget.com/support/articles/12560603847588']]},
 bybit:{name:'Bybit',users:'0.8 亿+',tag:'MASTER TRADER',summary:'Copy Trading Classic 有完整 Master Trader 排行分类，官方公开页面直接提供多种推荐榜与交易员绩效详情。',status:'公开榜单已确认',leaderboards:[['Top Balanced Traders','收益与风险更均衡'],['Top ROI','高 ROI 交易员'],['Top Intra-Day Traders','日内交易员'],['Top New Talents','新晋交易员'],['Highest Follower Profit','跟随者利润高'],['Lowest Drawdown','低回撤']],metrics:['30天 ROI','Master PnL','最大回撤','Follower Profit','交易统计与持仓'],links:[['Copy Trading','https://www.bybit.com/copyTrade/tradeLink'],['绩效说明','https://www.bybit.com/en/help-center/article/How-to-Understand-Master-Trader-Performance'],['排行规则','https://www.bybit.com/en/help-center/article/How-Can-Master-Traders-Rank-in-The-Different-Categories']]},
 gate:{name:'Gate',users:'0.50 亿+',tag:'LIVE COPY TRADING',summary:'Gate 已有实时跟单交易员排行榜规则，包含日榜、月榜和 Whale Ranking；官方评分同时考虑收益率、累计利润、最大回撤和资产规模。',status:'公开榜单已确认',leaderboards:[['Daily Ranking','每日更新前一日排名'],['Monthly Ranking','每月 1 日更新'],['Whale Ranking','偏资产规模维度'],['Copy Profit / Follower Growth','活动榜中也公开过利润与粉丝增长榜']],metrics:['收益率 30% 权重','累计利润 30%','最大回撤 10%','资产规模 30%'],links:[['实时榜规则','https://www.gate.com/de/help/quants/traders_guide/40122/copy-trading-lead-traders-leaderboard-rules'],['Copy Trading','https://www.gate.com/strategybot'],['榜单示例','https://www.gate.com/campaigns/3501']]},
 kucoin:{name:'KuCoin',users:'0.45 亿+',tag:'LEAD TRADER',summary:'KuCoin Copy Trading 已公开 Lead Trader 筛选与详细指标。官方支持 7 / 30 / 90 天表现区间，并能按 ROI、PNL、交易规模、当前跟随人数、Follower PNL 等筛选。',status:'公开榜单已确认',leaderboards:[['7 / 30 / 90 天表现','多周期交易员表现'],['ROI / PNL','收益率与收益额'],['Follower PNL','跟随者累计收益'],['Trade Size / Followers','交易规模与当前跟随人数']],metrics:['PNL / PNL%','AUM','Lead Trading Principal','交易频率','持仓时长','偏好资产','当前/历史持仓'],links:[['Copy Trader 指南','https://www.kucoin.com/support/39212120334745'],['Lead Trader 指南','https://www.kucoin.com/support/39211647234969'],['Copy Trading 介绍','https://www.kucoin.com/support/38990860166041']]},
 mexc:{name:'MEXC',users:'0.40 亿+',tag:'TOP FUTURES TRADERS',summary:'MEXC 公开 Top Futures Traders 页面，分类非常适合直接接入雷达：综合、最高 ROI、最高 PNL、最多 Followers，并支持 All Traders 多指标排序。',status:'公开榜单已确认',leaderboards:[['Overall','综合排名'],['Highest ROI','最高收益率'],['Highest PNL','最高收益额'],['Most Followers','最多跟随者'],['All Traders','可按多个指标继续排序']],metrics:['7天 ROI','7天 PNL','7天胜率','交易频率','分润比例','Followers','Total ROI / Total PNL'],links:[['Top Traders','https://www.mexc.com/futures/copyTrade/leaderRank'],['Copy Trade','https://www.mexc.com/futures/copyTrade/home?lang=en-US'],['官方教程','https://www.mexc.com/support/article/mexc-copy-trade-tutorial-website-390797347687474176']]},
 htx:{name:'HTX',users:'0.58 亿+',tag:'FUTURES COPY TRADING',summary:'HTX 在 2026 年升级了 Futures Copy Trading 排行体系，综合评估 PnL、风险管理、交易活跃度与跟单表现，并新增 AI Picks。',status:'公开榜单已确认',leaderboards:[['多维综合排行','PnL + 风控 + 活跃度 + 跟单表现'],['Top PnL%','活动体系中的收益率榜'],['Top PnL','收益额榜'],['Top Profitable Traders','跟随者盈利表现榜'],['AI Picks','基于偏好与风险习惯推荐']],metrics:['今日 PnL','收益表现','风险指标','交易活跃度','Copy Trading 表现'],links:[['Copy Trading 指南','https://www.htx.com/support/25018366573026/'],['2026 排行升级','https://www.htx.com/support/55038495247537/'],['榜单示例','https://www.htx.com/support/55036632137797/']]},
 crypto:{name:'Crypto.com',users:'1.0 亿+',tag:'TRADING ARENA',summary:'Crypto.com 当前更明确公开的是 Trading Arena 交易竞赛榜，而不是持续性的 Copy Trader 排行。系统里会把它归类为“交易竞赛雷达”，避免把不同产品误当成跟单榜。',status:'公开竞赛榜已确认',leaderboards:[['Trading Arena Top 10','竞赛前十名'],['Trading Volume Ranking','按活动交易量排名'],['Past Competitions','历史竞赛结果']],metrics:['当前排名','累计交易量','Top 10','约每30分钟更新'],links:[['Trading Arena FAQ','https://help.crypto.com/en/articles/6086788-trading-arena-common-faq']]}
};
const PLATFORM_SUB=[['overview','概览'],['leaderboards','公开排行榜'],['metrics','可用指标'],['official','官方入口']];
let platformSub='overview';
const cardPeriods=new Map();

const RANKS=[
 {key:'pnl',name:'收益额',hint:'所选周期收益额，从高到低'},
 {key:'roi',name:'收益率',hint:'所选周期收益率，从高到低'},
 {key:'hot',name:'综合榜',hint:'带单规模 → 跟单人数 → 带单时间'},
 {key:'aum',name:'带单规模',hint:'AUM 从高到低'},
 {key:'followers',name:'跟单人数',hint:'当前跟单人数从高到低'},
 {key:'days',name:'带单天数',hint:'带单时间从长到短'},
 {key:'drawdown',name:'低回撤',hint:'所选周期最大回撤越低越靠前'},
 {key:'flow',name:'资金流入',hint:'固定使用近30天估算净流入'},
 {key:'deep',name:'深度实盘',hint:'仅已有深度数据的交易员，按所选周期收益额'},
 {key:'risk',name:'风险预警',hint:'高风险优先，用于排查异常'}
];
const PERIOD_LABEL={year:'1年',month:'30天',week:'7天',day:'1天'};
const ALERT_WEIGHT={high:3,medium:2,low:1,none:0};
let current='global', payload={}, traders=[], changes={}, currentRank='pnl', currentPeriod='year', query='', renderLimit=30, loaded=false;
