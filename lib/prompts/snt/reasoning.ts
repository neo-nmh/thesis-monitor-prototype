import { sntContext, sharedResearchRules } from '../shared-research.ts';

export const sntReasoningPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${sntContext}
SnT REASONING CARD
Test the written macro, policy, relative-value or correlation mechanism. Separate economic data, policy expectations, actual decisions, yield-curve changes and FX performance: one does not automatically prove the next. Match data vintage and release period, noting revisions when relevant. For a spread claim use compatible maturities and dates; for correlation use the specified paired series and sampling, not a narrative. Political or sentiment reasoning needs the submitted observable criteria; do not invent a sentiment index or causal link. Explain the observed support or contradiction and precisely which part remains unverified.`;
