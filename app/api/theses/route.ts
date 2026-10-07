import { body, db, errorResponse, json, sameOrigin } from '@/lib/server';
import { inputSchema } from '@/lib/validation';
import { samples } from '@/lib/samples';
import type { Thesis } from '@/lib/types';
export async function GET(){try{const r=await db().prepare('SELECT payload,version FROM theses ORDER BY updated_at DESC LIMIT 200').all<{payload:string;version:number}>();return json(r.results.map(x=>({...JSON.parse(x.payload),version:x.version})));}catch(e){return errorResponse(e);}}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Request origin is not allowed.'},403);
 try{const b=await body(req);
 if(b.action==='samples') {await db().batch(samples.map(t=>db().prepare('INSERT OR IGNORE INTO theses (id,payload,version,updated_at) VALUES (?,?,?,?)').bind(t.id,JSON.stringify(t),1,t.updatedAt)));return json({ok:true});}
 const p=inputSchema.parse(b);const now=new Date().toISOString();
 const t:Thesis={...p,id:crypto.randomUUID(),version:1,groups:p.groups.map(g=>({...g,checks:g.checks.map(c=>({...c,status:'pending',explanation:'',evidence:[]}))})),createdAt:now,updatedAt:now,archived:false,sample:false,journal:[],reviews:[]};
 await db().prepare('INSERT INTO theses (id,payload,version,updated_at) VALUES (?,?,1,?)').bind(t.id,JSON.stringify(t),now).run();return json(t,201);
 }catch(e){return errorResponse(e);}
}
