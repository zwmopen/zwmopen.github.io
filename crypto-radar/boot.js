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
