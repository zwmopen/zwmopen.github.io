const OKX_MODES=[['copy','带单榜'],['trader','交易员榜']];
let okxMode='copy';

const OKX_TRADER_SNAPSHOT={
  captured:'2026-08-13',
  source:'user-screenshot',
  note:'来自用户提供的 OKX「热门交易员」截图，仅作为站内交易员榜的界面与字段基准；正式数据源仍需从 OKX 公开榜单接口持续采集。',
  sort:'收益额（从高到低）',
  period:'1年',
  rows:[
    {rank:1,name:'十老板',pnl:14813241.79,roi:299.18,win30:57.14,drawdown30:3.27},
    {rank:2,name:'crypto游鱼',pnl:2774765.77,roi:9.09,win30:25.00,drawdown30:0.79},
    {rank:3,name:'YANGMING.C',pnl:null,roi:null,win30:null,drawdown30:null}
  ]
};

function renderOkxModeTabs(){
  const el=document.querySelector('#okxModeTabs');
  if(!el)return;
  el.innerHTML=OKX_MODES.map(([k,n])=>`<button class="platform-subtab ${okxMode===k?'active':''}" data-okx-mode="${k}">${n}</button>`).join('');
  el.querySelectorAll('[data-okx-mode]').forEach(b=>b.onclick=()=>setOkxMode(b.dataset.okxMode));
}
function setOkxMode(mode){
  okxMode=mode;
  document.querySelector('#okxCopyPanel')?.classList.toggle('hidden',mode!=='copy');
  document.querySelector('#okxTraderPanel')?.classList.toggle('hidden',mode!=='trader');
  renderOkxModeTabs();
  if(mode==='copy')ensureData(); else renderOkxTraderBoard();
}
function renderOkxTraderBoard(){
  const root=document.querySelector('#okxTraderPanel'); if(!root)return;
  const s=OKX_TRADER_SNAPSHOT;
  root.innerHTML=`
    <section class="rank-console card">
      <div class="console-row"><span class="console-label">站内交易员榜</span><div class="rank-tabs"><button class="rank-tab active">收益额</button><button class="rank-tab">收益率</button><button class="rank-tab">资产</button></div><select class="period-select"><option>1年</option><option>30天</option><option>7天</option></select></div>
      <div class="console-meta"><span>OKX 普通交易员排行榜 · 与带单榜完全分开</span><span>${s.sort} · ${s.period}</span></div>
    </section>
    <section class="panel card">
      <div class="heading"><div><span class="label">OKX TRADER LEADERBOARD</span><h2>热门交易员</h2></div><p>截图基准 · 正式接口采集中</p></div>
      <div class="trader-list">${s.rows.map(r=>`<article class="trader-card card"><div class="ranknum ${r.rank<=3?'top3':''}">${r.rank}</div><div class="identity"><div class="avatar">${esc(r.name.slice(0,1))}</div><div class="namebox"><div class="name">${esc(r.name)}</div><div class="badges"><span class="badge deep">站内交易员</span></div></div></div><div class="mid"><div class="primary-label">1年收益额</div><div class="primary">${r.pnl==null?'—':money(r.pnl)}</div><div class="subline"><span>收益率 <b>${r.roi==null?'—':pct(r.roi)}</b></span><span>近30天胜率 <b>${r.win30==null?'—':pct(r.win30)}</b></span><span>30天最大回撤 <b>${r.drawdown30==null?'—':pct(r.drawdown30)}</b></span></div></div><div class="side-metrics"><div class="mini"><span>类型</span><b>普通交易员</b></div><div class="mini"><span>带单关系</span><b>无要求</b></div><div class="mini"><span>主页</span><b>待接口解析</b></div></div></article>`).join('')}</div>
      <p class="note">${esc(s.note)} OKX 官方对普通交易员 Leaderboard 的定义包含 Total PnL%、Total PnL、Assets，公开个人页还可展示 Max Drawdown、Win Rate、Profit/Loss Ratio 与公开仓位。这里不会用带单数据冒充普通交易员数据。</p>
      <div class="source-btns"><a class="source-btn secondary" href="https://www.okx.com/en-us/help/whats-leaderboard" target="_blank" rel="noopener">OKX Leaderboard 官方说明 ↗</a></div>
    </section>`;
}

document.addEventListener('DOMContentLoaded',()=>{renderOkxModeTabs();setOkxMode('copy')});
