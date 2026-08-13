const money=v=>Number.isFinite(Number(v))?`${Number(v)<0?'-':'+'}$${new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Math.abs(Number(v)))}`:'—';
const compactMoney=v=>{
 const n=Number(v); if(!Number.isFinite(n))return'—'; const a=Math.abs(n),sign=n<0?'-':'';
 if(a>=1e9)return`${sign}$${(a/1e9).toFixed(2)}B`; if(a>=1e6)return`${sign}$${(a/1e6).toFixed(2)}M`; if(a>=1e3)return`${sign}$${(a/1e3).toFixed(1)}K`; return`${sign}$${a.toFixed(0)}`
};
const num=v=>Number.isFinite(Number(v))?Math.round(Number(v)).toLocaleString('en-US'):'—';
const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(2)}%`:'—';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function renderTop(){
 $('#topTabs').innerHTML=TOP.map(x=>`<button class="tab ${x.key===current?'active':''}" data-top="${x.key}">${x.name}</button>`).join('');
 $$('[data-top]').forEach(b=>b.onclick=()=>go(b.dataset.top));
}
function renderExchangeRows(){
 $('#exchangeRows').innerHTML=EX.map(x=>`<tr data-ex="${x.key}"><td><span class="rank">${x.rank}</span></td><td class="exchange"><strong>${x.name}</strong>${x.key==='gate'?'<small>原 Gate.io</small>':''}</td><td class="users">${x.users}</td><td><span class="status ${x.key==='okx'?'live':''}">${x.key==='okx'?'多榜单已接入':'平台入口'}</span></td><td>${x.note}</td><td><button class="enter">进入 →</button></td></tr>`).join('');
 $$('[data-ex]').forEach(r=>r.onclick=()=>go(r.dataset.ex));
}
function renderPlatformSubnav(){
 $('#platformSubnav').innerHTML=PLATFORM_SUB.map(([k,n])=>`<button class="platform-subtab ${platformSub===k?'active':''}" data-platform-sub="${k}">${n}</button>`).join('');
 $$('[data-platform-sub]').forEach(b=>b.onclick=()=>{platformSub=b.dataset.platformSub;renderPlatform(current)});
}
function platformListHtml(rows){return`<div class="cap-list">${rows.map(([a,b])=>`<div class="cap"><b>${esc(a)}</b><small>${esc(b||'')}</small></div>`).join('')}</div>`}
function renderPlatform(key){
 const info=PLATFORM_INFO[key],x=EX.find(v=>v.key===key); if(!info||!x)return;
 $('#platformHead').innerHTML=`<div class="platform-head-row"><div><span class="label">${esc(info.tag)}</span><h1>${esc(info.name)} 雷达</h1><p>${esc(info.summary)}</p><span class="integrate">${esc(info.status)} · 系统内自动抓取继续接入</span></div><div class="platform-user"><span>公开用户规模</span><strong>${esc(info.users)}</strong></div></div>`;
 renderPlatformSubnav();
 let html='';
 if(platformSub==='overview')html=`<article class="platform-block card"><span class="label">PUBLIC DATA</span><h2>这个平台公开了什么</h2>${platformListHtml(info.leaderboards.slice(0,4))}</article><article class="platform-block card"><span class="label">RADAR PLAN</span><h2>币圈雷达怎么接</h2><p>先把官方公开榜单与指标目录完整挂进系统；后续 collector 把可稳定抓取的数据快照写入本站 JSON，再升级成和 OKX 一样的可排序、可切周期、可长期观察的内部榜单。</p><div class="fact-grid"><div class="fact"><span>平台规模</span><b>${esc(info.users)}</b></div><div class="fact"><span>公开榜单</span><b>${info.leaderboards.length} 类+</b></div><div class="fact"><span>指标维度</span><b>${info.metrics.length} 类+</b></div><div class="fact"><span>当前状态</span><b>目录已接 / 数据抓取中</b></div></div></article>`;
 else if(platformSub==='leaderboards')html=`<article class="platform-block card" style="grid-column:1/-1"><span class="label">LEADERBOARDS</span><h2>${esc(info.name)} 公开排行榜目录</h2>${platformListHtml(info.leaderboards)}<p>这些名称与维度来自该平台当前公开页面/帮助中心；不是我虚构的内部榜单。</p></article>`;
 else if(platformSub==='metrics')html=`<article class="platform-block card" style="grid-column:1/-1"><span class="label">METRICS</span><h2>可用于雷达筛选的指标</h2><div class="chips">${info.metrics.map(m=>`<span class="chip">${esc(m)}</span>`).join('')}</div><p>后续接入实际数据时，优先保留“收益、风险、资金规模、跟随者结果、交易活跃度”这几类可跨平台比较的公共字段。</p></article>`;
 else html=`<article class="platform-block card" style="grid-column:1/-1"><span class="label">OFFICIAL SOURCES</span><h2>官方入口</h2><p>直接跳官方公开页面核对榜单与指标。不同地区可能会因登录或合规限制显示不同内容。</p><div class="source-btns">${info.links.map(([n,u],i)=>`<a class="source-btn ${i?'secondary':''}" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)} ↗</a>`).join('')}</div></article>`;
 $('#platformBody').innerHTML=html;
}
function go(key){
 current=key; $$('.view').forEach(v=>v.classList.remove('active'));
 if(key==='global')$('#globalView').classList.add('active');
 else if(key==='okx'){ $('#okxView').classList.add('active'); ensureData(); }
 else if(key==='watch'){ $('#watchView').classList.add('active'); ensureData().then(renderWatch); }
 else if(key==='alerts'){ $('#alertsView').classList.add('active'); ensureData().then(renderAlerts); }
 else { renderPlatform(key); $('#platformView').classList.add('active'); }
 renderTop(); history.replaceState(null,'','#'+key); window.scrollTo({top:0,behavior:'smooth'});
}

function rankTabs(){
 $('#rankTabs').innerHTML=RANKS.map(r=>`<button class="rank-tab ${r.key===currentRank?'active':''}" data-rank="${r.key}">${r.name}</button>`).join('');
 $$('[data-rank]').forEach(b=>b.onclick=()=>{currentRank=b.dataset.rank;renderLimit=30;rankTabs();renderTraders();});
 const r=RANKS.find(x=>x.key===currentRank); $('#rankExplain').textContent=`${r?.hint||''}${['pnl','roi','drawdown','deep'].includes(currentRank)?` · ${PERIOD_LABEL[currentPeriod]}`:''}`;
}
