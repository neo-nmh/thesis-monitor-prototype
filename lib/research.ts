import { cardPrompts } from './prompts/index.ts';
import { scopeToCard } from './card-research.ts';
import type { CheckStatus, Evidence, Review, Thesis, ResearchProgress } from './types';
import { timingGuard, checkDeadline } from './timing.ts';
import { z } from 'zod';
export const MODEL='gpt-5-nano';
const evidenceSchema=z.object({title:z.string(),url:z.string(),publisher:z.string(),publishedAt:z.string().nullable(),observation:z.string()});
const checkResultSchema=z.object({status:z.enum(['pending','true','false','unclear']),explanation:z.string(),evidence:z.array(evidenceSchema)}).strict();
export const reviewSchema=z.object({checks:z.record(checkResultSchema)}).strict();
export const string={type:'string'};
export const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const checkOutputSchema=object({status:{type:'string',enum:['pending','true','false','unclear']},explanation:string,evidence:{type:'array',items:object({title:string,url:string,publisher:string,publishedAt:{type:['string','null']},observation:string})}});
// Required object keys enforce one result per exact ID; an array cannot enforce this.
export const outputSchema=(ids:string[])=>object({checks:object(Object.fromEntries(ids.map(id=>[id,checkOutputSchema])))});
export function researchRequest(fullThesis:Thesis,groupId:string,asOf=new Date().toISOString()){
 const thesis=scopeToCard(fullThesis,groupId);
 const checks=thesis.groups.flatMap(g=>g.checks.filter(c=>c.type!=='manual').map(c=>({id:c.id,label:c.label,type:c.type,deadline:checkDeadline(thesis,g,c)?.toISOString()||c.deadline,pendingRequired:!!timingGuard(thesis,g,c,asOf),groupKind:g.kind,argument:g.claim,context:g.context,window:g.window,marketView:g.marketView,variantView:g.variantView})));
 return {model:MODEL,store:false,reasoning:{effort:'low',summary:'auto'},max_output_tokens:8000,max_tool_calls:4,parallel_tool_calls:false,
 tools:[{type:'web_search',search_context_size:'low',external_web_access:true}],tool_choice:'required',include:['web_search_call.action.sources'],
 instructions:cardPrompts[thesis.team][thesis.groups[0].kind](asOf),
 input:JSON.stringify({thesisCreatedAt:thesis.createdAt,reviewAsOf:asOf,title:thesis.title,instrument:thesis.instrument,team:thesis.team,desk:thesis.desk,direction:thesis.direction,horizon:thesis.horizon,summary:thesis.summary,valuation:thesis.valuation,tradePlan:thesis.tradePlan,checks}),
 text:{format:{type:'json_schema',name:'thesis_review',strict:true,schema:outputSchema(checks.map(c=>c.id))}}};
}
export function canonicalURL(s:string){try{const u=new URL(s);if(!['https:','http:'].includes(u.protocol))return '';u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);return u.href.replace(/\/$/,'');}catch{return '';}}
export function responseCost(response:any){return (response.usage?.input_tokens??0)*0.05/1e6+(response.usage?.output_tokens??0)*0.4/1e6+(response.output??[]).filter((x:any)=>x.type==='web_search_call').length*0.01;}
export function parseResearch(response:any,t:Thesis,id:string,asOf=new Date().toISOString()):Review {
 if(response.status!=='completed')throw new Error('Research did not finish. No subtheses were changed.');
 const output=response.output??[],searches=output.filter((x:any)=>x.type==='web_search_call');
 if(!searches.some((x:any)=>x.status==='completed'))throw new Error('No completed web search was returned. No subtheses were changed.');
 const allowed=new Set<string>();
 for(const s of searches)for(const source of s.action?.sources??[]){const u=canonicalURL(source.url);if(u)allowed.add(u);}
 for(const msg of output)for(const part of msg.content??[])for(const a of part.annotations??[])if(a.type==='url_citation'){const u=canonicalURL(a.url);if(u)allowed.add(u);}
 const raw=output.flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('');
 const result=reviewSchema.parse(JSON.parse(raw)),expected=t.groups.flatMap(g=>g.checks).filter(c=>c.type!=='manual');
 const returnedIds=Object.keys(result.checks),missing=expected.filter(c=>!Object.hasOwn(result.checks,c.id)),unexpected=returnedIds.filter(id=>!expected.some(c=>c.id===id));
 if(missing.length||unexpected.length)throw new Error(`Research returned mismatched checks (${missing.length} missing, ${unexpected.length} unexpected). No subtheses were changed.`);
 const checks=expected.map(check=>{
  const c={...result.checks[check.id],id:check.id};
  const evidence:Evidence[]=c.evidence.filter(e=>allowed.has(canonicalURL(e.url)) && !!canonicalURL(e.url)).slice(0,3).map(e=>({...e,interpretation:'neutral'}));
  const group=t.groups.find(g=>g.checks.some(x=>x.id===check.id))!;
  let status:CheckStatus=c.status,explanation=c.explanation;
  const guard=timingGuard(t,group,check,asOf);
  if(guard){status=guard.status;explanation=guard.explanation;}
  else if((status==='true'||status==='false')&&!evidence.length){status='unclear';explanation='No traceable source was returned for this judgement. '+explanation;}
  // A pre-submission source cannot close a newly specified next-event catalyst.
  if(!guard && status!=='pending' && /\b(next|upcoming)\b/i.test(check.label+' '+group.window) && !evidence.some(e=>e.publishedAt && /^\d{4}-\d{2}-\d{2}/.test(e.publishedAt) && e.publishedAt.slice(0,10)>=t.createdAt.slice(0,10))){status='pending';explanation='Pending: no source establishes the specified event or release after this thesis was submitted.';}
  return {...c,label:check.label,groupKind:group.kind,status,explanation,evidence,previousStatus:check.status};
 });
 return {checks,id,createdAt:asOf,estimatedCost:responseCost(response),searchCalls:searches.length,model:MODEL,summary:'',changeSummary:'',learning:'',nextQuestions:[]};
}

// Consume only public reasoning summaries and actual tool metadata; never raw reasoning.
export async function consumeOpenAIStream(response:Response,onProgress:(event:ResearchProgress)=>void){
 if(!response.body)throw new Error('OpenAI returned an empty stream.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',completed:any=null,summary='';
 const sources=new Set<string>();
 function accept(raw:string){
  const data=raw.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');
  if(!data||data==='[DONE]')return;
  const e=JSON.parse(data);
  if(e.type==='response.reasoning_summary_text.delta'){summary=(summary+e.delta).slice(-6000);onProgress({kind:'reasoning',text:summary});}
  if(e.type==='response.web_search_call.searching')onProgress({kind:'stage',text:'Searching the web…'});
  if(e.type==='response.output_item.done'&&e.item?.type==='web_search_call'){
   const a=e.item.action??{};
   for(const q of a.queries??(a.query?[a.query]:[]))onProgress({kind:'search',text:q});
   for(const s of a.sources??[]){const url=canonicalURL(s.url);if(url&&!sources.has(url)){sources.add(url);onProgress({kind:'source',text:s.title||new URL(url).hostname,url});}}
  }
  if(e.type==='response.completed')completed=e.response;
  if(e.type==='response.failed'||e.type==='response.incomplete'||e.type==='error')throw new Error('OpenAI did not finish this research. No subtheses were changed.');
 }
 while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done}).replace(/\r\n/g,'\n');let i;while((i=buffer.indexOf('\n\n'))>=0){accept(buffer.slice(0,i));buffer=buffer.slice(i+2);}if(done)break;}
 if(buffer.trim())accept(buffer);
 if(!completed)throw new Error('The research stream ended before completion.');
 return completed;
}
