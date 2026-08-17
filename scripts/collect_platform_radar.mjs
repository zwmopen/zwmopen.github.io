import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {enrichUsersFromDom} from './platform_radar_dom.mjs';

const OUT='crypto-radar/platforms-generated.js';
const NOW=new Date().toISOString();
const targets=[
  ['binance','copy','https://www.binance.com/en/copy-trading'],
  ['bitget','copy','https://www.bitget.com/copy-trading/leaderboard-ranking/futures-pnl'],
  ['bybit','copy','https://www.bybit.com/copyTrade/tradeLink'],
  ['bybit','trader','https://www.bybit.com/en/leaderboard'],
  ['gate','copy','https://www.gate.com/copytrading'],
  ['mexc','copy','https://www.mexc.com/en-GB/futures/copyTrade/leaderRank'],
  ['htx','copy','https://futures.htx.com/zh-cn/copytrading/futures'],
  ['kucoin','copy','https://www.kucoin.com/copy-trading'],
  ['crypto','trader','https://crypto.com/exchange/trading-arena']
];
const NAME_KEYS=['nickName','nickname','traderName','leadTraderName','leadName','userName','username','displayName','name','addressLabel','address'];
const URL_KEYS=['profileUrl','profileURL','shareUrl','jumpUrl','detailUrl','url'];
const FIELD_ALIASES={
  aum:['aum','AUM','copyTradeAum','copyTraderAum','assetsUnderManagement','followAmount','copyAmount'],
  followers:['currentFollowerNum','currentFollowers','followerCount','followers','copyTraderNum','copy_trader_num','currentCopyTraderNum','copierCount','copiers'],
  days:['tradingDays','tradeDays','leadDays','joinedDays','days','leadTradingDays'],
  pnl:['pnl','PNL','totalPnl','totalPNL','profit','profitAmount','income','earnings','totalpl','totalProfit'],
  roi:['roi','ROI','roiRate','profitRate','pnlRatio','returnRate','return','yieldRate'],
  mdd:['mdd','MDD','maxDrawdown','maxDrawdownRate','maximumDrawdown','drawdown'],
  winRate:['winRate','winRatio','winningRate','successRate'],
  followerPnl:['followerPnl','followersPnl','copyPnl','copierPnl','copyTraderPnl','totalFollowerPnl','followerProfit'],
  assets:['assets','totalAssets','totalEquity','traderAssets','marginBalance','walletBalance'],
  volume:['volume','totalVolume','tradingVolume','tradeVolume'],
  trades:['trades','tradeCount','totalTrades','totalTxCnt','tradingOrderNum','orderCount'],
  sharpe:['sharpe','sharpeRatio','sharpRatio'],
  profitShare:['profitShare','profitShareRate','profitSharing','profitSharingRate']
};
function previous(){
  try{const t=fs.readFileSync(OUT,'utf8');const m=t.match(/window\.PLATFORM_GENERATED=(.*);\s*$/s);return m?JSON.parse(m[1]):{generatedAt:null,platforms:{},diagnostics:{}}}catch{return{generatedAt:null,platforms:{},diagnostics:{}}}
}
function num(v){if(v===null||v===undefined||v===''||typeof v==='boolean')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const s=String(v).replace(/[$,%+\s]/g,'').replace(/,/g,'');const x=Number(s);return Number.isFinite(x)?x:null}
function findValue(obj,keys){for(const k of keys){if(Object.prototype.hasOwnProperty.call(obj,k)&&obj[k]!==null&&obj[k]!==undefined&&obj[k]!=='')return obj[k]}return null}
function firstString(obj,keys){const v=findValue(obj,keys);return typeof v==='string'&&v.trim()?v.trim():null}
function normalize(obj,sourceUrl){
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return null;
  const rawName=findValue(obj,NAME_KEYS);let name=typeof rawName==='string'?rawName.trim():null;
  if(!name||name.length<2||name.length>90)return null;
  if(/^https?:\/\//i.test(name))return null;
  const metrics={};for(const [field,aliases] of Object.entries(FIELD_ALIASES)){const v=num(findValue(obj,aliases));if(v!==null)metrics[field]=v}
  const metricCount=Object.keys(metrics).length;if(metricCount<2)return null;
  let profileUrl=firstString(obj,URL_KEYS);if(profileUrl&&profileUrl.startsWith('/')){try{profileUrl=new URL(profileUrl,sourceUrl).href}catch{profileUrl=null}}
  if(profileUrl&&!/^https?:\/\//.test(profileUrl))profileUrl=null;
  const avatarUrl=firstString(obj,['avatarUrl','avatar','avatarURL','portrait','headUrl','profileImage']);
  const id=findValue(obj,['traderId','leadTraderId','userId','uid','id','leaderMark','portfolioId','uniqueCode','uniqueName']);
  return{name,profileUrl,avatarUrl:avatarUrl&&/^https?:\/\//.test(avatarUrl)?avatarUrl:null,rawId:id?String(id):null,metrics,source:'runtime-public'};
}
function walk(node,sourceUrl,out,depth=0){if(depth>12||node===null||node===undefined)return;if(Array.isArray(node)){for(const x of node)walk(x,sourceUrl,out,depth+1);return}if(typeof node!=='object')return;const n=normalize(node,sourceUrl);if(n)out.push(n);for(const v of Object.values(node))if(v&&typeof v==='object')walk(v,sourceUrl,out,depth+1)}
function dedupe(items){const map=new Map();for(const u of items){const key=(u.rawId||u.name).toLowerCase();const old=map.get(key);if(!old||Object.keys(u.metrics).length>Object.keys(old.metrics).length)map.set(key,u)}return[...map.values()].filter(x=>Object.keys(x.metrics).length>=2).slice(0,80)}
async function domAvatarHints(page,sourceUrl){return page.locator('img').evaluateAll((nodes,baseUrl)=>{const metricPattern=/(?:roi|收益|跟单|followers|pnl|drawdown|回撤|交易胜率|trading\s*days)/i,out=[];for(const img of nodes){const raw=img.currentSrc||img.src||img.getAttribute('src')||'',alt=(img.alt||'').toLowerCase();if(!raw||raw.startsWith('data:')||/(?:top trader|logo|decorate|badge|medal|icon|twitter|telegram|discord|instagram|youtube)/i.test(alt))continue;const rect=img.getBoundingClientRect();if(rect.width<32||rect.height<32||rect.width>180||rect.height>180)continue;let card=img.parentElement;while(card&&card!==document.body){const text=(card.innerText||'').trim();if(text.length>=30&&text.length<=2400&&metricPattern.test(text))break;card=card.parentElement}if(!card||card===document.body)continue;let avatarUrl=null;try{avatarUrl=new URL(raw,baseUrl).href}catch{}if(!avatarUrl||!/^https?:\/\//i.test(avatarUrl))continue;const text=(card.innerText||'').trim(),lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean),links=[...card.querySelectorAll('a[href]')].map(a=>{try{return new URL(a.href,baseUrl).href}catch{return null}}).filter(Boolean);out.push({avatarUrl,text,lines,links})}return out},sourceUrl)}
async function scrape(page,key,mode,url){
  const candidates=[];const api=[];const errors=[];
  const onResponse=async r=>{try{const ct=(r.headers()['content-type']||'').toLowerCase();if(!ct.includes('json'))return;if(r.status()<200||r.status()>=400)return;const data=await r.json();const before=candidates.length;walk(data,r.url(),candidates);if(candidates.length>before)api.push(r.url())}catch(e){errors.push(String(e).slice(0,120))}};
  page.on('response',onResponse);
  try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(9000);for(let i=0;i<4;i++){await page.mouse.wheel(0,1200);await page.waitForTimeout(1200)}
    // Parse JSON blobs embedded in the page as an extra fallback.
    const blobs=await page.locator('script').evaluateAll(nodes=>nodes.map(n=>n.textContent||'').filter(t=>t.length>40&&t.length<4_000_000));
    for(const text of blobs){const t=text.trim();if(!(t.startsWith('{')||t.startsWith('[')))continue;try{walk(JSON.parse(t),url,candidates)}catch{}}
  }catch(e){errors.push(`${e.name}: ${e.message}`)}finally{page.off('response',onResponse)}
  const hints=await domAvatarHints(page,url).catch(e=>{errors.push(`dom: ${e.message}`);return[]});
  const users=enrichUsersFromDom(dedupe(candidates),hints);
  return{users,title:`${key} ${mode}`,sourceUrl:url,generatedAt:NOW,apiSources:[...new Set(api)].slice(0,12),domAvatarHints:hints.length,avatarUsers:users.filter(x=>x.avatarUrl).length,profileUsers:users.filter(x=>x.profileUrl).length,errors:errors.slice(0,5)}
}
function findArrays(node,out=[]){if(Array.isArray(node)){if(node.length&&node.every(x=>x&&typeof x==='object'))out.push(node);for(const x of node)findArrays(x,out)}else if(node&&typeof node==='object')for(const v of Object.values(node))findArrays(v,out);return out}
function binanceWeb3(){
  const proc=spawnSync('baw',['leaderboard','query','-c','56','-p','30d','-t','ALL','--page','0','--size','20','--json'],{encoding:'utf8',timeout:120000});
  if(proc.error||proc.status!==0)return{users:[],error:(proc.error?.message||proc.stderr||`exit ${proc.status}`).slice(0,500)};
  try{const raw=JSON.parse(proc.stdout);const arrays=findArrays(raw).sort((a,b)=>b.length-a.length);const source='https://www.binance.com/zh-TC/skills/detail/binance-web3/binance-leaderboard';const users=dedupe((arrays[0]||[]).map(x=>{
      const address=String(x.address||x.walletAddress||x.addr||'').trim();const label=x.addressLabel||x.label||(address?`${address.slice(0,6)}…${address.slice(-4)}`:'');
      return{name:String(label),wallet:address||null,profileUrl:null,rawId:address||null,metrics:{pnl:num(x.realizedPnl??x.pnl),roi:num(x.realizedPnlPercent??x.pnlPercent??x.roi),winRate:num(x.winRate),volume:num(x.totalVolume),trades:num(x.totalTxCnt??x.tradeCount)},source:'binance-public-endpoint'}
    }).filter(x=>x.name&&Object.values(x.metrics).filter(v=>v!==null).length>=2));return{users,sourceUrl:source,generatedAt:NOW}}
  catch(e){return{users:[],error:`parse: ${e.message}`}}
}
const out=previous();out.generatedAt=NOW;out.platforms=out.platforms||{};out.diagnostics=out.diagnostics||{};
const browser=await chromium.launch({headless:true});const context=await browser.newContext({locale:'en-US',viewport:{width:1440,height:1000},userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36'});
for(const [key,mode,url] of targets){const page=await context.newPage();const k=`${key}:${mode}`;try{const result=await scrape(page,key,mode,url);out.diagnostics[k]={at:NOW,found:result.users.length,apiSources:result.apiSources,domAvatarHints:result.domAvatarHints,avatarUsers:result.avatarUsers,profileUsers:result.profileUsers,error:result.errors.join(' | ')||null};if(result.users.length>=3){out.platforms[key]=out.platforms[key]||{};out.platforms[key][mode]=result;console.log(k,'updated',result.users.length,'avatars',result.avatarUsers,'profiles',result.profileUsers)}else console.log(k,'kept previous; candidates',result.users.length)}finally{await page.close()}}
await browser.close();
const web3=binanceWeb3();out.diagnostics['binance:trader']={at:NOW,found:web3.users.length,error:web3.error||null};if(web3.users.length>=3){out.platforms.binance=out.platforms.binance||{};out.platforms.binance.trader={title:'Binance Web3 链上交易员榜',period:'30D',...web3};console.log('binance:trader updated',web3.users.length)}
fs.writeFileSync(OUT,`// Auto-generated public leaderboard snapshot.\nwindow.PLATFORM_GENERATED=${JSON.stringify(out,null,2)};\n`,'utf8');
console.log('written',OUT,OUT.length,'at',NOW);
