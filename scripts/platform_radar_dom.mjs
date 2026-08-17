function compact(value){return String(value||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'')}

export function enrichUsersFromDom(users,hints){
  const used=new Set();
  for(const user of users){
    const terms=[user.name,user.rawId].filter(x=>String(x||'').length>=4).map(x=>({raw:String(x).toLowerCase(),compact:compact(x)}));
    let best=null,bestScore=0;
    for(let i=0;i<hints.length;i++){
      if(used.has(i))continue;
      const hint=hints[i],text=String(hint.text||'').toLowerCase(),compactText=compact(hint.text),score=Math.max(...terms.map(t=>{
        if(text.includes(t.raw))return 10;
        if(t.compact&&compactText.includes(t.compact))return 7;
        return 0;
      }),0);
      if(score>bestScore){bestScore=score;best={index:i,hint}}
    }
    if(!best)continue;
    used.add(best.index);
    if(!user.avatarUrl&&best.hint.avatarUrl){user.avatarUrl=best.hint.avatarUrl;user.avatarSource='official-rendered-card'}
    if(!user.profileUrl&&best.hint.links?.[0])user.profileUrl=best.hint.links[0]
  }
  return users;
}
