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

### Files

```
index.html              Entry point. Loads the React bundle and contains
                        the mobile spider script (plain JS, not minified).
                        This is the easiest file to edit.

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
  headshot.jpg                About section (sticky, grayscale on hover)
  community.jpg               Friday Night Dinners card
  volunteering.jpg            Community Volunteering card
  scuba.jpg                   Gallery - Scuba Diving
  travel.jpg                  Gallery - Handstand/Travel
  film-collage.jpg            Gallery - Film Photography
  film-headshot.jpg           Small film photo
  flight.jpg                  Gallery - Private Pilot
  Yitzy_Rosenberg_CV.pdf      Duplicate of root CV (used in some links)

Yitzy_Rosenberg_CV.pdf  Resume download (linked from hero section)
yitzy-rosenberg.vcf     vCard contact file (linked from contact section)
CNAME                   GitHub Pages custom domain: bitzyspider.com
.nojekyll               Tells GitHub Pages not to run Jekyll
```

## The React app (inside index-ZZwLr-Wf.js)

The minified JS contains these React components (minified names in parens):

| Section     | What it shows |
|-------------|--------------|
| **Nav**     | Fixed top bar. Logo + spider icon, links to #about #work #community #gallery, "Say Hello" button |
| **Hero**    | Big headline "YITZY ROSENBERG: I UNTANGLE WICKED PROBLEMS", subtitle, tagline about debugging, CTA buttons (Explore Work, Download CV) |
| **About**   | "The Non-Linear Path" - life story, sticky headshot, spider metaphor, Assess/Hack/Build methodology |
| **Work**    | "How I Spend My Energy" - two columns: The Operator (real estate/startups) and The Engineer (water/infrastructure), plus toolkit |
| **Community** | "The Math of Community" - Friday Night Dinners, volunteering photos, philosophy |
| **Gallery** | "Off The Clock" - 4 cards: Scuba, Travel, Film Photography, Private Pilot |
| **Contact** | "Let's Connect the Dots" - email, phone, LinkedIn, vCard download |
| **Footer**  | Logo, copyright |

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

**Tagline** (in hero section):
- "(You debug the bugs on screen. I debug the ones in production.)"

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

**To change text content** (headings, descriptions, button labels):
- Search for the exact string in `assets/index-ZZwLr-Wf.js` and do a string replacement
- Be careful not to change the length of strings that are adjacent to important code

**To change styles on existing elements:**
- Find the `className:"..."` for the element in the minified JS
- Only use Tailwind classes that already exist in `assets/index-Cn99QLM1.css`
- To check if a class exists: `grep -o 'classname' assets/index-Cn99QLM1.css`

**To add new behavior:**
- Add a `<script>` tag in `index.html` (like the mobile spider script)
- This is much safer than modifying the minified bundle

**To change the mobile spider:**
- Edit the script directly in `index.html` - it's plain readable JavaScript

**To change images:**
- Replace files in `photos/` keeping the same filenames
- Or update the filename references in the minified JS

## Tech stack

- React 18+ (bundled, no source)
- Tailwind CSS v4.1.12 (compiled)
- Framer Motion (animations, page transitions)
- Lucide React (icons)
- HTML5 Canvas 2D (spider rendering)
- Vite (build tool, not present in repo)
- GitHub Pages (hosting)

## Design language

- **Colors:** Black background, white text, red accents (`#dc2626`, `#ff4444`)
- **Fonts:** Monospace for code-themed elements, sans-serif for body
- **Layout:** Single column on mobile, multi-column grid on desktop
- **Interactions:** Framer Motion hover/tap animations on cards and buttons
