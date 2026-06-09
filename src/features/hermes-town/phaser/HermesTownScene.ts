import type Phaser from "phaser";

import {
  HERMES_WORLD,
  type HermesBuilding,
  type HermesHero,
  type HermesTimeMode,
  type HermesTownTheme,
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
const CITY_GATE_X = WORLD_W - 128;
const CITY_EXIT_X = WORLD_W + 250;

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

const propFrameConfig = {
  "tree-round": [958, 790, 54, 72],
  "tree-pine": [1015, 787, 50, 76],
  "tree-blossom": [1078, 781, 64, 82],
  "market-stall": [840, 682, 112, 74],
} as const;

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

const themedPalette = (palette: Palette, theme: HermesTownTheme): Palette => {
  if (theme === "arcane-night") {
    return {
      ...palette,
      skyTop: palette.stars ? 0x1a1f4a : 0x7786c8,
      skyBottom: palette.stars ? 0x4a3f72 : 0xd5b7e8,
      hillFar: 0x685b94,
      hillNear: 0x496c68,
      grass: 0x597451,
      platform: 0x5b5f77,
    };
  }
  if (theme === "forest-shrine") {
    return {
      ...palette,
      skyTop: palette.stars ? 0x17394a : 0x8bc5be,
      skyBottom: palette.stars ? 0x3a5961 : 0xcfe3b5,
      hillFar: 0x72947a,
      hillNear: 0x4f8057,
      grass: 0x5f9250,
      platform: 0x657262,
    };
  }
  if (theme === "sunlit-market") {
    return {
      ...palette,
      skyTop: palette.stars ? 0x243457 : 0x91cbd2,
      skyBottom: palette.stars ? 0x665879 : 0xf4d790,
      hillFar: 0x9ab083,
      hillNear: 0x7a9a62,
      grass: 0x77a858,
      platform: 0x74725f,
    };
  }
  return palette;
};

const paletteForHour = (hour: number, theme: HermesTownTheme): Palette => {
  if (hour < 5) {
    return themedPalette({
      skyTop: 0x162b4f,
      skyBottom: 0x52637b,
      hillFar: 0x2b5560,
      hillNear: 0x355f55,
      grass: 0x4b7246,
      platform: 0x56645a,
      lamp: 0xffc66c,
      stars: true,
    }, theme);
  }
  if (hour < 9) {
    return themedPalette({
      skyTop: 0x86c7d6,
      skyBottom: 0xf1d99c,
      hillFar: 0x8ab0a0,
      hillNear: 0x6f9a66,
      grass: 0x6d9a55,
      platform: 0x697866,
      lamp: 0xffd58d,
      stars: false,
    }, theme);
  }
  if (hour < 17) {
    return themedPalette({
      skyTop: 0x88c6d3,
      skyBottom: 0xf4dca4,
      hillFar: 0x9ab6a5,
      hillNear: 0x739c69,
      grass: 0x6fa357,
      platform: 0x6d7b68,
      lamp: 0xf9b95f,
      stars: false,
    }, theme);
  }
  if (hour < 20) {
    return themedPalette({
      skyTop: 0xe69d7d,
      skyBottom: 0xf2d589,
      hillFar: 0x997f63,
      hillNear: 0x6f8a5b,
      grass: 0x668c4d,
      platform: 0x66715e,
      lamp: 0xffc46a,
      stars: false,
    }, theme);
  }
  return themedPalette({
    skyTop: 0x1d3159,
    skyBottom: 0x5b607f,
    hillFar: 0x315b65,
    hillNear: 0x3f6f62,
    grass: 0x496f48,
    platform: 0x55635a,
    lamp: 0xffc66c,
    stars: true,
  }, theme);
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
    private departureMissionKey = "";

    constructor() {
      super("hermes-town-scene");
    }

    preload() {
      this.load.image("hermes_reference_sprites", "/hermes-town/reference-sprites-keyed.png");
    }

    create() {
      this.updateWorldBounds();
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
        this.updateWorldBounds();
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
      for (const [propId, frame] of Object.entries(propFrameConfig)) {
        const [x, y, width, height] = frame;
        const frameName = `prop_${propId}`;
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
      if (!this.textures.exists("hermes_cloud_large")) {
        this.createCloudTexture("hermes_cloud_large", 220, 92);
      }
      if (!this.textures.exists("hermes_cloud_small")) {
        this.createCloudTexture("hermes_cloud_small", 150, 62);
      }
    }

    private renderWorld(force: boolean) {
      const state = bridge.getState();
      const hour = hourForMode(state.debug.timeMode);
      const streamCount = Object.values(state.streamingTextByAgentId).filter(Boolean).length;
      const runCount = Object.values(state.runCountByAgentId).reduce((total, value) => total + value, 0);
      const key = `${hour}:${state.settings.prosperity}:${state.settings.visualTheme}:${state.gatewayStatus}:${streamCount}:${runCount}:${state.mission.phase}:${state.debug.selectedBuildingId}:${state.buildings
        .map((building) => `${building.id}-${building.tier}-${building.unlocked}-${building.status}`)
        .join("|")}`;
      if (!force && key === this.lastRenderKey) return;
      this.lastRenderKey = key;

      this.backgroundLayer?.removeAll(true);
      this.farLayer?.removeAll(true);
      this.midLayer?.removeAll(true);
      this.foregroundLayer?.removeAll(true);

      const palette = paletteForHour(hour, state.settings.visualTheme);
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
      this.drawCityGate(palette);
      this.drawAetherRelays(state, palette);
    }

    private drawSky(palette: Palette, hour: number) {
      if (!this.backgroundLayer) return;
      const width = this.scale.width;
      const height = this.scale.height;
      const gfx = this.add.graphics();
      const bands = palette.stars
        ? [palette.skyTop, 0x223a62, 0x364f71, palette.skyBottom, 0x6a6e87]
        : [palette.skyTop, 0xa5d4cf, 0xcbd9b0, palette.skyBottom, 0xe8c985];
      bands.forEach((color, index) => {
        gfx.fillStyle(color, 1);
        gfx.fillRect(0, (height / bands.length) * index, width, height / bands.length + 1);
      });
      gfx.fillStyle(0xf5d18b, palette.stars ? 0.06 : 0.22);
      gfx.fillRect(0, height * 0.54, width, height * 0.24);
      if (palette.stars) {
        gfx.fillStyle(0xfef3c7, 0.85);
        for (let i = 0; i < 48; i += 1) {
          gfx.fillRect((i * 83) % width, 32 + ((i * 47) % 220), 2, 2);
        }
      } else {
        gfx.fillStyle(hour < 12 ? 0xf7e1a1 : 0xf4ba72, 0.72);
        gfx.fillCircle(width * (hour < 12 ? 0.22 : 0.8), height * 0.18, 34);
      }
      this.backgroundLayer.add(gfx);
      this.drawCloudSprites(palette);
    }

    private drawParallaxHills(palette: Palette) {
      if (!this.farLayer || !this.midLayer) return;
      const groundY = this.groundY();
      const far = this.add.graphics();
      far.fillStyle(palette.hillFar, palette.stars ? 0.78 : 0.55);
      for (let x = -260; x < WORLD_W + 460; x += 520) {
        far.fillEllipse(x + 250, groundY - 106, 620, 180);
        far.fillEllipse(x + 520, groundY - 94, 460, 135);
      }
      this.farLayer.add(far);

      const near = this.add.graphics();
      near.fillStyle(0x537261, palette.stars ? 0.42 : 0.62);
      for (let x = -160; x < WORLD_W + 440; x += 480) {
        near.fillEllipse(x + 230, groundY - 52, 520, 96);
      }
      near.setDepth(120);
      this.midLayer.add(near);
      this.drawTreeSprites(palette);
    }

    private drawPlatform(palette: Palette, prosperity: number) {
      if (!this.midLayer) return;
      const groundY = this.groundY();
      const worldHeight = this.worldHeight();
      const gfx = this.add.graphics();
      gfx.fillStyle(0x31513a, 0.72);
      gfx.fillRect(0, groundY - 34, WORLD_W, 34);
      gfx.fillStyle(palette.grass, 1);
      gfx.fillRect(0, groundY - 18, WORLD_W, 16);
      gfx.fillStyle(0x8fbf63, 0.95);
      for (let x = 0; x < WORLD_W; x += 28) {
        gfx.fillRect(x + ((x / 28) % 3) * 4, groundY - 24, 16, 5);
        gfx.fillRect(x + 10, groundY - 12, 7, 3);
      }
      gfx.fillStyle(0x2f3a34, 1);
      gfx.fillRect(0, groundY - 2, WORLD_W, 3);
      gfx.fillStyle(0x657466, 1);
      gfx.fillRect(0, groundY, WORLD_W, worldHeight - groundY);
      gfx.fillStyle(0x3d4b43, 1);
      gfx.fillRect(0, groundY, WORLD_W, 8);
      gfx.fillStyle(0x3f4b45, 1);
      gfx.fillRect(0, groundY + 90, WORLD_W, Math.max(0, worldHeight - groundY - 90));

      const rowHeight = 15;
      const stoneColors = [0x788678, 0x6b7a6d, 0x879381, 0x5d6a63, 0x71806f];
      for (let y = groundY + 8; y < worldHeight; y += rowHeight) {
        const row = Math.floor((y - groundY) / rowHeight);
        let x = row % 2 === 0 ? -18 : -44;
        while (x < WORLD_W) {
          const width = 34 + Math.abs((x + row * 29) % 5) * 8;
          const color = stoneColors[Math.abs((x / 12 + row) | 0) % stoneColors.length];
          gfx.fillStyle(color, 1);
          gfx.fillRect(x, y, width, rowHeight - 2);
          gfx.lineStyle(1, 0x334039, 0.82);
          gfx.strokeRect(x, y, width, rowHeight - 2);
          x += width;
        }
      }
      gfx.fillStyle(0x2f3d36, 0.68);
      gfx.fillRect(0, groundY + 5, WORLD_W, 2);
      gfx.fillStyle(0xa4b78c, 0.42);
      for (let x = 24; x < WORLD_W; x += 84) {
        gfx.fillRect(x, groundY + 14 + ((x / 84) % 4) * 15, 16, 2);
        gfx.fillRect(x + 9, groundY + 17 + ((x / 84) % 5) * 11, 7, 2);
      }
      if (prosperity > 55) {
        for (let x = 250; x < WORLD_W - 200; x += 360) {
          gfx.fillStyle(x % 720 === 250 ? 0xb73d51 : 0x3f71b5, 1);
          gfx.fillTriangle(x, groundY - 150, x + 46, groundY - 136, x, groundY - 120);
        }
      }
      this.midLayer.add(gfx);
    }

    private drawCloudSprites(palette: Palette) {
      if (!this.backgroundLayer) return;
      const width = this.scale.width;
      const height = this.scale.height;
      const cloudRows = [
        { key: "hermes_cloud_large", x: width * 0.18, y: height * 0.2, scale: 1.12, alpha: 0.86 },
        { key: "hermes_cloud_large", x: width * 0.72, y: height * 0.39, scale: 1.03, alpha: 0.82 },
        { key: "hermes_cloud_small", x: width * 0.9, y: height * 0.18, scale: 0.9, alpha: 0.8 },
        { key: "hermes_cloud_small", x: width * 0.34, y: height * 0.49, scale: 0.72, alpha: 0.7 },
      ];
      for (const cloud of cloudRows) {
        const image = this.add.image(cloud.x, cloud.y, cloud.key);
        image.setScale(cloud.scale);
        image.setAlpha(palette.stars ? cloud.alpha * 0.26 : cloud.alpha);
        image.setTint(palette.stars ? 0x8792aa : 0xffffff);
        image.setScrollFactor(0);
        this.backgroundLayer.add(image);
      }
    }

    private drawTreeSprites(palette: Palette) {
      if (!this.midLayer || !this.farLayer) return;
      const groundY = this.groundY();
      const frames = ["tree-round", "tree-pine", "tree-blossom"] as const;
      for (let x = -100; x < WORLD_W + 220; x += 86) {
        const frame = frames[Math.abs(Math.floor(x / 86)) % frames.length];
        const tree = this.add.image(x, groundY - 8 - (Math.abs(x) % 4) * 3, "hermes_reference_sprites", `prop_${frame}`);
        tree.setOrigin(0.5, 1);
        tree.setScale(frame === "tree-blossom" ? 1.08 : 1.18);
        tree.setAlpha(palette.stars ? 0.72 : 0.96);
        tree.setTint(palette.stars ? 0xa2abc8 : 0xffffff);
        tree.setDepth(125 + (x % 3));
        this.midLayer.add(tree);
      }
      for (let x = -220; x < WORLD_W + 420; x += 172) {
        const frame = frames[Math.abs(Math.floor(x / 172) + 1) % frames.length];
        const tree = this.add.image(x + 44, groundY - 48, "hermes_reference_sprites", `prop_${frame}`);
        tree.setOrigin(0.5, 1);
        tree.setScale(0.9);
        tree.setAlpha(palette.stars ? 0.42 : 0.58);
        tree.setTint(palette.stars ? 0x7887a7 : 0x9bb998);
        this.farLayer.add(tree);
      }
    }

    private createCloudTexture(key: string, width: number, height: number) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xb8beb6, 0.62);
      gfx.fillEllipse(width * 0.28, height * 0.64, width * 0.46, height * 0.28);
      gfx.fillEllipse(width * 0.55, height * 0.68, width * 0.66, height * 0.32);
      gfx.fillEllipse(width * 0.78, height * 0.65, width * 0.38, height * 0.26);
      gfx.fillStyle(0xf5ecd2, 1);
      gfx.fillEllipse(width * 0.22, height * 0.48, width * 0.36, height * 0.3);
      gfx.fillEllipse(width * 0.42, height * 0.35, width * 0.5, height * 0.44);
      gfx.fillEllipse(width * 0.67, height * 0.42, width * 0.54, height * 0.4);
      gfx.fillEllipse(width * 0.88, height * 0.54, width * 0.3, height * 0.24);
      gfx.fillStyle(0xffffff, 0.36);
      gfx.fillEllipse(width * 0.45, height * 0.25, width * 0.22, height * 0.13);
      gfx.fillEllipse(width * 0.66, height * 0.31, width * 0.24, height * 0.12);
      gfx.generateTexture(key, width, height);
      gfx.destroy();
    }

    private drawBuilding(
      layer: Phaser.GameObjects.Container | null,
      building: HermesTownState["buildings"][number],
      palette: Palette,
    ) {
      if (!layer) return;
      const x = building.x;
      const groundY = this.groundY();
      const y = groundY + (building.zBand === "foreground" ? 20 : 14);
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

    private drawCityGate(palette: Palette) {
      if (!this.foregroundLayer) return;
      const groundY = this.groundY();
      const shadow = this.add.ellipse(CITY_GATE_X, groundY + 24, 260, 24, 0x111827, 0.28);
      const gate = this.add.image(CITY_GATE_X, groundY + 20, "hermes_reference_sprites", "building_chapel");
      gate.setOrigin(0.5, 1);
      gate.setDisplaySize(246, 188);
      gate.setAlpha(0.98);
      if (palette.stars) {
        gate.setTint(0xd6d0ff);
      }
      const sign = this.add.text(CITY_GATE_X, groundY - 176, "Main City Gate", {
        align: "center",
        backgroundColor: "rgba(26, 16, 8, 0.84)",
        color: "#fff6d8",
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        padding: { left: 6, right: 6, top: 3, bottom: 3 },
      });
      sign.setOrigin(0.5, 1);
      this.foregroundLayer.add([shadow, gate, sign]);
    }

    private drawAetherRelays(state: HermesTownState, palette: Palette) {
      if (!this.foregroundLayer) return;
      const streamCount = Object.values(state.streamingTextByAgentId).filter(Boolean).length;
      const activeIds = new Set<HermesBuilding["id"]>();
      if (state.gatewayStatus === "connected") activeIds.add("guild-hall");
      if (streamCount > 0) activeIds.add("library");
      if (state.mission.active) activeIds.add(state.debug.selectedBuildingId);
      for (const building of state.buildings) {
        if (building.status === "active" || building.status === "upgrading") {
          activeIds.add(building.id);
        }
      }

      const colorForTheme = {
        "royal-guild": 0xffd36c,
        "arcane-night": 0xc6a8ff,
        "forest-shrine": 0x9be07f,
        "sunlit-market": 0xffc15d,
      } satisfies Record<HermesTownTheme, number>;
      const color = palette.stars ? 0xd7ccff : colorForTheme[state.settings.visualTheme];
      const groundY = this.groundY();
      for (const buildingId of activeIds) {
        const building = state.buildings.find((entry) => entry.id === buildingId);
        if (!building || !building.unlocked) continue;
        const x = building.x + building.width * 0.32;
        const y = groundY - building.height * 0.62;
        const gfx = this.add.graphics();
        gfx.lineStyle(2, color, 0.62);
        gfx.strokeCircle(x, y, 18);
        gfx.strokeCircle(x, y, 27);
        gfx.fillStyle(color, 0.88);
        gfx.fillTriangle(x, y - 18, x + 10, y, x, y + 18);
        gfx.fillTriangle(x, y - 18, x - 10, y, x, y + 18);
        gfx.fillStyle(0xffffff, palette.stars ? 0.68 : 0.45);
        gfx.fillCircle(x, y, 4);
        this.foregroundLayer.add(gfx);
      }
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
      const groundY = this.groundY();
      const anchor = this.physics.add.image(startX, groundY - 64, "hermes_anchor");
      anchor.setVisible(false);
      anchor.setCollideWorldBounds(false);
      anchor.body.setSize(30, 76);
      anchor.body.setOffset(-11, -68);
      anchor.body.setDragX(1200);
      anchor.body.setAllowGravity(false);
      anchor.body.setMaxVelocity(300, 0);

      const container = this.add.container(startX, groundY - 64);
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
      const selectedTarget = state.buildings.find((building) => building.id === state.debug.selectedBuildingId);
      const taskTarget =
        state.mission.active || state.debug.simulatedTask !== "idle"
          ? selectedTarget ?? state.buildings.find((building) => building.id === targetBuildingId)
          : null;
      const guildHall = state.buildings.find((building) => building.id === "guild-hall");

      state.heroes.forEach((hero, index) => {
        const actor = this.actors.get(hero.id);
        if (!actor) return;
        const body = actor.anchor.body;
        const now = time + actor.seed;
        const speed =
          state.mission.active && state.mission.phase === "embarking"
            ? 360 + hero.stats.agility * 18
            : 86 + hero.stats.agility * 13;
        const taskActive =
          state.mission.active ||
          hero.status === "working" ||
          hero.status === "questing" ||
          state.debug.simulatedTask !== "idle";

        if (state.mission.active && state.mission.phase === "gathering") {
          actor.targetX = (guildHall?.x ?? 420) + (index % 4) * 52 - 78;
        } else if (
          state.mission.active &&
          (state.mission.phase === "embarking" || state.mission.phase === "combat")
        ) {
          actor.targetX = CITY_EXIT_X + (index % 4) * 38;
        } else if (taskActive && taskTarget) {
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

        actor.anchor.setY(this.groundY() - 64);
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
      this.advanceMissionAfterTownExit(state);
    }

    private advanceMissionAfterTownExit(state: HermesTownState) {
      if (!state.mission.active || state.mission.phase !== "embarking") {
        if (!state.mission.active || state.mission.phase === "gathering" || state.mission.phase === "idle") {
          this.departureMissionKey = "";
        }
        return;
      }
      const party = state.heroes
        .filter((hero) => hero.status === "questing" || hero.status === "working")
        .slice(0, 4);
      if (party.length === 0) return;
      const allExited = party.every((hero) => {
        const actor = this.actors.get(hero.id);
        return actor ? actor.anchor.x > WORLD_W + 70 : false;
      });
      if (!allExited) return;
      const key = `${state.mission.simulatedApiCall}:${state.mission.title}`;
      if (this.departureMissionKey === key) return;
      this.departureMissionKey = key;
      const patch: Partial<HermesTownState> = {
        mission: {
          ...state.mission,
          phase: "combat",
          progress: Math.max(state.mission.progress, 36),
          log: [
            ...state.mission.log.slice(-5),
            "The party moved beyond the visible town road.",
            "Hermes begins the task beyond the main city gate.",
          ],
        },
      };
      bridge.setState(patch);
      onStatePatch?.(patch);
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
      const clicked = state.buildings.find((building) => building.id === buildingId);
      const inspectingOnly = !state.mission.active && state.debug.simulatedTask === "idle";
      const patch: Partial<HermesTownState> = {
        buildings: inspectingOnly
          ? state.buildings.map((building) =>
              building.id === buildingId && (building.status === "active" || building.status === "upgrading")
                ? { ...building, status: "idle" as const }
                : building,
            )
          : state.buildings,
        debug: {
          ...state.debug,
          selectedBuildingId: buildingId,
        },
        mission: {
          ...state.mission,
          active: false,
          phase: "idle",
          title: `${clicked?.name ?? "Building"} interaction`,
          objective: `Hero entering ${clicked?.name ?? "building"}...`,
          progress: 0,
          log: [
            `Clicked ${clicked?.name ?? buildingId}.`,
            `Label updated: inspecting ${clicked?.name ?? "building"}.`,
            "No hero work state or combat encounter was started by this click.",
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
            worldY: this.groundY() - building.height * (0.74 + building.tier * 0.04),
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

    private groundY() {
      return Math.max(300, Math.min(HERMES_WORLD.groundY, this.scale.height - 112));
    }

    private worldHeight() {
      return Math.max(WORLD_H, this.scale.height);
    }

    private updateWorldBounds() {
      const height = this.worldHeight();
      this.cameras.main.setBounds(0, 0, WORLD_W, height);
      this.physics.world.setBounds(0, 0, CITY_EXIT_X + 180, height);
    }
  }

  return new HermesTownScene();
};
