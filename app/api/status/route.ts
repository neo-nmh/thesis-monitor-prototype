import { CARD_RESERVATION } from '@/lib/research-budget';
import { db, json, secret } from '@/lib/server';
export async function GET(){try{const r=await db().prepare('SELECT COALESCE(SUM(reserved),0) as reserved, COALESCE(SUM(estimated_cost),0) as estimated FROM research_runs').first<{reserved:number;estimated:number}>();return json({configured:!!secret(),model:'gpt-5-nano',limit:12,reservationPerRun:CARD_RESERVATION,...r,remainingResearches:Math.max(0,Math.floor((12-(r?.reserved||0))/CARD_RESERVATION))});}catch{return json({error:'Database unavailable.'},503);}}
