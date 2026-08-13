import fs from 'node:fs';

const path='crypto-radar/platforms-generated.js';
const text=fs.readFileSync(path,'utf8');
const match=text.match(/window\.PLATFORM_GENERATED=(.*);\s*$/s);
if(!match) throw new Error('invalid platform generated file');
const data=JSON.parse(match[1]);
const now=new Date().toISOString();

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
fs.writeFileSync(path,`// Auto-generated public leaderboard snapshot.\nwindow.PLATFORM_GENERATED=${JSON.stringify(data,null,2)};\n`,'utf8');
console.log('postprocessed platform radar',now);
