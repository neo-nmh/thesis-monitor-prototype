import { reserveBudget } from './research-budget';
import { db, secret } from './server';
import { validationRequest, parseValidation } from './ai-validation';
import { responseCost } from './research';
import type { ThesisInput } from './validation';
export async function reserveRun(thesisId:string,kind:'research'|'validation',groupId?:string){
 return reserveBudget(db(),thesisId,kind,groupId);
}
export async function openAI(request:unknown,stream=false){
 const key=secret();if(!key)throw new Error('OpenAI is not configured on the server.');
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({...request as object,...(stream?{stream:true}:{})}),signal:AbortSignal.timeout(stream?150000:60000)});
 if(!response.ok){if(response.status===401)throw new Error('OpenAI rejected the server API key.');if(response.status===429)throw new Error('OpenAI rate limit or project budget reached. Try again later.');throw new Error(`OpenAI request failed (${response.status}).`);}return response;
}
export async function validateInput(t:ThesisInput,thesisId='new'){
 if(!secret())throw new Error('OpenAI is not configured on the server.');
 const id=await reserveRun(thesisId,'validation');let cost:number|null=null;
 try{const raw=await (await openAI(validationRequest(t))).json();cost=responseCost(raw);const issues=parseValidation(raw,t);await db().prepare('UPDATE research_runs SET status=?,estimated_cost=? WHERE id=?').bind(issues.length?'rejected':'validated',cost,id).run();return issues;}
 catch(e){await db().prepare('UPDATE research_runs SET status=?,estimated_cost=? WHERE id=?').bind('failed',cost,id).run();throw e;}
}
