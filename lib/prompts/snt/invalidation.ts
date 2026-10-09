import { sntContext, sharedResearchRules } from '../shared-research.ts';

export const sntInvalidationPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${sntContext}
SnT INVALIDATION CARD
Test the trader's explicit condition for the thesis failing: for example a specified FX fixing, curve spread, policy decision or persistent macro change. Preserve direction, threshold, frequency, dates and duration. A spot touch is not a closing-price breach; one release is not two consecutive releases; a speech is not a policy decision. true means the written invalidation condition is met (red tick); false means assessable evidence contradicts it (green cross). Do not reverse statuses or substitute a stop-loss for a fundamental condition. Failure to invalidate does not prove the broader thesis. Future conditions remain pending, and missing required market observations remain unclear.`;
