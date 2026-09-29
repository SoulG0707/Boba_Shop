export const INGREDIENTS = [
  { id: "rice_paper", name: "Bánh tráng", category: "Bánh tráng", unit: "phần", purchasePrice: 1_200, expirationDays: 45 },
  { id: "shrimp_salt", name: "Muối tôm", category: "Gia vị", unit: "phần", purchasePrice: 450, expirationDays: 180 },
  { id: "satay", name: "Sa tế", category: "Gia vị", unit: "phần", purchasePrice: 550, expirationDays: 90 },
  { id: "tamarind_sauce", name: "Sốt me", category: "Gia vị", unit: "phần", purchasePrice: 500, expirationDays: 45 },
  { id: "scallion_oil", name: "Dầu hành", category: "Gia vị", unit: "phần", purchasePrice: 350, expirationDays: 5 },
  { id: "green_mango", name: "Xoài xanh", category: "Topping", unit: "phần", purchasePrice: 1_000, expirationDays: 3 },
  { id: "vietnamese_coriander", name: "Rau răm", category: "Topping", unit: "phần", purchasePrice: 350, expirationDays: 2 },
  { id: "fried_shallot", name: "Hành phi", category: "Topping", unit: "phần", purchasePrice: 450, expirationDays: 30 },
  { id: "peanut", name: "Đậu phộng", category: "Topping", unit: "phần", purchasePrice: 300, expirationDays: 60 },
  { id: "quail_egg", name: "Trứng cút", category: "Topping", unit: "quả", purchasePrice: 450, expirationDays: 7 },
  { id: "beef_jerky", name: "Khô bò", category: "Topping", unit: "phần", purchasePrice: 2_200, expirationDays: 60 },
  { id: "chicken_jerky", name: "Khô gà", category: "Topping", unit: "phần", purchasePrice: 1_800, expirationDays: 60 },
  { id: "dried_shrimp", name: "Tép khô", category: "Topping", unit: "phần", purchasePrice: 800, expirationDays: 60 },
  { id: "calamansi", name: "Tắc", category: "Gia vị", unit: "quả", purchasePrice: 250, expirationDays: 5 },
  { id: "food_box", name: "Hộp đựng", category: "Đóng gói", unit: "hộp", purchasePrice: 600, expirationDays: 365 },
];

export const INGREDIENT_BY_ID = Object.freeze(
  Object.fromEntries(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient])),
);
