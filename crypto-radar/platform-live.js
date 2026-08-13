// Official public leaderboard snapshots verified on 2026-08-13.
// These are intentionally labeled snapshots, not invented real-time feeds.
const PLATFORM_SNAPSHOTS={
  mexc:{
    title:'7日 Top Futures Traders · 官方页面快照',
    captured:'2026-08-13',
    source:'https://www.mexc.com/en-GB/futures/copyTrade/leaderRank',
    columns:['#','交易员','7日收益额','7日 ROI','跟单人数'],
    rows:[
      ['1','Azizaljuaid','+$1,791.52','105.89%','108/1000'],
      ['2','23*****2','+$406.48','774.92%','44/1000'],
      ['3','kakosen','+$3,572.21','90.26%','11/1000'],
      ['4','Mexctrader-JfMQEn','+$22,947.71','76.90%','48/1000'],
      ['5','Anmol Traders','+$2,379.46','51.34%','41/1000'],
      ['6','Mexctrader-PF1tQb','+$4,183.12','49.65%','143/1000'],
      ['7','WhiteRussian','+$2,406.14','34.56%','47/1000'],
      ['8','Bongdal','+$669.26','33.52%','33/1000'],
      ['9','63*****0','+$1,107.99','23.40%','8/1000'],
      ['10','Rays 896','+$35,748.84','20.82%','9/1000']
    ]
  },
  bybit:{
    title:'近7日跟随者收益榜 · 官方页面快照',
    captured:'2026-08-13',
    source:'https://www.bybit.com/copyTrading/ja-JP/leader-board',
    columns:['#','跟随者','近7日收益','Master Trader'],
    rows:[
      ['1','ksh**@***','+28,717.32 USDT','AlphaMIX'],
      ['2','rah**@***','+15,372.51 USDT','Aryo'],
      ['3','van**@***','+11,544.57 USDT','Top_Trading'],
      ['4','bra**@***','+7,345.52 USDT','Puma Osorio'],
      ['5','raz**@***','+6,718.92 USDT','BtcSpotMaster'],
      ['6','Pavlos','+6,686.34 USDT','Camry759'],
      ['7','3SFKKtrade','+5,683.06 USDT','3SF_limited'],
      ['8','ars**@***','+5,005.18 USDT','Profit Boost'],
      ['9','gua**@***','+4,137.48 USDT','Akai Tenshi'],
      ['10','ale**@***','+3,786.82 USDT','Puma Osorio']
    ]
  },
  gate:{
    title:'Gate Copy Trading · 官方榜单快照',
    captured:'2026-08-13',
    source:'https://www.gate.com/campaigns/3501',
    boards:[
      {name:'Follower Growth Ranking',columns:['#','Lead Trader'],rows:[
        ['1','Sweetheart Work Hard'],['2','Strong mother'],['3','Old Ink Head'],['4','Only trade, not gamble'],['5','Gotothemoon'],['6','CAFE Trader'],['7','I want Coin Hoardingpro'],['8','Jia Yi Cake'],['9','GateUser-5aa6922f'],['10','leviyuan']
      ]},
      {name:'Copy Trading Profit Ranking',columns:['#','Lead Trader'],rows:[
        ['1','Sweetheart Work Hard'],['2','Gotothemoon'],['3','Kugou Enlightenment'],['4','May fortune'],['5','Jia Yi Cake'],['6','Jin Dou Xiao Yun'],['7','I want Coin Hoardingpro'],['8','Only trade, not gamble'],['9','Maringirl'],['10','DuoduoClassroom']
      ]}
    ]
  },
  bitget:{
    title:'TraderPro / Elite Trader · 官方实时榜体系',
    captured:'2026-08-13',
    source:'https://www.bitget.com/asia/copy-trading/traderpro',
    facts:[
      ['TraderPro Season 3 参与人数','44,315'],
      ['Season 3 Challenge 最高 ROI','377.59%'],
      ['Season 3 Challenge 最高胜率','100%'],
      ['TraderPro Elite Traders Copiers','5000+'],
      ['挑战榜刷新频率','每 10 分钟']
    ],
    live:[
      ['Futures · Profit','https://www.bitget.com/copy-trading/leaderboard-ranking/futures-pnl'],
      ['Futures · Followers','https://www.bitget.com/copy-trading/leaderboard-ranking/futures-top-follwers'],
      ['Futures · New Elite Traders','https://www.bitget.com/copy-trading/leaderboard-ranking/futures-new-elite-traders'],
      ['Spot · Profit','https://www.bitget.com/copy-trading/leaderboard-ranking/spot-pnl']
    ]
  },
  htx:{
    title:'HTX Futures Copy Trading · 官方实时榜',
    captured:'2026-08-13',
    source:'https://futures.htx.com/en-us/copytrading/futures',
    facts:[
      ['公开分类','Today’s Pick / AI Recommendation / Leaderboard / New Pro Traders'],
      ['数据说明','交易员表现数据约每 15 分钟更新'],
      ['当前网页镜像状态','公开抓取页返回 No Data；官方页仍可直接进入']
    ],
    live:[['HTX Futures Copy Trading','https://futures.htx.com/en-us/copytrading/futures']]
  },
  kucoin:{
    title:'KuCoin Lead Traders · 官方榜单体系',
    captured:'2026-08-13',
    source:'https://www.kucoin.com/support/39212120334745',
    facts:[
      ['可切周期','7 / 30 / 90 天'],
      ['核心排序','Rate of Return / PNL / Trade Size / Current Followers / Total Follower PNL'],
      ['详情页','PNL、AUM、持仓时长、偏好资产、当前/历史仓位、Follower PNL'],
      ['网页镜像状态','当前官方说明以 App Copy Trading 榜为主']
    ],
    live:[['KuCoin Copy Trading 指南','https://www.kucoin.com/support/39212120334745'],['Lead Trader Guide','https://www.kucoin.com/support/39211647234969']]
  },
  binance:{
    title:'Binance Leaderboards · 官方公开榜体系',
    captured:'2026-08-13',
    source:'https://www.binance.com/zh-TC/skills/detail/binance-web3/binance-leaderboard',
    facts:[
      ['Copy Trading','Spot / Futures Lead Traders，支持按 30D PnL / ROI 等筛选'],
      ['Web3 钱包榜周期','7 / 30 / 90 天'],
      ['Web3 钱包榜排序','PnL / Win Rate / Total Volume / Trade Count / Profit Rate / Token Count'],
      ['链支持','BSC / Solana / Base / Ethereum'],
      ['接口状态','Binance 官方说明为 Public endpoint，无需鉴权']
    ],
    live:[['Binance Copy Trading','https://www.binance.com/en/copy-trading'],['Binance Web3 Leaderboard','https://www.binance.com/zh-TC/skills/detail/binance-web3/binance-leaderboard']]
  },
  crypto:{
    title:'Crypto.com Trading Arena · 官方竞赛榜',
    captured:'2026-08-13',
    source:'https://help.crypto.com/en/articles/6086788-trading-arena-common-faq',
    facts:[
      ['榜单形式','当前竞赛 Top 10'],
      ['核心排序','Trading Volume / 当前排名'],
      ['刷新频率','约每 30 分钟'],
      ['历史数据','可查看 past competitions']
    ],
    live:[['Trading Arena FAQ','https://help.crypto.com/en/articles/6086788-trading-arena-common-faq']]
  }
};

function liveTable(columns,rows){
  return `<div class="table-wrap"><table><thead><tr>${columns.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td${i===0?' style="font-weight:950"':''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function factCards(rows){return `<div class="fact-grid">${rows.map(([a,b])=>`<div class="fact"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div>`}
function liveButtons(rows){return `<div class="source-btns">${rows.map(([n,u],i)=>`<a class="source-btn ${i?'secondary':''}" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a>`).join('')}</div>`}
function snapshotHtml(key){
  const s=PLATFORM_SNAPSHOTS[key]; if(!s)return'';
  let inner='';
  if(s.rows) inner=liveTable(s.columns,s.rows);
  else if(s.boards) inner=s.boards.map(b=>`<div style="margin-top:16px"><h3 style="margin:0 0 10px">${esc(b.name)}</h3>${liveTable(b.columns,b.rows)}</div>`).join('');
  else inner=`${s.facts?factCards(s.facts):''}${s.live?`<div style="margin-top:16px">${liveButtons(s.live)}</div>`:''}`;
  return `<article class="platform-block card" style="grid-column:1/-1"><span class="label">OFFICIAL SNAPSHOT</span><h2>${esc(s.title)}</h2><p>抓取/核验日期：${esc(s.captured)}。这是官方公开页面的当前快照或实时榜入口；不是模拟数据。</p>${inner}<div style="margin-top:14px"><a class="source-btn secondary" href="${esc(s.source)}" target="_blank" rel="noopener">核对官方来源 ↗</a></div></article>`;
}

const renderPlatformBase=renderPlatform;
renderPlatform=function(key){
  renderPlatformBase(key);
  const s=PLATFORM_SNAPSHOTS[key]; if(!s)return;
  if(platformSub==='overview') $('#platformBody').insertAdjacentHTML('afterbegin',snapshotHtml(key));
  if(platformSub==='leaderboards') $('#platformBody').insertAdjacentHTML('afterbegin',snapshotHtml(key));
};
