import { db, getThesis, json, sameOrigin, saveThesis, secret } from '@/lib/server';
import { parseResearch, researchRequest } from '@/lib/research';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 const key=secret();if(!key)return json({error:'Research is not configured. Add OPENAI_API_KEY on the server.'},503);
 const {id}=await ctx.params;const t=await getThesis(id);if(!t)return json({error:'Thesis not found.'},404);
 if(t.archived)return json({error:'Restore this thesis before researching it.'},400);
 if(!t.groups.some(g=>g.checks.some(c=>c.type!=='manual')))return json({error:'This thesis only has manual checks. Add a web-researchable check first.'},400);
 const runId=crypto.randomUUID(),now=new Date().toISOString(),cutoff=new Date(Date.now()-180000).toISOString(),cooldown=new Date(Date.now()-60000).toISOString();
 // Atomic reservation serializes the budget gate across all visitors and Worker instances.
 const reserved=await db().prepare(`INSERT INTO research_runs (id,thesis_id,created_at,status,reserved)
 SELECT ?,?,?,'running',0.25 WHERE (SELECT COALESCE(SUM(reserved),0) FROM research_runs) + 0.25 <= 12
 AND NOT EXISTS (SELECT 1 FROM research_runs WHERE status='running' AND created_at > ?)
 AND NOT EXISTS (SELECT 1 FROM research_runs WHERE created_at > ?)`)
 .bind(runId,id,now,cutoff,cooldown).run();
 if(!reserved.meta.changes)return json({error:'Research is already running, the one-minute cooldown is active, or the $12 prototype allowance is used. Try again shortly or check Usage.'},429);
 let cost:number|null=null;
 try{
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(researchRequest(t)),signal:AbortSignal.timeout(150000)});
 if(!response.ok){const err:any=await response.json().catch(()=>({}));const code=err.error?.code;if(response.status===401)throw new Error('OpenAI rejected the API key. Update the server secret.');if(response.status===429)throw new Error(code==='insufficient_quota'?'The OpenAI project has insufficient quota. Check its billing limit.':'OpenAI rate-limited this request. Please try later.');throw new Error(`OpenAI could not complete this request (${response.status}${code?`, ${String(code).slice(0,70)}`:''}). No checks were changed.`);}
 const raw:any=await response.json();cost=(raw.usage?.input_tokens??0)*0.05/1e6+(raw.usage?.output_tokens??0)*0.4/1e6+(raw.output??[]).filter((x:any)=>x.type==='web_search_call').length*0.01;const review=parseResearch(raw,t,runId);cost=review.estimatedCost;
 for(const g of t.groups)for(const c of g.checks){const r=review.checks.find(x=>x.id===c.id);if(r)Object.assign(c,{status:r.status,explanation:r.explanation,evidence:r.evidence,evaluatedAt:review.createdAt});}
 t.reviews.unshift(review);t.updatedAt=review.createdAt;
 // Never apply evidence to a thesis edited while the research was in flight.
 if(!await saveThesis(t,t.version)){await db().prepare('UPDATE research_runs SET status=?,estimated_cost=?,result=? WHERE id=?').bind('conflict',cost,JSON.stringify(review),runId).run();return json({error:'The thesis changed while research was running. The result was saved in the audit log but not applied. Run research on the current thesis.'},409);}
 await db().prepare('UPDATE research_runs SET status=?,estimated_cost=?,result=? WHERE id=?').bind('completed',cost,JSON.stringify(review),runId).run();
 return json({...t,version:t.version+1});
 }catch(e){await db().prepare('UPDATE research_runs SET status=?,estimated_cost=? WHERE id=?').bind('failed',cost,runId).run();return json({error:e instanceof Error?e.message:'Research failed. No checks were changed.'},502);}
}
