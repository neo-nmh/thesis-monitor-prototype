# Research prompts

The eight research prompts are in `ampb/` and `snt/`, each with `reasoning.ts`, `catalyst.ts`, `risk.ts` and `invalidation.ts`. `index.ts` selects one using the saved team and card kind. Each includes the common timing/evidence rules and its team's data guidance from `shared-research.ts`.

`researchRequest` receives one card ID. All its automated checks are returned under their exact IDs. Manual checks and other cards are untouched. The main research button queues the same card requests; it has no separate research prompt.

Verdicts always mean the literal statement is true or false. `check-display.ts` maps true risks/invalidation to red ticks and false risks/invalidation to green crosses. Reasoning/catalysts use green ticks and red crosses. Unclear uses a yellow minus, researched pending outcomes use a grey minus, and unresearched checks use an empty grey circle; both grey states share one donut segment.

`monitor-summary.ts` is a separate one-sentence synthesis prompt, not another research workflow. It summarizes saved checklist results after each card completes without web search or new verdicts. If synthesis fails, completed research is preserved with a factual fallback sentence. Form validation remains in `../ai-validation.ts`.

Each card reserves $0.27 against the existing $12 application allocation before validation, web research and synthesis. Usage reports remaining **card** researches. Actual API cost is recorded separately. The application allocation is not a provider billing guarantee.
