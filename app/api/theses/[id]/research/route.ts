import { body, db, getThesis, json, sameOrigin, saveThesis, secret, errorResponse } from '@/lib/server';
import { parseResearch, researchRequest, consumeOpenAIStream, responseCost } from '@/lib/research';
import { reserveRun, openAI } from '@/lib/ai-server';
import { parseValidation, validationRequest } from '@/lib/ai-validation';
import { applyCardReview, scopeToCard } from '@/lib/card-research';
import { fallbackSummary, parseSummary, summaryRequest } from '@/lib/monitor-summary';
import type { ResearchProgress } from '@/lib/types';
import { inputSchema } from '@/lib/validation';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 if(!secret())return json({error:'Research is not configured on the server.'},503);
 const {id}=await ctx.params,t=await getThesis(id);if(!t)return json({error:'Thesis not found.'},404);
 let groupId:string,scoped:typeof t;
 try{const input=await body(req);if(typeof input.groupId!=='string')throw new Error('Choose a research card.');groupId=input.groupId;scoped=scopeToCard(t,groupId);}catch(e){return errorResponse(e);}
 const encoder=new TextEncoder();
 const stream=new ReadableStream({async start(controller){
  let connected=true;const emit=(event:unknown)=>{if(connected)try{controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));}catch{connected=false;}};
  const progress=(event:ResearchProgress)=>emit({type:'progress',event});
  let runId:string|undefined,cost=0;
  try{
   progress({kind:'stage',text:'Checking thesis fields…'});
   // Legacy theses did not collect an author; let owners add it through Edit without blocking research.
   const input=inputSchema.parse({...t,author:t.author||'Unspecified'});
   // Reserve and rate-limit before any paid call, including validation and synthesis.
   runId=await reserveRun(id,'research',groupId);
   const validation=await (await openAI(validationRequest(input))).json();cost+=responseCost(validation);
   const issues=parseValidation(validation,input);
   if(issues.length){await db().prepare('UPDATE research_runs SET status=?,estimated_cost=? WHERE id=?').bind('rejected',cost,runId).run();emit({type:'rejected',issues,error:'Research stopped. Correct these fields in Edit thesis.'});return;}
   progress({kind:'stage',text:'Reviewing this card and its dates…'});
   const response=await openAI(researchRequest(t,groupId),true);
   const raw=await consumeOpenAIStream(response,progress);cost+=responseCost(raw);
   const review=parseResearch(raw,scoped,runId);
   const updated=applyCardReview(t,groupId,review);
   progress({kind:'stage',text:'Summarizing the checklist…'});
   let summary=fallbackSummary(updated);
   try{const rawSummary=await (await openAI(summaryRequest(updated))).json();cost+=responseCost(rawSummary);summary=parseSummary(rawSummary);}catch{/* Keep research results if summary generation fails. */}
   updated.monitorSummary={text:summary,createdAt:review.createdAt};review.summary=summary;review.estimatedCost=cost;
   const result=JSON.stringify({groupId,review});
   if(!await saveThesis(updated,t.version)){await db().prepare('UPDATE research_runs SET status=?,estimated_cost=?,result=? WHERE id=?').bind('conflict',cost,result,runId).run();throw new Error('The thesis changed during research. Refresh before researching the updated thesis.');}
   await db().prepare('UPDATE research_runs SET status=?,estimated_cost=?,result=? WHERE id=?').bind('completed',cost,result,runId).run();
   emit({type:'result',thesis:{...updated,version:t.version+1}});
  }catch(e){if(runId)await db().prepare("UPDATE research_runs SET status='failed',estimated_cost=? WHERE id=? AND status='running'").bind(cost,runId).run();emit({type:'error',error:e instanceof Error?e.message:'Research failed.'});}
  finally{if(connected)controller.close();}
 }});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
