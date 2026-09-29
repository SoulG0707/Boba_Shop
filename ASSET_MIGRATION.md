# Asset migration audit

The game domain is bánh tráng trộn. These classifications describe the finished rework; obsolete tea-shop files are not referenced by active UI or the service-worker cache.

## KEEP

- `img/characters/customers.webp`, `img/characters/delivery-customers.webp` — customer expressions and online-delivery portraits.
- `img/icons/calendar.png`, `employees.png`, `inventory.png`, `prices.png`, `reviews.png`, `settings.png`, `stats.png`, `upgrades.png` — generic management navigation.
- `img/banh-trang.svg` — bánh tráng bowl mark.
- `fonts/Baloo2-*.woff2` — Vietnamese-capable Baloo 2 family.
- `img/food-assets.svg` — new illustrated SVG sprite for ingredients, bowl and takeaway box.
- `img/stall-wall.svg` — new full-viewport bánh tráng shop scene.

## REPLACE

- Previous pink bubble-tea palette and striped awning → chili-orange, cream, wood, mango and herb palette.
- Existing narrow/repeating wall treatment → illustrated full-viewport shop scene with window, light strand, ingredient shelves, cart and lower garnish display.
- Ingredient/product emoji as primary inventory or mixing graphics → the reusable SVG ingredient sprite; emoji remain only in small copy/status text where they help scanning.
- Previous splash page → cream welcome panel and seven-step bánh tráng tutorial; no QR or Zalo promotion.
- Previous preparation panel → overlapping shop sign and menu board, compact advice/status, visible connected navigation, ingredient rows and fixed action.

## DELETE LATER

These legacy files remain on disk for a separate cleanup pass, but are not used by current screens or the service-worker precache:

- `img/backgrounds/preparation.jpg`, `img/backgrounds/selling.jpg`, `img/backgrounds/splash-shop.jpg` — previous bubble-tea/shop art.
- `img/cup/glass.png`, `img/cup/lid.png`, `img/tea-cup.svg`, `img/icons/tea.png`, `img/icons/preparation.png`, `img/splash-decor/cup.png`, `img/splash-decor/pearl.png` — drink/cup graphics.
- `img/icons/noodles.png`, `img/icons/clock.png`, `img/icons/pause.png`, `img/icons/warning.png`, `img/splash-decor/lantern-left.png`, `lantern-right.png`, `leaf.png`, `star.png`, `cup.png`, `pearl.png`, `berry.png`, `cat.png`, `cloud.png`, `heart.png` — unreferenced legacy or duplicate art.

## Sound

`AudioManager` synthesizes short contextual tones through Web Audio and has no pour-a-drink sample. `snd/` contains only its README. No sound asset was migrated.
