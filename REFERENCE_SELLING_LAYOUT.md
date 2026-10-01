# Reference Selling Layout Contract

Reference: [Tiệm Trà Mơ Ước](https://tiemtramouoc.tensorship.tech/)

This contract follows the supplied selling-screen reference and its interaction description. The live page was opened at a 390 × 844 viewport; its first-run introduction has to be completed before its selling screen can be reached. The serving composition below is the structure to preserve while adapting the tea tools to bánh tráng trộn.

Direct reference captures and the two visual comparison passes are in [visual-audit/reference-rebuild/README.md](visual-audit/reference-rebuild/README.md).

## Top-to-bottom composition

| Order | Reference region | Position and visual role | Bánh tráng mapping |
|---:|---|---|---|
| 1 | Header | Compact, persistent shop status: controls at the left, day and time beside them, cash/shop identity centered, rating on the right. | Keep the existing game header, replacing any visible tea identity with the bánh tráng domain. |
| 2 | Awning | A shallow striped shop valance directly under the header; it visually joins the header to the street-facing counter. | Reuse the pink-and-cream awning as the boundary above the customer lane. |
| 3 | Customer queue | Small, evenly spaced circular portraits below the awning. The active guest is emphasized; waiting guests stay visible as a row. | Keep the queue circles, focus ring, and patience ring. New guests append without stealing focus. |
| 4 | Main customer | One large standing character on the left, below the queue, facing the counter. It anchors the scene as an in-person transaction. | Use the current customer sprite at a fixed 145–165 px mobile height and 160–175 px desktop height. |
| 5 | Order bubble | Cream speech bubble to the customer's right, with a brown outline and a tail aimed back at the character. It grows vertically to show the whole immutable order. | Show product, BÉ/LỚN, requested toppings, exclusions, seasoning, and sauce in readable highlighted text. |
| 6 | Counter title | A short wooden nameplate at the top edge of the work counter, rather than a generic page heading. | Label it **QUẦY BÁNH TRÁNG**. |
| 7 | Size selector | Two illustrated cup stacks (M/L) sit at the left of the preparation bench and remain visually separate from ingredient controls. | Two fixed bowl/box illustrations labelled **BÉ** and **LỚN**; internal M/L values remain unchanged. |
| 8 | Main ingredient dispensers | A horizontal line of labelled tea dispensers occupies the bench immediately to the right of size. The dispenser bodies and taps read as shop equipment. | A row of ingredient jars for bánh tráng, muối tôm, sa tế, sốt me, dầu hành, and tắc. Selecting a jar gives local feedback and adds the ingredient to the bowl. |
| 9 | Preparation area | A large cup sits on a work surface at the left, with the fill/preparation interaction tied directly to it. | A large layered mixing thau is the left anchor. Its contents update as ingredients are added; mixing animation stays on the thau. |
| 10 | Topping trays | A fixed grid of inset metal bins to the right of the preparation vessel. Some bins remain visibly locked instead of disappearing. | Use a stable inox-tray grid for xoài, rau răm, hành phi, đậu phộng, trứng cút, khô bò, khô gà, and tép khô; retain locked slots in place. |
| 11 | Secondary ingredients | Smaller ingredient stations sit below the main work surface (ice and sugar in the tea reference), keeping less frequent controls secondary. | Put extra seasoning/sauce controls, e.g. cay level and sauce, in a lower fixed shelf. Keep the ingredient picker aligned with order detail. |
| 12 | Action/footer area | Equipment and the current next action stay at the lower/right end of the counter; feedback appears by the customer after serving. | A visible đóng hộp machine and one primary contextual action: **TRỘN**, then **ĐÓNG HỘP**, then **GIAO KHÁCH**. Show reaction/rating by the customer. |

## Layout rules

- Preserve the single front-of-shop scene and its vertical order: header → awning → queue → customer/order → counter → size and base jars → bowl/trays → secondary shelf → next action.
- Keep the customer on the left and the order bubble on the right. At 390 px, the two share one compact stage; the bubble uses the remaining width and expands for long requests rather than truncating.
- Keep the workstation wide and visually dominant in the lower portion of the game column. Use shallow counters, physical-looking dispensers, an oversized bowl, and inset trays; avoid nested dashboard cards and button grids.
- Keep the center column near 560 px maximum on desktop. At mobile, prioritize queue, customer/order, and workstation together without making the user repeatedly scroll between the order and the bowl.
- All ingredient slots and station dimensions stay fixed while stock, focus, order, or animation state changes.

## Interaction contract

- Generate an order once when a customer arrives; switching focus, rendering, timer updates, and resizing do not replace it.
- `focusedCustomerId` selects the visible guest/order; `activePreparationOrderId` keeps the in-progress preparation attached to its guest.
- Clicking a jar/tray gives immediate local feedback and adds that ingredient. The mix motion lasts about 1.4 seconds on the thau only. Packing transitions from thau to box in 400–700 ms. Serving moves the box toward the guest, shows a reaction and money/rating result by that guest, removes the guest, and focuses the oldest remaining arrival.
- The queue, clock, and patience update locally; the selling view is not fully rebuilt on the timer.

## Source mapping guardrails

- **Tea / milk tea / pearls / cups** become **bánh tráng / seasoning / toppings / bowls and boxes** in visible UI.
- Keep business IDs and existing purchase/save compatibility where required. Inventory filters remain strict to the selected category; pending purchase quantities and subtotal remain intact.
- Reuse project-owned character and illustration assets. Add coherent project SVGs for any missing bowl, size, tray, seasoning, or packing equipment; do not import or hotlink reference assets.
