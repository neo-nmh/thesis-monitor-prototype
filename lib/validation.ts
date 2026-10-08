import { z } from 'zod';
import { desks } from './types.ts';
const str=z.string().max(2400);
const required=(max=2400)=>z.string().max(max).refine(s=>s.trim().length>0,'This field is required.');
const check=z.object({id:z.string().min(1).max(100),label:required(),type:z.enum(['numeric','event','qualitative','manual']),deadline:z.string().max(100)});
export const inputSchema=z.object({author:required(80),title:required(140),team:z.enum(['AMPB','SnT']),desk:required(100),instrument:required(60),direction:required(100),horizon:required(200),summary:required(),valuation:str,tradePlan:str,groups:z.array(z.object({id:z.string().min(1).max(100),kind:z.enum(['reasoning','catalyst','risk','invalidation']),claim:required(),marketView:str,variantView:str,context:str,window:z.string().max(250),checksText:z.string().max(14400).optional(),checks:z.array(check).min(1).max(6)})).min(1).max(12)}).superRefine((t,ctx)=>{
 const checks=t.groups.flatMap(g=>g.checks);
 if(!desks[t.team].includes(t.desk))ctx.addIssue({code:'custom',path:['desk'],message:'Choose a desk for this team.'});
 if(checks.length>24)ctx.addIssue({code:'custom',path:['groups'],message:'Use at most 24 subtheses.'});
 if(new Set(checks.map(c=>c.id)).size!==checks.length || new Set(t.groups.map(g=>g.id)).size!==t.groups.length)ctx.addIssue({code:'custom',message:'Check and group IDs must be unique.'});
 if(JSON.stringify(t).length>20000)ctx.addIssue({code:'custom',message:'Keep the thesis under 20,000 characters.'});
 if(!t.groups.some(g=>g.kind==='reasoning'))ctx.addIssue({code:'custom',path:['groups'],message:'Include at least one reasoning point.'});
});
export type ThesisInput=z.infer<typeof inputSchema>;
export function validationFields(t:ThesisInput){
 const fields:Record<string,string>={author:t.author,title:t.title,instrument:t.instrument,direction:t.direction,horizon:t.horizon,summary:t.summary,valuation:t.valuation,tradePlan:t.tradePlan};
 t.groups.forEach((g,i)=>{for(const key of ['claim','marketView','variantView','context','window'] as const)fields[`groups.${i}.${key}`]=g[key];g.checks.forEach((c,j)=>{fields[`groups.${i}.checks.${j}.label`]=c.label;});});return fields;
}
