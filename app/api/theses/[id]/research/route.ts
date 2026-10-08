import { db, getThesis, json, sameOrigin, saveThesis, secret } from '@/lib/server';
import { parseResearch, researchRequest, consumeOpenAIStream, responseCost } from '@/lib/research';
import { reserveRun, openAI, validateInput } from '@/lib/ai-server';
import type { ResearchProgress } from '@/lib/types';
import { inputSchema } from '@/lib/validation';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 if(!secret())return json({error:'Research is not configured on the server.'},503);
 const {id}=await ctx.params,t=await getThesis(id);if(!t)return json({error:'Thesis not found.'},404);
 if(!t.groups.some(g=>g.checks.some(c=>c.type!=='manual')))return json({error:'This thesis only has manual checks.'},400);
 const encoder=new TextEncoder();
 const stream=new ReadableStream({async start(controller){
  let connected=true;const emit=(event:unknown)=>{if(connected)try{controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));}catch{connected=false;}};
  const progress=(event:ResearchProgress)=>emit({type:'progress',event});
  let runId:string|undefined,cost:number|null=null;
  try{
   progress({kind:'stage',text:'Checking thesis fields…'});
   // Legacy theses did not collect an author; let owners add it through Edit without blocking research.
   const input=inputSchema.parse({...t,author:t.author||'Unspecified'});
   const issues=await validateInput(input,id);if(issues.length){emit({type:'rejected',issues,error:'Research stopped. Correct these fields in Edit thesis.'});return;}
   runId=await reserveRun(id,'research');
   progress({kind:'stage',text:'Reviewing subtheses and their dates…'});
   const response=await openAI(researchRequest(t),true);
   const raw=await consumeOpenAIStream(response,progress);cost=responseCost(raw);
   const review=parseResearch(raw,t,runId);progress({kind:'stage',text:'Checking sources and saving results…'});
   for(const g of t.groups)for(const c of g.checks){const r=review.checks.find(x=>x.id===c.id);if(r)Object.assign(c,{status:r.status,explanation:r.explanation,evidence:r.evidence,evaluatedAt:review.createdAt});}
   t.reviews.unshift(review);t.updatedAt=review.createdAt;
   if(!await saveThesis(t,t.version)){await db().prepare('UPDATE research_runs SET status=?,estimated_cost=?,result=? WHERE id=?').bind('conflict',cost,JSON.stringify(review),runId).run();throw new Error('The thesis changed during research. Run research again on the updated thesis.');}
   await db().prepare('UPDATE research_runs SET status=?,estimated_cost=?,result=? WHERE id=?').bind('completed',cost,JSON.stringify(review),runId).run();
   emit({type:'result',thesis:{...t,version:t.version+1}});
  }catch(e){if(runId)await db().prepare("UPDATE research_runs SET status='failed',estimated_cost=? WHERE id=? AND status='running'").bind(cost,runId).run();emit({type:'error',error:e instanceof Error?e.message:'Research failed.'});}
  finally{if(connected)controller.close();}
 }});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
