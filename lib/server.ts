import { env } from 'cloudflare:workers';
import { ZodError } from 'zod';
import type { Thesis } from './types';
export function db() { if(!env.DB) throw new Error('Database unavailable.'); return env.DB; }
export function secret() { return (env as unknown as Record<string,string>).OPENAI_API_KEY || process.env.OPENAI_API_KEY; }
export function json(value: unknown,status=200) { return Response.json(value,{status,headers:{'Cache-Control':'no-store'}}); }
export function sameOrigin(request: Request) { const origin=request.headers.get('origin'); return !origin || origin===new URL(request.url).origin; }
export async function body(request:Request) { if(Number(request.headers.get('content-length')||0)>150000) throw new Error('Request too large.'); const text=await request.text(); if(text.length>150000)throw new Error('Request too large.');return JSON.parse(text); }
export async function getThesis(id:string):Promise<Thesis|null> {const r=await db().prepare('SELECT payload, version FROM theses WHERE id = ?').bind(id).first<{payload:string;version:number}>();return r?{...JSON.parse(r.payload),version:r.version}:null;}
export async function saveThesis(t:Thesis,version:number) { const r=await db().prepare('UPDATE theses SET payload = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?').bind(JSON.stringify({...t,version:version+1}),t.updatedAt,t.id,version).run(); return r.meta.changes>0; }
export function errorResponse(e:unknown){return json({error:e instanceof ZodError?e.issues.map(i=>`${i.path.join(' → ')}: ${i.message}`).join('\n'):e instanceof Error?e.message:'Something went wrong.'},400);}
