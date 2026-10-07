import { z } from 'zod';
const str=z.string().max(2400);
const check=z.object({id:z.string().min(1).max(100),label:str.min(1),type:z.enum(['numeric','event','qualitative','manual']),deadline:z.string().max(100)});
export const inputSchema=z.object({title:z.string().min(1).max(140),team:z.enum(['AMPB','SnT','Quant','AI']),desk:z.string().min(1).max(100),instrument:z.string().min(1).max(60),direction:z.string().min(1).max(100),horizon:z.string().max(200),summary:str.min(1),valuation:str,tradePlan:str,groups:z.array(z.object({id:z.string().min(1).max(100),kind:z.enum(['reasoning','catalyst','risk','invalidation']),claim:str.min(1),marketView:str,variantView:str,context:str,window:z.string().max(250),checks:z.array(check).min(1).max(6)})).min(1).max(12)}).superRefine((t,ctx)=>{
  const checks=t.groups.flatMap(g=>g.checks);
  if(checks.length>24)ctx.addIssue({code:'custom',message:'Keep each thesis to 24 checks or fewer.'});
  if(new Set(checks.map(c=>c.id)).size!==checks.length || new Set(t.groups.map(g=>g.id)).size!==t.groups.length)ctx.addIssue({code:'custom',message:'Check and group IDs must be unique.'});
  if(JSON.stringify(t).length>20000)ctx.addIssue({code:'custom',message:'Keep this prototype thesis under 20,000 characters.'});
  if(!t.groups.some(g=>g.kind==='reasoning'))ctx.addIssue({code:'custom',message:'Include at least one reasoning point.'});
});
