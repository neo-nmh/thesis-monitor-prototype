export type CheckStatus = 'pending' | 'true' | 'false' | 'unclear';
export type GroupKind = 'reasoning' | 'catalyst' | 'risk' | 'invalidation';
export type Team = 'AMPB' | 'SnT' | 'Quant' | 'AI';
export type Evidence = { title: string; url: string; publisher: string; publishedAt: string | null; observation: string; interpretation: 'supports' | 'contradicts' | 'neutral' };
export type Check = { id: string; label: string; type: 'numeric' | 'event' | 'qualitative' | 'manual'; deadline: string; status: CheckStatus; explanation: string; evidence: Evidence[]; evaluatedAt?: string; manualNote?: string };
export type Group = { id: string; kind: GroupKind; claim: string; marketView: string; variantView: string; context: string; window: string; checks: Check[] };
export type JournalEntry = { id: string; createdAt: string; text: string; kind: 'reflection' | 'manual' | 'edit'; previous?: {title:string;summary:string;groups:Group[];valuation:string;tradePlan:string}; };
export type Review = { id: string; createdAt: string; summary: string; changeSummary: string; learning: string; nextQuestions: string[]; checks: { id: string; label: string; groupKind: GroupKind; status: CheckStatus; explanation: string; evidence: Evidence[]; previousStatus: CheckStatus }[]; estimatedCost: number; searchCalls: number; model: string; };
export type Thesis = { id: string; version: number; title: string; team: Team; desk: string; instrument: string; direction: string; horizon: string; summary: string; valuation: string; tradePlan: string; groups: Group[]; createdAt: string; updatedAt: string; archived: boolean; sample: boolean; journal: JournalEntry[]; reviews: Review[]; };
export const desks: Record<Team, string[]> = {
  AMPB: ['Training · US AI', 'Training · US Non-AI', 'Internship · Seeds', 'Internship · Infinity'],
  SnT: ['FX · USDJPY', 'FX · USDKRW', 'FX · USDSGD', 'Rates · US', 'Rates · Japan'],
  Quant: ['Quant research'], AI: ['AI research'],
};
export const kindLabels: Record<GroupKind, string> = { reasoning: 'Reasoning', catalyst: 'Catalysts', risk: 'Risks', invalidation: 'Invalidation' };
export function allChecks(t: Thesis) { return t.groups.flatMap(g => g.checks); }
export function health(t: Thesis) {
  if (t.archived) return 'Archived';
  if(t.groups.some(g => g.kind === 'invalidation' && g.checks.some(c => c.status === 'true'))) return 'Invalidation flagged';
  if(t.groups.some(g => (g.kind === 'reasoning' && g.checks.some(c => c.status === 'false')) || (g.kind === 'risk' && g.checks.some(c => c.status === 'true')))) return 'Needs attention';
  const c=allChecks(t);
  if (!c.some(c=>c.evaluatedAt)) return 'Not researched';
  if (c.some(c=>c.status === 'unclear' || c.status === 'pending')) return 'Open questions';
  return 'On track';
}
export function newCheck(label: string): Check {
  const manual=/^manual\s*:/i.test(label);
  return {id: crypto.randomUUID(), label:label.replace(/^manual\s*:/i,''),type:manual?'manual':/[><=%]|\d/.test(label)?'numeric':'qualitative',deadline:'',status:'pending',explanation:'',evidence:[]};
}
export function newGroup(kind: GroupKind): Group { return {id:crypto.randomUUID(),kind,claim:'',marketView:'',variantView:'',context:'',window:'',checks:[]}; }
