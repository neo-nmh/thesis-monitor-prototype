import { sntContext, sharedResearchRules } from '../shared-research.ts';

export const sntCatalystPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${sntContext}
SnT CATALYST CARD
Resolve the relevant release, central-bank meeting, election or policy event relative to thesisCreatedAt. Distinguish its scheduled date, realized result and market reaction. Polls, implied probabilities and commentary are not event outcomes. An election result does not prove subsequent legislation, and a rate cut does not prove a rally in bonds or a currency move. Test a surprise only against an identifiable pre-event expectation; do not invent consensus. Use the requested fixing/close and observation interval for market reactions. Future events and their future effects remain pending, even if earlier releases support the narrative.`;
