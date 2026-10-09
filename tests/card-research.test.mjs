import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { samples } from '../lib/samples.ts';
import { researchRequest, parseResearch } from '../lib/research.ts';
import { researchCards, scopeToCard, applyCardReview, runCardQueue } from '../lib/card-research.ts';
import { checkDisplay, checklistDistribution } from '../lib/check-display.ts';
import { summaryRequest, summaryChecklist, parseSummary, fallbackSummary } from '../lib/monitor-summary.ts';
import { CARD_RESERVATION, reserveBudget } from '../lib/research-budget.ts';

test('risk and invalidation retain literal symbols while reversing only green/red',()=>{
 for(const kind of ['reasoning','catalyst','risk','invalidation']){
  const adverse=['risk','invalidation'].includes(kind);
  assert.deepEqual([checkDisplay('true',kind).color,checkDisplay('true',kind).symbol],[adverse?'red':'green','tick']);
  assert.deepEqual([checkDisplay('false',kind).color,checkDisplay('false',kind).symbol],[adverse?'green':'red','cross']);
  assert.deepEqual(checkDisplay('pending',kind),{color:'grey',label:'Not researched yet',symbol:'empty'});
  assert.deepEqual(checkDisplay('pending',kind,true),{color:'grey',label:'Pending',symbol:'minus'});assert.equal(checkDisplay('unclear',kind).color,'yellow');
 }
});

test('donut includes every check and uses exactly the same semantic colours',()=>{
 const t=structuredClone(samples[0]);
 t.groups=['reasoning','catalyst','risk','invalidation'].map((kind,i)=>({...t.groups[0],id:`g${i}`,kind,checks:['true','false','pending','unclear'].map((status,j)=>({...t.groups[0].checks[0],id:`c${i}${j}`,status}))}));
 assert.deepEqual(checklistDistribution(t).map(p=>[p.color,p.count,p.rounded]),[['green',4,25],['red',4,25],['yellow',4,25],['grey',4,25]]);
 t.groups[0].checks.pop();assert.equal(checklistDistribution(t).reduce((n,p)=>n+p.rounded,0),100);
 t.groups=[];assert.ok(checklistDistribution(t).every(p=>p.percent===0));
});

test('one card researches every automated subpoint and keeps all thesis context',()=>{
 const t=structuredClone(samples[0]),g=t.groups[0];g.checks.push({...g.checks[0],id:'manual',type:'manual'});
 const before=structuredClone(t),r=researchRequest(t,g.id,'2026-10-09T00:00:00Z'),input=JSON.parse(r.input);
 assert.equal(input.title,t.title);assert.equal(input.horizon,t.horizon);assert.equal(input.summary,t.summary);
 assert.deepEqual(input.checks.map(c=>c.id),g.checks.filter(c=>c.type!=='manual').map(c=>c.id));
 assert.deepEqual(r.text.format.schema.properties.checks.required,input.checks.map(c=>c.id));assert.deepEqual(t,before);
 assert.throws(()=>researchRequest(t,'unknown'),/not found/);
 g.checks.forEach(c=>c.type='manual');assert.throws(()=>scopeToCard(t,g.id),/manual checks/);
});

test('a card review cannot alter another card or a manual observation',()=>{
 const t=structuredClone(samples[0]),g=t.groups[0];g.checks.push({...g.checks[0],id:'manual',type:'manual',status:'false',manualNote:'Trader observation'});
 const before=structuredClone(t),review={id:'run',createdAt:'2026-10-09T00:00:00Z',checks:g.checks.filter(c=>c.type!=='manual').map(c=>({...c,status:'true',explanation:'New evidence',evidence:[]}))};
 const updated=applyCardReview(t,g.id,review);
 assert.deepEqual(updated.groups.slice(1),t.groups.slice(1));assert.deepEqual(updated.groups[0].checks.at(-1),g.checks.at(-1));
 assert.ok(updated.groups[0].checks.slice(0,-1).every(c=>c.status==='true'));assert.deepEqual(t,before);
 for(const checks of [[],[...review.checks,{...review.checks[0],id:'foreign'}],review.checks.map(()=>review.checks[0])])assert.throws(()=>applyCardReview(t,g.id,{...review,checks}),/mismatched/);
});

test('main research is exactly the same sequential card requests as individual controls',async()=>{
 const t=structuredClone(samples[0]);t.groups.at(-1).checks.forEach(c=>c.type='manual');
 const singles=[],all=[];
 for(const g of researchCards(t))await runCardQueue(t,g.id,async id=>{singles.push(researchRequest(t,id,'2026-10-09T00:00:00Z'));});
 let inFlight=0;await runCardQueue(t,undefined,async(id,index,total)=>{assert.equal(++inFlight,1);assert.equal(index,all.length+1);assert.equal(total,singles.length);await Promise.resolve();all.push(researchRequest(t,id,'2026-10-09T00:00:00Z'));inFlight--;});
 assert.deepEqual(all,singles);
 const completed=[];await assert.rejects(runCardQueue(t,undefined,async(id,index)=>{if(index===2)throw new Error('Failed card');completed.push(id);}),/Failed card/);assert.deepEqual(completed,[t.groups[0].id]);
});

test('summary sees the merged whole checklist, including dates and adverse truth semantics, without more search',()=>{
 const t=structuredClone(samples[0]),request=summaryRequest(t),input=JSON.parse(request.input);
 assert.equal(input.cardsNeedingResearch.length,t.groups.length);assert.equal(input.reviewedChecks.length,0);
 assert.equal(request.tools,undefined);assert.equal(request.model,'gpt-5-nano');assert.ok(request.instructions.includes('true means an adverse condition was met'));
 const raw=summary=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({summary})}]}]});
 assert.equal(parseSummary(raw('A short\nparagraph.')),'A short paragraph.');assert.throws(()=>parseSummary(raw('word '.repeat(101))),/Invalid summary/);
 assert.equal(parseSummary(raw('Revenue rose 9.32%, supporting the thesis. More detail follows.')),'Revenue rose 9.32%, supporting the thesis.');
 assert.ok(fallbackSummary(t).includes('unresearched checks'));
 assert.ok(fallbackSummary(t).length<400);
});

test('summary distinguishes unchecked historical statements from genuinely future observations',()=>{
 const t=structuredClone(samples[0]);t.groups=t.groups.slice(0,1);
 t.groups[0].checks=[
  {...t.groups[0].checks[0],id:'historical',label:'A policy decision was published in September 2024.',status:'pending'},
  {...t.groups[0].checks[0],id:'future',label:'The policy rate falls below 2% by March 2027.',status:'pending',evaluatedAt:'2026-10-09T00:00:00Z'},
 ];
 const checks=summaryChecklist(t,'2026-10-09T00:00:00Z')[0].checks;
 assert.equal(checks[0].researchState,'not_researched');assert.equal(checks[1].researchState,'future_observation');
});

function budgetDB(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE research_runs(id TEXT,thesis_id TEXT,created_at TEXT,status TEXT,reserved REAL,estimated_cost REAL,result TEXT)');
 const db={prepare(sql){return {bind(...values){return {async run(){const result=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};}};}};}};
 return {sqlite,db};
}

test('budget blocks overlapping runs, permits the next card, and cools down only the same card',async()=>{
 const {sqlite,db}=budgetDB();
 try{
  const id=await reserveBudget(db,'thesis','research','reasoning');
  await assert.rejects(reserveBudget(db,'thesis','research','risk'),/Research is running/);
  sqlite.prepare("UPDATE research_runs SET status='completed' WHERE id=?").run(id);
  await assert.rejects(reserveBudget(db,'thesis','research','reasoning'),/cooldown/);
  const second=await reserveBudget(db,'thesis','research','risk');assert.notEqual(second,id);
  assert.equal(sqlite.prepare('SELECT SUM(reserved) AS total FROM research_runs').get().total,2*CARD_RESERVATION);
 }finally{sqlite.close();}
});

test('combined reservation stays inside cap and failed attempts keep their reservation',async()=>{
 const {sqlite,db}=budgetDB();
 try{
  sqlite.prepare('INSERT INTO research_runs VALUES (?,?,?,?,?,?,?)').run('previous','old','2020-01-01','completed',11.74,0,null);
  await assert.rejects(reserveBudget(db,'thesis','research','risk'),/usage limit/);
  sqlite.exec('DELETE FROM research_runs');const id=await reserveBudget(db,'thesis','research','risk');
  sqlite.prepare("UPDATE research_runs SET status='failed' WHERE id=?").run(id);
  assert.equal(sqlite.prepare('SELECT reserved FROM research_runs').get().reserved,CARD_RESERVATION);
  await assert.rejects(reserveBudget(db,'thesis','research','risk'),/cooldown/);
 }finally{sqlite.close();}
});
