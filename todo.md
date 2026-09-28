# Mercadinho do Bairro — gameplay roadmap

Source: [gameplay analysis](docs/GAMEPLAY-ANALYSIS.md). Check off work only after it is implemented and validated. The times below are **design targets**, not measured player results.

Baseline before P0: levels continue indefinitely; the last unlock is at level 5. Three active simulation runs bought every upgrade in 12.8–13.2 minutes. The proposed first campaign ends at level 20 after roughly 2–3 hours of active play; that campaign remains future work. With P0 implemented, three active simulations made the first sale at about 17 seconds, bought the first upgrade at 32–46 seconds, and bought every current upgrade in about 15 minutes. Human timing and touch usability still need validation.

## P0 — Fix the first five minutes

- [x] Replace the opening “serve 25 customers” objective with a short sequence: harvest tomatoes → stock the shelf → make the first sale → buy the first improvement.
  - Done when each step advances from an actual game event, gives a clear next destination, and survives saving/reloading.
- [x] Add world hints for the active task and a visible preview of the next store area (corn).
  - [ ] Validate with fresh desktop and portrait mobile players that they can identify where to go without opening Help. The headless browser could not render the 3D scene reliably.
- [x] Make the first useful improvement affordable early; review the cost and unlock order for basket, cashier, helper, and corn.
  - [ ] Validate the human targets of first sale in 30–45 seconds and first useful improvement in 60–90 seconds. Bot results are faster and do not measure comprehension.
- [x] Smooth reputation-driven traffic. Separate the increase in arrival rate from the increase in order size, and make recovery from poor reputation practical.
  - Done when one happy customer cannot cause the current jump from 8 to 36 nominal items of demand per minute.
- [x] Improve harvest, stocking, sale, purchase, and level-up feedback. Show the immediate benefit and next goal after each purchase.
- [x] Correct the README basket progression; the current upgrade takes capacity from 4 to 8, with no 12/16 tiers.
- [x] Update the stale entrance-door imports in `tests/layout.test.js` so the baseline test suite can run against the current `bairro.js` API.

## P1 — Build one complete expansion before the full campaign

- [x] Set the helper's minimum level to the planned egg level (5). New helper hires also require eggs to be unlocked; keep helpers already purchased in older saves. Helper speed requires the helper.
- [x] Implement eggs at level 5 through the new production wing so players can satisfy the helper prerequisite.
- [x] Implement a staged store footprint shared by the scene, collision map, pathfinding, camera bounds, and save data.
  - A stage defines its prerequisite, price, active floor, walls, stations, paths, and unlocked products.
  - Done when buying an expansion changes the physical map and existing actors remain in reachable positions.
- [x] Make the next wing visible as a construction site. On purchase, reveal floor space, equipment, signs, and a useful shorter path or new service area.
- [x] Add one new production chain, starting with a single input and output, such as corn → feed → eggs.
  - Done when the player can learn the chain, sell its output, and see why the new department matters.
- [x] Pair the first stocking helper with that new department so hiring staff creates a new player task instead of ending active play.
- [x] Introduce the new product gradually in customer orders; do not demand it from every customer before the player can stock it.
- [x] Add save migration for stages, recipes, and staff state. Existing saves must retain money, customers served, purchases, and unlocked products.
- [ ] Test the complete expansion on desktop and portrait mobile: construction reveal, reachability, customer and helper routes, performance, and reload. Automated route, sale, stocking, and reload checks pass; headless desktop and narrow portrait browser captures were reviewed. Hands-on phone playtesting and frame-rate measurement remain.

## P2 — Extend to a 20-level first campaign

| Levels | Store stage | Main addition | Elapsed target |
| --- | --- | --- | ---: |
| 1–3 | Compact produce stall | Learn the loop; tomatoes and cashier | 5 min |
| 4–7 | Produce wing | Corn at level 4; feed, eggs and helper at level 5 | 21 min |
| 8–11 | Refrigerated wing | Milk, cheese, storage | 45 min |
| 12–15 | Bakery frontage | Wheat, bread, worker specialization | 77 min |
| 16–20 | Neighborhood supermarket | Loading area, mixed orders, final expansion | 129 min |

- [ ] Define level rewards and visible milestones for every level, including a clear completion state at level 20.
- [ ] Give players a small accomplishment or decision every 2–4 minutes, especially during later 10–12-minute levels.
- [ ] Add the refrigerated, bakery, and supermarket stages one at a time, validating each stage before adding the next.
- [ ] Add staff assignments and stock-priority logic. A helper should choose shortages and must not wait indefinitely at a full shelf.
- [ ] Scale baskets and concurrent customers with actual store capacity. `CONFIG.maxClientes` currently does not control admission.
- [ ] Add storage, production capacity, and a second checkout only when observed bottlenecks make them useful.
- [ ] Keep a completed level-20 store playable; make any restart or second-shop progression optional.

## P3 — Tune and validate the economy

- [ ] Instrument first sale, upgrade, expansion, level, and completion times; stockout duration; queue time; paid and empty visits; income per minute; and time spent working versus waiting.
- [ ] Extend `scripts/analyze-progression.mjs` to cover each new stage and multiple purchase policies. Include cases where the player does nothing after hiring staff.
- [ ] Balance each level using expected customer throughput and the target minutes per level. Balance purchase costs using uncommitted income and target saving time; inspect upgrade payback separately.
- [ ] Check that demand never greatly exceeds the minimum of crop production, transport, shelf space, baskets, and checkout capacity unless a brief, announced challenge is intended.
- [ ] Playtest fresh desktop and mobile sessions. Measure median and slower-player completion times, where players get lost, and whether they understand the next task.
- [ ] Adjust the campaign toward 2–3 hours of active play from observed results. Avoid lengthening it solely through higher prices or repeated customer-count goals.

## P4 — Optional depth after the core campaign works

- [ ] Add neighborhood orders, short announced busy periods, and cosmetic milestones with clear optional rewards.
- [ ] Consider offline earnings only after staffed production is reliable; cap earnings according to real production bottlenecks.
- [ ] Explore a second store with a distinct layout and product mix while preserving the completed first store.
