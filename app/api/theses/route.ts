import { body, db, errorResponse, json, sameOrigin, normalizeThesis, authorNumber } from '@/lib/server';
import { inputSchema } from '@/lib/validation';
import { validateInput } from '@/lib/ai-server';
import type { Thesis } from '@/lib/types';
export async function GET(){try{const r=await db().prepare('SELECT payload,version FROM theses ORDER BY updated_at DESC').all<{payload:string;version:number}>();return json(r.results.map(x=>normalizeThesis({...JSON.parse(x.payload),version:x.version})));}catch(e){return errorResponse(e);}}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 try{const p=inputSchema.parse(await body(req));const issues=await validateInput(p);if(issues.length)return json({error:'Thesis not saved. Correct these fields.',issues},422);
 const now=new Date().toISOString(),number=await authorNumber(p.author);
 const t:Thesis={...p,id:crypto.randomUUID(),version:1,authorNumber:number,groups:p.groups.map(g=>({...g,checks:g.checks.map(c=>({...c,status:'pending',explanation:'',evidence:[]}))})),createdAt:now,updatedAt:now,archived:false,sample:false,journal:[],reviews:[]};
 await db().prepare('INSERT INTO theses (id,payload,version,updated_at) VALUES (?,?,1,?)').bind(t.id,JSON.stringify(t),now).run();return json(t,201);
 }catch(e){return errorResponse(e);}
}
