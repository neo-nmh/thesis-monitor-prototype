import type { Thesis } from './types';
import { MODEL, object, string } from './research.ts';
import { monitorSummaryPrompt } from './prompts/monitor-summary.ts';
import { checklistDistribution } from './check-display.ts';
import { checkDeadline, timingGuard } from './timing.ts';
import { checkDisplay } from './check-display.ts';
import { summarySentence } from './summary-text.ts';

export function summaryChecklist(t:Thesis,asOf:string){
 return t.groups.map(g=>({kind:g.kind,argument:g.claim,window:g.window,checks:g.checks.map(c=>({
  statement:c.label,status:c.status,checkedAt:c.evaluatedAt??null,
  researchState:!c.evaluatedAt?'not_researched':c.status==='pending'?(timingGuard(t,g,c,asOf)?'future_observation':'unresolved_outcome'):c.status==='unclear'?'insufficient_evidence':'assessed',
  deadline:checkDeadline(t,g,c)?.toISOString()||c.deadline,explanation:c.explanation,
  evidence:c.evidence.map(e=>({observation:e.observation,publishedAt:e.publishedAt})),
 }))}));
}

export function summaryRequest(t:Thesis,asOf=new Date().toISOString()){
 const cards=summaryChecklist(t,asOf);
 return {model:MODEL,store:false,reasoning:{effort:'low'},max_output_tokens:2400,
  instructions:monitorSummaryPrompt,
  input:JSON.stringify({asOf,title:t.title,originalThesis:t.summary,instrument:t.instrument,direction:t.direction,horizon:t.horizon,
   reviewedChecks:cards.flatMap(card=>card.checks.filter(c=>c.checkedAt).map(c=>({...c,cardKind:card.kind,impact:checkDisplay(c.status,card.kind).color==='green'?'supports thesis':checkDisplay(c.status,card.kind).color==='red'?'challenges thesis':'unresolved'}))),
   cardsNeedingResearch:cards.filter(card=>card.checks.some(c=>!c.checkedAt)).map(card=>({kind:card.kind,unreviewedChecks:card.checks.filter(c=>!c.checkedAt).length})),
  }),
  text:{format:{type:'json_schema',name:'monitor_summary',strict:true,schema:object({summary:string})}},
 };
}
export function parseSummary(raw:any){
 if(raw.status!=='completed')throw new Error('Summary did not finish.');
 const text=(raw.output??[]).flatMap((x:any)=>x.content??[]).filter((p:any)=>p.type==='output_text').map((p:any)=>p.text).join('');
 const value=JSON.parse(text).summary;
 if(typeof value!=='string'||!value.trim()||value.trim().split(/\s+/).length>50)throw new Error('Invalid summary.');
 return summarySentence(value);
}
// If synthesis fails, retain completed research and show a fresh, factual fallback.
export function fallbackSummary(t:Thesis){
 const parts=Object.fromEntries(checklistDistribution(t).map(p=>[p.color,p.count]));
 const opening=parts.green&&parts.red?'The researched checks show mixed evidence for the thesis':parts.red?'The researched checks challenge the thesis':parts.green?'The resolved checks support the thesis so far':'The checklist does not yet establish whether the thesis is playing out';
 const checks=t.groups.flatMap(g=>g.checks),unresolved=[];
 if(checks.some(c=>c.status==='pending'&&c.evaluatedAt))unresolved.push('pending outcomes');
 if(parts.yellow)unresolved.push('unclear evidence');
 if(checks.some(c=>!c.evaluatedAt))unresolved.push('unresearched checks');
 return opening+(unresolved.length?`, with ${unresolved.join(' and ')} remaining.`:'.');
}
