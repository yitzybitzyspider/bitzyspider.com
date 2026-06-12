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
                        BUGS? PLAY BUG HUNT →") and a hero hint line, both
                        injected by a script at the end of index.html.
                        Fully self-contained (HTML+CSS+JS, no dependencies).
                        Safe to iterate on without touching index.html.
```

## Bug Hunt game (game.html)

A standalone arcade game built on the site's spider brand. Lives entirely in `game.html`; the main site links to it via the injected pill/hero-line script in `index.html` (the game itself still has no dependency on the main site).

**Tutorial (optional):** a TUTORIAL ghost button on the menu starts a guided practice run (`startTutorial()` / `tutUpdate()` / `TUT_STEPS`): no quota (`hQuota` shows "practice", rank shows TUTORIAL), no automatic spawning — each step spawns what it needs. Steps: MOVE (glide to a pulsing ring at `tutMark`), CATCH (fly), SHOOT→WRAP (beetle, message switches mid-step when it's webbed), WEAVE (1 strand), CROSS (1 crossing), TRAP (moth), and on desktop only RECLAIM (eat a strand, E). Completion banner, then auto-returns to menu. The banner is `#tutMsg`, positioned by the same `--ay` arena var as the HUD.

**Controls:** spider follows the mouse (desktop) or finger drag (mobile), with a deliberate hard speed cap — the spider is slow on purpose so webs matter. Click / quick-tap / SPACE shoots a web **where you click** (aimed, with ±28° aim-assist homing and a generous hit radius; costs 30 silk from a regenerating meter). **W or the on-screen WEB button** anchors a strand at your position; walk, press again to pin it (silk cost ≈ length/12, min 5). It chains — you stay anchored at the pin point to keep weaving; pressing with <24px of travel exits build mode. The **silk trail dragging behind the spider snares** bugs that touch it (heavy slow for 1.6s, tears the trail segment; boss is immune). Stuck/webbed bugs struggle; walking over them "wraps" them for 1.5x points. P pauses, M mutes.

**Web structure rules (core mechanic):** each bug type has an `esc` time — how long it stays stuck on a strand before chewing through. **When a bug escapes, that strand breaks.** A strand needs **≥2 attachments** to hold: a shared endpoint counts 1 (snap within 18px, compare <2px), a **T-junction weld counts 1** (an endpoint resting on another strand's mid-line — `snapPoint` snaps anywhere along a strand, so you can repair/extend an existing web), a **mid-line crossing counts 2** (it pins the strand). Unsupported strands fray and fall apart in 12s (flickering). So lone tripwires are temporary, an X of two crossing strands is stable, and chains decay from the tips inward. Crossings also get a woven diamond-mesh graphic (`crossings` array, recomputed in `recalcSupport`) — crossing your own line is both the visual and structural payoff. The dragonfly boss tears through strands instantly. Strands persist across levels within a run (max 36). Build flow: W/WEB anchors, walk, W/PIN pins and chains; X/Esc/DETACH stops weaving.

**Movement (important):** the spider uses the *original site spider physics*, extracted from the minified React bundle — position lerps 10%/frame toward the cursor (then hard-capped at `topSpeed()` = 150 + 40/tier px/s), rotation eases 15%/frame with angle wrap. 8 IK feet stay planted in world space until stretched past `STEP_DIST` (34 × scale), then step — **alternating tetrapod gait** (`GAIT` groups): only the active group may start steps, **hard cap of 4 simultaneously stepping legs** (most-stretched first), so ≥4 feet are always planted. **Steps must complete via a progress counter (`prog += 0.25/frame`, ~4 frames, then snap)** — never use a distance threshold to end a step, because the foot chases a moving target and will never arrive, which freezes the whole gait (this was a real bug). Feet land ahead of travel (velocity lead 0.14s) and initialize planted at their ideals (no spawn scramble). `spiderScale()` = 0.62 + 0.05/level + grip bonus, capped 1.25 — the spider starts small and **grows every level**. Catches happen at the *mouth* (15 × scale ahead of center). All per-frame lerps are framerate-independent via `1 - Math.pow(1-k, dt*60)`.

**Bug types** (unlock by level, `esc` = seconds to chew out of a strand): fly (L1, catch on contact, esc 5), moth (L2, fast, esc 3), beetle (L3, must be webbed, esc 8), wasp (L4, chases and stings — costs a heart, esc 2.5), firefly (L5, fast bonus that despawns after 7s, esc 1.5), stinkbug (L6, keeps distance and spits globs that slow the spider 55% for 2.5s, esc 4), slug (L7, slow tank leaving slime puddles that slow the spider, esc 10), webworm (L8, hunts your strands and eats one after latching 1.2s — immune to sticking, web-shot it), dragonfly (L9, rare tough regular: 3 web shots, `tears: true` strands, counts as 3 bugs, hub-slowed but trail-immune; its key in `TYPES` is still `boss` for historical reasons).

**Bosses** (every 5th level via `pickBoss()`, 4-boss rotation): **Hornet Queen** (L5: 5 HP, orbits screen center, spawns up to 3 wasps marked `queenSpawn`), **Mantis** (L10: 4 HP, stalks at ~180px, lunges at 1.5x speed to sting, seeks strands to tear), **Moth King** (L15: 6 HP, huge erratic darter, summons up to 3 moths marked `kingSpawn`), **Tarantula Hawk** (L20: 5 HP, relentless pursuit with 1.6x dive bursts, stings) — then the rotation repeats. True bosses have `boss: true` (hub-immune, tears strands, qv 5). HP pips render in the boss's theme color (`BOSS_COLORS`), filled/empty. **Every boss releases a drop when wrapped** (`DROPS` table): queen → Royal Jelly (full hearts), mantis → Praying Charm (2x points 20s, `buffScoreUntil`), moth king → Moth Dust (1.5x speed 20s, `buffSpeedUntil`), hawk → Hawk Sting (+1 bomb). Drops are walk-over pickups; any left uncollected auto-apply at `levelClear` so a quota-clearing boss kill never loses one.

**Dual silk meters (v7):** `silk` (red bar) powers aimed web shots, regenerates fast (11 + 4/tier per s, max 100 + 30/tier). `webSilk` (white bar) pays for woven strands and auto-web, regenerates slowly (5 + 1.5/tier, max 160 + 40/tier) **but every catch feeds it** (+7, +14 wrapped) — hunting fuels building. Eating a strand (E, within 20×scale px) reclaims 60% of its cost into webSilk.

**Hubs & combos:** 3+ strands sharing one endpoint form a **hub** — spiral rings render around it and bugs inside `HUB_R` (48px) move at 50% (boss immune). Wrapping bugs within 4s of each other builds a **combo** (x1.5 per step, cap x3) on top of `wrapMult()` (1.5 + 0.25/Venom-Fangs tier). Wraps trigger a 60ms hit-stop (`freezeUntil` gates `update()` in the loop, draw continues) and a twang ripple; snags ripple too. The HUD score is a count-up ticker (`shownScore`). After 2.5s without input the spider **idle-wanders** like the site spider (random-walk velocity on `target`, bounces off a 40px margin). Multiple bugs stuck on the same strand erode it faster (30%/extra bug) and the strand blinks faster/orange.

**Auto-web (Q / AUTO button):** auto-builds a circular web (8 spokes + ring arcs, up to 4 concentric rings, one strand per 0.12s) centered on the spider's position when toggled, paying from webSilk. Stops on completion, silk-out, or strand cap.

**Progression:** quota of bugs per level (`8 + level*4`, boss counts as 5, dragonfly 3). Each level has a fun rank name (`RANKS` array: HATCHLING → … → THE EXTERMINATOR, then ITSY BITSY LEGEND) shown in the HUD, at level start, and as "PROMOTED:" in the shop. Between levels an upgrade shop spends points (same number as score, tracked separately as `cash`): Swift Legs, Silk Range, Silk Glands (both meters), Strong Grip, Tough Silk, Venom Fangs, Extra Heart. Once **all core upgrades are maxed**, an ADVANCED section appears (`SINKS`): Double Shot (3-way spread), Fortified Silk (stacking, +35% stuck time), Buy A Life (stacking), Bug Bomb (B key, webs everything in 140px). Hearts refill +1 per level clear. High score and lifetime "bugs debugged" persist in localStorage under `bughunt_*` keys.

**Arena sizes (v8):** the menu has a SMALL (560×420) / MEDIUM (880×620) / FULL picker, persisted as `bughunt_size`. Windowed arenas center the canvas (`ofsX/ofsY`); pointer input converts via `evX/evY` and the fixed-position HUD shifts with CSS vars `--ax/--ay/--arx/--aby` set in `resize()`. `body.windowed` adds the arena outline.

**Debug params (internal testing):** `?lvl=15` starts runs at level 15, `?pts=2000` seeds shop cash, `?boss=mantis` (or `queen`/`mothking`/`hawk`/`boss`) force-spawns that type at every level start. Active params show as `· DEBUG (…)` after the version number on the menu. The version label (`#verLabel`, set from `GAME_VERSION`) is how you confirm which build you're on.

**Testing gotcha:** a stationary test bot never catches bugs, so the alive-bug population hits `maxAlive` and spawning stalls — rare types (worm, w:0.3) may never appear. To exercise a specific bug type headlessly, sed its weight up in the extracted JS instead of waiting — or just use the `?boss=` / `?lvl=` debug params, which work in the headless harness by stubbing `window.location.search`.

**Architecture notes:**
- Single IIFE in `<script id="game-js">`; ES5 style matching the rest of the repo
- State machine: `menu | play | shop | pause | over` — DOM overlays per state, canvas renders always
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
