(()=>{
const GS={
  okxTrader:{
    title:'热门交易员 · 1年收益额',status:'snapshot',statusText:'用户截图核对',source:'OKX 星球热门交易员',sourceUrl:'https://www.okx.com/zh-hans/help/okx-orbit-faq',
    filters:[['pnl','收益额'],['roi','收益率']],periods:[['year','1年']],
    users:[
      {name:'十老板',badge:'365天盈利榜第1名',primaryLabel:'1年收益额',primaryValue:'+$14,769,893.49',sortPnl:14769893.49,sortRoi:298.30,metrics:[['1年收益率','+298.30%'],['近30天胜率','57.14%'],['30天最大回撤','3.27%'],['总交易战绩','+637.58%'],['粉丝','2.67万'],['关注','9']],note:'普通交易战绩用户，不等同于带单员。截图显示可进入个人主页继续查看「动态 / 交易战绩 / 直播」。',sourceUrl:'https://www.okx.com/zh-hans/help/okx-orbit-faq'},
      {name:'crypto游鱼',primaryLabel:'1年收益额',primaryValue:'+$2,775,145.72',sortPnl:2775145.72,sortRoi:9.09,metrics:[['1年收益率','+9.09%'],['近30天胜率','25.00%'],['30天最大回撤','0.79%']],note:'来自用户提供的 OKX 热门交易员截图。',sourceUrl:'https://www.okx.com/zh-hans/help/okx-orbit-faq'},
      {name:'YANGMING.C',primaryLabel:'1年收益额',primaryValue:'+$2,731,384.59',sortPnl:2731384.59,sortRoi:1584.76,metrics:[['1年收益率','+1,584.76%'],['近30天胜率','96.00%'],['30天最大回撤','3.26%']],note:'来自用户提供的 OKX 热门交易员截图。',sourceUrl:'https://www.okx.com/zh-hans/help/okx-orbit-faq'}
    ]
  },
  platforms:{
    mexc:{
      copy:{title:'Top Futures Traders · 7日',status:'snapshot',statusText:'官方公开榜快照',sourceUrl:'https://www.mexc.com/en-GB/futures/copyTrade/leaderRank',users:[
        u('Azizaljuaid','7日收益额','+$1,791.52',[['ROI','105.89%'],['跟单人数','108/1000']], 'High Stress Tolerance+9'),
        u('23*****2','7日收益额','+$406.48',[['ROI','774.92%'],['跟单人数','44/1000']], 'High Stress Tolerance+6'),
        u('kakosen','7日收益额','+$3,572.21',[['ROI','90.26%'],['跟单人数','11/1000']], 'High Stress Tolerance+5'),
        u('Mexctrader-JfMQEn','7日收益额','+$22,947.71',[['ROI','76.90%'],['跟单人数','48/1000']], 'High Stress Tolerance+8'),
        u('Anmol Traders','7日收益额','+$2,379.46',[['ROI','51.34%'],['跟单人数','41/1000']], 'Balanced'),
        u('Mexctrader-PF1tQb','7日收益额','+$4,183.12',[['ROI','49.65%'],['跟单人数','143/1000']], 'Balanced'),
        u('WhiteRussian','7日收益额','+$2,406.14',[['ROI','34.56%'],['跟单人数','47/1000']]),
        u('Bongdal','7日收益额','+$669.26',[['ROI','33.52%'],['跟单人数','33/1000']]),
        u('63*****0','7日收益额','+$1,107.99',[['ROI','23.40%'],['跟单人数','8/1000']]),
        u('Rays 896','7日收益额','+$35,748.84',[['ROI','20.82%'],['跟单人数','9/1000']])
      ]},
      trader:{title:'普通交易员榜',status:'public',statusText:'未发现独立公开用户榜',sourceUrl:'https://www.mexc.com/futures/copyTrade/leaderRank',empty:'MEXC 当前稳定公开的是 Copy Trade 交易员体系；没有把普通账户交易战绩做成与 OKX 星球相同的常驻公开用户榜。这里保持独立，不拿带单员冒充普通交易员。'}
    },
    htx:{
      copy:{title:'HTX 合约跟单 · 综合排名',status:'snapshot',statusText:'官方页面公开数据',sourceUrl:'https://futures.htx.com/zh-cn/copytrading/futures',users:[
        u('以太格格','30日收益率','+1126.73%',[['30日收益额','24,672.97 USDT'],['30日最大回撤','56.0498%'],['AUM','$60,236.77'],['30日胜率','93.89%'],['跟单者总收益','$35,784.61'],['跟单人数','98/1000']]),
        u('150****@163.com','30日收益率','+15.68%',[['30日收益额','1,554.70 USDT'],['30日最大回撤','13.3915%'],['AUM','$484,800.49'],['30日胜率','73.68%'],['跟单者总收益','$64,884.27'],['跟单人数','11/100']]),
        u('天启资本TraderT','30日收益率','+5.42%',[['30日收益额','208.01 USDT'],['30日最大回撤','49.6364%'],['AUM','$4,933.79'],['30日胜率','93.75%'],['跟单者总收益','$494.56'],['跟单人数','2/1000']]),
        u('TimCook','30日收益率','+14.27%',[['30日收益额','1,092.33 USDT'],['30日最大回撤','96.9227%'],['AUM','$12,637.92'],['30日胜率','100%'],['跟单者总收益','$5,114.55'],['跟单人数','254/1000']]),
        u('长琦有钱静','7日收益率','+293.38%',[['7日收益额','485.93 USDT'],['7日最大回撤','0%'],['AUM','$1,042.31'],['7日胜率','62.5%'],['跟单者总收益','$275.48'],['跟单人数','3/100']]),
        u('165****@qq.com','7日收益率','+2.37%',[['7日收益额','676.94 USDT'],['7日最大回撤','3.8333%'],['AUM','$29,049.31'],['7日胜率','100%'],['跟单者总收益','$0.00'],['跟单人数','0/100']])
      ]},
      trader:{title:'普通交易员榜',status:'public',statusText:'未发现独立常驻公开榜',sourceUrl:'https://futures.htx.com/zh-cn/copytrading/futures',empty:'HTX 当前公开的用户级详细榜主要属于合约跟单 Lead Trader。普通账户没有找到与 OKX 星球「热门交易员」同等级的常驻公开榜，因此独立保留，不混用。'}
    },
    gate:{
      copy:{title:'Gate 跟单交易员 · 30日',status:'snapshot',statusText:'官方用户页/榜单',sourceUrl:'https://www.gate.com/copytrading',users:[
        {name:'Sphinx AI',badge:'高频 · 短线 · 保守',primaryLabel:'30日/当前收益率',primaryValue:'+64.31%',metrics:[['PnL','+216.66'],['AUM','$279,704.77'],['最大回撤','16.91%'],['夏普率','0.43'],['累计跟单','242'],['带单资产','1,081.01']],profileUrl:'https://www.gate.com/copytrading/trader/futures/16718',sourceUrl:'https://www.gate.com/copytrading/trader/futures/16718'},
        {name:'C4 Stable Sniper No. 1',badge:'高频 · 短线 · 保守',primaryLabel:'收益率',primaryValue:'+4.53%',metrics:[['总收益','+80.82'],['胜率','94.11%'],['AUM','$101,726.68'],['最大回撤','40.44%'],['夏普率','2.80'],['累计跟单','86']],profileUrl:'https://www.gate.com/copytrading/trader/futures/23630',sourceUrl:'https://www.gate.com/copytrading/trader/futures/23630'},
        u('ETH Evergreen Tree','30日ROI','+60.66%',[['Trader PnL','+1,837.30'],['AUM','$295,287.48'],['跟单人数','247/800']], 'Star Trader'),
        u('Eight Blessings','30日ROI','+1.28%',[['Trader PnL','+817.59'],['AUM','$381,894.59'],['跟单人数','11/1000']], 'Largest AUM'),
        u('2026 Dark Horse Leading the Way','30日ROI','+47.71%',[['Trader PnL','+957.73'],['AUM','$65,864.64'],['跟单人数','100/100']], 'Star Trader')
      ]},
      trader:{title:'普通交易员 / 交易赛榜',status:'public',statusText:'活动榜可公开，非长期个人战绩榜',sourceUrl:'https://www.gate.com/id/announcements/article/100759',empty:'Gate 有 Top Trader / Top ROI 等交易赛排行榜，但它是活动期榜单，不等同于 OKX 星球的常驻普通交易员个人战绩榜。系统保持单独入口，避免和带单榜混在一起。'}
    },
    bybit:{
      copy:{title:'Bybit Master Traders · PnL%榜',status:'snapshot',statusText:'官方活动榜公开用户',sourceUrl:'https://www.bybit.com/copyTrading/en/trader-vs-bot',users:[
        u('Treasure_D','Master Trader ROI','203.92%',[['榜单','Human Squad'],['积分','10']]),
        u('dcagod','Master Trader ROI','183.13%',[['榜单','Human Squad'],['积分','8']]),
        u('Marginator','Master Trader ROI','176.51%',[['榜单','Human Squad'],['积分','6']]),
        u('ETH Whale','Master Trader ROI','132.03%',[['榜单','Human Squad'],['积分','3']]),
        u('TradingMaster0','Master Trader ROI','87.97%',[['榜单','Human Squad'],['积分','3']]),
        u('LoseMoneyFast','Master Trader ROI','80.85%',[['榜单','Human Squad'],['积分','3']]),
        u('MetatronicDave','Master Trader ROI','70.90%',[['榜单','Human Squad'],['积分','3']]),
        u('GRAND CROSS','Master Trader ROI','64.36%',[['榜单','Human Squad'],['积分','3']]),
        u('VKryptos','Master Trader ROI','61.38%',[['榜单','Human Squad'],['积分','3']]),
        u('CryptoPizza-Valera-X','Master Trader ROI','58.28%',[['榜单','Human Squad'],['积分','3']])
      ]},
      trader:{title:'交易员交易量榜',status:'snapshot',statusText:'官方 Top 100 Traders by Volume',sourceUrl:'https://www.bybit.com/copyTrading/en/trader-vs-bot',users:[
        u('ITEKCrypto','累计交易量','490,464,874 USDT',[['类型','Human Trader']]),u('GRAND CROSS','累计交易量','461,542,407 USDT',[['类型','Human Trader']]),u('MakingCashflow','累计交易量','322,646,434 USDT',[['类型','Human Trader']]),u('livemore low risk','累计交易量','197,482,299 USDT',[['类型','Human Trader']]),u('persianz1','累计交易量','131,066,949 USDT',[['类型','Human Trader']]),u('dcagod','累计交易量','89,991,916 USDT',[['类型','Human Trader']]),u('Deep Learning','累计交易量','44,008,561 USDT',[['类型','Human Trader']]),u('TradingWithConfidence','累计交易量','42,348,818 USDT',[['类型','Human Trader']]),u('Juan_Lazy','累计交易量','39,829,550 USDT',[['类型','Human Trader']]),u('Eclipse.PP','累计交易量','37,699,915 USDT',[['类型','Human Trader']])
      ]}
    },
    bitget:{
      copy:{title:'Bitget Elite Trader 榜',status:'public',statusText:'榜单公开，动态用户列表需网页运行态',sourceUrl:'https://www.bitget.com/copy-trading/leaderboard-ranking/futures-pnl',empty:'Bitget 的 Futures / Spot Elite Trader 排行页面是公开的，并支持 Profit、Followers、New Elite Traders 等榜单；当前静态网页抓取没有返回用户行。系统不伪造用户，保留官方实时榜入口。'},
      trader:{title:'TraderPro 交易员体系',status:'snapshot',statusText:'官方 TraderPro 公开交易员案例',sourceUrl:'https://www.bitget.com/asia/copy-trading/traderpro',users:[
        u('Julien Brelien','TraderPro','公开交易员',[['Season 3参与人数','44,315'],['挑战最高ROI','377.59%']]),u('WealthWizard','TraderPro','公开交易员',[['计划','TraderPro']]),u('AlphaPro','TraderPro','公开交易员',[['计划','TraderPro']]),u('Zeedar','TraderPro','公开交易员',[['计划','TraderPro']]),u('DING','TraderPro','公开交易员',[['计划','TraderPro']]),u('Joe Noxxy','TraderPro','公开交易员',[['计划','TraderPro']])
      ]}
    },
    kucoin:{
      copy:{title:'KuCoin Lead Traders',status:'public',statusText:'App 榜单公开规则，网页无稳定用户行',sourceUrl:'https://www.kucoin.com/support/39212120334745',empty:'KuCoin 已公开 7/30/90 天、ROI、PNL、Trade Size、Current Followers、Follower PNL 等 Lead Trader 排行规则，并支持进入交易员主页查看 PNL、AUM、持仓时长、偏好资产、当前/历史仓位与跟随者 PNL；当前主要在 App 展示用户列表。'},
      trader:{title:'普通交易员榜',status:'public',statusText:'未发现独立常驻公开榜',sourceUrl:'https://www.kucoin.com/support/39212120334745',empty:'当前可验证的用户级公开体系是 Copy Trading Lead Trader。普通账户没有发现与 OKX 星球相同的常驻个人战绩榜。'}
    },
    binance:{
      copy:{title:'Binance Copy Trading Lead Traders',status:'public',statusText:'公开产品页，用户列表动态加载',sourceUrl:'https://www.binance.com/en/copy-trading',empty:'Binance Copy Trading 公开 Lead Trader 资料，支持 30D PnL / ROI、风险评分、跟随人数等筛选；当前页面用户行通过运行态加载，本站不硬造用户。'},
      trader:{title:'Binance Web3 链上交易员榜',status:'live',statusText:'官方 Public endpoint · 无需鉴权',sourceUrl:'https://www.binance.com/zh-TC/skills/detail/binance-web3/binance-leaderboard',empty:'Binance 官方已经开放链上交易员公共榜：BSC / Solana / Base / Ethereum，支持 7/30/90 天，按 PnL、胜率、交易量、交易次数、活跃度、盈利率、代币数排序；下一层会由自动采集器直接落真实钱包用户行。'}
    },
    crypto:{
      copy:{title:'Copy Trading',status:'public',statusText:'无同类常驻产品',sourceUrl:'https://help.crypto.com/en/articles/6086788-trading-arena-common-faq',empty:'Crypto.com 当前没有找到与 OKX 带单榜同结构的常驻公开 Copy Trader 用户榜，因此不拿竞赛用户冒充带单员。'},
      trader:{title:'Trading Arena 交易竞赛榜',status:'public',statusText:'官方竞赛 Top 10',sourceUrl:'https://help.crypto.com/en/articles/6086788-trading-arena-common-faq',empty:'Trading Arena 会展示竞赛 Top 10、Trading Volume 与历史竞赛，但公开帮助页不直接返回当前参赛用户名。这里保持为独立交易竞赛榜。'}
    }
  }
};
function u(name,label,value,metrics=[],badge=''){return{name,primaryLabel:label,primaryValue:value,metrics,badge}}
function e(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
function statusClass(s){return s==='live'?'live':s==='snapshot'?'snapshot':''}
function statusLabel(board){return `<span class="data-status ${statusClass(board.status)}">${board.status==='live'?'● ':board.status==='snapshot'?'◐ ':'○ '}${e(board.statusText||'公开数据')}</span>`}
function userCard(item,index,board){
 const metrics=(item.metrics||[]).slice(0,6), source=item.sourceUrl||board.sourceUrl, exact=!!item.profileUrl;
 return `<article class="radar-user-card card clickable" data-gs-user="${index}"><div class="ranknum ${index<3?'top3':''}">${index+1}</div><div class="user-main"><div class="user-name-row"><div class="user-name">${e(item.name)}</div>${item.badge?`<span class="user-badge">${e(item.badge)}</span>`:''}</div><div class="user-meta">${statusLabel(board)}${exact?'<span class="data-status live">用户主页可直达</span>':'<span class="data-status">站内详情可点</span>'}</div>${item.note?`<div class="user-note">${e(item.note)}</div>`:''}</div><div class="score-main"><div class="score-label">${e(item.primaryLabel||'公开指标')}</div><div class="score-value ${String(item.primaryValue||'').trim().startsWith('-')?'neg':''}">${e(item.primaryValue||'—')}</div><div class="score-sub">${metrics.slice(0,4).map(([a,b])=>`<span>${e(a)} <b>${e(b)}</b></span>`).join('')}</div></div><div class="sidebox">${metrics.slice(0,3).map(([a,b])=>`<div><span>${e(a)}</span><b>${e(b)}</b></div>`).join('')}</div><div class="user-actions">${exact?`<a class="primary" href="${e(item.profileUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">用户主页 ↗</a>`:`<button type="button">详情</button>`}${source?`<a href="${e(source)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">官网 ↗</a>`:''}</div></article>`;
}
function emptyBoard(board){return `<article class="board-empty card"><h3>${e(board.title||'该榜暂无可稳定镜像的用户行')}</h3><p>${e(board.empty||'官方页面存在，但本站当前没有稳定可验证的具体用户数据。')}</p>${board.sourceUrl?`<a class="source-btn" href="${e(board.sourceUrl)}" target="_blank" rel="noopener">打开官方实时榜 ↗</a>`:''}</article>`}
function boardHtml(board){
 const users=board.users||[];
 return `<div class="radar-board-head"><div><span class="label">USER LEVEL DATA</span><h2>${e(board.title||'用户榜')}</h2></div><p>${statusLabel(board)}<br>${users.length?`当前展示 ${users.length} 个具体用户`:'不伪造缺失用户'}</p></div>${users.length?`<section class="radar-user-list">${users.map((x,i)=>userCard(x,i,board)).join('')}</section>`:emptyBoard(board)}`;
}
function ensureDrawer(){
 if(document.getElementById('gsDetailDrawer'))return;
 document.body.insertAdjacentHTML('beforeend','<div class="detail-backdrop" id="gsDetailBackdrop"></div><aside class="detail-drawer" id="gsDetailDrawer"><button class="detail-close" id="gsDetailClose">×</button><div id="gsDetailContent"></div></aside>');
 const close=()=>{document.getElementById('gsDetailBackdrop').classList.remove('open');document.getElementById('gsDetailDrawer').classList.remove('open')};
 document.getElementById('gsDetailClose').onclick=close;document.getElementById('gsDetailBackdrop').onclick=close;
}
function openDetail(item,board,platform){
 ensureDrawer(); const metrics=item.metrics||[],source=item.sourceUrl||board.sourceUrl;
 document.getElementById('gsDetailContent').innerHTML=`<span class="detail-platform">${e(platform.toUpperCase())} · ${e(board.title)}</span><h2>${e(item.name)}</h2>${item.badge?`<span class="user-badge">${e(item.badge)}</span>`:''}<div class="detail-grid"><div class="detail-metric"><span>${e(item.primaryLabel||'主指标')}</span><b>${e(item.primaryValue||'—')}</b></div>${metrics.map(([a,b])=>`<div class="detail-metric"><span>${e(a)}</span><b>${e(b)}</b></div>`).join('')}</div>${item.note?`<div class="detail-notes">${e(item.note)}</div>`:''}<div class="detail-links">${item.profileUrl?`<a class="source-btn" href="${e(item.profileUrl)}" target="_blank" rel="noopener">打开用户主页 ↗</a>`:''}${source?`<a class="source-btn secondary" href="${e(source)}" target="_blank" rel="noopener">打开官方来源 ↗</a>`:''}</div>`;
 document.getElementById('gsDetailBackdrop').classList.add('open');document.getElementById('gsDetailDrawer').classList.add('open');
}
function bindCards(scope,board,platform){scope.querySelectorAll('[data-gs-user]').forEach(el=>el.onclick=()=>openDetail((board.users||[])[Number(el.dataset.gsUser)],board,platform))}

let okxMode='copy',okxSort='pnl';
function initOkxModes(){
 const view=document.getElementById('okxView'); if(!view||document.getElementById('okxBoardModes'))return;
 const head=view.querySelector('.okx-head');
 head.insertAdjacentHTML('afterend','<div class="board-mode-shell card" id="okxBoardModes"><span class="board-mode-label">OKX 榜单类型</span><div class="board-mode-tabs"><button class="board-mode-btn active" data-okx-mode="copy">带单榜<span class="sub">Lead Trader</span></button><button class="board-mode-btn" data-okx-mode="trader">交易员榜<span class="sub">热门交易员</span></button></div></div>');
 const consoleEl=view.querySelector('.rank-console'), list=document.getElementById('traderList'), more=document.getElementById('loadMore');
 consoleEl.dataset.gsCopy='1';list.dataset.gsCopy='1';more.dataset.gsCopy='1';
 more.insertAdjacentHTML('afterend','<section id="okxTraderBoard" hidden></section>');
 view.querySelectorAll('[data-okx-mode]').forEach(btn=>btn.onclick=()=>{okxMode=btn.dataset.okxMode;renderOkxMode()});
 renderOkxMode();
}
function renderOkxMode(){
 const view=document.getElementById('okxView'); if(!view)return;
 view.querySelectorAll('[data-okx-mode]').forEach(b=>b.classList.toggle('active',b.dataset.okxMode===okxMode));
 view.querySelectorAll('[data-gs-copy]').forEach(el=>el.hidden=okxMode!=='copy');
 const sec=document.getElementById('okxTraderBoard'); if(!sec)return; sec.hidden=okxMode!=='trader';
 if(okxMode!=='trader')return;
 const board=GS.okxTrader, users=[...board.users].sort((a,b)=>okxSort==='roi'?(b.sortRoi||0)-(a.sortRoi||0):(b.sortPnl||0)-(a.sortPnl||0));
 const local={...board,users};
 sec.innerHTML=`<section class="radar-controls card"><div><button class="rank-tab ${okxSort==='pnl'?'active':''}" data-okx-sort="pnl">收益额（从高到低）</button><button class="rank-tab ${okxSort==='roi'?'active':''}" data-okx-sort="roi">收益率（从高到低）</button></div><span class="data-status snapshot">1年</span></section><section class="board-section-note card"><b>这是普通交易员榜，不是带单榜。</b> 主排名按 1 年收益额/收益率；卡片同时保留近 30 天胜率与 30 天最大回撤，完全按你截图里的信息层级拆开。</section>${boardHtml(local)}`;
 sec.querySelectorAll('[data-okx-sort]').forEach(b=>b.onclick=()=>{okxSort=b.dataset.okxSort;renderOkxMode()}); bindCards(sec,local,'OKX');
}

let platformMode={};
const oldRenderPlatform=renderPlatform;
renderPlatform=function(key){
 oldRenderPlatform(key); const info=PLATFORM_INFO[key], pack=GS.platforms[key]; if(!info||!pack)return;
 const nav=document.getElementById('platformSubnav'),body=document.getElementById('platformBody');
 if(!platformMode[key])platformMode[key]='copy'; const mode=platformMode[key];
 nav.innerHTML=`<span class="board-mode-label">${e(info.name)} 榜单</span><button class="platform-subtab ${mode==='copy'?'active':''}" data-gs-mode="copy">带单榜</button><button class="platform-subtab ${mode==='trader'?'active':''}" data-gs-mode="trader">交易员榜</button><button class="platform-subtab ${mode==='overview'?'active':''}" data-gs-mode="overview">平台概览</button><button class="platform-subtab ${mode==='official'?'active':''}" data-gs-mode="official">官方入口</button>`;
 nav.querySelectorAll('[data-gs-mode]').forEach(btn=>btn.onclick=()=>{platformMode[key]=btn.dataset.gsMode;renderPlatform(key)});
 if(mode==='copy'||mode==='trader'){
   const board=pack[mode]; body.innerHTML=`<section style="grid-column:1/-1">${boardHtml(board)}</section>`; bindCards(body,board,key);
 } else if(mode==='overview'){
   body.innerHTML=`<article class="platform-block card"><span class="label">PLATFORM</span><h2>${e(info.name)} 数据结构</h2><p>${e(info.summary)}</p><div class="fact-grid"><div class="fact"><span>用户规模</span><b>${e(info.users)}</b></div><div class="fact"><span>带单榜</span><b>${pack.copy?.users?.length?`${pack.copy.users.length} 用户已镜像`:'官方入口/规则'}</b></div><div class="fact"><span>交易员榜</span><b>${pack.trader?.users?.length?`${pack.trader.users.length} 用户已镜像`:'独立保留'}</b></div><div class="fact"><span>原则</span><b>两类榜不混用</b></div></div></article><article class="platform-block card"><span class="label">METRICS</span><h2>公开指标</h2><div class="chips">${(info.metrics||[]).map(x=>`<span class="chip">${e(x)}</span>`).join('')}</div></article>`;
 } else {
   body.innerHTML=`<article class="platform-block card" style="grid-column:1/-1"><span class="label">OFFICIAL SOURCES</span><h2>${e(info.name)} 官方入口</h2><div class="source-btns">${(info.links||[]).map(([n,u],i)=>`<a class="source-btn ${i?'secondary':''}" href="${e(u)}" target="_blank" rel="noopener">${e(n)} ↗</a>`).join('')}${pack.copy?.sourceUrl?`<a class="source-btn secondary" href="${e(pack.copy.sourceUrl)}" target="_blank" rel="noopener">带单榜来源 ↗</a>`:''}${pack.trader?.sourceUrl?`<a class="source-btn secondary" href="${e(pack.trader.sourceUrl)}" target="_blank" rel="noopener">交易员榜来源 ↗</a>`:''}</div></article>`;
 }
};

ensureDrawer();initOkxModes();
window.__CRYPTO_RADAR_GOLD_STANDARD__=GS;
})();
