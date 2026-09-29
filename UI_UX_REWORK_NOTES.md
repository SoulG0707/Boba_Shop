# UI/UX rework notes

## Reuse

- Inventory, preparation readiness, purchasing, economy, customer creation, orders, mixing/packing/serving, reviews, upgrades, employees, online orders, daily events, persistence, backup, day cycle and contextual audio systems.
- Existing customer sprite sheets, management icons, Baloo 2 font files and the bánh tráng logo.
- Compact money formatting through `formatMoneyCompact()`.

## Adapt

- Preparation now combines the shop sign, chalk menu board, visible six-item primary navigation, compact truthful stock advice, estimated customer count, category filters, ingredient rows and the fixed open-shop action.
- Selling retains its existing order and service rules but gives the bowl and illustrated ingredients the central work area, with clearer customer orders and serve feedback.
- Settings and support screens use cream sheets and rows. Employees, mini-games, settings, online-order information and daily tax details live under “Thêm”.
- Saves gain a persisted `tutorialCompleted` flag. Existing saves without that field are normalized as returning saves; new saves begin with the seven-page tutorial.

## Replace

- The constrained wall treatment and pink tea-shop visual language are replaced by a full-viewport illustrated bánh tráng stall, chili/cream awning, orange accent, warm cream surfaces, wood trim and dark chalkboard.
- Main navigation no longer has a “Tiệm” tab. Its six tabs are Kho, Nâng cấp, Giá bán, Đánh giá, Tổng kết and Thêm.
- Primary ingredient and product emoji are replaced by reusable SVG art for ingredients, bowl, takeaway box and products.
- Welcome no longer contains tea branding or a QR/Zalo promotion.

## Domain search notes

- Active UI copy and assets use the bánh tráng domain.
- `tea-shop-game-save-v1` remains only as `LEGACY_STORAGE_KEY` so old browser data can be recognized and migrated.
- The `barista` role string remains only in legacy-save conversion and is normalized to the current `mixer` role.
- Previous drink/shop image files remain on disk, uncached and unused; see [ASSET_MIGRATION.md](ASSET_MIGRATION.md).

## Verification

- `node --check` passed for all 46 JavaScript modules.
- Automated browser walkthrough passed at 390 × 844 and 1366 × 768.
- Zero stock and partial stock kept the open-shop action disabled. Sufficient inventory enabled it.
- Tutorial skip/completion persisted, the tutorial replay action worked, and the returning save appeared after reload.
- A legacy version-2 save migrated to the current schema while preserving day and money and bypassing first-run onboarding.
- A customer order was read, ingredients were added to the bowl, mixed, packed and served. The balance, daily revenue and review updated; values survived reload.
- End-of-day settlement advanced to Day 2 preparation and carried accumulated revenue.
- Settings bottom-close and More navigation were present and interactive.
- Browser console: no errors. Neither capture exceeded its viewport width; desktop browser scrollbar reduced the document width to 1351px inside the 1366px viewport.

## Known limits

- The reference recording only shows a developer-message modal, so shop, navigation, preparation and selling visuals were guided by the attached product brief rather than direct video frames.
- The `+5k trứng cút` menu-board line is a visual menu cue; current order recipes still determine actual ingredients and do not expose a separate optional add-on picker.
- Old tea-related assets are marked for later cleanup instead of being deleted during this UI change.
