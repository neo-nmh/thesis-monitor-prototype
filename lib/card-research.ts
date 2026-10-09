import type { Review, Thesis } from './types';

export function researchCards(t:Thesis,groupId?:string){
 const groups=groupId?t.groups.filter(g=>g.id===groupId):t.groups;
 if(groupId&&!groups.length)throw new Error('Research card not found.');
 const eligible=groups.filter(g=>g.checks.some(c=>c.type!=='manual'));
 if(!eligible.length)throw new Error('This card or thesis only has manual checks.');
 return eligible;
}

export function scopeToCard(t:Thesis,groupId:string):Thesis {
 return {...t,groups:researchCards(t,groupId)};
}

export function applyCardReview(t:Thesis,groupId:string,review:Review):Thesis {
 const group=researchCards(t,groupId)[0],expected=group.checks.filter(c=>c.type!=='manual');
 if(review.checks.length!==expected.length||new Set(review.checks.map(c=>c.id)).size!==expected.length||review.checks.some(c=>!expected.some(e=>e.id===c.id)))throw new Error('Research returned mismatched checks. No subtheses were changed.');
 return {...t,updatedAt:review.createdAt,monitorSummary:undefined,reviews:[review,...t.reviews],groups:t.groups.map(g=>g.id!==groupId?g:{...g,checks:g.checks.map(c=>{
  const result=review.checks.find(r=>r.id===c.id);
  return result?{...c,status:result.status,explanation:result.explanation,evidence:result.evidence,evaluatedAt:review.createdAt}:c;
 })})};
}

// Both the single-card and all-cards controls use this same request sequence.
export async function runCardQueue(t:Thesis,groupId:string|undefined,run:(groupId:string,index:number,total:number)=>Promise<void>){
 const groups=researchCards(t,groupId);
 for(const [i,g] of groups.entries())await run(g.id,i+1,groups.length);
}
