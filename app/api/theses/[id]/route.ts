import { body, errorResponse, getThesis, json, sameOrigin, saveThesis } from '@/lib/server';
import { inputSchema } from '@/lib/validation';
import type { CheckStatus } from '@/lib/types';
export async function PATCH(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 try{const {id}=await ctx.params;const t=await getThesis(id);if(!t)return json({error:'Thesis not found.'},404);
 const b=await body(req);if(b.version!==t.version)return json({error:'This thesis changed in another session. Refresh and try again.'},409);
 const now=new Date().toISOString();
 if(b.action==='archive'){t.archived=!t.archived;}
 else if(b.action==='note') {if(typeof b.text!=='string'||!b.text.trim()||b.text.length>4000)throw new Error('Add a reflection of 1–4,000 characters.');t.journal.unshift({id:crypto.randomUUID(),createdAt:now,text:b.text.trim(),kind:'reflection'});}
 else if(b.action==='manual') {const c=t.groups.flatMap(g=>g.checks).find(c=>c.id===b.checkId);if(!c||c.type!=='manual')throw new Error('Only manual checks can be marked by hand.');if(!['true','false','unclear','pending'].includes(b.status)||typeof b.note!=='string'||!b.note.trim()||b.note.length>2000)throw new Error('A status and evidence note are required.');const before=c.status;c.status=b.status as CheckStatus;c.explanation=b.note.trim();c.manualNote=b.note.trim();c.evaluatedAt=now;t.journal.unshift({id:crypto.randomUUID(),createdAt:now,text:`Manual check: ${c.label}\n${before} → ${c.status}\n${c.explanation}`,kind:'manual'});}
 else if(b.action==='edit') {
 const p=inputSchema.parse(b.thesis);
 const previous={title:t.title,summary:t.summary,groups:t.groups,valuation:t.valuation,tradePlan:t.tradePlan};
 Object.assign(t,p,{groups:p.groups.map(g=>({...g,checks:g.checks.map(c=>({...c,status:'pending',explanation:'',evidence:[]}))}))});
 t.journal.unshift({id:crypto.randomUUID(),createdAt:now,text:'Thesis revised. Check states reset so prior evidence is not applied to a changed argument.',kind:'edit',previous});
 }else throw new Error('Unknown action.');
 t.updatedAt=now;if(!await saveThesis(t,t.version))return json({error:'Another update arrived. Refresh and try again.'},409);return json({...t,version:t.version+1});
 }catch(e){return errorResponse(e);}
}
