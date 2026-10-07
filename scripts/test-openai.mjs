import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { researchRequest, parseResearch } from '../lib/research.ts';
import { samples } from '../lib/samples.ts';
if(process.stdin.isTTY)execFileSync('stty',['-echo'],{stdio:['inherit','ignore','ignore']});
process.stdout.write('Ready for API key on stdin (input is hidden).\n');
const rl=readline.createInterface({input:process.stdin});
rl.once('line',async key=>{
 rl.close();
 const t=structuredClone(samples[0]);t.groups=t.groups.slice(0,1);t.groups[0].checks=t.groups[0].checks.slice(1);
 const req=researchRequest(t);req.max_tool_calls=2;
 const start=Date.now();
 try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key.trim()}`,'Content-Type':'application/json'},body:JSON.stringify(req),signal:AbortSignal.timeout(150000)});const data=await r.json();
 if(!r.ok){console.log(JSON.stringify({http:r.status,error:data.error?.message,code:data.error?.code}));process.exitCode=1;}
 else{const review=parseResearch(data,t,'smoke-test');console.log(JSON.stringify({ok:true,seconds:Math.round((Date.now()-start)/1000),model:review.model,searchCalls:review.searchCalls,estimatedCost:review.estimatedCost,checks:review.checks.map(c=>({id:c.id,status:c.status,evidenceCount:c.evidence.length,explanation:c.explanation})),summary:review.summary}));}
 }catch(e){console.log(JSON.stringify({error:e.message}));process.exitCode=1;}
 finally{if(process.stdin.isTTY)execFileSync('stty',['echo'],{stdio:['inherit','ignore','ignore']});}
});
