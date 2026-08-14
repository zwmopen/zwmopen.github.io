if(!document.querySelector('link[rel="icon"]')){const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href='./favicon.svg';document.head.appendChild(icon)}
async function ensureData(){
 if(loaded)return;
 try{
   const stamp=Date.now(), [r1,r2]=await Promise.all([
     fetch(`../trader-radar/data/traders.json?t=${stamp}`,{cache:'no-store'}),
     fetch(`../trader-radar/data/changes.json?t=${stamp}`,{cache:'no-store'})
   ]);
   if(!r1.ok)throw Error(`traders HTTP ${r1.status}`);
   payload=await r1.json(); traders=payload.traders||[];
   if(r2.ok){changes=await r2.json(); for(const t of traders)t.changes=changes.traders?.[t.unique_code]||t.changes||{}}
   loaded=true; renderTraders(); if(current==='watch')renderWatch(); if(current==='alerts')renderAlerts();
 }catch(e){
   $('#okxMeta').textContent=`数据读取失败：${e.message}`;
   $('#traderList').innerHTML='<div class="empty card"><b>OKX 数据读取失败</b><span>稍后刷新或打开独立雷达。</span></div>';
 }
}
$('#periodSelect').onchange=e=>{currentPeriod=e.target.value;cardPeriods.clear();renderLimit=30;renderTraders()};
$('#traderSearch').oninput=e=>{query=e.target.value.trim();renderLimit=30;renderTraders()};
$('#loadMore').onclick=()=>{renderLimit+=30;renderTraders()};
renderExchangeRows();renderTop();rankTabs();
const initial=location.hash.slice(1);go(TOP.some(x=>x.key===initial)?initial:'global');

// Keep every exchange visually and behaviorally aligned with the OKX mother template.
const alignedPeriodInit=new Set();
function alignPlatformPeriodControls(){
 if(['global','okx','watch','alerts'].includes(current))return;
 const body=document.getElementById('platformBody'), select=body?.querySelector('[data-v3-period]');
 if(!body||!select)return;
 if(!alignedPeriodInit.has(current)){
   alignedPeriodInit.add(current);
   if(select.value!=='year'){
     select.value='year';
     select.dispatchEvent(new Event('change',{bubbles:true}));
     return;
   }
 }
 const names={year:'年',month:'月',week:'周',day:'日'};
 body.querySelectorAll('.v3-chart').forEach(chart=>{
   if(chart.querySelector('.periods'))return;
   const periods=document.createElement('div');periods.className='periods';
   ['year','month','week','day'].forEach(key=>{
     const btn=document.createElement('button');
     btn.className=`period-btn ${select.value===key?'active':''}`;
     btn.textContent=names[key];
     btn.type='button';
     btn.onclick=e=>{
       e.preventDefault();e.stopPropagation();
       const liveSelect=document.querySelector('#platformBody [data-v3-period]');
       if(!liveSelect)return;
       liveSelect.value=key;
       liveSelect.dispatchEvent(new Event('change',{bubbles:true}));
     };
     periods.appendChild(btn);
   });
   const tip=document.createElement('div');tip.className='chart-tip';tip.textContent='年 / 月 / 周 / 日 · 真实快照曲线';
   chart.append(periods,tip);
 });
}
const platformBody=document.getElementById('platformBody');
if(platformBody){
 new MutationObserver(()=>requestAnimationFrame(alignPlatformPeriodControls)).observe(platformBody,{childList:true,subtree:true});
 requestAnimationFrame(alignPlatformPeriodControls);
}
