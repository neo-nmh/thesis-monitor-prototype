import { ampbContext, sharedResearchRules } from '../shared-research.ts';

export const ampbCatalystPrompt = (asOf:string) => `${sharedResearchRules(asOf)}
${ampbContext}
AMPB CATALYST CARD
Separate the catalyst happening from its expected business or market effect. Use official dates for earnings, launches, approvals, capital returns or corporate actions, then verify each stated outcome independently. An announcement is not completion; regulatory submission is not approval; a launch does not prove sales. An earnings release can verify what guidance was issued, but not whether that guidance will be met. An event with a future assessment window remains pending. If the claimed price reaction is assessable, source the actual price interval rather than infer it from the news.`;
