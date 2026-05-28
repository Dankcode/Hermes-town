import type { OfficeAgent } from "@/features/retro-office/core/types";

export type HermesHeroClass =
  | "knight"
  | "mage"
  | "archer"
  | "baker"
  | "rogue"
  | "tamer";

export type HermesHeroStatus = "idle" | "walking" | "working" | "questing" | "error";

export type HermesHeroStats = {
  strength: number;
  agility: number;
  level: number;
};

export type HermesHero = {
  id: string;
  name: string;
  subtitle?: string | null;
  className: HermesHeroClass;
  status: HermesHeroStatus;
  color: string;
  weapon: "sword" | "staff" | "bow" | "spoon" | "dagger" | "whip";
  stats: HermesHeroStats;
};

export type HermesBuildingId =
  | "guild-hall"
  | "blacksmith"
  | "library"
  | "chapel"
  | "bakery"
  | "potion-shop"
  | "windmill"
  | "market"
  | "observatory"
  | "training-yard";

export type HermesBuilding = {
  id: HermesBuildingId;
  name: string;
  theme: string;
  skill: string;
  x: number;
  width: number;
  height: number;
  tier: number;
  unlocked: boolean;
  zBand: "background" | "midground" | "foreground";
  status: "idle" | "active" | "upgrading" | "locked";
};

export type HermesMission = {
  active: boolean;
  title: string;
  objective: string;
  progress: number;
  log: string[];
  simulatedApiCall: string;
};

export type HermesTimeMode = "system" | "day" | "dusk" | "night";

export type HermesDebugState = {
  open: boolean;
  timeMode: HermesTimeMode;
  selectedHeroId: string | null;
  selectedBuildingId: HermesBuildingId;
  simulatedTask: "idle" | "code_patch" | "research" | "approval" | "test_run";
  labelsVisible: boolean;
  scrollSensitivity: number;
};

export type HermesTownSettings = {
  prosperity: number;
  npcDensity: number;
};

export type HermesTownState = {
  heroes: HermesHero[];
  buildings: HermesBuilding[];
  mission: HermesMission;
  settings: HermesTownSettings;
  debug: HermesDebugState;
  gatewayStatus: string;
  streamingTextByAgentId: Record<string, string | null>;
  runCountByAgentId: Record<string, number>;
};

export const HERMES_WORLD = {
  width: 3600,
  height: 520,
  groundY: 390,
};

const heroClasses: HermesHeroClass[] = ["knight", "mage", "archer", "baker", "rogue", "tamer"];

const classWeapon: Record<HermesHeroClass, HermesHero["weapon"]> = {
  knight: "sword",
  mage: "staff",
  archer: "bow",
  baker: "spoon",
  rogue: "dagger",
  tamer: "whip",
};

export const createDefaultBuildings = (): HermesBuilding[] => [
  {
    id: "guild-hall",
    name: "Guild Hall",
    theme: "Mission board and agent roster",
    skill: "Task intake",
    x: 360,
    width: 260,
    height: 230,
    tier: 2,
    unlocked: true,
    zBand: "midground",
    status: "idle",
  },
  {
    id: "bakery",
    name: "Bakery",
    theme: "Docs, polish, onboarding",
    skill: "Support",
    x: 720,
    width: 230,
    height: 190,
    tier: 1,
    unlocked: true,
    zBand: "foreground",
    status: "idle",
  },
  {
    id: "blacksmith",
    name: "Blacksmith",
    theme: "Builds, patches, refactors",
    skill: "Code craft",
    x: 1090,
    width: 280,
    height: 240,
    tier: 2,
    unlocked: true,
    zBand: "midground",
    status: "idle",
  },
  {
    id: "library",
    name: "Library",
    theme: "Research and context",
    skill: "Knowledge",
    x: 1480,
    width: 260,
    height: 230,
    tier: 1,
    unlocked: true,
    zBand: "background",
    status: "idle",
  },
  {
    id: "chapel",
    name: "Chapel",
    theme: "Safety and approvals",
    skill: "Trust",
    x: 1860,
    width: 230,
    height: 230,
    tier: 1,
    unlocked: true,
    zBand: "midground",
    status: "idle",
  },
  {
    id: "windmill",
    name: "Windmill",
    theme: "Automations and background work",
    skill: "Cron",
    x: 2260,
    width: 250,
    height: 280,
    tier: 1,
    unlocked: true,
    zBand: "background",
    status: "idle",
  },
  {
    id: "potion-shop",
    name: "Potion Shop",
    theme: "Runtime profiles and experiments",
    skill: "Settings",
    x: 2630,
    width: 230,
    height: 205,
    tier: 1,
    unlocked: false,
    zBand: "foreground",
    status: "locked",
  },
  {
    id: "market",
    name: "Market",
    theme: "Skills and plugins",
    skill: "Marketplace",
    x: 2920,
    width: 250,
    height: 170,
    tier: 1,
    unlocked: false,
    zBand: "foreground",
    status: "locked",
  },
  {
    id: "observatory",
    name: "Observatory",
    theme: "Analytics and run logs",
    skill: "Telemetry",
    x: 3150,
    width: 240,
    height: 250,
    tier: 1,
    unlocked: false,
    zBand: "midground",
    status: "locked",
  },
  {
    id: "training-yard",
    name: "Training Yard",
    theme: "Tests, smoke checks, playtests",
    skill: "Verification",
    x: 3320,
    width: 260,
    height: 150,
    tier: 1,
    unlocked: false,
    zBand: "foreground",
    status: "locked",
  },
];

export const createDemoHeroes = (): HermesHero[] => [
  {
    id: "demo-knight",
    name: "Main",
    subtitle: "Guild captain",
    className: "knight",
    status: "idle",
    color: "#4b8fca",
    weapon: "sword",
    stats: { strength: 8, agility: 4, level: 4 },
  },
  {
    id: "demo-mage",
    name: "Sage",
    subtitle: "Context keeper",
    className: "mage",
    status: "walking",
    color: "#8d5fd3",
    weapon: "staff",
    stats: { strength: 3, agility: 6, level: 3 },
  },
  {
    id: "demo-archer",
    name: "Scout",
    subtitle: "Search and triage",
    className: "archer",
    status: "walking",
    color: "#4f9a52",
    weapon: "bow",
    stats: { strength: 5, agility: 8, level: 2 },
  },
  {
    id: "demo-baker",
    name: "Mira",
    subtitle: "Docs and polish",
    className: "baker",
    status: "idle",
    color: "#d97986",
    weapon: "spoon",
    stats: { strength: 4, agility: 5, level: 2 },
  },
];

export const mapOfficeAgentsToHeroes = (agents: OfficeAgent[]): HermesHero[] => {
  if (agents.length === 0) return createDemoHeroes();

  return agents.slice(0, 8).map((agent, index) => {
    const className = heroClasses[index % heroClasses.length];
    return {
      id: agent.id,
      name: agent.name || "Hero",
      subtitle: agent.subtitle ?? "Hermes agent",
      className,
      status:
        agent.status === "working"
          ? "working"
          : agent.status === "error"
            ? "error"
            : index % 2 === 0
              ? "idle"
              : "walking",
      color: agent.color,
      weapon: classWeapon[className],
      stats: {
        strength: 4 + (index % 5),
        agility: 5 + ((index + 2) % 5),
        level: 1 + (index % 5),
      },
    };
  });
};

export const createInitialTownState = (params: {
  agents: OfficeAgent[];
  gatewayStatus: string;
  streamingTextByAgentId: Record<string, string | null>;
  runCountByAgentId: Record<string, number>;
}): HermesTownState => {
  const heroes = mapOfficeAgentsToHeroes(params.agents);
  return {
    heroes,
    buildings: createDefaultBuildings(),
    gatewayStatus: params.gatewayStatus,
    streamingTextByAgentId: params.streamingTextByAgentId,
    runCountByAgentId: params.runCountByAgentId,
    settings: {
      prosperity: 42,
      npcDensity: 5,
    },
    debug: {
      open: true,
      timeMode: "system",
      selectedHeroId: heroes[0]?.id ?? null,
      selectedBuildingId: "guild-hall",
      simulatedTask: "idle",
      labelsVisible: true,
      scrollSensitivity: 1,
    },
    mission: {
      active: false,
      title: "Local debug task",
      objective: "Preview how Hermes task API state will affect the side-scroller.",
      progress: 0,
      simulatedApiCall: "idle",
      log: [
        "Debug state is local.",
        "No live Hermes agent request has been sent.",
      ],
    },
  };
};
