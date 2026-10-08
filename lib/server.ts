import { env } from 'cloudflare:workers';
import { ZodError } from 'zod';
import type { Thesis } from './types';
import { correctLegacyTiming } from './timing';
export function db() { if(!env.DB) throw new Error('Database unavailable.'); return env.DB; }
export function secret() { return (env as unknown as Record<string,string>).OPENAI_API_KEY || process.env.OPENAI_API_KEY; }
export function json(value: unknown,status=200) { return Response.json(value,{status,headers:{'Cache-Control':'no-store'}}); }
export function sameOrigin(request: Request) { const origin=request.headers.get('origin'); return !origin || origin===new URL(request.url).origin; }
export async function body(request:Request) { if(Number(request.headers.get('content-length')||0)>150000) throw new Error('Request too large.'); const text=await request.text(); if(text.length>150000)throw new Error('Request too large.');return JSON.parse(text); }
export function normalizeThesis(t:Thesis):Thesis {
 const sampleNumbers:Record<string,number>={'sample-yen':1,'sample-ai':2,'sample-rates':3};
 return correctLegacyTiming({...t,author:t.author??(t.sample?'Example':''),authorNumber:t.authorNumber||sampleNumbers[t.id]||1,desk:t.desk.replace(/^Training\s*·\s*/, '')});
}
export async function getThesis(id:string):Promise<Thesis|null> {const r=await db().prepare('SELECT payload, version FROM theses WHERE id = ?').bind(id).first<{payload:string;version:number}>();return r?normalizeThesis({...JSON.parse(r.payload),version:r.version}):null;}
export async function saveThesis(t:Thesis,version:number) { const r=await db().prepare('UPDATE theses SET payload = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').bind(JSON.stringify({...t,version:version+1}),t.updatedAt,t.id,version).run(); return r.meta.changes>0; }
export async function authorNumber(author:string){const r=await db().prepare('INSERT INTO author_sequences (author_key,value) VALUES (?,1) ON CONFLICT(author_key) DO UPDATE SET value=value+1 RETURNING value').bind(author.trim().toLocaleLowerCase()).first<{value:number}>();return r!.value;}
export function errorResponse(e:unknown){return e instanceof ZodError?json({error:'Correct the highlighted fields.',issues:e.issues.map(i=>({field:i.path.join('.'),message:i.message,suggestion:''}))},422):json({error:e instanceof Error?e.message:'Something went wrong.'},400);}
