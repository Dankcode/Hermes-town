# Hermes-town Context

## Product Direction

Hermes-town is the next interface layer for this repository. The current Claw3D office metaphor should evolve into a cozy 2D anime town builder where OpenClaw/Hermes agents are represented as animated heroes who live, idle, walk, work, and go on missions inside a medieval platform town.

The target mood is close to the town screens from Crusaders Quest: readable pixel/anime silhouettes, side-view platform composition, small buildings with warm windows, tiny heroes walking across a shared street, and an idle-game sense that the town keeps breathing even when the user is not actively issuing commands.

This repository remains the frontend application. OpenClaw runtime source code must stay outside this repository and must not be modified. Hermes-town should connect to the existing backend integration points in this app, not by changing OpenClaw itself.

## Current Repository Context

- The app is a Next.js 16 frontend with React 19 and TypeScript.
- `npm run dev` starts the custom server on port 3000 through `server/index.js --dev`.
- The existing office experience is rendered from `src/features/office/screens/OfficeScreen.tsx`.
- The active Hermes-town renderer is Phaser 3 with Arcade Physics.
- Legacy retro-office `.tsx` files are excluded from TypeScript compilation while the app transitions away from Three.js.
- Existing runtime, gateway, agent, chat, task board, marketplace, voice, onboarding, and sidebar logic should be preserved where possible.
- The Hermes-town visual surface replaces the 3D office surface, while the existing app shell can continue to provide connection, chat, and settings controls.

## Prototype Scope

The current prototype is intentionally local and safe:

- It renders a Phaser-powered 2D side-scrolling platform town surface.
- The game canvas is a short panoramic strip instead of a full-height platformer viewport.
- It reads existing visible office agents and maps them into town heroes.
- It does not send real commands to Hermes/OpenClaw yet.
- It includes a local Debug Simulation HUD for changing hero Strength, Agility, Level, building tier, prosperity, time of day, and simulated Hermes task state.
- It includes a mission popup that previews how active tasks will be shown over the town while the town remains visible behind it.
- It uses the provided reference spritesheet as the repo-local source image at `public/hermes-town/reference-sprites.png`; Phaser crops named frames from it at runtime.

## Core Fantasy

The user is the guild founder/mayor of Hermes-town. Their AI agents are heroes, apprentices, sages, scouts, clerics, smiths, bakers, librarians, and rangers. When the user gives a task, the town dispatches appropriate heroes to a mission. While the task runs, the user sees a mission/battle popup with live progress, stream text, approvals, tool usage, or future backend state. When tasks complete, the town grows: buildings improve, new props appear, roads get cleaner, banners change, and heroes gain visible role identity.

## Visual Style

- 2D side-view town, not top-down.
- Strictly non-isometric and non-3D: buildings are flat 2D foreground/midground/background assets on a horizontal platform.
- The camera can pan horizontally through mouse drag, touch drag, and wheel/trackpad input across a wide side-scrolling world.
- Arcade Physics is used only for left/right character motion on the X-axis. Gravity and jumping are not part of the town crawler.
- Anime/chibi hero proportions: large head, small body, readable weapon silhouette.
- Pixel-art-inspired edges and shading, but the implementation can use procedural Phaser graphics until final sprites are produced.
- Buildings should have a cozy medieval fantasy identity: bakery, blacksmith, library, chapel, guild hall, potion shop, windmill, market stall, castle gate, workshop, observatory, training yard.
- The background follows the user's local clock:
  - Morning: soft blue, peach horizon, bright windows fading out.
  - Day: clear sky, saturated greenery, busy NPC traffic.
  - Evening: amber sky, lamps and windows brighten.
  - Night: deep sky, stars, torches, warm windows, quieter pacing.
- The town should feel lively even when disconnected: NPCs walk, chimneys smoke, banners flutter, torches flicker, and heroes idle.

## Character System

Characters should be modular and animation-ready:

- Head, body, left arm, right arm, left leg, right leg, and weapon should be separate parts.
- Head can bob independently from the torso.
- Arms swing while walking.
- Legs alternate while walking.
- Weapon can rotate/sweep for attack or task animations.
- Physics anchors move on the X-axis using Phaser Arcade Physics; modular parts follow the anchor.
- The same logical hero should be able to swap role/class visuals without changing backend identity.

Initial hero classes:

- Knight: defensive coding, approvals, permissions, protection.
- Mage: reasoning, planning, research, summarization.
- Archer: search, triage, quick targeting, routing.
- Baker/Healer: docs, care tasks, formatting, cleanup, support.
- Rogue: debugging, diff inspection, hidden-state investigation.
- Beast Tamer: orchestration, multi-agent coordination, queue handling.

## Building And Skill Mapping

Each Hermes capability should have a medieval town home:

- Guild Hall: agent roster, company builder, mission board, task intake.
- Blacksmith: code generation, refactoring, build repair, dependency handling.
- Library: documentation, search, summarization, knowledge retrieval.
- Chapel: safety review, approvals, policy checks, trust and permission gates.
- Bakery: formatting, docs polish, onboarding, comfort/support surfaces.
- Potion Shop: experiments, feature flags, model settings, runtime profiles.
- Windmill: automation, recurring jobs, heartbeat tasks, background work.
- Market Stall: skill marketplace, plugin installation, agent abilities.
- Observatory: analytics, run logs, system health, performance.
- Training Yard: tests, smoke checks, e2e runs, playtest verification.
- Castle Gate: gateway connection status, access control, remote runtime entry.
- Workshop: files, diffs, patches, branch and PR workflows.

Buildings should have tiers:

- Tier 1: small, humble, basic silhouette.
- Tier 2: more detail, lit windows, banners, visible props.
- Tier 3: expanded footprint, animated elements, unique roof/sign.
- Tier 4+: prestige variants unlocked by successful goals.

## Mission Popup Model

When a user task starts, the town should remain visible and active in the background. A mission popup appears above it with:

- Active hero party.
- Mission title and objective.
- Live stream text or current backend event summary.
- Tool/action timeline.
- Approval prompts where required.
- Completion state and reward summary.

The popup should feel like a battle/task stage rather than a generic modal. It can show heroes attacking, casting, blocking, healing, or crafting against symbolic monsters that represent blockers, failing tests, stale docs, broken builds, or missing requirements.

## Backend Integration Target

Do not integrate real commands in the prototype. The intended future mapping is:

- Agent roster comes from the same runtime state currently used by `OfficeScreen`.
- Agent `running` state maps to hero `questing` or `working`.
- Streaming assistant text maps to mission log text.
- Tool calls map to attack/craft/support animations.
- Approvals map to chapel/castle-gate prompts.
- Task board cards map to guild hall missions.
- Skill installation maps to market stall purchases.
- Cron/heartbeat automation maps to windmill activity.
- Runtime connection maps to castle gate lamps and portcullis state.

## Asset Pipeline

Short term:

- Use Phaser runtime frame cropping from the supplied reference image to establish modular character parts.
- Use Phaser runtime frame cropping from the supplied reference image for prototype building assets.
- Labels for buildings and heroes live on a fixed UI layer so they remain readable during camera panning.
- Keep asset keys stable.
- Store reference and generated assets under `public/hermes-town/`.

Long term:

- Generate character sprite parts as separate transparent PNGs.
- Produce animation strips for idle, walk, attack, cast, heal, craft, celebrate, and sleep.
- Maintain a manifest that maps class, body part, weapon, and animation names to asset keys.
- Keep final sprites modular so equipment and agent identity can change independently.

## UX Goals

- First screen is the town itself, not a landing page.
- Debug Simulation is available during prototype/debug and must remain local until a real Hermes integration is explicitly added.
- The town should be legible at laptop, desktop, and narrow browser widths.
- Dense operational UI belongs in DOM overlays; the Phaser canvas owns the world and character motion.
- The interface should preserve existing chat and sidebar workflows while replacing the core office visualization.

## Non-Goals For The Prototype

- No real Hermes/OpenClaw task dispatch from Debug Simulation.
- No database.
- No Docker.
- No modification of OpenClaw source.
- No production transparent sprite atlas requirement yet.
