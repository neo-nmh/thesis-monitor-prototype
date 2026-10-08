import { body, db, errorResponse, getThesis, json, sameOrigin, saveThesis, authorNumber } from '@/lib/server';
import { inputSchema } from '@/lib/validation';
import { validateInput } from '@/lib/ai-server';
import type { CheckStatus } from '@/lib/types';
export async function PATCH(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 try{const {id}=await ctx.params,t=await getThesis(id);if(!t)return json({error:'Thesis not found.'},404);
 const b=await body(req);if(b.version!==t.version)return json({error:'This thesis changed in another session. Refresh and try again.'},409);
 const now=new Date().toISOString();
 if(b.action==='manual') {const c=t.groups.flatMap(g=>g.checks).find(c=>c.id===b.checkId);if(!c||c.type!=='manual')throw new Error('Only manual checks can be marked by hand.');if(!['true','false','unclear','pending'].includes(b.status)||typeof b.note!=='string'||!b.note.trim()||b.note.length>2000)throw new Error('A status and evidence note are required.');c.status=b.status as CheckStatus;c.explanation=b.note;c.manualNote=b.note;c.evaluatedAt=now;}
 else if(b.action==='edit') {
  const p=inputSchema.parse(b.thesis),issues=await validateInput(p,id);if(issues.length)return json({error:'Thesis not saved. Correct these fields.',issues},422);
  const number=t.author.trim().toLowerCase()===p.author.trim().toLowerCase()?t.authorNumber:await authorNumber(p.author);
  Object.assign(t,p,{authorNumber:number,groups:p.groups.map(g=>({...g,checks:g.checks.map(c=>({...c,status:'pending',explanation:'',evidence:[]}))}))});
 }else throw new Error('Unknown action.');
 t.updatedAt=now;if(!await saveThesis(t,t.version))return json({error:'Another update arrived. Refresh and try again.'},409);return json({...t,version:t.version+1});
 }catch(e){return errorResponse(e);}
}
export async function DELETE(req:Request,ctx:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 try{const {id}=await ctx.params,b=await body(req);const r=await db().prepare('DELETE FROM theses WHERE id=? AND version=?').bind(id,b.version).run();if(!r.meta.changes)return json({error:'The thesis changed or was already deleted. Refresh and try again.'},409);await db().prepare('UPDATE research_runs SET result=NULL WHERE thesis_id=?').bind(id).run();return json({deleted:true});}catch(e){return errorResponse(e);}
}
