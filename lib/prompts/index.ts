import type { GroupKind, Team } from '../types';
import { ampbReasoningPrompt } from './ampb/reasoning.ts';
import { ampbCatalystPrompt } from './ampb/catalyst.ts';
import { ampbRiskPrompt } from './ampb/risk.ts';
import { ampbInvalidationPrompt } from './ampb/invalidation.ts';
import { sntReasoningPrompt } from './snt/reasoning.ts';
import { sntCatalystPrompt } from './snt/catalyst.ts';
import { sntRiskPrompt } from './snt/risk.ts';
import { sntInvalidationPrompt } from './snt/invalidation.ts';

export const cardPrompts:Record<Team,Record<GroupKind,(asOf:string)=>string>> = {
 AMPB: {reasoning:ampbReasoningPrompt,catalyst:ampbCatalystPrompt,risk:ampbRiskPrompt,invalidation:ampbInvalidationPrompt},
 SnT: {reasoning:sntReasoningPrompt,catalyst:sntCatalystPrompt,risk:sntRiskPrompt,invalidation:sntInvalidationPrompt},
};
