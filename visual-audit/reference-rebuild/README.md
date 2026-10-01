# Selling screen reference audit

## Captures

`reference-selling-390x844.png` and `reference-selling-1366x768.png` are direct captures of the live reference page after opening its first selling day. The mobile capture preserves the reference's first-run tutorial prompt; no pixels from the reference were edited. The desktop page keeps the reference site's portrait gameplay column centered in the wide browser viewport.

The user supplied later-day screenshots as the visual target for a busier queue and active work area. The live-site captures are from a clean test profile at Day 1, so their queue, order, and tutorial state differ from the supplied Day 8 examples.

## Visual passes

- **Iteration 1** established the hierarchy, fixed size controls, horizontal dispensers, large mixing bowl, metal tray grid, and the complete order bubble. Its counter surface still read as one framed card.
- **Iteration 2** kept the reference's left customer/right speech bubble and bowl-left/trays-right layout, then removed the enclosing side frame around the wood surfaces so the workstation reads as an open counter. The final capture has a full bowl, long order, and enabled next action.

Use the comparison boards to inspect the same viewport side by side:

- [Iteration 1 · mobile](comparison-iteration-1-mobile.png)
- [Iteration 1 · desktop](comparison-iteration-1-desktop.png)
- [Iteration 2 · mobile](comparison-iteration-2-mobile.png)
- [Iteration 2 · desktop](comparison-iteration-2-desktop.png)

The corresponding current captures are [mobile](iteration-2-mobile-390x844.png) and [desktop](iteration-2-desktop-1366x768.png). The live reference captures are [mobile](reference-selling-390x844.png) and [desktop](reference-selling-1366x768.png).

## What changed after comparing

Iteration 2 softened the equipment row into a long wooden rail, removed the frame and rounded corners from the main work surface, removed the bowl's inset backdrop, and changed the lower seasoning shelf into a simple plank. The station still uses the same fixed grid so the trays do not move when ingredient counts change.

## Remaining differences from the reference

- The live reference uses a roughly 400 px portrait game column at a 1366 px desktop viewport. This project follows the requested 560 px maximum desktop column.
- The live reference has six tea dispensers; the mapped bánh tráng counter has four base/seasoning jars, two auxiliary containers, eight topping trays, and a distinct packing machine.
- The reference's original hand-drawn station art is denser. This implementation uses project-owned SVG equipment and the project's existing character sprites to keep one coherent art source without copying or hotlinking reference assets.
- The direct reference capture includes the Day 1 tutorial overlay. The user's supplied later-day screenshots show a later queue and no tutorial.

## Regression coverage

`../selling-rework/capture-and-test.mjs` captures both viewports and checks focus/order persistence for A/B/C/D, a full long order, serving A while B/C/D retain their orders, inventory category filtering and pending-cart persistence, a 10-second idle interval without a full selling rerender, no legacy tea wording or M/L size labels, tray bounds, and a playable selling clip of at least 20 seconds.
