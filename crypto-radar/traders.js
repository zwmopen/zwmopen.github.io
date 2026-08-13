function metricFor(t,kind,period=currentPeriod){
 const m=t.metrics||{}, pm=t.period_metrics?.[period]||{};
 if(kind==='pnl') return Number(pm.pnl_usd ?? (period==='year'?m.pnl_usd:NaN));
 if(kind==='roi') return Number(pm.roi_pct ?? (period==='year'?m.roi_pct:NaN));
 if(kind==='drawdown') return Number(pm.max_drawdown_pct ?? (period==='year'?m.max_drawdown_pct:NaN));
 return NaN;
}
function hotCompare(a,b){
 const A=[a.metrics?.aum_usd||0,a.metrics?.followers||0,a.metrics?.lead_days||0],B=[b.metrics?.aum_usd||0,b.metrics?.followers||0,b.metrics?.lead_days||0];
 for(let i=0;i<A.length;i++)if(A[i]!==B[i])return B[i]-A[i]; return 0;
}
function valueForSort(t){
 const m=t.metrics||{};
 if(currentRank==='pnl'||currentRank==='deep') return metricFor(t,'pnl');
 if(currentRank==='roi') return metricFor(t,'roi');
 if(currentRank==='aum') return Number(m.aum_usd||0);
 if(currentRank==='followers') return Number(m.followers||0);
 if(currentRank==='days') return Number(m.lead_days||0);
 if(currentRank==='drawdown') return metricFor(t,'drawdown');
 if(currentRank==='flow') return Number(t.changes?.['30d']?.estimated_net_flow_usd ?? NaN);
 if(currentRank==='risk') return ALERT_WEIGHT[t.alert_level]||0;
 return 0;
}
function sortedTraders(){
 let list=traders.filter(t=>{
   if(currentRank==='deep'&&!t.is_deep)return false;
   const text=`${t.name||''} ${t.unique_code||''}`.toLowerCase();
   if(query&&!text.includes(query.toLowerCase()))return false;
   if(['pnl','roi','drawdown','deep'].includes(currentRank) && !Number.isFinite(valueForSort(t)))return false;
   if(currentRank==='flow'&&!Number.isFinite(valueForSort(t)))return false;
   return true;
 });
 if(currentRank==='hot') list.sort(hotCompare);
 else if(currentRank==='drawdown') list.sort((a,b)=>{
   const A=valueForSort(a),B=valueForSort(b); if(!Number.isFinite(A))return 1;if(!Number.isFinite(B))return-1; return A-B;
 });
 else if(currentRank==='risk') list.sort((a,b)=>valueForSort(b)-valueForSort(a)||hotCompare(a,b));
 else list.sort((a,b)=>{
   const A=valueForSort(a),B=valueForSort(b); if(!Number.isFinite(A))return 1;if(!Number.isFinite(B))return-1; return B-A;
 });
 return list;
}
function periodSeries(t,period=currentPeriod){
 let raw=period==='week'?(t.weekly_roi_series||[]):(t.roi_series||[]);
 let arr=raw.map((x,i)=>({time:x.time?Date.parse(x.time):NaN,value:Number(x.roi_pct),i})).filter(x=>Number.isFinite(x.value)).sort((a,b)=>(Number.isFinite(a.time)?a.time:a.i)-(Number.isFinite(b.time)?b.time:b.i));
 if(period==='day')return arr.slice(-2);
 if(period==='week')return arr.slice(-8);
 const span=period==='month'?30:365, timed=arr.filter(x=>Number.isFinite(x.time));
 if(!timed.length)return arr.slice(-60);
 const cutoff=timed.at(-1).time-span*86400000; return timed.filter(x=>x.time>=cutoff).slice(-80);
}
function sparkline(t,period=currentPeriod){
 const s=periodSeries(t,period); if(s.length<2)return'<div class="spark-empty">暂无该周期曲线</div>';
 const vals=s.map(x=>x.value),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1,w=320,h=52,pad=3;
 const pts=vals.map((v,i)=>`${pad+(w-pad*2)*(i/(vals.length-1))},${h-pad-(h-pad*2)*((v-min)/span)}`).join(' ');
 const end=vals.at(-1),cls=end<0?'var(--red)':'var(--green)';
 return`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${cls}" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>`;
}
function primaryDisplay(t,period=currentPeriod){
 const m=t.metrics||{};
 let v=valueForSort(t);
 if((currentRank==='pnl'||currentRank==='deep')&&period!==currentPeriod)v=metricFor(t,'pnl',period);
 if(currentRank==='roi'&&period!==currentPeriod)v=metricFor(t,'roi',period);
 if(currentRank==='drawdown'&&period!==currentPeriod)v=metricFor(t,'drawdown',period);
 if(currentRank==='pnl'||currentRank==='deep')return{label:`${PERIOD_LABEL[period]}收益额`,value:money(v),neg:v<0};
 if(currentRank==='roi')return{label:`${PERIOD_LABEL[period]}收益率`,value:pct(v),neg:v<0};
 if(currentRank==='aum')return{label:'带单规模',value:compactMoney(v),neg:false};
 if(currentRank==='followers')return{label:'当前跟单人数',value:num(v),neg:false};
 if(currentRank==='days')return{label:'带单天数',value:`${num(v)} 天`,neg:false};
 if(currentRank==='drawdown')return{label:`${PERIOD_LABEL[period]}最大回撤`,value:pct(v),neg:false};
 if(currentRank==='flow')return{label:'近30天估算净流入',value:compactMoney(v),neg:v<0};
 if(currentRank==='risk')return{label:'风险等级',value:(t.alert_level||'none').toUpperCase(),neg:t.alert_level==='high'};
 return{label:'综合排名',value:compactMoney(m.aum_usd),neg:false};
}
function alertBadge(t){
 const a=t.alert_level||'none'; if(a==='high')return'<span class="badge warn">高风险</span>'; if(a==='medium')return'<span class="badge warn">中风险</span>'; if(a==='low')return'<span class="badge good">低风险</span>'; return'';
}
function avatar(t){
 const letter=esc((t.name||'?').slice(0,1));
 return t.avatar_url?`<img class="avatar" src="${esc(t.avatar_url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=avatar>${letter}</div>'">`:`<div class="avatar">${letter}</div>`;
}
function watchIds(){try{return new Set(JSON.parse(localStorage.getItem('crypto-radar-watch')||'[]').map(String))}catch(e){return new Set()}}
function saveWatch(set){localStorage.setItem('crypto-radar-watch',JSON.stringify([...set]))}
function toggleWatch(id){
 const set=watchIds(),k=String(id); set.has(k)?set.delete(k):set.add(k); saveWatch(set); renderTraders(); if(current==='watch')renderWatch();
}
function cardHtml(t,index){
 const m=t.metrics||{},period=cardPeriods.get(String(t.id))||currentPeriod,p=primaryDisplay(t,period),watched=watchIds().has(String(t.id)),badges=[t.is_deep?'<span class="badge deep">深度数据</span>':'',t.is_curve_full?'<span class="badge good">周期曲线</span>':'',alertBadge(t)].filter(Boolean).join('');
 const pm=t.period_metrics?.[period]||{}, roi=pm.roi_pct ?? (period==='year'?m.roi_pct:null), pnl=pm.pnl_usd ?? (period==='year'?m.pnl_usd:null), dd=pm.max_drawdown_pct ?? (period==='year'?m.max_drawdown_pct:null);
 const periods=[['year','年'],['month','月'],['week','周'],['day','日']].map(([k,n])=>`<button class="period-btn ${period===k?'active':''}" data-card-period="${k}" data-card-id="${esc(t.id)}">${n}</button>`).join('');
 return`<article class="trader-card card" data-id="${esc(t.id)}"><div class="ranknum ${index<3?'top3':''}">${index+1}</div><div class="identity">${avatar(t)}<div class="namebox"><div class="name">${esc(t.name)}</div><div class="badges">${badges}</div></div></div><div class="mid"><div class="primary-label">${p.label}</div><div class="primary ${p.neg?'neg':''}">${p.value}</div><div class="subline"><span>收益率 <b>${pct(roi)}</b></span><span>收益额 <b>${compactMoney(pnl)}</b></span><span>回撤 <b>${pct(dd)}</b></span><span>AUM <b>${compactMoney(m.aum_usd)}</b></span><span>跟单 <b>${num(m.followers)}</b></span><span>带单 <b>${num(m.lead_days)}天</b></span></div><div class="chart-link" data-chart-id="${esc(t.id)}" data-chart-period="${period}"><div class="sparkbox">${sparkline(t,period)}</div><div class="periods">${periods}</div><div class="chart-tip">点曲线进入详细图表 ↗</div></div></div><div class="side-metrics"><div class="mini"><span>当前跟单</span><b>${num(m.followers)}</b></div><div class="mini"><span>带单规模</span><b>${compactMoney(m.aum_usd)}</b></div><div class="mini"><span>近30天净流入</span><b>${compactMoney(t.changes?.['30d']?.estimated_net_flow_usd)}</b></div></div><div class="actions"><button class="star ${watched?'on':''}" data-watch="${esc(t.id)}" title="自选">${watched?'★':'☆'}</button>${t.profile_url?`<a class="profile" href="${esc(t.profile_url)}" target="_blank" rel="noopener" title="打开主页">↗</a>`:''}</div></article>`;
}
function bindTraderActions(scope=document){scope.querySelectorAll('[data-watch]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();toggleWatch(b.dataset.watch)});scope.querySelectorAll('[data-card-period]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();cardPeriods.set(String(b.dataset.cardId),b.dataset.cardPeriod);renderTraders();if(current==='watch')renderWatch()});scope.querySelectorAll('[data-chart-id]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-card-period]'))return;const id=el.dataset.chartId,period=cardPeriods.get(String(id))||el.dataset.chartPeriod||currentPeriod;location.href=`../trader-radar/chart.html?id=${encodeURIComponent(id)}&period=${encodeURIComponent(period)}`});}

function renderTraders(){
 if(!loaded)return;
 rankTabs();
 const list=sortedTraders(), visible=list.slice(0,renderLimit);
 $('#traderList').innerHTML=visible.length?visible.map(cardHtml).join(''):'<div class="empty card"><b>没有匹配结果</b><span>换一个排行榜、周期或搜索词。</span></div>';
 $('#loadMore').hidden=renderLimit>=list.length; $('#loadMore').textContent=`继续加载（${Math.min(30,list.length-renderLimit)}）`;
 bindTraderActions($('#traderList'));
 const r=RANKS.find(x=>x.key===currentRank); $('#okxMeta').textContent=`${payload.generated_at?`数据更新 ${new Date(payload.generated_at).toLocaleString('zh-CN')} · `:''}当前榜 ${list.length} 人 · 展示 ${visible.length} 人`;
 $('#rankExplain').textContent=`${r?.hint||''}${['pnl','roi','drawdown','deep'].includes(currentRank)?` · ${PERIOD_LABEL[currentPeriod]}`:''}`;
}
function renderWatch(){
 if(!loaded)return;
 const ids=watchIds(), list=traders.filter(t=>ids.has(String(t.id))).sort(hotCompare);
 $('#watchList').innerHTML=list.length?list.map(cardHtml).join(''):'<div class="empty card"><b>自选还是空的</b><span>去 OKX 排行榜点 ☆ 加入观察。</span></div>';
 bindTraderActions($('#watchList'));
}
function renderAlerts(){
 if(!loaded)return;
 const list=traders.filter(t=>t.alerts?.length).sort((a,b)=>(ALERT_WEIGHT[b.alert_level]||0)-(ALERT_WEIGHT[a.alert_level]||0)||hotCompare(a,b));
 $('#alertList').innerHTML=list.length?list.slice(0,100).map(t=>{
   const m=t.metrics||{},level=t.alert_level||'low',msgs=(t.alerts||[]).slice(0,4).map(a=>a.message).join('；');
   return`<article class="alert-row card"><div class="severity"><span class="dot ${level}"></span>${level==='high'?'高风险':level==='medium'?'中风险':'低风险'}</div><div><div class="alert-name">${esc(t.name)}</div><div class="alert-msg">${esc(msgs)}</div></div><div class="alert-side"><b>${compactMoney(m.aum_usd)}</b>跟单 ${num(m.followers)} · 带单 ${num(m.lead_days)}天</div></article>`
 }).join(''):'<div class="empty card"><b>当前没有预警</b></div>';
}
