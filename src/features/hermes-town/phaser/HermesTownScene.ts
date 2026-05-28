import type Phaser from "phaser";

import {
  HERMES_WORLD,
  type HermesBuilding,
  type HermesHero,
  type HermesTimeMode,
  type HermesTownState,
} from "@/features/hermes-town/data/town";
import type { HermesTownBridge } from "@/features/hermes-town/phaser/HermesTownBridge";

type HeroActor = {
  id: string;
  anchor: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  container: Phaser.GameObjects.Container;
  head: Phaser.GameObjects.Image;
  torso: Phaser.GameObjects.Image;
  armL: Phaser.GameObjects.Image;
  armR: Phaser.GameObjects.Image;
  legL: Phaser.GameObjects.Image;
  legR: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  targetX: number;
  facing: 1 | -1;
  seed: number;
};

type LabelAnchor = {
  key: string;
  worldX: number;
  worldY: number;
  text: string;
  visible: boolean;
};

type Palette = {
  skyTop: number;
  skyBottom: number;
  hillFar: number;
  hillNear: number;
  grass: number;
  platform: number;
  lamp: number;
  stars: boolean;
};

const WORLD_W = HERMES_WORLD.width;
const WORLD_H = HERMES_WORLD.height;
const GROUND_Y = HERMES_WORLD.groundY;

const heroFrameConfig = {
  knight: {
    head: [156, 59, 56, 52],
    torso: [159, 129, 52, 58],
    arm: [122, 166, 30, 48],
    leg: [149, 210, 30, 52],
    weapon: [217, 59, 44, 134],
  },
  mage: {
    head: [444, 70, 74, 70],
    torso: [440, 154, 66, 76],
    arm: [406, 196, 28, 42],
    leg: [449, 230, 30, 40],
    weapon: [361, 118, 45, 132],
  },
  archer: {
    head: [706, 69, 66, 65],
    torso: [701, 154, 62, 70],
    arm: [778, 169, 30, 38],
    leg: [706, 229, 32, 42],
    weapon: [800, 129, 56, 133],
  },
  baker: {
    head: [66, 310, 72, 66],
    torso: [68, 388, 62, 72],
    arm: [24, 416, 30, 43],
    leg: [75, 468, 28, 34],
    weapon: [169, 384, 47, 101],
  },
  rogue: {
    head: [354, 309, 72, 70],
    torso: [351, 390, 62, 74],
    arm: [316, 410, 28, 43],
    leg: [361, 467, 30, 36],
    weapon: [274, 351, 48, 95],
  },
  tamer: {
    head: [619, 309, 72, 68],
    torso: [620, 391, 62, 74],
    arm: [586, 414, 28, 43],
    leg: [624, 468, 30, 36],
    weapon: [773, 382, 52, 112],
  },
} as const;

const buildingFrameConfig = {
  bakery: [866, 296, 205, 158],
  blacksmith: [1070, 296, 190, 158],
  "guild-hall": [865, 471, 202, 152],
  "potion-shop": [1073, 469, 194, 156],
  windmill: [1284, 465, 218, 176],
  chapel: [1282, 286, 222, 170],
  library: [865, 471, 202, 152],
  market: [841, 677, 110, 82],
  observatory: [1073, 469, 194, 156],
  "training-yard": [1262, 878, 272, 66],
} as const satisfies Record<HermesBuilding["id"], readonly [number, number, number, number]>;

const taskTargetBuilding = {
  idle: "guild-hall",
  code_patch: "blacksmith",
  research: "library",
  approval: "chapel",
  test_run: "training-yard",
} as const;

const hash = (value: string) => {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }
  return Math.abs(result);
};

const hourForMode = (mode: HermesTimeMode) => {
  if (mode === "day") return 13;
  if (mode === "dusk") return 18;
  if (mode === "night") return 23;
  return new Date().getHours();
};

const paletteForHour = (hour: number): Palette => {
  if (hour < 5) {
    return {
      skyTop: 0x111b38,
      skyBottom: 0x25385f,
      hillFar: 0x1f4e4d,
      hillNear: 0x2c6558,
      grass: 0x356944,
      platform: 0x6e472a,
      lamp: 0xffc66c,
      stars: true,
    };
  }
  if (hour < 9) {
    return {
      skyTop: 0x79b9e8,
      skyBottom: 0xf7c99c,
      hillFar: 0x6e9f6b,
      hillNear: 0x7fb469,
      grass: 0x67a957,
      platform: 0x7a4e2d,
      lamp: 0xffd58d,
      stars: false,
    };
  }
  if (hour < 17) {
    return {
      skyTop: 0x80c7f5,
      skyBottom: 0xd8f1ff,
      hillFar: 0x83ad6b,
      hillNear: 0x6ca965,
      grass: 0x59a04d,
      platform: 0x7a4e2d,
      lamp: 0xf9b95f,
      stars: false,
    };
  }
  if (hour < 20) {
    return {
      skyTop: 0xf09870,
      skyBottom: 0xf8d48d,
      hillFar: 0x8a7a54,
      hillNear: 0x78965b,
      grass: 0x5f8f4d,
      platform: 0x6f472b,
      lamp: 0xffc46a,
      stars: false,
    };
  }
  return {
    skyTop: 0x192342,
    skyBottom: 0x4a5076,
    hillFar: 0x244f5a,
    hillNear: 0x386c64,
    grass: 0x386c4a,
    platform: 0x5b3b28,
    lamp: 0xffc66c,
    stars: true,
  };
};

export const createHermesTownScene = (params: {
  PhaserLib: typeof import("phaser");
  bridge: HermesTownBridge;
  onStatePatch?: (patch: Partial<HermesTownState>) => void;
}): Phaser.Scene => {
  const { PhaserLib, bridge, onStatePatch } = params;

  class HermesTownScene extends PhaserLib.Scene {
    private unsubscribe: (() => void) | null = null;
    private backgroundLayer: Phaser.GameObjects.Container | null = null;
    private farLayer: Phaser.GameObjects.Container | null = null;
    private midLayer: Phaser.GameObjects.Container | null = null;
    private heroLayer: Phaser.GameObjects.Container | null = null;
    private foregroundLayer: Phaser.GameObjects.Container | null = null;
    private uiLayer: Phaser.GameObjects.Container | null = null;
    private actors = new Map<string, HeroActor>();
    private labels = new Map<string, Phaser.GameObjects.Text>();
    private lastRenderKey = "";
    private nextTargetAt = new Map<string, number>();
    private followActorId: string | null = null;
    private dragging = false;
    private dragStartX = 0;
    private dragStartScrollX = 0;
    private dragDistance = 0;
    private manualPanUntil = 0;

    constructor() {
      super("hermes-town-scene");
    }

    preload() {
      this.load.image("hermes_reference_sprites", "/hermes-town/reference-sprites.png");
    }

    create() {
      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      this.createAtlasFrames();
      this.createPrimitiveTextures();

      this.backgroundLayer = this.add.container(0, 0).setDepth(0).setScrollFactor(0);
      this.farLayer = this.add.container(0, 0).setDepth(100).setScrollFactor(0.55, 1);
      this.midLayer = this.add.container(0, 0).setDepth(500);
      this.heroLayer = this.add.container(0, 0).setDepth(900);
      this.foregroundLayer = this.add.container(0, 0).setDepth(1200);
      this.uiLayer = this.add.container(0, 0).setDepth(50_000).setScrollFactor(0);

      this.unsubscribe = bridge.subscribe(() => this.renderWorld(true));
      this.scale.on("resize", () => {
        this.cameras.main.setSize(this.scale.width, this.scale.height);
        this.renderWorld(true);
      });
      this.setupCameraInput();
      this.renderWorld(true);
    }

    update(time: number, delta: number) {
      const state = bridge.getState();
      this.renderWorld(false);
      this.syncHeroes(state);
      this.updateHeroPhysics(state, time, delta);
      this.sortHeroes();
      this.ensureCameraFollow(state);
      this.updateLabels(state);
    }

    shutdown() {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.actors.forEach((actor) => {
        actor.anchor.destroy();
        actor.container.destroy(true);
      });
      this.actors.clear();
      this.labels.forEach((label) => label.destroy());
      this.labels.clear();
    }

    private createAtlasFrames() {
      const texture = this.textures.get("hermes_reference_sprites");
      for (const [className, parts] of Object.entries(heroFrameConfig)) {
        for (const [part, frame] of Object.entries(parts)) {
          const [x, y, width, height] = frame;
          const frameName = `${className}_${part}`;
          if (!texture.has(frameName)) {
            texture.add(frameName, 0, x, y, width, height);
          }
        }
      }
      for (const [buildingId, frame] of Object.entries(buildingFrameConfig)) {
        const [x, y, width, height] = frame;
        const frameName = `building_${buildingId}`;
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, x, y, width, height);
        }
      }
    }

    private createPrimitiveTextures() {
      if (!this.textures.exists("hermes_anchor")) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(0, 0, 8, 8);
        gfx.generateTexture("hermes_anchor", 8, 8);
        gfx.destroy();
      }
      if (!this.textures.exists("hermes_platform")) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0x7a4e2d, 1);
        gfx.fillRect(0, 0, 32, 32);
        gfx.generateTexture("hermes_platform", 32, 32);
        gfx.destroy();
      }
    }

    private renderWorld(force: boolean) {
      const state = bridge.getState();
      const hour = hourForMode(state.debug.timeMode);
      const key = `${hour}:${state.settings.prosperity}:${state.buildings
        .map((building) => `${building.id}-${building.tier}-${building.unlocked}-${building.status}`)
        .join("|")}`;
      if (!force && key === this.lastRenderKey) return;
      this.lastRenderKey = key;

      this.backgroundLayer?.removeAll(true);
      this.farLayer?.removeAll(true);
      this.midLayer?.removeAll(true);
      this.foregroundLayer?.removeAll(true);

      const palette = paletteForHour(hour);
      this.cameras.main.setBackgroundColor(palette.skyTop);
      this.drawSky(palette, hour);
      this.drawParallaxHills(palette);
      this.drawPlatform(palette, state.settings.prosperity);

      for (const building of state.buildings) {
        if (!building.unlocked) continue;
        const layer =
          building.zBand === "foreground"
              ? this.foregroundLayer
              : this.midLayer;
        this.drawBuilding(layer, building, palette);
      }
    }

    private drawSky(palette: Palette, hour: number) {
      if (!this.backgroundLayer) return;
      const width = this.scale.width;
      const height = this.scale.height;
      const gfx = this.add.graphics();
      gfx.fillStyle(palette.skyTop, 1);
      gfx.fillRect(0, 0, width, height * 0.64);
      gfx.fillStyle(palette.skyBottom, 1);
      gfx.fillRect(0, height * 0.24, width, height * 0.62);
      gfx.fillStyle(0xf2d28a, palette.stars ? 0.12 : 0.18);
      gfx.fillRect(0, height * 0.58, width, height * 0.18);
      if (palette.stars) {
        gfx.fillStyle(0xfef3c7, 0.85);
        for (let i = 0; i < 48; i += 1) {
          gfx.fillRect((i * 83) % width, 32 + ((i * 47) % 220), 2, 2);
        }
      } else {
        gfx.fillStyle(hour < 12 ? 0xfff0a7 : 0xf9b86b, 0.9);
        gfx.fillCircle(width * (hour < 12 ? 0.2 : 0.78), height * 0.16, 36);
      }
      gfx.fillStyle(0xffffff, palette.stars ? 0.1 : 0.32);
      for (let i = 0; i < 8; i += 1) {
        const x = ((i * 191) % width) - 40;
        const y = 48 + ((i * 37) % 94);
        gfx.fillEllipse(x, y, 120, 22);
        gfx.fillEllipse(x + 54, y + 5, 90, 18);
      }
      this.backgroundLayer.add(gfx);
    }

    private drawParallaxHills(palette: Palette) {
      if (!this.farLayer || !this.midLayer) return;
      const far = this.add.graphics();
      far.fillStyle(palette.hillFar, 1);
      for (let x = -200; x < WORLD_W + 400; x += 520) {
        far.fillEllipse(x + 250, GROUND_Y - 56, 620, 210);
      }
      this.farLayer.add(far);

      const near = this.add.graphics();
      near.fillStyle(palette.hillNear, 0.9);
      for (let x = -100; x < WORLD_W + 500; x += 720) {
        near.fillEllipse(x + 340, GROUND_Y - 28, 760, 145);
      }
      near.setDepth(120);
      this.midLayer.add(near);
    }

    private drawPlatform(palette: Palette, prosperity: number) {
      if (!this.midLayer) return;
      const gfx = this.add.graphics();
      gfx.fillStyle(palette.grass, 1);
      gfx.fillRect(0, GROUND_Y - 18, WORLD_W, 32);
      gfx.fillStyle(0x8bcf63, 1);
      for (let x = 0; x < WORLD_W; x += 32) {
        gfx.fillRect(x + ((x / 32) % 3) * 3, GROUND_Y - 28, 14, 6);
      }
      gfx.fillStyle(palette.platform, 1);
      gfx.fillRect(0, GROUND_Y + 14, WORLD_W, WORLD_H - GROUND_Y);
      gfx.fillStyle(0x4b2f22, 0.3);
      for (let x = 0; x < WORLD_W; x += 96) {
        gfx.fillRect(x, GROUND_Y + 22, 4, 110);
      }
      if (prosperity > 55) {
        for (let x = 250; x < WORLD_W - 200; x += 360) {
          gfx.fillStyle(x % 720 === 250 ? 0xb73d51 : 0x3f71b5, 1);
          gfx.fillTriangle(x, GROUND_Y - 150, x + 46, GROUND_Y - 136, x, GROUND_Y - 120);
        }
      }
      this.midLayer.add(gfx);
    }

    private drawBuilding(
      layer: Phaser.GameObjects.Container | null,
      building: HermesTownState["buildings"][number],
      palette: Palette,
    ) {
      if (!layer) return;
      const x = building.x;
      const y = GROUND_Y + (building.zBand === "foreground" ? 10 : 0);
      const scale = 0.82 + building.tier * 0.08;
      const shadow = this.add.ellipse(x, y + 9, building.width * scale, 22, 0x1f2937, 0.25);
      const image = this.add.image(x, y, "hermes_reference_sprites", `building_${building.id}`);
      image.setOrigin(0.5, 1);
      image.setDisplaySize(building.width * scale, building.height * scale);
      image.setInteractive({ useHandCursor: true });
      image.on("pointerdown", () => {
        if (this.dragDistance > 8) return;
        this.handleBuildingClick(building.id);
      });
      if (building.status === "upgrading") {
        image.setTint(0xffd37a);
      } else if (building.status === "active") {
        image.setTint(0xcff6ff);
      } else if (palette.stars) {
        image.setTint(0xd6d0ff);
      }
      layer.add([shadow, image]);
    }

    private syncHeroes(state: HermesTownState) {
      if (!this.heroLayer) return;
      const ids = new Set(state.heroes.map((hero) => hero.id));
      for (const [id, actor] of this.actors) {
        if (!ids.has(id)) {
          actor.anchor.destroy();
          actor.container.destroy(true);
          this.actors.delete(id);
        }
      }
      for (const hero of state.heroes) {
        if (!this.actors.has(hero.id)) {
          const actor = this.createHeroActor(hero, this.actors.size);
          this.actors.set(hero.id, actor);
          this.heroLayer.add(actor.container);
        }
      }
    }

    private createHeroActor(hero: HermesHero, index: number): HeroActor {
      const startX = 180 + index * 88;
      const anchor = this.physics.add.image(startX, GROUND_Y - 82, "hermes_anchor");
      anchor.setVisible(false);
      anchor.setCollideWorldBounds(true);
      anchor.body.setSize(30, 76);
      anchor.body.setOffset(-11, -68);
      anchor.body.setDragX(1200);
      anchor.body.setAllowGravity(false);
      anchor.body.setMaxVelocity(300, 0);

      const container = this.add.container(startX, GROUND_Y - 80);
      container.setScale(1.08);
      const shadow = this.add.ellipse(0, 60, 54, 13, 0x111827, 0.24);
      const legL = this.add.image(-11, 31, "hermes_reference_sprites", `${hero.className}_leg`);
      const legR = this.add.image(11, 31, "hermes_reference_sprites", `${hero.className}_leg`);
      const torso = this.add.image(0, -1, "hermes_reference_sprites", `${hero.className}_torso`);
      const armL = this.add.image(-26, 2, "hermes_reference_sprites", `${hero.className}_arm`);
      const armR = this.add.image(27, 2, "hermes_reference_sprites", `${hero.className}_arm`);
      const weapon = this.add.image(40, -4, "hermes_reference_sprites", `${hero.className}_weapon`);
      const head = this.add.image(0, -47, "hermes_reference_sprites", `${hero.className}_head`);
      legL.setOrigin(0.5, 0.18);
      legR.setOrigin(0.5, 0.18);
      armL.setOrigin(0.5, 0.12);
      armR.setOrigin(0.5, 0.12);
      weapon.setOrigin(0.45, 0.7);
      container.add([shadow, legL, legR, torso, armL, armR, weapon, head]);

      return {
        id: hero.id,
        anchor,
        container,
        head,
        torso,
        armL,
        armR,
        legL,
        legR,
        weapon,
        targetX: startX + 160,
        facing: 1,
        seed: hash(hero.id) % 1000,
      };
    }

    private updateHeroPhysics(state: HermesTownState, time: number, delta: number) {
      const targetBuildingId = taskTargetBuilding[state.debug.simulatedTask];
      const taskTarget = state.buildings.find((building) => building.id === targetBuildingId);

      state.heroes.forEach((hero, index) => {
        const actor = this.actors.get(hero.id);
        if (!actor) return;
        const body = actor.anchor.body;
        const now = time + actor.seed;
        const speed = 86 + hero.stats.agility * 13;
        const taskActive =
          state.mission.active ||
          hero.status === "working" ||
          hero.status === "questing" ||
          state.debug.simulatedTask !== "idle";

        if (taskActive && taskTarget) {
          actor.targetX = taskTarget.x + (index % 4) * 58 - 90;
        } else if (hero.status === "walking" && (Math.abs(actor.anchor.x - actor.targetX) < 20 || (this.nextTargetAt.get(hero.id) ?? 0) < time)) {
          const left = 120;
          const right = WORLD_W - 180;
          actor.targetX = left + ((hash(`${hero.id}:${Math.floor(time / 2400)}`) + index * 277) % (right - left));
          this.nextTargetAt.set(hero.id, time + 2600 + index * 180);
        }

        const distance = actor.targetX - actor.anchor.x;
        const wantsToMove = hero.status !== "idle" && hero.status !== "error" && Math.abs(distance) > 14;
        if (wantsToMove) {
          body.setVelocityX(Math.sign(distance) * speed);
          actor.facing = distance >= 0 ? 1 : -1;
        } else {
          body.setVelocityX(0);
        }

        actor.anchor.setY(GROUND_Y - 80);
        body.setVelocityY(0);
        actor.container.setPosition(actor.anchor.x, actor.anchor.y);
        actor.container.setScale(actor.facing, 1);
        actor.container.setDepth(860 + Math.round(actor.anchor.y));

        const walkWeight = Math.min(1, Math.abs(body.velocity.x) / speed);
        const phase = now / 115;
        const bob = Math.sin(phase) * 3 * walkWeight;
        actor.head.y = -47 + bob * 0.6;
        actor.torso.y = -1 + bob * 0.25;
        actor.legL.rotation = Math.sin(phase) * 0.32 * walkWeight;
        actor.legR.rotation = -Math.sin(phase) * 0.32 * walkWeight;
        actor.armL.rotation = -Math.sin(phase) * 0.25 * walkWeight;
        actor.armR.rotation = Math.sin(phase) * 0.25 * walkWeight;
        actor.weapon.rotation =
          taskActive && index < 4
            ? -0.52 + Math.sin(now / 92) * (0.24 + hero.stats.strength * 0.015)
            : 0.05 + Math.sin(now / 400) * 0.05;
        actor.container.setAlpha(hero.status === "error" ? 0.68 : 1);
        actor.container.y += bob;
      });
    }

    private setupCameraInput() {
      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (pointer.event?.target instanceof HTMLCanvasElement === false) return;
        this.dragging = true;
        this.dragStartX = pointer.x;
        this.dragStartScrollX = this.cameras.main.scrollX;
        this.dragDistance = 0;
        this.cameras.main.stopFollow();
        this.followActorId = null;
      });
      this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (!this.dragging) return;
        const state = bridge.getState();
        const deltaX = pointer.x - this.dragStartX;
        this.dragDistance = Math.max(this.dragDistance, Math.abs(deltaX));
        this.cameras.main.scrollX = this.clampScrollX(
          this.dragStartScrollX - deltaX * state.debug.scrollSensitivity,
        );
        this.manualPanUntil = this.time.now + 3200;
      });
      const stopDrag = () => {
        this.dragging = false;
      };
      this.input.on("pointerup", stopDrag);
      this.input.on("pointerupoutside", stopDrag);
      this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: unknown[], deltaX: number, deltaY: number) => {
        const state = bridge.getState();
        this.cameras.main.stopFollow();
        this.followActorId = null;
        this.cameras.main.scrollX = this.clampScrollX(
          this.cameras.main.scrollX + (Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY) * state.debug.scrollSensitivity,
        );
        this.manualPanUntil = this.time.now + 3200;
      });
    }

    private clampScrollX(scrollX: number) {
      const max = Math.max(0, WORLD_W - this.cameras.main.width);
      return Math.max(0, Math.min(max, scrollX));
    }

    private handleBuildingClick(buildingId: HermesBuilding["id"]) {
      const state = bridge.getState();
      const nextBuildings = state.buildings.map((building) =>
        building.id === buildingId
          ? {
              ...building,
              status: building.status === "upgrading" ? ("active" as const) : ("upgrading" as const),
              unlocked: true,
            }
          : building,
      );
      const clicked = nextBuildings.find((building) => building.id === buildingId);
      const patch: Partial<HermesTownState> = {
        buildings: nextBuildings,
        debug: {
          ...state.debug,
          selectedBuildingId: buildingId,
        },
        mission: {
          ...state.mission,
          active: true,
          title: `${clicked?.name ?? "Building"} interaction`,
          objective: `Hero entering ${clicked?.name ?? "building"}...`,
          progress: 18,
          log: [
            `Clicked ${clicked?.name ?? buildingId}.`,
            `Label updated: Hero entering ${clicked?.name ?? "building"}...`,
            "This change is local to the debug object.",
          ],
        },
      };
      bridge.setState(patch);
      onStatePatch?.(patch);
    }

    private updateLabels(state: HermesTownState) {
      const anchors: LabelAnchor[] = [];
      if (state.debug.labelsVisible) {
        for (const building of state.buildings) {
          if (!building.unlocked) continue;
          anchors.push({
            key: `building:${building.id}`,
            worldX: building.x,
            worldY: GROUND_Y - building.height * (0.74 + building.tier * 0.04),
            text: `${building.name}\n${building.status === "upgrading" ? "Hero entering..." : `${building.status}: ${building.skill}`}`,
            visible: true,
          });
        }
        for (const hero of state.heroes) {
          const actor = this.actors.get(hero.id);
          if (!actor) continue;
          anchors.push({
            key: `hero:${hero.id}`,
            worldX: actor.anchor.x,
            worldY: actor.anchor.y - 106,
            text: `${hero.name}\n${hero.status}: Lv ${hero.stats.level}`,
            visible: true,
          });
        }
      }

      const activeKeys = new Set(anchors.map((anchor) => anchor.key));
      for (const [key, label] of this.labels) {
        if (!activeKeys.has(key)) {
          label.setVisible(false);
        }
      }
      for (const anchor of anchors) {
        const label = this.ensureLabel(anchor.key);
        const screenX = anchor.worldX - this.cameras.main.scrollX;
        const screenY = anchor.worldY - this.cameras.main.scrollY;
        label.setText(anchor.text);
        label.setPosition(
          Math.max(64, Math.min(this.scale.width - 64, screenX)),
          Math.max(28, Math.min(this.scale.height - 28, screenY)),
        );
        label.setVisible(anchor.visible && screenX > -120 && screenX < this.scale.width + 120);
      }
    }

    private ensureLabel(key: string) {
      const existing = this.labels.get(key);
      if (existing) return existing;
      const label = this.add.text(0, 0, "", {
        align: "center",
        backgroundColor: "rgba(26, 16, 8, 0.84)",
        color: "#fff6d8",
        fixedWidth: 132,
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        lineSpacing: 2,
        padding: { left: 6, right: 6, top: 4, bottom: 4 },
      });
      label.setOrigin(0.5, 1);
      label.setScrollFactor(0);
      label.setDepth(60_000);
      this.uiLayer?.add(label);
      this.labels.set(key, label);
      return label;
    }

    private sortHeroes() {
      if (!this.heroLayer) return;
      this.heroLayer.sort("depth");
    }

    private ensureCameraFollow(state: HermesTownState) {
      if (this.dragging || this.time.now < this.manualPanUntil) return;
      const selected = state.debug.selectedHeroId
        ? this.actors.get(state.debug.selectedHeroId)
        : null;
      const active =
        selected ??
        state.heroes
          .map((hero) => this.actors.get(hero.id))
          .find((actor) => actor && Math.abs(actor.anchor.body.velocity.x) > 2) ??
        this.actors.values().next().value;
      if (!active) return;
      if (this.followActorId !== active.id) {
        this.followActorId = active.id;
        this.cameras.main.startFollow(active.anchor, true, 0.065, 0.08, 0, 120);
        this.cameras.main.setDeadzone(220, 160);
      }
    }
  }

  return new HermesTownScene();
};
