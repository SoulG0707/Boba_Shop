const foodBox = { food_box: 1 };

const baseProducts = [
  {
    id: "traditional",
    name: "Bánh tráng trộn truyền thống",
    category: "Truyền thống",
    icon: "product_traditional",
    basePrice: 25_000,
    baseRecipe: { rice_paper: 1, shrimp_salt: 1, satay: 1, green_mango: 1, vietnamese_coriander: 1, fried_shallot: 1, peanut: 1, calamansi: 1, ...foodBox },
    description: "Vị chua cay quen thuộc, thơm xoài xanh và rau răm.",
    unlockedByDefault: true,
  },
  {
    id: "beef",
    name: "Bánh tráng trộn khô bò",
    category: "Khô bò",
    icon: "product_beef",
    basePrice: 32_000,
    baseRecipe: { rice_paper: 1, shrimp_salt: 1, satay: 1, green_mango: 1, vietnamese_coriander: 1, fried_shallot: 1, peanut: 1, calamansi: 1, beef_jerky: 1, ...foodBox },
    description: "Thêm khô bò dai thơm, đậm đà.",
    unlockedByDefault: true,
  },
  {
    id: "chicken",
    name: "Bánh tráng trộn khô gà",
    category: "Khô gà",
    icon: "product_chicken",
    basePrice: 32_000,
    baseRecipe: { rice_paper: 1, shrimp_salt: 1, satay: 1, green_mango: 1, vietnamese_coriander: 1, fried_shallot: 1, peanut: 1, calamansi: 1, chicken_jerky: 1, ...foodBox },
    description: "Khô gà lá chanh thơm nhẹ, cay vừa.",
    unlockedByDefault: true,
  },
  {
    id: "special",
    name: "Bánh tráng trộn đặc biệt",
    category: "Đặc biệt",
    icon: "product_special",
    basePrice: 40_000,
    baseRecipe: { rice_paper: 1, shrimp_salt: 1, satay: 1, tamarind_sauce: 1, green_mango: 1, vietnamese_coriander: 1, fried_shallot: 1, peanut: 1, calamansi: 1, quail_egg: 1, beef_jerky: 1, dried_shrimp: 1, ...foodBox },
    description: "Đủ vị sốt me, trứng cút, khô bò và tép khô.",
    unlockedByDefault: true,
  },
];

export const PRODUCT_OPTIONS = Object.freeze({
  sizes: {
    M: { label: "Bé", ingredientMultiplier: 1, priceModifier: 0 },
    L: { label: "Lớn", ingredientMultiplier: 1.4, priceModifier: 8_000 },
  },
});

export function getSizeLabel(size) {
  return PRODUCT_OPTIONS.sizes[size]?.label ?? PRODUCT_OPTIONS.sizes.M.label;
}

export const PRODUCTS = Object.freeze(baseProducts.map((product) => Object.freeze(product)));
export const PRODUCT_BY_ID = Object.freeze(Object.fromEntries(PRODUCTS.map((product) => [product.id, product])));

export function getProductRecipe(productId, { size = "M" } = {}) {
  const product = PRODUCT_BY_ID[productId];
  if (!product) return null;
  const sizeOption = PRODUCT_OPTIONS.sizes[size] ?? PRODUCT_OPTIONS.sizes.M;
  return Object.fromEntries(Object.entries(product.baseRecipe).map(([ingredientId, quantity]) => [
    ingredientId,
    ingredientId === "food_box" ? quantity : Math.ceil(quantity * sizeOption.ingredientMultiplier),
  ]));
}

export function getProductPrice(productId, sellPrices, { size = "M" } = {}) {
  const product = PRODUCT_BY_ID[productId];
  if (!product) return 0;
  const sizeOption = PRODUCT_OPTIONS.sizes[size] ?? PRODUCT_OPTIONS.sizes.M;
  const basePrice = sellPrices?.[productId] ?? product.basePrice;
  return Math.round(basePrice + sizeOption.priceModifier);
}
