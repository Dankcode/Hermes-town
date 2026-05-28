# Hermes-town Rules

## Repository Safety

- Keep instructions generic and safe for open source.
- Do not commit personal machine paths, private overlay instructions, secrets, tokens, runtime URLs, or environment-specific notes.
- Keep any OpenClaw runtime checkout separate from this repository.
- Do not modify OpenClaw source code. Changes requested for Hermes-town belong in this app.
- Use local OpenClaw source only for context when needed.

## Implementation Rules

- Phaser 3 with Arcade Physics is the only rendering/game engine for Hermes-town.
- Do not add Three.js, React Three Fiber, or isometric camera/rendering surfaces for the town.
- The active `/office` experience must stay a strict 2D side-scrolling platform interface.
- Arcade Physics must be limited to X-axis character walking; do not add gravity, jumping, or platformer combat physics unless explicitly requested.
- Keep gameplay/town state outside Phaser scenes where practical.
- Phaser scenes should adapt state into visuals, animations, camera, and effects.
- React/DOM should own dense controls, Debug Simulation, mission panels, chat, settings, and backend forms.
- Keep backend integration behind explicit boundaries so prototype Debug Simulation cannot accidentally send real commands.
- Prefer stable asset manifest keys over scattered direct file paths.
- Use TypeScript types for town state, buildings, heroes, missions, and debug settings.

## Visual Rules

- The main screen must be the usable town interface.
- Do not create a marketing landing page for Hermes-town.
- The town is side-view/platform style.
- The floor is a continuous horizontal platform.
- The game canvas should use a shorter panoramic strip format.
- The camera should support horizontal mouse/touch drag panning and wheel/trackpad scroll sensitivity through local debug state.
- Buildings are flat 2D objects in foreground, midground, or background depth bands.
- Prototype buildings should be sourced from the provided spritesheet rather than procedural placeholders.
- Keep buildings on a readable street/platform baseline.
- Use cozy medieval fantasy theming.
- Heroes should be anime/chibi inspired with separate head, body, arms, legs, and weapon layers.
- Use visible motion: walking, idle bob, weapon-ready/attack, smoke, lamps, fluttering banners, and NPC traffic.
- Time of day must affect sky, light, and mood.
- Avoid a one-note palette. Use sky, grass, stone, timber, warm window light, cloth banners, and accent colors.
- Keep text out of the canvas when it is dense or interactive; use DOM overlays instead.

## Backend Mapping Rules

- `idle` agent state means the hero can walk around town.
- `running` agent state means the hero is working, questing, or fighting in a mission popup.
- `error` agent state means the hero should show an alert/damaged/confused state.
- Streaming text should become mission log copy.
- Approvals should become chapel/castle gate prompts.
- Skills should map to buildings.
- New goals completed should increase prosperity and unlock or upgrade buildings.
- Remote agents should be visually distinct but still treated as heroes or visitors.

## Debug Simulation Rules

- Do not use the old superuser-mode button or label.
- Debug Simulation must be clearly marked as local/prototype.
- Debug Simulation must not dispatch real tasks unless the user explicitly enables a future backend connection.
- Debug Simulation mutates only local `HermesTownState.debug`, hero stats, building tiers, prosperity, time-of-day mode, and mission state.
- Debug Simulation controls label visibility, building status, and scroll sensitivity.
- Debug Simulation should model Hermes API-like task states so the UI can be tested independently.
- Debug controls should use predictable form controls: selects for states, sliders for numeric values, checkboxes/toggles for binary values, and icon buttons for direct commands.

## Asset Rules

- Store Hermes-town public assets under `public/hermes-town/`.
- The provided spritesheet is the prototype source of truth for character frame crops.
- Runtime atlas/frame coordinates should stay centralized in the Phaser scene or a manifest module.
- Keep supplied references as references unless they are explicitly licensed/approved for production use.
- Generated production assets should be checked for transparent backgrounds, consistent scale, stable anchors, and modular body part alignment.
- Preserve class and animation names in manifests.
- Do not embed large binary assets in source files.

## Testing Rules

- Run `npm run typecheck` after TypeScript changes when feasible.
- Run `npm run build` when changing Next.js route or production rendering behavior, acknowledging the known optional `openclaw` warning if it appears.
- For game/canvas changes, open localhost and capture/review the rendered screen.
- Check desktop and narrow viewport layout for HUD overlap and nonblank Phaser rendering.
- Keep known pre-existing lint/test failures separate from new Hermes-town work.

## Design Acceptance Criteria

- `/office` shows Hermes-town as the main visual surface.
- The town renders without requiring an active OpenClaw Gateway.
- Heroes appear and animate in the town.
- Buildings appear with medieval themes and upgrade tiers.
- Debug Simulation can inject task states, hero stats, building upgrades, and time-of-day modes.
- A mission popup can be opened while the town remains visible behind it.
- The UI communicates that backend linking is currently simulated.
