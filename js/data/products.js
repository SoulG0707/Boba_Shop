const baseProducts = [
  {
    id: "milkTea",
    name: "Trà sữa truyền thống",
    category: "Trà sữa",
    emoji: "🧋",
    basePrice: 28_000,
    baseRecipe: { tea: 1, milk: 1, sugar: 1, cup: 1 },
    description: "Trà đen thơm, sữa dịu và ngọt vừa.",
    unlockedByDefault: true,
  },
  {
    id: "matchaLatte",
    name: "Matcha latte",
    category: "Matcha",
    emoji: "🍵",
    basePrice: 34_000,
    baseRecipe: { matcha: 1, milk: 1, sugar: 1, cup: 1 },
    description: "Matcha xanh mịn pha cùng sữa tươi.",
    unlockedByDefault: true,
  },
];

export const PRODUCT_OPTIONS = Object.freeze({
  sizes: {
    regular: { label: "Vừa", priceMultiplier: 1, recipeMultiplier: 1 },
    large: { label: "Lớn", priceMultiplier: 1.3, recipeMultiplier: 1.5 },
  },
  toppings: {
    none: { label: "Không topping", price: 0, recipe: {} },
    blackPearl: { label: "Trân châu đen", price: 5_000, recipe: { blackPearl: 1 } },
    whitePearl: { label: "Trân châu trắng", price: 6_000, recipe: { whitePearl: 1 } },
  },
});

export const PRODUCTS = Object.freeze(baseProducts.map((product) => Object.freeze(product)));
export const PRODUCT_BY_ID = Object.freeze(Object.fromEntries(PRODUCTS.map((product) => [product.id, product])));

export function getProductRecipe(productId, { size = "regular", topping = "none" } = {}) {
  const product = PRODUCT_BY_ID[productId];
  if (!product) return null;
  const sizeOption = PRODUCT_OPTIONS.sizes[size] ?? PRODUCT_OPTIONS.sizes.regular;
  const toppingOption = PRODUCT_OPTIONS.toppings[topping] ?? PRODUCT_OPTIONS.toppings.none;
  const recipe = {};

  for (const [ingredientId, quantity] of Object.entries(product.baseRecipe)) {
    recipe[ingredientId] = Math.ceil(quantity * sizeOption.recipeMultiplier);
  }
  for (const [ingredientId, quantity] of Object.entries(toppingOption.recipe)) {
    recipe[ingredientId] = (recipe[ingredientId] ?? 0) + quantity;
  }
  return recipe;
}

export function getProductPrice(productId, sellPrices, { size = "regular", topping = "none" } = {}) {
  const product = PRODUCT_BY_ID[productId];
  if (!product) return 0;
  const sizeOption = PRODUCT_OPTIONS.sizes[size] ?? PRODUCT_OPTIONS.sizes.regular;
  const toppingOption = PRODUCT_OPTIONS.toppings[topping] ?? PRODUCT_OPTIONS.toppings.none;
  const basePrice = sellPrices?.[productId] ?? product.basePrice;
  return Math.round(basePrice * sizeOption.priceMultiplier + toppingOption.price);
}
