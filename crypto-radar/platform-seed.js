// Last-known-good public trader snapshots. Dynamic collector data overrides these rows when fresher.
window.PLATFORM_SEED={
  capturedAt:'2026-08-13',
  binance:{
    copy:{title:'Binance Lead Traders',period:'7D',sourceUrl:'https://www.binance.com/en/copy-trading',users:[
      {name:'加密猫女苏娜',profileUrl:'https://www.binance.com/es/copy-trading/lead-details/4844930989142068736',metrics:{aum:515.93,followers:0,days:214,pnl:0,roi:0,mdd:0,winRate:0,assets:515.93,sharpe:-1.98,profitShare:10},source:'official-profile'}
    ]},
    trader:{title:'Binance Web3 链上交易员榜',period:'30D',sourceUrl:'https://www.binance.com/zh-TC/skills/detail/binance-web3/binance-leaderboard',users:[],note:'由官方无鉴权 Web3 Leaderboard 自动采集器补全钱包用户。'}
  },
  bitget:{
    copy:{title:'Bitget Elite Traders',period:'30D',sourceUrl:'https://www.bitget.com/copy-trading/leaderboard-ranking/futures-pnl',users:[],note:'公开动态榜由浏览器采集器同步；失败时保留最后一次成功数据。'},
    trader:{title:'Bitget TraderPro',period:'Season',sourceUrl:'https://www.bitget.com/asia/copy-trading/traderpro',users:[
      {name:'Julien Brelien',metrics:{},badge:'TraderPro'},
      {name:'WealthWizard',metrics:{},badge:'TraderPro'},
      {name:'AlphaPro',metrics:{},badge:'TraderPro'},
      {name:'Zeedar',metrics:{},badge:'TraderPro'},
      {name:'DING',metrics:{},badge:'TraderPro'},
      {name:'Joe Noxxy',metrics:{},badge:'TraderPro'}
    ]}
  },
  bybit:{
    copy:{title:'Bybit Master Trader ROI',period:'Current',sourceUrl:'https://www.bybitglobal.com/copyTrade/',users:[
      {name:'Treasure_D',metrics:{roi:203.92},badge:'Human Squad'},
      {name:'dcagod',metrics:{roi:183.13},badge:'Human Squad'},
      {name:'Marginator',metrics:{roi:176.51},badge:'Human Squad'},
      {name:'ETH Whale',metrics:{roi:132.03},badge:'Human Squad'},
      {name:'TradingMaster0',metrics:{roi:87.97},badge:'Human Squad'},
      {name:'LoseMoneyFast',metrics:{roi:80.85},badge:'Human Squad'},
      {name:'MetatronicDave',metrics:{roi:70.90},badge:'Human Squad'},
      {name:'GRAND CROSS',metrics:{roi:64.36},badge:'Human Squad'},
      {name:'VKryptos',metrics:{roi:61.38},badge:'Human Squad'},
      {name:'CryptoPizza-Valera-X',metrics:{roi:58.28},badge:'Human Squad'}
    ]},
    trader:{title:'Bybit 普通交易员榜',period:'Daily',sourceUrl:'https://www.bybitglobal.com/copyTrade/',users:[
      {name:'Super Prophet',metrics:{},badge:'Leaderboard'}
    ],note:'官方普通交易员榜为 Top 500；动态用户名、PnL、ROI 由浏览器采集器同步。'}
  },
  gate:{
    copy:{title:'Gate Lead Traders',period:'Current',sourceUrl:'https://gate.ac/copytrading',users:[
      {name:'Gotothemoon',profileUrl:'https://www.gate.com/zh/copytrading/trader/futures/8907',badge:'高级交易员 · 高频 · 激进 · 短线',metrics:{aum:472.18,followers:25,days:483,pnl:-10.68,roi:-21.35,mdd:26.93,winRate:66.66,assets:0,trades:3,profitShare:18,followerPnl:0,sharpe:-0.73}},
      {name:'Shunping',profileUrl:'https://www.gate.com/copytrading/trader/futures/22593',badge:'高频 · 短线 · 保守',metrics:{aum:14756.42,followers:11,days:38,pnl:274.22,roi:7.08,mdd:3.89,winRate:92.30,assets:1879.37,trades:91,followerPnl:-716.52,sharpe:7.58}},
      {name:'Jonggeon',profileUrl:'https://www.gate.com/copytrading/trader/futures/25345',badge:'长期 · 高频 · 激进',metrics:{aum:52,followers:3,days:14,pnl:1956.76,roi:263.69,mdd:58.05,winRate:96.29,assets:3545.82,trades:27,followerPnl:-225.17,sharpe:8.88}},
      {name:'Officially authorized to get rich',profileUrl:'https://www.gate.com/copytrading/trader/futures/25576',badge:'长期 · 高频 · 激进',metrics:{aum:0,followers:0,days:48,pnl:468.82,roi:4.58,mdd:44.33,winRate:89.23,assets:527.09,trades:65,followerPnl:0,sharpe:3.34}},
      {name:'Good luck continues.',profileUrl:'https://www.gate.com/copytrading/trader/futures/10264',badge:'长期 · 高频 · 激进',metrics:{aum:374.75,followers:8,days:388,pnl:-2770.49,roi:-3.69,mdd:100,winRate:55,assets:9504.71,trades:20,followerPnl:-802.31,sharpe:-0.87}},
      {name:'GateUser-24b1b538',profileUrl:'https://www.gate.com/copytrading/trader/futures/25747',badge:'长期 · 高频 · 激进',metrics:{aum:5.69,followers:1,days:47,pnl:-1513.53,roi:-33.10,mdd:100,winRate:63.11,assets:1881.30,trades:1003,followerPnl:-37.26,sharpe:-3.32}},
      {name:'w555',profileUrl:'https://www.gate.com/copytrading/trader/futures/25618',badge:'长期 · 高频 · 激进',metrics:{aum:83996,followers:7,days:50,pnl:54.01,roi:.19,winRate:87.5,assets:1873.35,trades:8,followerPnl:335.65,sharpe:-2.67}},
      {name:'GateUser-a40218ae',profileUrl:'https://www.gate.com/copytrading/trader/futures/25825',badge:'长期 · 高频 · 激进',metrics:{aum:10,followers:1,days:45,pnl:596.49,roi:2.74,mdd:48.77,winRate:85.71,assets:18935.96,trades:7,followerPnl:-.31,sharpe:.54}},
      {name:'AI Contract Productivity',profileUrl:'https://www.gate.com/copytrading/trader/futures/27342',badge:'长期 · 高频 · 激进',metrics:{aum:0,followers:0,days:2,pnl:157.34,roi:10.01,mdd:19.23,winRate:61.53,assets:1731.13,trades:13,followerPnl:-410.39}},
      {name:'Professional Trader 5',profileUrl:'https://www.gate.com/copytrading/trader/futures/27794',badge:'长期 · 高频 · 保守',metrics:{aum:10,followers:1,days:2,pnl:-61.29,roi:-7.57,mdd:.21,winRate:100,assets:507.66,trades:11,followerPnl:.44}}
    ]},
    trader:{title:'Gate 普通交易员 / 活动交易榜',period:'Event',sourceUrl:'https://gate.ac/copytrading',users:[],note:'常驻公开细节目前主要集中在 Lead Trader 用户页；活动交易榜与带单榜分开。'}
  },
  kucoin:{
    copy:{title:'KuCoin Lead Traders',period:'7/30/90D',sourceUrl:'https://www.kucoin.com/copytrading',users:[],note:'KuCoin 用户榜当前可取得官方公开快照，但头像与用户主页字段不完整；缺失部分不补造。'},
    trader:{title:'KuCoin 普通交易员榜',period:'—',sourceUrl:'https://www.kucoin.com/',users:[],note:'未把 Lead Trader 用户冒充普通交易员。'}
  },
  mexc:{
    copy:{title:'MEXC Top Futures Traders',period:'7D',sourceUrl:'https://www.mexc.com/en-GB/futures/copyTrade/leaderRank',users:[
      {name:'Azizaljuaid',badge:'High Stress Tolerance+9',metrics:{pnl:1791.52,roi:105.89,followers:108}},
      {name:'23*****2',badge:'High Stress Tolerance+6',metrics:{pnl:406.48,roi:774.92,followers:44}},
      {name:'kakosen',badge:'High Stress Tolerance+5',metrics:{pnl:3572.21,roi:90.26,followers:11}},
      {name:'Mexctrader-JfMQEn',badge:'High Stress Tolerance+8',metrics:{pnl:22947.71,roi:76.90,followers:48}},
      {name:'Anmol Traders',badge:'Balanced+6',metrics:{pnl:2379.46,roi:51.34,followers:41}},
      {name:'Mexctrader-PF1tQb',badge:'Balanced+5',metrics:{pnl:4183.12,roi:49.65,followers:143}},
      {name:'WhiteRussian',badge:'High Stress Tolerance+7',metrics:{pnl:2406.14,roi:34.56,followers:47}},
      {name:'Bongdal',badge:'High Stress Tolerance+5',metrics:{pnl:669.26,roi:33.52,followers:33}},
      {name:'63*****0',badge:'High Stress Tolerance+6',metrics:{pnl:1107.99,roi:23.40,followers:8}},
      {name:'Rays 896',badge:'High Stress Tolerance+5',metrics:{pnl:35748.84,roi:20.82,followers:9}},
      {name:'GÖTTEN SİKİŞ',badge:'High Stress Tolerance+7',metrics:{pnl:180.82,roi:16.33,followers:18}},
      {name:'MEXCieZoo',badge:'Low Stress Tolerance+7',metrics:{pnl:4801.94,roi:14.21,followers:9}},
      {name:'Money marker',badge:'High Stress Tolerance+5',metrics:{pnl:2075.16,roi:11.66,followers:6}},
      {name:'Short term',badge:'High Stress Tolerance+6',metrics:{pnl:581.23,roi:10.94,followers:11}},
      {name:'15*****2',badge:'Balanced+6',metrics:{pnl:27621.52,roi:52.67,followers:4}},
      {name:'Mexctrader-Gm29lD',badge:'Balanced+6',metrics:{pnl:27104.06,roi:187.08,followers:28}},
      {name:'82*****9',badge:'No Stress Tolerance+10',metrics:{pnl:25408.01,roi:400.21,followers:64}},
      {name:'Mexctrader-dnA0Wp',badge:'High Stress Tolerance+7',metrics:{pnl:24784.05,roi:25.43,followers:4}},
      {name:'lannier',badge:'High Stress Tolerance+7',metrics:{pnl:22450.07,roi:6.48,followers:3}},
      {name:'SIRTSHTA7',badge:'High Stress Tolerance+7',metrics:{pnl:19445.51,roi:23.79,followers:0}}
    ]},
    trader:{title:'MEXC 普通交易员榜',period:'—',sourceUrl:'https://www.mexc.com/',users:[],note:'公开常驻用户级排行榜目前是 Copy Trade Lead Trader；不混榜。'}
  },
  htx:{
    copy:{title:'HTX 合约跟单 · 综合排名',period:'30D',sourceUrl:'https://futures.htx.com/zh-cn/copytrading/futures',users:[
      {name:'以太格格',metrics:{aum:60236.77,followers:98,pnl:24672.97,roi:1126.73,mdd:56.0498,winRate:93.89,followerPnl:35784.61}},
      {name:'150****@163.com',metrics:{aum:484800.49,followers:11,pnl:1554.70,roi:15.68,mdd:13.3915,winRate:73.68,followerPnl:64884.27}},
      {name:'天启资本TraderT',metrics:{aum:4933.79,followers:2,pnl:208.01,roi:5.42,mdd:49.6364,winRate:93.75,followerPnl:494.56}},
      {name:'TimCook',metrics:{aum:12637.92,followers:254,pnl:1092.33,roi:14.27,mdd:96.9227,winRate:100,followerPnl:5114.55}},
      {name:'安全产出',metrics:{aum:15979.21,followers:214,pnl:41712.65,roi:61.04,mdd:97.9562,winRate:100,followerPnl:801.50}},
      {name:'财运',metrics:{aum:1716.07,followers:3,pnl:326.88,roi:108.96,mdd:.464,winRate:100,followerPnl:19.95}},
      {name:'枯燥的等待一天又一天',metrics:{aum:4885.98,followers:585,pnl:160.54,roi:17.14,mdd:3.63,winRate:92.86,followerPnl:259.39}},
      {name:'已稳定交易一年',metrics:{aum:4936.03,followers:838,pnl:76.44,roi:12.34,mdd:7.1236,winRate:85.71,followerPnl:109.11}},
      {name:'五年计划',metrics:{aum:21455.59,followers:123,pnl:125.48,roi:23.35,mdd:4.5351,winRate:100,followerPnl:3572.01}},
      {name:'聚财6688',metrics:{aum:4585.64,followers:14,pnl:72.66,roi:22.72,mdd:14.0633,winRate:98.25,followerPnl:594.52}},
      {name:'不积小流无以成江海',metrics:{aum:2070.80,followers:200,pnl:198.03,roi:21.40,mdd:51.8099,winRate:72.73,followerPnl:321.65}},
      {name:'经历多轮大涨大跌',metrics:{aum:2332.81,followers:739,pnl:129.91,roi:21.01,mdd:7.299,winRate:86.67,followerPnl:88.78}}
    ]},
    trader:{title:'HTX 普通交易员榜',period:'—',sourceUrl:'https://www.htx.com/',users:[],note:'当前公开细节集中在 Futures Copy Trading Lead Trader；不把带单榜复制成普通交易员榜。'}
  },
  crypto:{
    copy:{title:'Crypto.com Copy Trader',period:'—',sourceUrl:'https://crypto.com/',users:[],note:'未发现与 OKX Lead Trader 等价的常驻公开 Copy Trader 榜。'},
    trader:{title:'Crypto.com Trading Arena',period:'Event',sourceUrl:'https://help.crypto.com/en/articles/6086788-trading-arena-common-faq',users:[],note:'竞赛 Top 10 为事件型榜单，自动采集器仅在活动公开时同步具体用户。'}
  }
};
