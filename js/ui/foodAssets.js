import { escapeHtml } from "./helpers.js";

const FOOD_ASSET_IDS = new Set([
  "rice_paper", "shrimp_salt", "satay", "tamarind_sauce", "scallion_oil", "green_mango",
  "vietnamese_coriander", "fried_shallot", "peanut", "quail_egg", "beef_jerky", "chicken_jerky",
  "dried_shrimp", "calamansi", "food_box", "mixing_bowl", "shop-logo", "product_traditional",
  "product_beef", "product_chicken", "product_special",
]);

export function renderFoodAsset(id, className = "food-asset", label = "") {
  if (!FOOD_ASSET_IDS.has(id)) return "";
  const accessible = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="${className}" ${accessible}><use href="./img/food-assets.svg#${id}"></use></svg>`;
}
