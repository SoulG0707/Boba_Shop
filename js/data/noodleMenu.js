export const NOODLE_MENU = [
  {
    id: "spicyBeefNoodle",
    name: "Mì cay bò",
    description: "Mì tươi, nước dùng cay và thịt bò.",
    price: 52_000,
    recipe: { noodles: 1, spicyBroth: 1, beef: 1 },
    emoji: "🍜",
  },
  {
    id: "fishBallNoodle",
    name: "Mì cay cá viên",
    description: "Mì cay nóng hổi với cá viên dai ngon.",
    price: 46_000,
    recipe: { noodles: 1, spicyBroth: 1, fishBall: 2 },
    emoji: "🌶️",
  },
];

export const NOODLE_BY_ID = Object.freeze(Object.fromEntries(NOODLE_MENU.map((item) => [item.id, item])));
