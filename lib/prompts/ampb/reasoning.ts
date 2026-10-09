import { ampbContext, sharedResearchRules } from '../shared-research.ts';

export const ampbReasoningPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${ampbContext}
AMPB REASONING CARD
Test the stated business or valuation mechanism, using the market view and variant view as context rather than facts. For each check, establish the relevant demand, revenue, profitability, cash-flow, balance-sheet or valuation observation. Distinguish an observed result from the explanation for it: revenue growth alone does not prove pricing power, and an earnings beat alone does not prove undervaluation. If a check specifically concerns a stock return, use dated price evidence and the specified baseline, accounting for splits where applicable. Explain which part of the argument the evidence establishes and any remaining gap.`;
