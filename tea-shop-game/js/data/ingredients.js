export const INGREDIENTS = [
  { id: "tea", name: "Trà đen", unit: "gói", purchasePrice: 1_200, expirationDays: 14, startingQuantity: 24, emoji: "🍃" },
  { id: "milk", name: "Sữa tươi", unit: "phần", purchasePrice: 1_800, expirationDays: 5, startingQuantity: 20, emoji: "🥛" },
  { id: "matcha", name: "Bột matcha", unit: "phần", purchasePrice: 2_300, expirationDays: 20, startingQuantity: 14, emoji: "🍵" },
  { id: "sugar", name: "Đường", unit: "phần", purchasePrice: 300, expirationDays: 60, startingQuantity: 30, emoji: "🍯" },
  { id: "blackPearl", name: "Trân châu đen", unit: "phần", purchasePrice: 700, expirationDays: 4, startingQuantity: 18, emoji: "⚫" },
  { id: "whitePearl", name: "Trân châu trắng", unit: "phần", purchasePrice: 800, expirationDays: 4, startingQuantity: 12, emoji: "⚪" },
  { id: "cup", name: "Ly và nắp", unit: "bộ", purchasePrice: 500, expirationDays: 120, startingQuantity: 32, emoji: "🥤" },
];

export const INGREDIENT_BY_ID = Object.freeze(
  Object.fromEntries(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient])),
);

export const STARTING_STOCK = Object.freeze(
  Object.fromEntries(INGREDIENTS.map(({ id, startingQuantity }) => [id, startingQuantity])),
);
