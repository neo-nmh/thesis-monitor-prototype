import { sntContext, sharedResearchRules } from '../shared-research.ts';

export const sntRiskPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${sntContext}
SnT RISK CARD
Test each stated adverse macro, policy, FX, rates, liquidity or correlation condition. true means the written adverse condition is supported (red tick); false means evidence contradicts it (green cross). Do not reverse statuses based on trade direction. Distinguish an inflation release from the projected policy response and from the market move. A risk warning, hedge or favourable trade return does not show whether the risk happened. Use the exact series, baseline and observation window; inaccessible positioning or liquidity data means unclear once assessable, not false. A false check does not rule out the risk occurring later. Future conditions remain pending.`;
