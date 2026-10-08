import type { Check, Group, Thesis } from './types';

const months = 'january february march april may june july august september october november december'.split(' ');
const numbers: Record<string, number> = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12 };
const number = (s:string) => numbers[s.toLowerCase()] ?? Number(s);
const endOfMonth = (year:number, month:number) => new Date(Date.UTC(year,month+1,0,23,59,59,999));
const endOfDay = (year:number, month:number, day:number) => new Date(Date.UTC(year,month,day,23,59,59,999));

// Only deadline phrases count in a claim. A dated historical comparison is not a deadline.
export function parseWindow(text:string, createdAt:string, field=false):Date|null {
 const anchor = new Date(createdAt);
 if(!text || Number.isNaN(anchor.getTime())) return null;
 const s=text.replace(/[–—]/g,'-');
 const candidates:Date[]=[];
 const dateText=field?s:[...s.matchAll(/\b(?:by|through|until|before|during|in|as of|at the end of|over)\s+([^.;\n]+)/gi)].map(m=>m[1]).join(' ');
 for(const m of dateText.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g))candidates.push(endOfDay(+m[1],+m[2]-1,+m[3]));
 const monthPattern=months.map(m=>m.slice(0,3)+'(?:'+m.slice(3)+')?').join('|');
 for(const m of dateText.matchAll(new RegExp('\\b('+monthPattern+')\\.?\\s+(?:(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+)?(20\\d{2})\\b','gi'))){if(/\d{1,2}(?:st|nd|rd|th)?\s+$/.test(dateText.slice(0,m.index)))continue;const month=months.findIndex(n=>n.startsWith(m[1].toLowerCase().replace('.','')));candidates.push(m[2]?endOfDay(+m[3],month,+m[2]):endOfMonth(+m[3],month));}
 for(const m of dateText.matchAll(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+('+monthPattern+')\\.?\\s+(20\\d{2})\\b','gi'))){candidates.push(endOfDay(+m[3],months.findIndex(n=>n.startsWith(m[2].toLowerCase())),+m[1]));}
 for(const m of dateText.matchAll(/\bQ([1-4])\s*(20\d{2})\b/gi))candidates.push(endOfMonth(+m[2],+m[1]*3-1));
 for(const m of dateText.matchAll(/\b(?:end[ -]of[ -]|end[ -])?(20\d{2})\b/g)){
  if(!candidates.length)candidates.push(endOfMonth(+m[1],11));
 }
 // Relative windows are anchored to submission, never to each new research run.
 const relative=s.match(/(?:\bnext\s+|\bwithin\s+|\bover\s+(?:the\s+)?|^)(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s*-\s*(\d+|one|two|three|four|five|six))?\s+(days?|weeks?|months?|years?|monthly\s+releases?|quarterly\s+(?:releases?|earnings)|earnings\s+releases?)/i);
 if(relative){const count=number(relative[2]||relative[1]),unit=relative[3].toLowerCase(),d=new Date(anchor);if(unit.startsWith('day'))d.setUTCDate(d.getUTCDate()+count);else if(unit.startsWith('week'))d.setUTCDate(d.getUTCDate()+7*count);else d.setUTCMonth(d.getUTCMonth()+count*(unit.startsWith('year')?12:unit.startsWith('quarter')||unit.startsWith('earnings')?3:1));candidates.push(d);}
 return candidates.length?new Date(Math.max(...candidates.map(d=>d.getTime()))):null;
}
export function checkDeadline(t:Pick<Thesis,'horizon'|'createdAt'>,g:Group,c:Check):Date|null {
 const explicit=parseWindow(c.deadline,t.createdAt,true)||parseWindow(c.label,t.createdAt);
 if(explicit)return explicit;
 if(g.window){const window=parseWindow(g.window,t.createdAt,true);if(window)return window;}
 // Historical/current observations can be checked now even if the trade lasts months.
 if(/\b(latest|currently|current|past|previous|last|has (?:already )?(?:published|announced)|since)\b/i.test(c.label))return null;
 if(/\b(will|next|upcoming|over the thesis|through the thesis|by the end)\b/i.test(c.label))return parseWindow(t.horizon,t.createdAt,true);
 return null;
}
export function timingGuard(t:Pick<Thesis,'horizon'|'createdAt'>,g:Group,c:Check,asOf:string){
 const deadline=checkDeadline(t,g,c);
 if(deadline && new Date(asOf).getTime()<=deadline.getTime())return {status:'pending' as const,explanation:`Pending until ${deadline.toISOString().slice(0,10)}. The observation window has not ended. Forecasts and earlier releases do not establish this outcome.`};
 return null;
}
export function correctLegacyTiming(t:Thesis):Thesis {
 return {...t,groups:t.groups.map(g=>({...g,checks:g.checks.map(c=>{
  if(c.type==='manual')return c;
  const guard=timingGuard(t,g,c,c.evaluatedAt||new Date().toISOString());
  return guard?{...c,...guard}:c;
 })}))};
}
