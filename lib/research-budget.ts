export const CARD_RESERVATION=0.27; // Research, form validation and checklist summary.

export async function reserveBudget(database:D1Database,thesisId:string,kind:'research'|'validation',groupId?:string){
 if(kind==='research'&&!groupId)throw new Error('Choose a research card.');
 const id=crypto.randomUUID(),now=new Date().toISOString(),amount=kind==='research'?CARD_RESERVATION:0.01;
 // A different card can follow immediately; the same card still has a cooldown.
 const extra=kind==='research'?`AND NOT EXISTS (SELECT 1 FROM research_runs WHERE status='running' AND created_at > ?)
  AND NOT EXISTS (SELECT 1 FROM research_runs WHERE reserved >= 0.25 AND thesis_id=? AND created_at > ? AND (json_extract(result,'$.groupId')=? OR json_extract(result,'$.groupId') IS NULL))`
  :`AND NOT EXISTS (SELECT 1 FROM research_runs WHERE status='validating' AND created_at > ?)`;
 const args=kind==='research'?[new Date(Date.now()-300000).toISOString(),thesisId,new Date(Date.now()-60000).toISOString(),groupId]:[new Date(Date.now()-60000).toISOString()];
 const r=await database.prepare(`INSERT INTO research_runs (id,thesis_id,created_at,status,reserved,result) SELECT ?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(reserved),0) FROM research_runs) + ? <= 12 ${extra}`)
  .bind(id,thesisId,now,kind==='research'?'running':'validating',amount,JSON.stringify({groupId:groupId??null}),amount,...args).run();
 if(!r.meta.changes)throw new Error(kind==='research'?'Research is running, this card’s one-minute cooldown is active, or the usage limit has been reached.':'An input check is running or the usage limit has been reached. Try again shortly.');
 return id;
}
