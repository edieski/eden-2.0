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
