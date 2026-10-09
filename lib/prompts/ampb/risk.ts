import { ampbContext, sharedResearchRules } from '../shared-research.ts';

export const ampbRiskPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${ampbContext}
AMPB RISK CARD
Test whether each written downside condition occurred: for example margin compression, lost customers, financing stress, competition or weak demand. true means that adverse statement is supported; false means observed evidence contradicts it. The UI shows true as a red tick and false as a green cross. Do not reverse statuses. Verify the specified threshold and period, not the general possibility of the risk. Management discussing a risk is not evidence it materialized, and a mitigation plan is not evidence it was avoided. A false check does not mean this risk is impossible in the future. Keep unresolved future risks pending, and assessable but undocumented risks unclear.`;
