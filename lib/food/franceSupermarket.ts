/** Prompt block: menus and grocery lists must use only items found in French supermarkets. */
export const FRANCE_SUPERMARKET_RULES = `
SHOPPING CONTEXT — FRANCE ONLY:
- The user shops at French supermarkets (Carrefour, Leclerc, Intermarché, Auchan, Lidl, Monoprix, Franprix, etc.)
- Every ingredient and grocery item must be realistically available in France — no exotic imports or Anglo-only products
- Use natural French product names: crème fraîche, comté, baguette, haricots verts, jambon blanc, lardons, fromage blanc, etc.
- Metric quantities only: g, kg, ml, L, pièces, botte, barquette
- Substitute unavailable items with French equivalents:
  - heavy cream → crème liquide or crème fraîche
  - cheddar → comté, emmental, or gruyère
  - scallions → oignons nouveaux or cébette
  - cilantro → coriandre fraîche (when in season)
  - bacon → lardons fumés or poitrine fumée
  - ground beef → bœuf haché 5% or 15%
- Avoid: US/UK brand names, hard-to-find ethnic specialty items, items not sold in standard French rayons
- Staples you can assume: beurre, lait, œufs, farine, huile d'olive, moutarde, sel, poivre, pâtes, riz, conserves, bouillon cube
- Proteins common in France: poulet, bœuf, porc, lardons, jambon, saumon, cabillaud, thon en boîte, œufs, lentilles, pois chiches
- If photos show non-French or unavailable ingredients, adapt the dish to use French supermarket substitutes
`;

/** Prompt block: keep plans cheap and built around batch cooking / meal prep. */
export const BUDGET_MEALPREP_RULES = `
BUDGET OPTIMISATION:
- Minimise cost without sacrificing nourishment — this is a priority
- Prefer affordable French staples: œufs, lentilles, pois chiches, haricots rouges, pâtes, riz, pommes de terre, carottes, oignons, courgettes, thon en boîte, bœuf haché, poulet entier (not just filets), saucisse, jambon blanc, fromage en bloc (emmental, comté râpé MDD)
- Reuse the same ingredients across many meals — fewer unique products = lower bill
- Buy in bulk when an ingredient appears 3+ times (1 kg poulet, 1 kg riz, 500 g pâtes, 1 L lait, etc.)
- Favour MDD / marque distributeur and Lidl/Intermarché basics over premium brands
- Skip expensive items: saumon frais, viande premium, pré-découpés, sauces prêtes chères, fromages rares
- Seasonal produce only — cheaper and fresher
- One grocery list should feel like ONE shop, not 21 separate recipes

MEAL PREP OPTIMISATION:
- Structure the plan around 1–2 batch-cook sessions (e.g. Day 1 + mid-plan refresh if {num_days} > 5)
- Cook once, eat multiple times — dinners become next-day lunches
- Build around prep components: riz/pâtes en batch, légumes rôtis, poulet rôti, sauce tomate, soupe, salade composée base
- Breakfast can repeat all week (same overnight oats, tartines, yaourt — zero decision fatigue)
- Each meal description MUST say how it fits prep: "Batch Day 1" / "Reheat portion" / "Assemble 5 min from prepped riz + légumes"
- ADHD-friendly: front-load effort on prep days, then mostly reheat/assemble
- Prefer fridge-safe meals 3–4 days; freeze portions if plan is longer than 5 days
- Minimise daily cooking to 15 min or less on non-prep days
`;
