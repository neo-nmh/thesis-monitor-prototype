import { ampbContext, sharedResearchRules } from '../shared-research.ts';

export const ampbInvalidationPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${ampbContext}
AMPB INVALIDATION CARD
Test the trader's exact condition for abandoning the thesis, not a substitute condition you consider more important. Respect the stated threshold, persistence and observation period. A temporary dip does not meet a condition requiring two quarters; a lower share price does not establish a broken fundamental assumption unless that is the written check. true means the invalidation condition is met (red tick); false means assessable evidence contradicts it (green cross). Never reverse statuses. A false invalidation check only says this condition was not met; it does not independently prove the investment thesis. Future conditions remain pending and insufficient evidence remains unclear.`;
