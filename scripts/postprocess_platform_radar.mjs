import fs from 'node:fs';

const dataPath='crypto-radar/platforms-generated.js';
const historyPath='crypto-radar/platform-history.js';
const text=fs.readFileSync(dataPath,'utf8');
const match=text.match(/window\.PLATFORM_GENERATED=(.*);\s*$/s);
if(!match) throw new Error('invalid platform generated file');
const data=JSON.parse(match[1]);
const now=new Date().toISOString();

function loadHistory(){
  try{
    const src=fs.readFileSync(historyPath,'utf8');
    const m=src.match(/window\.PLATFORM_HISTORY=(.*);\s*$/s);
    return m?JSON.parse(m[1]):{updatedAt:null,series:{}};
  }catch{return{updatedAt:null,series:{}}}
}
function idFor(user){
  return String(user?.rawId||user?.wallet||user?.name||'unknown').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff._:-]+/g,'_').slice(0,120);
}
function cleanMetrics(metrics={}){
  const out={};
  for(const [k,v] of Object.entries(metrics)){
    const n=Number(v);
    if(Number.isFinite(n))out[k]=Math.round(n*1e8)/1e8;
  }
  return out;
}
function ingest(history,snapshot,at){
  if(!at||!Number.isFinite(Date.parse(at)))return;
  history.series=history.series||{};
  for(const [platform,modes] of Object.entries(snapshot.platforms||{})){
    for(const [mode,board] of Object.entries(modes||{})){
      if(!Array.isArray(board?.users))continue;
      for(const user of board.users){
        const metrics=cleanMetrics(user.metrics);
        if(!Object.keys(metrics).length)continue;
        const key=`${platform}:${mode}:${idFor(user)}`;
        const bucket=history.series[key]||(history.series[key]={name:user.name||null,platform,mode,raw:[],daily:[]});
        bucket.name=user.name||bucket.name||null;
        const point={at,metrics};
        const raw=bucket.raw||(bucket.raw=[]);
        const lastRaw=raw.at(-1);
        if(!lastRaw||Math.abs(Date.parse(at)-Date.parse(lastRaw.at))>=3*3600e3) raw.push(point); else raw[raw.length-1]=point;
        bucket.raw=raw.slice(-140);
        const day=at.slice(0,10),daily=bucket.daily||(bucket.daily=[]),lastDaily=daily.at(-1);
        if(lastDaily?.at?.slice(0,10)===day) daily[daily.length-1]=point; else daily.push(point);
        bucket.daily=daily.slice(-400);
      }
    }
  }
  history.updatedAt=at;
}

const history=loadHistory();
if(data.generatedAt) ingest(history,data,data.generatedAt);

for(const key of ['mexc','htx']){
  const board=data.platforms?.[key]?.copy;
  if(!board||board.percentNormalized) continue;
  for(const user of board.users||[]){
    for(const field of ['roi','mdd','winRate']){
      const value=Number(user.metrics?.[field]);
      if(Number.isFinite(value)) user.metrics[field]=Math.round(value*100*1e6)/1e6;
    }
  }
  board.percentNormalized=true;
  board.metricUnit='percentage-normalized';
}

async function binanceWeb3(){
  const params=new URLSearchParams({chainId:'56',period:'30d',tag:'ALL',pageNo:'1',pageSize:'25'});
  const endpoint=`https://web3.binance.com/bapi/defi/v1/public/wallet-direct/market/leaderboard/query/ai?${params}`;
  const res=await fetch(endpoint,{headers:{'Accept-Encoding':'identity','User-Agent':'binance-web3/3.0 (Crypto Radar)'}});
  const body=await res.json();
  if(!res.ok||String(body.code||'000000')!=='000000') throw new Error(`Binance Web3 ${res.status}/${body.code||'unknown'}`);
  const rows=body?.data?.data||[];
  return rows.map(item=>{
    const address=String(item.address||'').trim();
    const name=String(item.addressLabel||item.label||(address?`${address.slice(0,6)}…${address.slice(-4)}`:'')).trim();
    const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
    const metrics={pnl:num(item.realizedPnl),roi:num(item.realizedPnlPercent),winRate:num(item.winRate),volume:num(item.totalVolume),trades:num(item.totalTxCnt),assets:num(item.balance)};
    Object.keys(metrics).forEach(k=>metrics[k]===null&&delete metrics[k]);
    return {name,wallet:address||null,avatarUrl:item.addressLogo||null,rawId:address||null,profileUrl:null,metrics,source:'binance-official-web3'};
  }).filter(x=>x.name&&Object.keys(x.metrics).length>=2);
}

try{
  const users=await binanceWeb3();
  data.diagnostics=data.diagnostics||{};
  data.diagnostics['binance:trader']={at:now,found:users.length,error:null,source:'official-web3-public-endpoint'};
  if(users.length>=3){
    data.platforms.binance=data.platforms.binance||{};
    data.platforms.binance.trader={title:'Binance Web3 链上交易员榜',period:'30D',sourceUrl:'https://www.binance.com/zh-TC/skills/detail/binance-web3/crypto-market-rank',generatedAt:now,users};
  }
}catch(error){
  data.diagnostics=data.diagnostics||{};
  data.diagnostics['binance:trader']={at:now,found:0,error:String(error)};
}

data.generatedAt=now;
ingest(history,data,now);
fs.writeFileSync(dataPath,`// Auto-generated public leaderboard snapshot.\nwindow.PLATFORM_GENERATED=${JSON.stringify(data,null,2)};\n`,'utf8');
fs.writeFileSync(historyPath,`// Auto-generated historical public snapshots. Missing points are never interpolated.\nwindow.PLATFORM_HISTORY=${JSON.stringify(history,null,2)};\n`,'utf8');
console.log('postprocessed platform radar',now,'history series',Object.keys(history.series||{}).length);
