# BitzySpider.com - Project Guide

Personal portfolio site for Yitzy Rosenberg. Hosted on GitHub Pages at bitzyspider.com.

## Why this site exists

Yitzy's story doesn't fit on a resume. He left an insular community at 15, taught himself high school on public library Wi-Fi, went from a GED to a full scholarship at Cornell. He's worked across wildly different fields - managing a $350M water infrastructure portfolio for 10 million people, leasing commercial real estate, founding two startups. The site exists to make that non-linear path feel like a superpower, not a liability.

The goal is that someone lands on the page and within a few seconds thinks: "This person is sharp, builds things, and is not boring." The spider chasing their cursor is the first signal - before they read a single word, they're experiencing something Yitzy engineered. That's the whole pitch in miniature.

## The impression it should give

**Competence through demonstration, not claims.** The spider isn't decoration - it's a working piece of engineering (IK legs, physics, canvas rendering) that proves technical skill before the visitor reads the About section. The site itself is the portfolio.

**Unconventional is the point.** The copy leans into the weird resume: "I don't fit in boxes. I usually break them to see how they're made." The structure mirrors this - it's not a standard corporate portfolio with a timeline. It's organized by energy (how he spends it) and identity (operator, engineer, connector).

**Human, not corporate.** The tone is direct and a little playful. Phone number is "(304) 44-YITZY". The CTA says "Whether you have a wicked problem that needs untangling, or you just want to know how I coded the spider chasing your mouse." There's a section about Friday Night Dinners and scuba diving. The person behind the work matters as much as the work.

**Spider as brand metaphor.** This is the core creative decision. Spiders are systems engineers - they build complex, resilient structures out of nothing. That maps directly to how Yitzy describes his approach: assess the situation, hack a path, build the system. The domain is bitzyspider.com. The favicon is a spider. The interactive spider IS the cursor. The counter says "BUGS DEBUGGED." It's not a gimmick bolted on - it's the throughline of the entire brand.

## Design choices and why

**Black background, red accents:** Bold and technical. The dark theme signals engineering/hacker culture. Red (`#dc2626`) is the spider's accent color (fangs, joints, hourglass marking on the favicon) - it pops without being aggressive.

**The spider replaces the cursor on desktop:** This is intentional and a little aggressive as a design choice. It forces engagement - you can't ignore it. It says "this site is different" within the first second. The tradeoff is some people will find it annoying, but the people Yitzy wants to talk to will think it's cool.

**Mobile spider lives in a corner:** On mobile the full-screen spider was too intrusive - it followed your finger and blocked content. The corner web with the dangling spider keeps the brand present without getting in the way. The fly chase after a minute of idle is a reward for people who stick around. Tapping the spider lets you opt into the full interactive experience.

**"BUGS DEBUGGED" counter:** Playful double meaning. The spider literally catches bugs on screen, and Yitzy catches bugs in production code. It's a small dopamine hit that keeps people moving their mouse. The counter is intentionally subtle (small, bottom-left, no backdrop blur) so it doesn't compete with the content.

**Monospace for code-y elements, clean sans-serif for body:** The monospace (counter, tagline) reinforces the engineering angle. The body text is clean and readable - the site isn't trying to be a terminal emulator, just nodding to that world.

**Content organized by identity, not chronology:** "The Operator" and "The Engineer" instead of a job timeline. "The Math of Community" instead of "Volunteer Work." "Off The Clock" instead of "Hobbies." Every section name does double duty - it describes the content AND tells you how Yitzy thinks about himself.

**Friday Night Dinners, scuba, film photography, flying:** These aren't random hobbies. Each one says something: he brings people together (dinners), stays calm under pressure (scuba - "check your gauges, know your environment, don't panic"), values intention over speed (film photography), and literally has a pilot's license. The gallery is another way of saying "I'm a systems thinker who operates in the real world."

## What this site is

A single-page portfolio with an interactive spider that follows your cursor (desktop) or lives in a corner web (mobile). The spider is the central brand metaphor - Yitzy "untangles wicked problems" like a spider builds webs.

## How the code is organized

This repo is a **production build only** - there is no source code. The React app was built with Vite and the output was committed directly. If you need to change React components, you have to edit the minified JS. If you need to add new behavior, add it as a plain script in `index.html`.

**The majority of the site's customization now lives in `index.html` as plain JS scripts** that inject into or replace the React-rendered DOM. The minified React bundle provides the skeleton (nav, hero heading, section containers, spider canvas) and the scripts in `index.html` override content, add new sections, and fix layout issues.

### Files

```
index.html              Entry point. Loads the React bundle and contains:
                        - <style> block: CSS overrides for heading size,
                          nav clearance, mobile fixes
                        - Spider kill switch script (?spider=0)
                        - Mobile spider script (corner web + dangle)
                        - Current Projects section injection (Astrid)
                        - Work section card replacement (4 experience cards)
                        - Toolkit section replacement (7-category grid)
                        - Education section injection (2 photo cards)
                        - Section nav buttons injection (hero)
                        - Contact section redesign (icons, rows)
                        - Longboard gallery card injection
                        - Community section redesign (3 photo cards)
                        - Section spacing unifier
                        - Desktop spider hint text
                        - Bug Hunt game link (fixed pill + hero line)
                        - Logo click-to-top handler
                        - Desktop nav link injection (Skills, Education)
                        - Mobile slide-up hamburger nav menu
                        This is the easiest and preferred file to edit.

LEASE_Formula.pdf       Work sample PDF for commercial real estate card
2023_SFWMD_SLRFRP.pdf   Work sample PDF for infrastructure card

assets/
  index-ZZwLr-Wf.js    Minified React app (~296KB). Contains ALL components,
                        the interactive spider, Framer Motion, Lucide icons,
                        and Tailwind runtime. Editing this is possible but
                        delicate - only do simple string replacements.

  index-Cn99QLM1.css   Compiled Tailwind v4.1.12 CSS (~104KB). Only classes
                        that were used at build time exist here. You cannot
                        use arbitrary Tailwind classes unless they already
                        appear in this file.

favicon.svg             Spider icon (SVG). Dark body, white eyes, red
                        hourglass marking, 8 legs.

photos/                 All images used on the site:
  professional-headshot.jpg   OG/social sharing image
  headshot.jpg                About section (sticky on desktop, static on mobile)
  community.jpg               Friday Night Dinners card
  volunteering.jpg            Local Volunteering card
  aguaclara.jpg               AguaClara Reach card
  scuba.jpg                   Gallery - Scuba Diving
  travel.jpg                  Gallery - Handstand/Travel (object-position: center 20%)
  film-collage.jpg            Gallery - Film Photography
  film-headshot.jpg           Small film photo
  flight.jpg                  Gallery - Private Pilot
  longboard.jpg               Gallery - Board Meeting (longboard)
  Yitzy_Rosenberg_CV.pdf      Duplicate of root CV (used in some links)

Yitzy_Rosenberg_CV.pdf  Resume download (linked from contact section)
yitzy-rosenberg.vcf     vCard contact file (linked from contact section)
CNAME                   GitHub Pages custom domain: bitzyspider.com
.nojekyll               Tells GitHub Pages not to run Jekyll

game.html               "Bug Hunt" — standalone arcade game. Linked from the
                        main site via a fixed bottom-right pill ("WANT MORE
                        BUGS? PLAY BUG HUNT →" on desktop; shortened to just
                        "PLAY BUG HUNT →" with tighter sizing on touch so it
                        doesn't collide with the bottom-left BUGS DEBUGGED
                        counter) and a hero hint line, both injected by a script
                        at the end of index.html. Fully self-contained
                        (HTML+CSS+JS, no dependencies). Safe to iterate on
                        without touching index.html.

SUPABASE_SETUP.md       How to turn on the optional global leaderboard for Bug
                        Hunt: create a free Supabase project, run the table SQL
                        + RLS policies, paste the URL + anon key into game.html's
                        CLOUD block. Off by default (scores stay local).
```

## Bug Hunt game (game.html)

A standalone arcade game built on the site's spider brand. Lives entirely in `game.html`; the main site links to it via the injected pill/hero-line script in `index.html` (the game itself still has no dependency on the main site).

**Tutorial (optional, v20 — covers every mechanic):** a TUTORIAL ghost button on the menu starts a guided practice run (`startTutorial()` / `tutUpdate()` / `TUT_STEPS`): no quota (`hQuota` shows "practice", rank shows TUTORIAL), no automatic spawning — each step spawns/sets up what it needs. Shared steps (touch + desktop): MOVE (glide to a pulsing ring at `tutMark`), CATCH (fly), SHOOT→WRAP (beetle, message switches mid-step when it's webbed), WEAVE (1 strand), CROSS (1 crossing), AUTO-WEB (Q/AUTO builds the hub-and-spoke web — checks `strands.length >= tutStrandN+5`), REPAIR (it tears 4 strands then R/FIX re-weaves the gaps), TRAP (moth), SPREAD (double-click/F to fling a spread-web, spawns 3 flies), NEST (catch bugs to fill brood meter, then press N to lay), RAGE (meter pre-filled, press G/RAGE to activate berserk, checks `rageUntil > 0`). Desktop-only extras spliced in: HOLD STILL (after MOVE — hold SPACE, checks `tutHeldStill`), and appended BUG BOMB (grants 1, press B) and RECLAIM (eat a strand, E — its `init` lays a fallback strand if the web decayed so the step can't soft-lock). Completion banner, then auto-returns to menu. The banner is `#tutMsg`, positioned by the same `--ay` arena var as the HUD.

**Controls:** spider follows the mouse (desktop) or finger drag (mobile), with a deliberate hard speed cap — the spider is slow on purpose so webs matter. **Holding SPACE plants the spider in place** (`holdStill`) so you can turn and aim without drifting toward the cursor — it freezes position (not the auto-weaver) and suppresses idle-wander; released, it resumes following. Click / quick-tap shoots a web **where you click** (aimed, with ±28° aim-assist homing and a generous hit radius; costs 30 silk from a regenerating meter). *(SPACE used to shoot; it's now the hold-still key — shooting is click/tap only.)* **W (or the on-screen WEB button on touch)** anchors a strand at your position; walk, press again to pin it (silk cost ≈ length/12, min 5). It chains — you stay anchored at the pin point to keep weaving; pressing with <24px of travel exits build mode. The **silk trail dragging behind the spider snares** bugs that touch it (heavy slow for 1.6s, tears the trail segment; boss is immune). Stuck/webbed bugs struggle; walking over them "wraps" them for 1.5x points. P pauses, M mutes. **Double-click / double-tap (or F) fires a SPREAD** — flings a **visible spider web** outward (`spreads` fx: rotating radial spokes + woven capture rings that snap out over ~280ms then fade) in a `spreadR()` ring (base `SPREAD_R` 110px, +28/Spread-Silk tier) that traps every non-boss bug near you, including ones you've walked on top of and can't shoot; free but recharges slowly (`spreadCD()` base `SPREAD_CD` 7s, −1.3s/tier, floor 2.5s; `spreadAt` gate). **G (or the touch RAGE button)** activates rage mode when the orange meter is full — 5.5s of berserk (2.5× speed, invulnerable, auto-catches everything you touch). On desktop the **WEB, DETACH, EGG, RAGE, AUTO, EAT, FIX, and pause HUD buttons are all hidden** (the keys W/X/N/G/Q/E/R/P do the same); those on-screen pills are touch-only.

**Web structure rules (core mechanic):** each bug type has an `esc` time — how long it stays stuck on a strand before chewing through. **When a bug escapes, that strand breaks.** A strand needs **≥2 attachments** to hold: a shared endpoint counts 1 (snap within 18px, compare <2px), a **T-junction weld counts 1** (an endpoint resting on another strand's mid-line — `snapPoint` snaps anywhere along a strand, so you can repair/extend an existing web), a **mid-line crossing counts 2** (it pins the strand). Unsupported strands fray and fall apart in 12s (flickering). **Heavy bugs (r ≥ 11: beetle, stinkbug, slug) need TWO strands touching them to be held** — one strand only drags them (`dragUntil`/`dragSlow`, slower the bigger the bug); light bugs stick on one. So lone tripwires are temporary, an X of two crossing strands is stable, and chains decay from the tips inward. Crossings also get a woven diamond-mesh graphic (`crossings` array, recomputed in `recalcSupport`) — crossing your own line is both the visual and structural payoff. The dragonfly boss tears through strands instantly. Strands persist across levels within a run (max 48). Build flow: W/WEB anchors, walk, W/PIN pins and chains; X/Esc/DETACH stops weaving. **E is hold-to-eat**: while held (key or EAT button) the spider grazes any strand it walks over, reclaiming 60% into webSilk. **R / FIX repairs**: re-walks the last weaver spiral (`lastWebCenter`) — `strandCovered()` skips intact segments for free, gaps get re-laid; if the spider starts away from the web it walks there first (`autoArmed`) before laying. EAT/FIX buttons show on touch only; desktop uses the keys.

**Movement (important):** the spider uses the *original site spider physics*, extracted from the minified React bundle — position lerps 10%/frame toward the cursor (then hard-capped at `topSpeed()` = 150 + 40/tier px/s), rotation eases 15%/frame with angle wrap. 8 IK feet stay planted in world space until stretched past `STEP_DIST` (34 × scale), then step — **alternating tetrapod gait** (`GAIT` groups): only the active group may start steps, **hard cap of 4 simultaneously stepping legs** (most-stretched first), so ≥4 feet are always planted. **Steps must complete via a progress counter (`prog += 0.25/frame`, ~4 frames, then snap)** — never use a distance threshold to end a step, because the foot chases a moving target and will never arrive, which freezes the whole gait (this was a real bug). Feet land ahead of travel (velocity lead 0.14s) and initialize planted at their ideals (no spawn scramble). `spiderScale()` = 0.62 + 0.05/level + grip bonus, capped 1.25 — the spider starts small and **grows every level**. Catches happen at the *mouth* (15 × scale ahead of center). All per-frame lerps are framerate-independent via `1 - Math.pow(1-k, dt*60)`.

**Bug types** (unlock by level, `esc` = seconds to chew out of a strand): fly (L1, catch on contact, esc 5), moth (L2, fast, actively dive-bombs your strands like a porch light — sticks, chews out in 3s, snaps the strand; every moth is incoming web damage), beetle (L3, must be webbed, esc 8 — a **nest raider**: beelines for your eggs/spiderlings and eats them), wasp (L4, chases and stings — costs a heart, esc 2.5), firefly (L5, fast bonus that despawns after 7s — but **flies into your web and BURNS it**: torches the strand it touches plus the two nearest others via `burnWebAt`, freeing any bugs stuck on them, then flits off immune for 0.9s), stinkbug (L6, keeps distance and spits globs that slow the spider 55% for 2.5s, esc 4), slug (L7, slow tank leaving slime puddles that slow the spider, esc 10 — also a **nest raider**), webworm (L8, hunts your strands and eats one after latching 1.2s — immune to sticking, web-shot it), dragonfly (L9, rare tough regular: 3 web shots, `tears: true` strands, counts as 3 bugs, hub-slowed but trail-immune; its key in `TYPES` is still `boss` for historical reasons).

**Gradual difficulty (v14):** beyond unlocking new foes, every bug type gets harder the longer it's been in rotation. At spawn, `spawnBug()` computes `over = level − type.min` and bakes two per-bug factors: `spdK = min(1.45, 1 + over*0.045)` (up to +45% speed) and `escMult = max(0.62, 1 − over*0.03)` (chews out up to ~38% faster). Because each bug's AI re-caps velocity to its base `sp`, the speed factor is applied to the **displacement** (`b.x += b.vx*dt*mv*spdK`) so it scales uniformly across every movement pattern; `escMult` multiplies the stuck-time wherever `webT` is set from `esc` (strand stick + spread trap). Bosses are exempt (`spdK`/`escMult` = 1) — they're tuned per fight. Spawn rate (`spawnTimer`) and `maxAlive` already ramp with level on top of this.

**Bosses** (every 5th level via `pickBoss()`, 8-boss rotation): **Hornet Queen** (L5: 5 HP, orbits screen center, spawns up to 3 wasps marked `queenSpawn`), **Mantis** (L10: 4 HP, stalks at ~180px, lunges at 1.5x speed to sting, seeks strands to tear), **Moth King** (L15: 6 HP, huge erratic darter, summons up to 3 moths marked `kingSpawn`), **Tarantula Hawk** (L20: 5 HP, relentless pursuit with 1.6x dive bursts, stings), **Black Widow** (L25: 5 HP, wall-crawler that dashes diagonally across the arena and drops sticky globs that slow the player; purple `#a855f7`), **Centipede** (L30: 7 HP, serpentine wave movement with periodic high-speed charges at the spider; copper `#ea580c`), **Bombardier** (L35: 5 HP, circles at range and lobs acid globs at your strands — burns the hit strand + 2 nearest on impact, like a ranged firefly; cyan `#06b6d4`), **Assassin Bug** (L40: 6 HP, alternates between visible (circling at distance) and cloaked (alpha 0.12, creeping toward spider) states — decloaks at close range for an ambush sting at 1.8x speed; rose `#e11d48`) — then the rotation repeats. True bosses have `boss: true` (hub-immune, tears strands, qv 5). HP pips render in the boss's theme color (`BOSS_COLORS`), filled/empty. **Every boss releases a drop when wrapped** (`DROPS` table): queen → Royal Jelly (full hearts), mantis → Praying Charm (2x points 20s, `buffScoreUntil`), moth king → Moth Dust (1.5x speed 20s, `buffSpeedUntil`), hawk → Hawk Sting (+1 bomb), widow → Widow's Silk (full silk + webSilk refill), centipede → Shed Molt (brood meter full, instant egg ready), bombardier → Acid Flask (+2 bombs), assassin → Shadow Veil (+3 sting shields via `shieldHits`). Drops are walk-over pickups; any left uncollected auto-apply at `levelClear` so a quota-clearing boss kill never loses one.

**Rogue bosses (v16):** once you've beaten a boss it's added to `bossesBeaten` and can **return on later non-boss levels as a "rogue"** — same look and movement-AI (dispatched by `b.k`), but no longer a true boss. `spawnRogueBoss()` (≈6% per spawn at level ≥6, capped to one alive via `anyRogueAlive()`, skipped on `level % 5 === 0`) clones the boss type into `rogueType(kind)` (cached in `ROGUE_TYPES`): `boss:false` (so it's trappable, hub-slowable, spread-trappable), `tears:false`, `hp:2` (two web-shots), `qv:2`, `score ×0.4`, `esc:4`, and gives it a real heading (bosses spawn with `sp:0`). Rogues **don't summon minions** (the queen/mothking spawn gates check `!b.rogue`), don't drop loot, and don't use boss-only special attacks (widow doesn't drop globs, bombardier doesn't fire acid). They render with 2 HP pips. `bossesBeaten` resets in `startGame`.

**Foe reveal cards:** before a level that introduces something new, `beginLevel()` → `newFoesThisLevel()` finds foes whose `min === level` (plus the boss on boss-levels, plus any `?boss=` debug foe) that aren't in `foesSeen`, and shows a pre-level `#ovIntro` card (state `'intro'`, not in `overlays`-playing so the HUD hides): foe name/color, NEW FOE vs NEW BOSS tag, a one-line `FOE_INFO` description, and a live `drawBug` preview rendered into `#foeCanvas` by temporarily pointing the module `ctx` at it (`renderFoePreview`). Multiple new foes queue (`introQueue`, button reads NEXT then LET'S GO). The fly is pre-seeded as seen so level 1 starts immediately.

**Dual silk meters (v7):** `silk` (red bar) powers aimed web shots, regenerates fast (11 + 4/tier per s, max 100 + 30/tier). `webSilk` (white bar) pays for woven strands and auto-web, regenerates slowly (5 + 1.5/tier, max 160 + 40/tier) **but every catch feeds it** (+7, +14 wrapped) — hunting fuels building. Eating a strand (E, within 20×scale px) reclaims 60% of its cost into webSilk. A third meter, the **rage bar** (orange, `rageMeter`, v20), charges from catches (+6) and wraps (+14) — see "Rage mode" below.

**Nest — brood meter & spiderlings (v15/v16):** catching bugs charges a **brood meter** (`broodMeter`, yellow bar in the HUD, max `BROOD_MAX` 100). Each catch adds `BROOD_PER_CATCH` (12) or `BROOD_PER_WRAP` (22); passive regen ticks at `BROOD_PASSIVE` (1.5/s). When full, an **egg sac visibly forms on the spider's abdomen** (growing yellow cluster, drawn in `drawSpider`), and pressing **N (or the touch EGG button)** lays it at your position. The sac is vulnerable on the ground — any non-webbed, non-boss bug that reaches it bites it (`EGG_BITE` 34 hp/sec, drains its health ring). **Beetles and slugs are dedicated nest RAIDERS** (`raider: true`): they make a beeline for the nest from far off (≤540px, strong 650 pull, capped to their own speed) and hunt **both eggs and spiderlings** — a raider that catches a spiderling chews it (`RAID_BITE` 48 hp/sec vs `SPIDERLING_HP` 28 — spiderlings are **fragile**, gone in ~0.6s if undefended), and the spiderling flees and shows a health ring (dies → "spiderling eaten!"). Every *other* bug only drifts mildly toward eggs (≤280px, 240 pull), so flies/wasps still come for the nest while moths/fireflies prefer your web. **Protect the nest with your web:** a strand-hub (`HUB_R`) over the egg cuts bite damage to 32% (a *fortified nest*), and strands around it stop raiders before they reach it — so the loop is weave a web, lay eggs inside it, defend until they hatch. After `eggHatchMs()` (~16s, faster with NEST) a surviving egg **hatches into a spiderling** (`spawnSpiderling`) — a tiny autonomous hero-spider with **real IK legs** (`initSpiderLegs()` gives each its own 8-leg array + gait group, updated with the same tetrapod gait as the player: `STEP_DIST`, `GAIT`, progress counter, alternating groups — `updateSpiderlings`/`drawSpiderling`, scale 0.34, `SPIDERLING_SP` 138). Spiderling legs use a **stubbier `SPIDERLING_FEET`** rig (each foot pulled 36% back toward its hip so the babies don't look spindly) and avoid the chase-jitter that long legs had: movement uses a `dd > 4` deadzone (no twitching on top of a bug), foot lead reads a **smoothed velocity** (`s.svx/svy`), and feet are stickier (1.35× step trigger). It chases the nearest catchable bug and grabs it at its mouth (counts toward quota + feeds webSilk like your own catches; no wrap-freeze). Eyes track nearby bugs. **Separation (v18):** each spiderling pushes away from siblings within `SEP_D` (26px) so a brood that piles onto the same bug spreads back out instead of fusing into one blob — they cover more ground. **Slime traps them (v18):** `inSlimeAt(x,y)` (the position-parameterised form of the player's `inSlime()`) checks the babies too; a slimed spiderling crawls at 0.4× speed with a weaker lerp (kicking up slime particles as it wrangles free), so slug/widow slime is a real hazard for the nest helpers. The nest holds `maxBrood()` = 2 + brood eggs+spiderlings combined (laying is gated on brood meter being full + room in nest). Eggs/spiderlings **persist across levels** within a run and reset on `startGame`/`toMenu`/tutorial. The **NEST INSTINCT** shop upgrade (`brood`, max 3) toughens eggs (+60 hp/tier), speeds the hatch (−2.5s/tier), and raises the nest cap. HUD shows `· EGG nn%` or `· EGG READY` + `· EGGS n · BROOD n`.

**Rage mode (v20):** catching and wrapping bugs charges the **rage meter** (`rageMeter`, orange bar in the HUD, max `RAGE_MAX` 100). Each catch adds `RAGE_PER_CATCH` (6) or `RAGE_PER_WRAP` (14) — wraps charge faster. No passive regen; you earn rage purely from hunting. When the meter is full, pressing **G (or the touch RAGE button)** activates **berserk mode** for `RAGE_DURATION` (5.5s): the spider runs at **2.5× speed**, is **invulnerable** (`invulnUntil` set to `rageUntil`), **auto-targets** the nearest bug each frame (`rageActive()` overrides `target` in `update()`), and **auto-catches/wraps** every bug within a generous 50×scale px radius via `rageCollide()` — bugs are instantly webbed (hp 0, wrapped) and the spider gets full wrap credit (combos, points, meters). Rage overrides `holdStill` (the spider must chase), ignores stinkbug spit and slime slowdown, and suppresses idle-wander. **Visuals during rage:** the spider's body turns dark red (`#2a0a0a`), legs turn red (`#dc2626` strokes, `#f97316` joints), eyes become glowing red with yellow pupils, fangs enlarge, a pulsing red/orange aura radiates around the body, spark particles trail behind, and a red vignette pulses on the screen edges (fades as rage nears expiry). A custom `SFX.rage()` plays on activation (ascending sawtooth sweep). After rage ends the meter resets to 0 and must be refilled from catches. The `rageUntil` timestamp, `rageMeter`, and `rageActive()` function govern state; all are reset in `startGame`, `startTutorial`, and `toMenu`. HUD shows `· RAGE nn%`, `· RAGE ✓` (ready), or `· RAGE Ns` (active countdown). The rage bar pulses with a CSS animation when active. The RAGE step is in the tutorial (shared touch+desktop, after NEST), the CTRL_ROWS for both platforms, and the MECHANICS glossary.

**Hubs & combos:** 3+ strands sharing one endpoint form a **hub** — spiral rings render around it and bugs inside `HUB_R` (48px) move at 50% (boss immune). Wrapping bugs within 4s of each other builds a **combo** (x1.5 per step, cap x3) on top of `wrapMult()` (1.5 + 0.25/Venom-Fangs tier). Wraps trigger a 60ms hit-stop (`freezeUntil` gates `update()` in the loop, draw continues) and a twang ripple; snags ripple too. The HUD score is a count-up ticker (`shownScore`). After 2.5s without input the spider **idle-wanders** like the site spider (random-walk velocity on `target`, bounces off a 40px margin). Multiple bugs stuck on the same strand erode it faster (30%/extra bug) and the strand blinks faster/orange.

**Auto-weaver (Q / AUTO button) — hub-and-spoke (v18):** the weaver builds a true **hub-and-spoke web**, not a spiral. `autoWebEdges(cx,cy)` generates the canonical geometry from the toggle point: `AUTO_SPOKES` (6) straight radial spokes, each a chain of `AUTO_RINGS` (3) segments at radii `ringRadius(ring) = AUTO_RING*ring` (44/88/132), plus concentric **ring segments that connect each spoke vertex DIRECTLY to its neighbour** (a hexagon per ring — no overlapping spiral chords). The spider walks an edge queue (`autoEdges`): for each edge it walks to the near endpoint (phase `goA`, lays nothing), then to the far endpoint and pins the whole segment on arrival, so every laid strand runs vertex-to-vertex. `reorderAutoEdges()` keeps the queue nearest-first (and flips each edge so the closer endpoint is walked first) so the spider never backtracks. Because every connection is a **shared endpoint** (center hub = 6 spokes; each rim vertex = inward radial + 2 chords), the web is self-supporting with **zero mid-line crossings**. Each segment costs webSilk, so a fresh player (webSilkMax 160) is silk-limited and the web stops partway with "out of web silk" — buy Silk Glands to weave the full web. Stops when the queue empties ("web complete!"), on silk-out, on the strand cap, or **when the player moves the mouse / drags** (600ms grace). A faint dashed guide outlines the segments still to lay. `lastWebCenter` remembers the center for repairs.

**Repair (R / FIX) — gap-first (v18):** `startRepair()` enumerates the canonical `autoWebEdges(lastWebCenter)` and queues **only the edges that aren't currently covered** (`strandCovered` false), so the spider goes straight to the actual holes instead of re-walking the intact web. The HUD message reports the gap count ("repairing N gaps…"); if nothing is missing it says "web intact — nothing to repair." Repair shares the same edge-walking loop as the auto-weaver (`autoRepair` flag distinguishes the completion message). **Repair is mouse-locked (v19):** unlike the auto-weaver (which hands control back the moment you move the mouse), `setTarget` only cancels auto-web when `!autoRepair` — so moving the mouse during a repair does nothing; press **R again** to exit repair mode (`startRepair`'s leading `if (autoWeb) stopAutoWeb()` toggles it off). Note: when `layAuto` fails (silk-out / strand cap) it calls `stopAutoWeb` which nulls `autoEdges`, so `updateAutoWeb` must bail on `!ok` *before* touching the queue (a real crash fixed in v19).

**Internal-only web graphics (v18):** the decorative woven meshes are clamped so they never extend past the actual silk. In `recalcSupport`, each hub gets an `rMax` (the nearest connected strand's far-endpoint distance) and each crossing gets an `rMax` (nearest of the 4 strand endpoints). The hub spiral rings only draw when the hub is well-enclosed (`n >= 4`) and stop before they reach `rMax`; the crossing diamond knit stops at `rMax` too. So the "web" graphic only fills the internal cell between connected strands — it doesn't float out into empty space.

**Menu/pause UI (v21 declutter):** the start menu is intentionally minimal — title, a one-line tagline, the BEST/BUGS-DEBUGGED stat (`#mHigh`/`#mTotal`), the arena-size picker, a big START HUNTING button, and a row of ghost buttons: **TUTORIAL, CONTROLS, FIELD GUIDE, HIGH SCORES**. The icon-based controls grid (`CTRL_ROWS` → `renderControls()`) is no longer inline on the menu; it lives in its own **CONTROLS overlay** (`#ovControls`, state `'controls'`, opened by `btnControlsMenu` via `openControls()`), which still renders into `#menuControls`. The pause overlay keeps its inline grid (`#pauseControls`). Touch and desktop get different rows. The old "KNOW YOUR BUGS" legend was dropped from the menu (it's redundant with the Field Guide's BESTIARY tab).

**High score tracker (v21):** the top 8 runs persist in localStorage under `bughunt_scores` as a JSON array of `{ s: score, lv: level, d: epoch-ms }`. `recordScore(score, level)` (called from `gameOver()`) pushes the run, sorts descending, trims to `SCORE_KEEP` (8), saves, and returns the run's **1-based placement** (0 if it missed the board; a score of 0 is never recorded). The **HIGH SCORES overlay** (`#ovScores`, state `'scores'`, `renderScores(freshIdx)`) lists each run's rank, score (comma-grouped), `LV n · rankName(n)`, and a relative timestamp (`agoStr()`: "just now" / "5m ago" / "2d ago" / locale date). It's openable from the menu (`btnScoresMenu` → `openScores('menu')`) and from the game-over card (`btnScoresOver` → `openScores('over', lastPlace-1)`, which highlights the just-finished run via the `.fresh` row class). `scoresReturn` remembers where BACK goes. On game over, `#oRank` shows a placement badge — "🏆 NEW HIGH SCORE!" for #1 or "#N ON THE BOARD!" otherwise — and is hidden if the run didn't place.

**Global leaderboard (v23, optional cloud board):** an opt-in shared/cross-device high-score board powered by a free **Supabase** project, hit with two plain `fetch` calls (no SDK, no build step) to keep the page dependency-free. It's **config-gated** by the `CLOUD` block near the top of the game script (`{ url, key }`, both blank by default). `cloudOn()` returns true only when both strings are filled and `fetch` exists; with it off, the game is 100% local and unchanged. Helpers: `sanitizeName()` (letters/digits/space/`._-` only, collapse whitespace, cap 12), `htmlEsc()`, `submitScore(name, sc, lv)` → POST to `…/rest/v1/scores` (resolves true/false), `fetchGlobal()` → GET top 20 by `score.desc` (resolves array or null). When cloud is on: the HIGH SCORES overlay shows a **THIS DEVICE / GLOBAL** tab switch (`#scoreTabs`, `showScoreTab()`, `loadGlobal()`/`renderGlobal()` into `#globalRows`, reusing the `.glossTab` styling); the game-over card reveals a name input + **SUBMIT TO GLOBAL** button (`#oSubmit`/`#oName`/`#btnSubmitScore`), pre-filled from `bughunt_name`, that posts the finished run and flips to "SUBMITTED ✓". The anon key is meant to be public — access is gated by Postgres **row-level-security** policies (read + bounded insert only; no update/delete), not key secrecy. A client-only board is inherently forgeable; sane CHECK bounds + manual row deletion in the dashboard are the moderation story. Full setup (table SQL, RLS policies, where to paste the two keys) lives in **`SUPABASE_SETUP.md`**.

**Field Guide (v16):** a comprehensive glossary overlay (`#ovGloss`, state `'gloss'`) accessible from both the menu and pause screen via FIELD GUIDE ghost buttons. Three tabbed panes (`.glossTab` buttons switching `.glossPane` visibility): **BESTIARY** — every bug type with a live `drawBug` canvas preview (52×52), name (colored), threat tags (RAIDER/STINGER/BURNER/WEB-EATER/BOSS), the `FOE_INFO` description, and stat line (unlock level, escape time, weight class, special notes including boss drops). **UPGRADES** — all 9 core upgrades with icons (`UPG_ICONS`), pip count, and plain descriptions (`UPG_DESC`), plus the 4 advanced sinks. **MECHANICS** — 9 reference cards covering silk meters, strand support rules, heavy bugs, hubs, combos, brood/nest, difficulty scaling, boss drops, and rage mode. The `glossReturn` variable remembers whether to return to `'menu'` or `'pause'` on close. Rendering happens in `renderGlossary()` which populates all three panes including the foe preview canvases (same ctx-swap technique as `renderFoePreview`).

**Progression:** quota of bugs per level (`8 + level*4`, boss counts as 5, dragonfly 3). Each level has a fun rank name (`RANKS` array: HATCHLING → … → THE EXTERMINATOR, then ITSY BITSY LEGEND) shown in the HUD, at level start, and as "PROMOTED:" in the shop. Between levels an upgrade shop spends points (same number as score, tracked separately as `cash`): Swift Legs, Silk Range, Silk Glands (both meters), Strong Grip, Tough Silk, Venom Fangs, **Spread Silk** (v14: wider spread radius +28/tier and faster recharge −1.3s/tier, max 3), **Nest Instinct** (v15: tougher eggs +60hp/tier, faster hatch −2.5s/tier, bigger nest cap, max 3), Extra Heart. Once **all core upgrades are maxed**, an ADVANCED section appears (`SINKS`): Double Shot (3-way spread), Fortified Silk (stacking, +35% stuck time), Buy A Life (stacking), Bug Bomb (B key, webs everything in 140px). Hearts refill +1 per level clear. High score (`bughunt_hi`), lifetime "bugs debugged" (`bughunt_total`), the top-8 score board (`bughunt_scores`), the player's global-board name (`bughunt_name`), arena size (`bughunt_size`), and mute (`bughunt_mute`) all persist in localStorage under `bughunt_*` keys.

**Background (v22):** `renderBg()` bakes (once per resize / level) a rich per-level sky. The deterministic RNG is seeded by `1337 + level * 7919` so every level has a unique layout. Layers, bottom to top: (1) a deep **radial gradient** whose core carries `bgTint()` (hue rotates ~33°/level at 38% sat / 7% light via `bgHue()`); (2) **4-6 nebula clouds** — large soft radial-gradient blobs in hues ±30° of the level tint, very low alpha (0.025-0.05), giving each level a distinct color mood; (3) **three-tier starfield** — dim white motes (~W*H/9000), medium colored stars (~W*H/40000, blue-ish or warm tints), and 6-11 **bright stars** with glow halos and color (stored in `bgStars` for per-frame twinkling); (4) the orb-web motif (`bigWeb()`: 14 spokes + 9 wobbled rings) and two corner brand webs; (5) an **edge vignette** (radial gradient darkening the periphery). On top, `draw()` adds per-frame: a **breathing core-glow** (pulsing `sin(t*0.0006)`), **twinkling bright stars** (sine-wave brightness pulse with per-star phase offset, glow halo flares at peak), rare **shooting star** streaks (~every 40s, diagonal fade trail), and **ambient dust** (18 small white motes + 8 larger slow hue-tinted motes for parallax depth). `startLevel()` calls `renderBg()` so the sky shifts as you climb.

**Arena sizes (v8):** the menu has a SMALL (560×420) / MEDIUM (880×620) / FULL picker, persisted as `bughunt_size`. Windowed arenas center the canvas (`ofsX/ofsY`); pointer input converts via `evX/evY` and the fixed-position HUD shifts with CSS vars `--ax/--ay/--arx/--aby` set in `resize()`. `body.windowed` adds the arena outline.

**Debug params (internal testing):** `?lvl=15` starts runs at level 15, `?pts=2000` seeds shop cash, `?boss=mantis` (or `queen`/`mothking`/`hawk`/`widow`/`centipede`/`bombardier`/`assassin`/`boss`) force-spawns that type at every level start. Active params show as `· DEBUG (…)` after the version number on the menu. The version label (`#verLabel`, set from `GAME_VERSION`) is how you confirm which build you're on.

**Testing gotcha:** a stationary test bot never catches bugs, so the alive-bug population hits `maxAlive` and spawning stalls — rare types (worm, w:0.3) may never appear. To exercise a specific bug type headlessly, sed its weight up in the extracted JS instead of waiting — or just use the `?boss=` / `?lvl=` debug params, which work in the headless harness by stubbing `window.location.search`.

**Architecture notes:**
- Single IIFE in `<script id="game-js">`; ES5 style matching the rest of the repo
- State machine: `menu | play | shop | pause | over | intro | gloss | controls | scores` — DOM overlays per state, canvas renders always
- The menu runs an ambient autopilot (spider chases flies) behind the card
- Body/head/eyes/fangs drawing is verbatim from the site spider; legs come from the IK rig (world space), not the old sine-walk
- Input uses pointer events only; a "tap" is pointerup within 280ms and <16px of pointerdown and fires an aimed shot at the tap point; the WEB button (`#btnWeb`, bottom-right, `.on` class while weaving) works for both touch and desktop
- Resize/orientation changes clamp the spider, target, bugs, and strand endpoints back into the new bounds, so the game stays playable at any window size
- The game JS can be syntax-checked with `node --check` and smoke-tested headlessly by stubbing window/document/canvas (the stub needs `closePath`); an invincible-bot variant (patch `hearts--` and starting level via sed on the extracted JS) exercises boss/stinkbug/slug levels; the strand system is testable by simulating W-key weaving and watching `#silkLbl` strand counts decay

## The React app (inside index-ZZwLr-Wf.js)

The minified JS renders the initial DOM skeleton. Many sections are then **replaced or augmented by scripts in `index.html`**. The React components provide section containers with IDs that the scripts poll for and inject into.

| Section     | React provides | Scripts in index.html override |
|-------------|---------------|-------------------------------|
| **Nav**     | Fixed top bar. Logo + spider icon, section links, "Say Hello" button | **Logo** made clickable (scrolls to top). **Desktop:** Skills and Education links injected after Work. **Mobile:** "Say Hello" replaced with hamburger icon that opens a slide-up menu with all sections; swipe-down to dismiss |
| **Hero**    | Heading "I UNTANGLE WICKED PROBLEMS", subtitle, tagline, placeholder for nav buttons | CSS overrides heading size (`clamp(2.8rem, 7vw, 5.5rem)`), hides stray `<br>`, adds `padding-top: 10rem`. Scripts inject section nav buttons and desktop spider hint |
| **Current Projects** | *(does not exist in React)* | **Fully injected** before Work section: Astrid app demo in iPhone frame + description card |
| **About**   | "The Non-Linear Path" - life story, headshot, spider metaphor, Assess/Hack/Build methodology | CSS disables sticky headshot on mobile |
| **Work**    | "How I Spend My Energy" - section container with grid | **Grid contents replaced** with 4 standalone experience cards (Real Estate, Startup, Infrastructure, VC). Work sample badges color-matched to card accents (red or blue). Toolkit replaced with 7-category grid (id=`skills`). **Education section injected** after toolkit with 2 photo cards (Cornell, Self-taught) |
| **Community** | "The Math of Community" - section container | **Rebuilt** as 3 photo cards: Friday Night Dinners, Local Volunteering, AguaClara Reach |
| **Gallery** | "Off The Clock" - 4 cards: Scuba, Travel, Film Photography, Private Pilot | **Longboard card appended** (5th card). Grid converted to flexbox for centered bottom row. Travel image repositioned |
| **Contact** | "Let's Connect the Dots" - two button rows | **Button contents replaced**: Row 1 = Email, Phone, Save Contact (white). Row 2 = LinkedIn (blue), Download CV (red). All with SVG icons |
| **Footer**  | Logo, copyright | — |

### Section IDs (used for navigation)

The React app's original section IDs have been changed. The scripts in `index.html` rely on these IDs:

- `current_work` — "What I'm Building Now" (injected section)
- `track_record` — "How I Spend My Energy" (Work/experience cards + toolkit)
- `skills` — Toolkit grid (id added by script onto the React-rendered toolkit container)
- `education` — "Education" (injected section, 2 photo cards)
- `community` — "The Math of Community"
- `off_the_clock` — "Off The Clock" (gallery)
- `contact` — "Let's Connect the Dots"

The hero section nav buttons, desktop nav links, and mobile hamburger menu all link to these IDs. If you rename a section ID in the minified JS, update the corresponding `href` in the nav button script, the desktop nav injection script, and the mobile nav menu script.

### The Interactive Spider (desktop)

Lives inside the React app. Renders on a full-viewport `<canvas>` element with `fixed inset-0 pointer-events-none z-50`.

**How it works:**
- Follows the mouse cursor (or touch position on mobile if in full-screen mode)
- Has 8 legs with inverse kinematics - each leg steps toward target positions
- Eyes track the bug/fly position
- A bug/fly wanders the screen; when the spider's head gets within 30px, it "catches" it and the counter increments
- After 2.5 seconds of no mouse movement, the spider wanders autonomously with random velocity
- Leaves a silk trail: fading white lines connecting recent positions (lifetime: 5 seconds)

**Spider visual (faces RIGHT by default):**
- Body: `#1a1a1a` ellipse (20x16) with white 2px stroke, centered at (-5, 0)
- Fangs: `#ff4444` triangles
- Head: `#1a1a1a` circle (radius 12) at (15, 0) with white stroke
- Eyes: white sclera (radius 4.5) at (19, -5) and (19, 5), dark pupils (radius 2) that track the bug, white highlights
- Mouth: small white arc
- Legs: white 2px strokes with `#ff4444` joint circles (radius 1.5-2)

**Key constants in the minified JS:**
- `Md=20` - spider body width
- `Iy=12` - head radius
- `Fy=8` - number of legs
- `Dd=6` - bug body size
- `Oy=2500` - idle timeout (ms) before autonomous wandering
- `ma=8` - max wander velocity
- `Nd=0.5` - random velocity factor
- `pa=5000` - silk trail lifetime (ms)

**Counter UI:**
- Fixed position, bottom-left corner (`fixed bottom-4 left-4 z-[60]`)
- Shows "BUGS DEBUGGED: X" in monospace, with the number in red
- Small text (`text-xs`, `md:text-sm`), thin border, no backdrop blur
- `pointer-events-none` so it doesn't interfere with scrolling
- On mobile: hidden by the mobile spider script (replaced with corner web)

**Tagline** (in hero section):
- "(You debug the bugs on screen. I debug the ones in production.)"
- Followed by a subtle hint: "Move your cursor to guide the spider. Catch the bugs." (desktop only, injected by script)

### Cursor behavior (desktop)

The React spider hides the system cursor (`document.body.style.cursor = "none"`) on non-touch devices. The spider itself acts as the cursor. All clickable elements have `cursor-none` class.

## The Mobile Spider (inside index.html)

This is a plain JavaScript IIFE at the bottom of `index.html`. It only runs on touch devices. It exists because the full-screen spider is too intrusive on mobile - it follows your finger everywhere and gets in the way of reading.

**What it does:**

1. **Hides the React spider** - sets the original canvas and counter to `display: none`
2. **Creates a 160x200 canvas** fixed in the top-right corner
3. **Draws a web** - 8 spokes + 5 concentric rings radiating from the top-right corner
4. **Spider dangles** from an anchor point on the web (~135 degrees, 85% out along the spoke), hanging from a silk thread, gently swaying
5. **After 60 seconds idle**, a fly spawns and buzzes around erratically. The spider detaches and chases it, leaving a silk trail
6. **Tap the spider** to enter full-screen mode (shows the original React spider + counter). Returns to corner mode after 5 seconds of no touch activity

**The corner spider is visually identical to the React spider**, just scaled to 0.45x. Same body, head, eyes, fangs, legs, mouth. Eyes track the fly.

**Key variables in the mobile script:**
- `W=160, H=200` - corner canvas size
- `SC=0.45` - spider scale factor
- `FLY_DELAY=60000` - 60 seconds before fly appears
- `RETURN_TIMEOUT=5000` - 5 seconds before returning to corner from full-screen
- `trailLifetime=5000` - silk trail fades over 5 seconds
- `threadLen=50` - dangle thread length
- `swaySpeed=0.015, swayAmp=4` - gentle sway parameters

## Editing tips

**Preferred approach: inject via `index.html` scripts.** Almost all recent changes were done this way. The pattern is:

1. Poll for a React-rendered element by ID or selector using `setInterval`
2. Once found, `clearInterval` and inject/replace content
3. Use inline styles or existing Tailwind classes for styling

This is far safer and more readable than editing the minified bundle.

**To change text content in the React skeleton** (headings, descriptions, button labels):
- Search for the exact string in `assets/index-ZZwLr-Wf.js` and do a string replacement
- Be careful not to change the length of strings that are adjacent to important code
- Only do this for strings that aren't already overridden by `index.html` scripts

**To change styles on React-rendered elements:**
- **Prefer CSS overrides in the `<style>` block** in `index.html` with `!important`
- If you must edit the minified JS: find the `className:"..."` and only use Tailwind classes that exist in `assets/index-Cn99QLM1.css`
- To check if a class exists: `grep -o 'classname' assets/index-Cn99QLM1.css`

**To add new sections or features:**
- Add a `<script>` tag in `index.html` following the existing polling pattern
- Poll for a known element, inject your content relative to it
- See the Current Projects script for an example of injecting a whole new section

**To change the mobile spider:**
- Edit the script directly in `index.html` - it's plain readable JavaScript

**To change images:**
- Replace files in `photos/` keeping the same filenames
- Or update the filename references in the relevant script (most are now in `index.html`)

**To change experience cards, toolkit, community cards, or contact buttons:**
- These are all defined in plain JS objects/arrays in `index.html` scripts
- Edit the data directly — no minified JS involved

## Tech stack

- React 18+ (bundled, no source)
- Tailwind CSS v4.1.12 (compiled)
- Framer Motion (animations, page transitions)
- Lucide React (icons)
- HTML5 Canvas 2D (spider rendering)
- Vite (build tool, not present in repo)
- GitHub Pages (hosting)

## Design language

- **Colors:** Black background (`#000`), white text, red accents (`#dc2626`, `#ff4444`), blue accents (`#3b82f6` on alternating work cards, `#0A66C2` on LinkedIn button). Work sample badges match their card's accent color (red cards get red badges, blue cards get blue badges)
- **Card style:** Dark background (`rgba(24,24,27,0.2)`), zinc border (`#27272a`), border lightens on hover (to accent color at 30% opacity)
- **Fonts:** Monospace for code-themed elements (counter, section labels, taglines), sans-serif for body
- **Layout:** Single column on mobile, multi-column grid on desktop. Gallery uses flexbox to center the bottom row of 5 cards
- **Interactions:** Framer Motion hover/tap on React elements. Injected cards use CSS transitions (border-color, transform, image scale)
- **Section spacing:** Unified to `padding: 5rem 0` via script override (React default was `py-32`)

## Lessons learned

Things that tripped us up and how to avoid them in the future:

### The React h1 has a phantom `<br>`

The minified React app renders the hero heading as `"" + <br> + "I UNTANGLE..."`. That empty string + line break wastes a full line of vertical space, pushing the visible heading behind the fixed nav. **Fix:** CSS rule `h1 > br:first-of-type { display: none !important; }` in the `<style>` block.

### The fixed nav requires generous hero padding

The nav bar is ~80px tall and `position: fixed`. The hero section needs `padding-top: 10rem` (160px) to ensure the heading clears it, especially at large font sizes. The original React `pt-24` (96px) was not enough. **Fix:** CSS rule `section:first-of-type { padding-top: 10rem !important; }`.

### CSS `!important` is necessary to override React

The minified bundle applies Tailwind classes directly. To override them from `index.html`, you need `!important` on your CSS rules. Without it, the specificity of the compiled Tailwind classes wins.

### Heading size must be responsive

The React app used `text-6xl md:text-8xl` which was enormous on some screens and invisible on others. **Fix:** `clamp(2.8rem, 7vw, 5.5rem)` scales smoothly from mobile to desktop without breakpoint jumps.

### Sticky elements break on mobile

The About section headshot uses `sticky top-32` which overlays content on small screens. **Fix:** CSS media query disables sticky on `max-width: 767px`.

### DOM injection pattern

All `index.html` scripts follow the same pattern:
```js
var poll = setInterval(function(){
  var el = document.getElementById('section_id');
  if (!el) return;
  clearInterval(poll);
  // Now safe to modify el
}, 200);
```
This is necessary because React renders asynchronously. The 200ms interval is a good balance between responsiveness and CPU usage.

### Don't try to replace the React app wholesale

Early attempts to rewrite the entire page or refactor into a modular build system caused regressions. The safest approach is to **keep the React bundle as the skeleton** and **surgically override specific sections** from `index.html` scripts. Each script is self-contained and only touches one section.

### Section IDs were renamed

The original React section IDs (`work`, `gallery`, etc.) were changed to more descriptive names (`track_record`, `off_the_clock`, etc.). All nav links, scroll targets, and injection scripts must use the new IDs. If you change an ID in the minified JS, grep `index.html` for every reference to the old name.

### Navigation links exist in three places

The desktop nav bar, hero section nav buttons, and mobile hamburger menu all contain section links. When adding or removing a navigable section, **all three must be updated**:
1. **Hero buttons** — the `buttons` array in the hero nav buttons injection script
2. **Desktop nav** — the desktop nav link injection script (queries for `nav .hidden.md\\:flex`)
3. **Mobile menu** — the `sections` array in the mobile slide-up nav script

Missing any one of these will create an inconsistent experience between desktop and mobile.

### Desktop nav link ordering matters

The desktop nav injection script inserts links relative to existing React-rendered links using `insertBefore(newLink, referenceLink.nextSibling)`. The insertion order must be **reverse** of how you want them to appear if inserting after the same element, or you can chain them (insert A after Work, then insert B after A). The current order is: About, Work, Skills, Education, Community, Off the Clock.

### The React nav logo is a `<div>`, not an `<a>`

The BITZYSPIDER.COM logo in the top-left nav is rendered as a plain `<div>` (not a link). A script adds a click handler to scroll to the top of the page. If you ever need to change this behavior, the selector is `nav .text-2xl.font-bold`.

### Work sample PDFs live in the repo root

The work sample PDFs (`LEASE_Formula.pdf`, `2023_SFWMD_SLRFRP.pdf`) are served from the repo root, not a `/docs/` subdirectory. GitHub Pages serves all files in the root. The `badgeLink` paths in the work card data must be `'/LEASE_Formula.pdf'` not `'/docs/LEASE_Formula.pdf'`. Subdirectory paths will 404 on GitHub Pages unless that directory actually exists.

### Badge colors should match their card's accent

Work experience cards alternate between red (`#dc2626`) and blue (`#3b82f6`) accents. The "Work Sample" badges on each card should use the same color as the card's accent, not a hardcoded red. The hover color also needs to shift: red cards hover to `#ef4444`, blue cards hover to `#60a5fa`.

### Mobile nav replaces "Say Hello" with a hamburger

On touch devices, the "Say Hello" button in the top-right nav is hidden and replaced with a hamburger icon. Tapping it opens a slide-up sheet with all section links. The sheet supports swipe-down to dismiss (threshold: 80px). This script only runs on touch devices (`'ontouchstart' in window || navigator.maxTouchPoints`).

### The `skills` ID is assigned by script, not React

The toolkit section doesn't have an ID in the React bundle. The toolkit replacement script assigns `toolkit.id = 'skills'` so that nav links can scroll to it. If the toolkit script is removed or rewritten, this ID assignment must be preserved or navigation will break.

### Education section is injected, not React-rendered

The Education section (id=`education`) is fully injected by a script in `index.html` after the toolkit. It contains two photo cards (Cornell Engineering, Self-Taught Foundation). The photos use the class `.edu-photo` with responsive height (`360px` desktop, `300px` mobile). If you need to add more education cards, add objects to the `schools` array in that script.
