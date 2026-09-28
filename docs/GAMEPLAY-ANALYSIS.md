# Gameplay and progression analysis

Reviewed 2026-09-28. This records the game **before the P0 onboarding and pacing changes**. It is a source-code review and headless simulation experiment, not a browser/mobile playtest. Proposed timings below are design targets, not measured player behavior. The analysis itself did not change gameplay; see `todo.md` for the implemented P0 work and current timing checks.

## Main finding

The harvest → carry → stock → sell → upgrade loop is already present. The largest opportunity is to extend the sequence of meaningful changes: master a task, automate it, open a department, learn a new task. Increasing prices or customer counts alone would extend repetition.

There is **no designed maximum level**. `Simulacao.nivel` is `1 + floor(payingCustomers / 25)`. The final unlock gate is level 5, but earning enough money to purchase everything takes longer. Afterward, levels and money continue without additional products, store stages, or upgrades.

The linked [My Mini Mart reference](https://funox.com/en/game/my-mini-mart) describes proximity-based harvesting, carrying, stocking, cash rewards, employee hiring, and expansion. That supports the reference loop; the page does not establish an exact level cap or completion time. I did not play its embedded build, and the timing estimates here concern this repository only.

## Current progression and time to finish

| Level | Total paying customers | Available content | Cost |
| --- | ---: | --- | ---: |
| 1 | 0 | Tomatoes; carry 4; manual checkout | — |
| 2 | 25 | Carry 8; cashier | R$100 + R$500 |
| 3 | 50 | Stocking helper | R$500 |
| 4 | 75 | Corn garden and shelf | R$650 |
| 5 | 100 | Player speed; helper speed; fertilizer for each crop | R$100 + R$100 + R$200 |
| 6 onward | Every additional 25 | No additional configured unlocks | — |

Seven upgrade definitions represent eight purchases, totaling **R$2,150**. The basket currently caps at 8; README text mentioning 12 and 16 is outdated.

I ran three seeded starts for each of three scenarios using `scripts/analyze-progression.mjs`. Raw results are in `progression-results.jsonl`.

| Scenario | Reach level 5 | Purchase everything |
| --- | ---: | ---: |
| Unlimited shelf supply and continuous checkout, counterfactual benchmark | 8.66–8.70 min | 11.34–11.89 min |
| Active stocking/checking-out bot using actual movement and production | 9.31–9.66 min | 12.79–13.15 min |
| Same opening, then employees handle work after both are hired | 9.42–9.83 min | 13.25–13.36 min |

All nine runs purchased everything at level 6. In the active runs the first basket upgrade arrived around minute 3, cashier around 4.6, helper around 7.4–7.5, and corn around 11.3. The helper and corn were therefore purchased later than their advertised level gates.

Method: 60 Hz simulation, seeded random numbers, real customers, reputation, inventory, crop growth, collision-aware routing, and normal purchase validation. The active bot fills its basket, stocks the least-stocked unlocked shelf, and clears checkout when needed. It buys in this order: basket, cashier, helper, corn, player speed, helper speed, both fertilizers. Purchases happen remotely and instantly, so office travel, menu reading, and fertilizer selection time are omitted. Other purchase strategies may differ. Three seeds are a small sensitivity check, not confidence intervals or a human skill distribution. The unlimited-stock case is not a proof of fastest possible completion.

**Planning estimate for a new human player: roughly 15–25 minutes to buy all current upgrades**, possibly longer with confusion or stockouts. This range is judgment based on the approximately 13-minute bot results plus learning/navigation overhead, not measured playtesting. Level 5 is the last unlock tier, not a win condition. Time to a maximum level is undefined because none is implemented.

At a constant paying-customer rate, `minutes to level L ≈ 25 × (L − 1) / customersPerMinute`. At 12 customers/minute that is about 2.1 minutes per level; at 4 it is 6.25; at 3 it is 8.3. Arrival rates do not guarantee payment rates. Travel, five reserved baskets, stockouts, and checkout affect the result. Hidden tabs and pauses do not advance play, and there is no offline earning system.

## What most limits engagement

1. **Early progression asks for repetition before explaining the loop through objectives.** The recurring task is already “serve 25 customers.” Add a short sequence: collect 4 tomatoes → stock the shelf → complete the first sale → buy the first improvement. Show the destination in the world. Target a first sale within 30–45 seconds and a useful upgrade within 60–90 seconds; validate on mobile.
2. **Automation almost ends the player's role.** Staff-only completion was within about half a minute of active completion for these seeds. Keep automation rewarding, but pair it with a new department or optional higher-value job. Let employees maintain the established store while the player opens the next system.
3. **Corn adds another route but little new behavior.** Follow it with a simple transformation, such as corn → feed → eggs, or milk → cheese. Begin with one input and one output; avoid multiple unfamiliar chains at once.
4. **The map is largely complete from the start.** Corn reveals configured objects inside fixed world bounds and walls. It does not expand the store footprint. Make new floor space, entrances, machines, signage, and staffing positions appear with milestones.
5. **Reputation changes demand too abruptly.** Starting reputation is 60. One happy customer can raise it to 64, changing arrivals from every 15 seconds to every 5, and maximum orders from 3 to 5. Nominal expected demand jumps from 8 to 36 items/minute before capacity limits. Tomatoes grow at about 33.3/minute before fertilizer, even before transport losses. Smooth the ramp and introduce larger orders separately from higher footfall.
6. **Levels are disconnected from growing operational complexity.** Every tier uses another 25 paying customers; satisfaction points are tracked separately and do not grant levels. Add specific milestones, and make every level provide a visible or useful reward.
7. **The helper does not prioritize shortages.** It cycles products and can wait at a full shelf while carrying that product. With more departments, select work using stock relative to demand, allow reassignment, and define storage/overflow behavior.

## Recommended first campaign: 20 levels, five store stages

Aim for **2–3 hours of active play** to finish the first store, across multiple sessions. This requires new playable content; the current two products cannot support that duration well.

| Levels | Store evolution | New decision or task | Approximate elapsed target at end |
| --- | --- | --- | ---: |
| 1–3 | Compact produce stall; tomatoes and corn | Learn loop, increase carrying capacity, hire cashier | 5 min |
| 4–7 | Open produce wing and service passage | Hire/assign stocker, add feed → eggs | 21 min |
| 8–11 | Add refrigerated wing and receiving/storage area | Milk supply, cheese processing, balance inputs and finished stock | 45 min |
| 12–15 | Open bakery frontage and second service area | Wheat → bread, worker specialization, predictable busy periods | 77 min |
| 16–20 | Grow into neighborhood supermarket with loading area | Mixed delivery orders, larger storage, department optimization, final expansion | 129 min |

Illustrative minutes for each level transition, 1→2 through 19→20:

`2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 12`

These add to **129 minutes (2 h 9 min)**. They are a proposed pacing budget, not a forecast from implemented content. First-time players may need longer. Give level 20 a clear completion state; afterward offer optional optimization or a second shop with a different layout and product mix. Preserve the completed shop and make any reset optional.

Between major stages, award capacity, shelf space, storage, worker assignment slots, production capacity, and appearance changes. Place a smaller decision or accomplishment every 2–4 minutes; later 10–12-minute levels must not be empty waits.

## Make expansion feel physical and useful

- Show the next wing as a fenced construction site with its price, requirement, and future department visible.
- On purchase, animate the fence removal, floor/wall change, new equipment delivery, and sign change. Reveal the first interaction immediately.
- Give each expansion an operational benefit: a shorter service path, another loading point, storage, or checkout capacity. More floor space should not just increase walking distance.
- Establish distinct visual landmarks and clear product icons for each department. Keep delivery and customer paths readable on a portrait screen.
- Stage customer demand after opening: first supply a few introductory orders, then ramp toward normal demand. Do not immediately send every customer to an empty new department.
- Preserve access to earlier departments and the office. Recalculate routes and move actors to safe positions if construction changes their occupied space.

The map needs stage data shared by rendering, collisions, navigation, camera bounds, and persistence. Merely adding entries to `PRODUTOS` is insufficient: the current layout includes hard-coded crop obstacles and fixed walls. A stage should define its prerequisite, price, active zones, stations, walls, paths, and bounds. Add recipe and employee assignment data separately. Migrate saves: the current version mismatch behavior starts a fresh game.

## Economy and scaling rules

Use store levels for unlocks and money for purchases. If adding XP, award it for completed sales and one-time milestones; endlessly moving products between locations should not become the fastest progression strategy. Reward satisfied orders modestly, without making unhappy players unable to recover.

Tune each new tier using observed throughput rather than an arbitrary exponential cost curve:

- `required XP ≈ expected XP/min × target minutes − expected one-time mission XP`
- `purchase cost ≈ expected uncommitted cash/min × target saving minutes`
- `upgrade payback time = price / incremental cash earned per minute`

These measure different things. Saving time determines affordability; payback measures the value of the improvement. Account for purchases competing for the same money. Current level gates already show why nominal availability does not guarantee the player can afford the reward.

For a first tuning pass, target minor improvements after about 1–3 minutes of saving and early expansions after about 4–6, increasing later only when other activities fill the interval. Validate against real play. Check demand against the minimum of production, transport, shelf availability, checkout, and basket capacity. Add a second checkout when queues demonstrate a need; the current 1.15-second checkout is theoretically much faster than the maximum arrival rate.

Increase customer concurrency with the physical capacity of the store. Currently five reserved baskets constrain admission; `CONFIG.maxClientes` is not used by the spawning logic. Raising that unused setting would not scale traffic. Separate order size, arrival rate, and patience tuning. Start new players with a gentler demand ramp and make reputation recoverable through ordinary successful service.

## Reasons to keep playing

Keep three visible goals: something to do now, an affordable improvement soon, and a larger expansion to anticipate. Improve carry-stack readability, stock transfer feedback, purchase previews, and level-up celebrations. These are candidates for visual playtesting, not claims about observed rendering quality.

Add optional neighborhood orders using existing products, customer requests with clear rewards, and decoration milestones that personalize the store. An announced short busy period can test a new upgrade. Missing an optional challenge should not remove already-earned progression. Keep core progression available without compulsory return timers or daily streaks.

Offline earnings could help return sessions later, but first establish reliable staff production. If introduced, derive earnings from staffed production bottlenecks with a clear cap; do not multiply total shop revenue as though every department were automated.

## Implementation order and validation

1. Improve the first five minutes: onboarding objectives, destination hints, early upgrade affordability, smoother reputation demand, and a visible next expansion.
2. Build one true expansion and one processing chain; pair it with automation and evaluate whether it creates useful decisions.
3. Generalize stage data, staff assignments, recipes, customer capacity, and save migration. Then extend to the full campaign.
4. Tune duration using recorded first-sale, upgrade, expansion, and level times; paid/empty visits; stockout duration; queue time; income/minute; and active-versus-staff-only progress.

Start with fresh desktop and mobile players. Measure median and slower-player completion, where they stop, and whether they understand what to do next. The simulation is useful for checking the economy, but cannot validate touch comfort, comprehension, visual excitement, or retention.

Baseline verification: `npm test` reports **62 passed, 1 failed**. `tests/layout.test.js` imports `POSICOES_PORTAS_ENTRADA` (and the old position helper), while `bairro.js` exports the newer entrance-angle API. This existed before the analysis; gameplay and tests were left unchanged. Refresh that test as part of subsequent implementation.

Primary implementation references: `src/jogo/configuracao.js` (economy and unlocks), `src/jogo/simulacao.js` (level/reputation/customer/staff behavior), `src/jogo/bairro.js` and `src/jogo/cena.js` (fixed layout and station visibility), `src/interface/interface.js` (objectives and office purchases), and `src/main.js` (visible-page simulation).
