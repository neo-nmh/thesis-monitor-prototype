import type { CheckStatus, GroupKind, Thesis } from './types';

export type CheckColor = 'green' | 'red' | 'yellow' | 'grey';
export function checkDisplay(status:CheckStatus,kind:GroupKind,researched=false){
 const adverse=kind==='risk'||kind==='invalidation';
 const color:CheckColor=status==='pending'?'grey':status==='unclear'?'yellow':(status==='true')!==adverse?'green':'red';
 const label=status==='pending'?(researched?'Pending':'Not researched yet'):status==='unclear'?'Unclear':status==='true'?(adverse?'Adverse condition verified':'Verified'):(adverse?'Adverse condition contradicted':'False');
 return {color,label,symbol:status==='true'?'tick':status==='false'?'cross':status==='unclear'||researched?'minus':'empty'};
}

export function checklistDistribution(t:Thesis){
 const counts:Record<CheckColor,number>={green:0,red:0,yellow:0,grey:0};
 for(const g of t.groups)for(const c of g.checks)counts[checkDisplay(c.status,g.kind).color]++;
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 const parts=(Object.keys(counts) as CheckColor[]).map(color=>({color,count:counts[color],percent:total?counts[color]/total*100:0}));
 // Keep accessible percentage descriptions at exactly 100%.
 const rounded=parts.map(p=>Math.floor(p.percent));
 if(total){
  const order=parts.map((p,i)=>({i,remainder:p.percent-rounded[i]})).sort((a,b)=>b.remainder-a.remainder);
  const missing=100-rounded.reduce((a,b)=>a+b,0);
  for(let i=0;i<missing;i++)rounded[order[i].i]++;
 }
 return parts.map((p,i)=>({...p,rounded:rounded[i]}));
}
