"use client";

import {
  Activity,
  BookOpen,
  Bot,
  Building2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Gauge,
  Gem,
  Play,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Swords,
  Waypoints,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { HermesTownCanvas } from "@/features/hermes-town/components/HermesTownCanvas";
import {
  createDefaultBuildings,
  createInitialTownState,
  mapOfficeAgentsToHeroes,
  type HermesBuilding,
  type HermesDebugState,
  type HermesEncounter,
  type HermesHero,
  type HermesHeroStatus,
  type HermesMission,
  type HermesTimeMode,
  type HermesTownSettings,
  type HermesTownTheme,
  type HermesTownState,
} from "@/features/hermes-town/data/town";
import type { OfficeAgent } from "@/features/retro-office/core/types";

type HermesGatewayAdapterType = "openclaw" | "hermes" | "demo" | "local" | "claw3d" | "custom";

type HermesTownExperienceProps = {
  agents?: OfficeAgent[];
  activeAdapterType?: HermesGatewayAdapterType | null;
  gatewayToken?: string;
  gatewayStatus?: string;
  gatewayUrl?: string;
  selectedAdapterType?: HermesGatewayAdapterType;
  runtimeSnapshot?: HermesRuntimeSnapshot;
  streamingTextByAgentId?: Record<string, string | null>;
  runCountByAgentId?: Record<string, number>;
  onAddAgent?: () => void;
  onAgentChatSelect?: (agentId: string) => void;
  onAgentDelete?: (agentId: string) => void;
  onAgentEdit?: (agentId: string) => void;
  onGatewayAdapterTypeChange?: (adapterType: HermesGatewayAdapterType) => void;
  onGatewayConnect?: () => void;
  onGatewayDisconnect?: () => void;
  onGatewayTokenChange?: (value: string) => void;
  onGatewayUrlChange?: (value: string) => void;
  onMonitorSelect?: (agentId: string | null) => void;
  onQaLabDismiss?: () => void;
  onStandupArrivalsChange?: (arrivedAgentIds: string[]) => void;
  onTaskBoardSelectCard?: (cardId: string) => void;
  onVoiceRepliesPreview?: (voiceId: string, voiceName: string) => void;
  [key: string]: unknown;
};

type PanelId = "godmode" | "gateway" | "settings";
type PanelPosition = Record<PanelId, { x: number; y: number }>;
type HermesRuntimeTone = "aether" | "quest" | "memory" | "warning" | "skill";
type HermesRuntimeTaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
type HermesRuntimeSignal = {
  id: string;
  title: string;
  summary: string;
  timestamp?: string | null;
  tone: HermesRuntimeTone;
  buildingId?: HermesBuilding["id"];
  theme?: HermesTownTheme;
  task?: HermesDebugState["simulatedTask"];
  taskCardId?: string | null;
};
type HermesRuntimeTask = {
  id: string;
  title: string;
  status: HermesRuntimeTaskStatus;
  agentName?: string | null;
};
type HermesRuntimeSkill = {
  key: string;
  name: string;
  ready: boolean;
  emoji?: string | null;
};
type HermesRuntimeRunSummary = {
  id: string;
  title: string;
  heroName?: string | null;
  status: "running" | "recent" | "waiting" | "complete" | "blocked";
  detail: string;
  timestamp?: string | null;
  buildingId?: HermesBuilding["id"];
  tone?: HermesRuntimeTone;
};
type HermesRuntimeSnapshot = {
  adapterType?: string | null;
  eventCount?: number;
  gatewayStatus?: string;
  gatewayUrl?: string;
  liveStateText?: string;
  remoteStatus?: string | null;
  runningCount?: number;
  runSummaries?: HermesRuntimeRunSummary[];
  signals?: HermesRuntimeSignal[];
  skills?: HermesRuntimeSkill[];
  tasks?: HermesRuntimeTask[];
  unseenInboxCount?: number;
};
type CombatFloat = {
  id: number;
  text: string;
  x: number;
  y: number;
  tone: "damage" | "crit" | "heal";
};
type QuestDecisionChoice = {
  id: string;
  title: string;
  effect: string;
  bonus: number;
};
type QuestDecision = {
  prompt: string;
  choices: QuestDecisionChoice[];
};
type CombatState = {
  key: string;
  maxMobHp: number;
  mobHp: number;
  turn: number;
  floats: CombatFloat[];
  victory: boolean;
  decision: QuestDecision | null;
  decisionResolved: boolean;
};

type EncounterChoiceId = "assist" | "question" | "decline";
type HudTab = "progress" | "process" | "oracle" | "memory" | "themes";

const statusOptions: HermesHeroStatus[] = ["idle", "walking", "working", "questing", "error"];
const timeOptions: HermesTimeMode[] = ["system", "day", "dusk", "night"];
const taskOptions: HermesDebugState["simulatedTask"][] = [
  "idle",
  "code_patch",
  "research",
  "approval",
  "test_run",
];
const spriteSheet = "/hermes-town/reference-sprites-keyed.png";
const spriteSheetSize = { width: 1536, height: 1024 };

const combatHeroFrames: Record<HermesHero["className"], readonly [number, number, number, number]> = {
  knight: [905, 70, 84, 92],
  mage: [913, 173, 78, 92],
  archer: [699, 74, 86, 128],
  baker: [50, 318, 98, 152],
  rogue: [334, 316, 100, 156],
  tamer: [606, 318, 96, 154],
};

const mobFrames = [
  { name: "Gilded Slime", frame: [23, 552, 112, 58] as const },
  { name: "Mushroom Goblin", frame: [197, 552, 92, 90] as const },
  { name: "Tiny Dragon", frame: [463, 554, 96, 88] as const },
  { name: "Stone Golem", frame: [298, 679, 104, 104] as const },
  { name: "Bat Imp", frame: [472, 684, 86, 76] as const },
];

const clampTier = (value: number) => Math.max(1, Math.min(4, value));

const themeOptions: { label: string; value: HermesTownTheme; summary: string }[] = [
  {
    label: "Royal Guild",
    value: "royal-guild",
    summary: "Gold, charter seals, and heroic command-room warmth.",
  },
  {
    label: "Arcane Night",
    value: "arcane-night",
    summary: "Moonlit violet magic with memory-crystal emphasis.",
  },
  {
    label: "Forest Shrine",
    value: "forest-shrine",
    summary: "Green sanctuary tones for calm research and reflection.",
  },
  {
    label: "Sunlit Market",
    value: "sunlit-market",
    summary: "Bright isekai bazaar energy for plugins and growth.",
  },
];

const initialPanelPositions = (): PanelPosition => {
  return {
    godmode: { x: 8, y: 8 },
    gateway: { x: 936, y: 8 },
    settings: { x: 188, y: 8 },
  };
};

export function HermesTownExperience(props: HermesTownExperienceProps) {
  const agents = props.agents ?? [];
  const gatewayStatus = props.gatewayStatus ?? "disconnected";
  const streamingTextByAgentId = props.streamingTextByAgentId ?? {};
  const runCountByAgentId = props.runCountByAgentId ?? {};
  const initialState = useMemo(
    () =>
      createInitialTownState({
        agents,
        gatewayStatus,
        streamingTextByAgentId,
        runCountByAgentId,
      }),
    [],
  );
  const [town, setTown] = useState<HermesTownState>(initialState);
  const [panelPositions, setPanelPositions] = useState<PanelPosition>(initialPanelPositions);
  const [panelOpen, setPanelOpen] = useState<Record<PanelId, boolean>>({
    godmode: true,
    gateway: true,
    settings: false,
  });
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [hudTab, setHudTab] = useState<HudTab>("progress");
  const runtimeAmbienceKeyRef = useRef("");
  const [pendingGatewayConnect, setPendingGatewayConnect] = useState<{
    adapterType: HermesGatewayAdapterType;
    url: string;
  } | null>(null);

  useEffect(() => {
    setTown((current) => {
      const nextHeroes = mergeBackendHeroes(
        current.heroes,
        mapOfficeAgentsToHeroes(agents, current.settings.maxAgents),
      );
      if (
        areHeroRostersEqual(current.heroes, nextHeroes) &&
        current.gatewayStatus === gatewayStatus &&
        areRecordValuesEqual(current.streamingTextByAgentId, streamingTextByAgentId) &&
        areRecordValuesEqual(current.runCountByAgentId, runCountByAgentId)
      ) {
        return current;
      }
      return {
        ...current,
        heroes: nextHeroes,
        gatewayStatus,
        streamingTextByAgentId,
        runCountByAgentId,
      };
    });
  }, [agents, gatewayStatus, runCountByAgentId, streamingTextByAgentId, town.settings.maxAgents]);

  useEffect(() => {
    setPanelPositions((current) => ({
      ...current,
      gateway: { ...current.gateway, x: Math.max(8, window.innerWidth - 344) },
    }));
  }, []);

  useEffect(() => {
    if (!pendingGatewayConnect) return;
    if (props.selectedAdapterType !== pendingGatewayConnect.adapterType) return;
    if ((props.gatewayUrl ?? "").trim() !== pendingGatewayConnect.url) return;
    const timer = window.setTimeout(() => {
      props.onGatewayConnect?.();
      setPendingGatewayConnect(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    pendingGatewayConnect,
    props.gatewayUrl,
    props.onGatewayConnect,
    props.selectedAdapterType,
  ]);

  const selectedHero =
    town.heroes.find((hero) => hero.id === town.debug.selectedHeroId) ?? town.heroes[0] ?? null;
  const selectedBuilding =
    town.buildings.find((building) => building.id === town.debug.selectedBuildingId) ??
    town.buildings[0];
  const activeHeroes = town.heroes.filter(
    (hero) => hero.status === "working" || hero.status === "questing",
  );
  const combatParty = (activeHeroes.length ? activeHeroes : town.heroes).slice(0, 4);
  const missionLog = buildMissionLog(town);
  const townMetrics = buildTownMetrics(town, missionLog);
  const runtimeSnapshot = props.runtimeSnapshot ?? buildFallbackRuntimeSnapshot(town);
  const runtimeSignals = useMemo(
    () => buildRuntimeSignals(town, runtimeSnapshot),
    [
      runtimeSnapshot,
      town.gatewayStatus,
      town.heroes,
      town.runCountByAgentId,
      town.streamingTextByAgentId,
    ],
  );

  useEffect(() => {
    if (town.mission.active || town.encounter.active) return;
    const signal = selectAmbientRuntimeSignal(runtimeSignals);
    if (!signal) return;
    const buildingId = signal.buildingId ?? buildingForRuntimeTone(signal.tone);
    const ambienceKey = `${signal.id}:${buildingId}:${signal.task ?? "idle"}`;
    if (runtimeAmbienceKeyRef.current === ambienceKey) return;
    runtimeAmbienceKeyRef.current = ambienceKey;
    setTown((current) => {
      if (current.mission.active || current.encounter.active) return current;
      return {
        ...current,
        heroes: current.heroes.map((hero, index) => ({
          ...hero,
          status:
            signal.tone === "warning"
              ? index < 2
                ? "working"
                : hero.status === "idle"
                  ? "walking"
                  : hero.status
              : signal.tone === "quest" || signal.tone === "memory" || signal.tone === "skill"
                ? index < 3
                  ? "working"
                  : hero.status === "idle"
                    ? "walking"
                    : hero.status
                : hero.status,
        })),
        buildings: current.buildings.map((building) =>
          building.id === buildingId
            ? { ...building, status: signal.tone === "warning" ? "upgrading" : "active", unlocked: true }
            : building.status === "active" && building.id !== current.debug.selectedBuildingId
              ? { ...building, status: building.unlocked ? "idle" : "locked" }
              : building,
        ),
        debug: {
          ...current.debug,
          selectedBuildingId: buildingId,
          simulatedTask: signal.task ?? taskForBuilding(buildingId),
        },
        settings: {
          ...current.settings,
          visualTheme: signal.theme ?? themeForRuntimeTone(signal.tone),
        },
      };
    });
  }, [runtimeSignals, town.encounter.active, town.mission.active]);

  const updateDebug = (patch: Partial<HermesDebugState>) => {
    setTown((current) => ({
      ...current,
      debug: { ...current.debug, ...patch },
    }));
  };

  const applySceneStatePatch = useCallback((patch: Partial<HermesTownState>) => {
    setTown((current) => {
      const next = mergeTownPatch(current, patch);
      return areTownStatesEqual(current, next) ? current : next;
    });
  }, []);

  const updateHero = (id: string, patch: Partial<HermesHero>) => {
    setTown((current) => ({
      ...current,
      heroes: current.heroes.map((hero) => (hero.id === id ? { ...hero, ...patch } : hero)),
      debug: { ...current.debug, selectedHeroId: id },
    }));
  };

  const updateHeroStats = (id: string, patch: Partial<HermesHero["stats"]>) => {
    setTown((current) => ({
      ...current,
      heroes: current.heroes.map((hero) =>
        hero.id === id ? { ...hero, stats: { ...hero.stats, ...patch } } : hero,
      ),
      debug: { ...current.debug, selectedHeroId: id },
    }));
  };

  const updateBuilding = (id: HermesBuilding["id"], patch: Partial<HermesBuilding>) => {
    setTown((current) => ({
      ...current,
      buildings: current.buildings.map((building) =>
        building.id === id ? { ...building, ...patch } : building,
      ),
      debug: { ...current.debug, selectedBuildingId: id },
    }));
  };

  const updateProsperity = (prosperity: number) => {
    setTown((current) => ({
      ...current,
      settings: { ...current.settings, prosperity },
    }));
  };

  const updateSettings = (patch: Partial<HermesTownSettings>) => {
    setTown((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  };

  const recordMemoryPulse = () => {
    setTown((current) => ({
      ...current,
      mission: {
        ...current.mission,
        log: [
          ...current.mission.log.slice(-5),
          `Memory crystal indexed ${current.debug.selectedBuildingId}.`,
          `Process snapshot saved at prosperity ${current.settings.prosperity}.`,
        ],
      },
      settings: {
        ...current.settings,
        prosperity: Math.min(100, current.settings.prosperity + 2),
      },
    }));
    setHudTab("memory");
  };

  const attuneRuntimeSignal = (signal: HermesRuntimeSignal) => {
    const buildingId = signal.buildingId ?? buildingForRuntimeTone(signal.tone);
    setTown((current) => ({
      ...current,
      buildings: current.buildings.map((building) =>
        building.id === buildingId
          ? { ...building, unlocked: true, status: signal.tone === "warning" ? "upgrading" : "active" }
          : building,
      ),
      debug: {
        ...current.debug,
        selectedBuildingId: buildingId,
        simulatedTask: signal.task ?? current.debug.simulatedTask,
      },
      settings: {
        ...current.settings,
        prosperity: Math.min(100, current.settings.prosperity + 1),
        visualTheme: signal.theme ?? themeForRuntimeTone(signal.tone),
      },
      mission: {
        ...current.mission,
        log: [
          ...current.mission.log.slice(-5),
          `Oracle attuned: ${signal.title}.`,
          `${buildingLabel(buildingId)} now visualizes ${signal.tone} activity.`,
        ],
      },
    }));
    setHudTab("oracle");
  };

  const embarkRuntimeSignal = (signal: HermesRuntimeSignal) => {
    attuneRuntimeSignal(signal);
    if (signal.taskCardId) {
      props.onTaskBoardSelectCard?.(signal.taskCardId);
    }
    simulateTask(signal.task ?? taskForBuilding(signal.buildingId ?? buildingForRuntimeTone(signal.tone)));
  };

  const connectHermesGateway = () => {
    const targetUrl = resolveHermesGatewayUrl(town.settings);
    const hermesApiUrl = resolveHermesApiUrl(town.settings);
    props.onGatewayAdapterTypeChange?.("hermes");
    props.onGatewayUrlChange?.(targetUrl);
    props.onGatewayTokenChange?.(props.gatewayToken ?? "");
    setPendingGatewayConnect({ adapterType: "hermes", url: targetUrl });
    setHudTab("oracle");
    setTown((current) => ({
      ...current,
      settings: {
        ...current.settings,
        connectionProfile: "tailscale",
        tailscaleHost: current.settings.tailscaleHost.trim() || "100.81.200.32",
      },
      mission: {
        ...current.mission,
        log: [
          ...current.mission.log.slice(-5),
          `Hermes adapter prepared: ${targetUrl}.`,
          `Hermes API target: ${hermesApiUrl}.`,
          "Runtime bridge will hydrate heroes, oracle dispatches, quests, relics, and memory streams.",
        ],
      },
    }));
  };

  const triggerEncounter = useCallback(() => {
    setTown((current) => {
      const unlocked = current.buildings.filter((building) => building.unlocked);
      const selected =
        current.buildings.find((building) => building.id === current.debug.selectedBuildingId) ??
        unlocked[(Date.now() + current.settings.prosperity) % Math.max(1, unlocked.length)] ??
        current.buildings[0];
      const encounter = buildStreetEncounter(selected, current.settings.prosperity);
      return {
        ...current,
        debug: { ...current.debug, selectedBuildingId: selected.id },
        encounter,
        buildings: current.buildings.map((building) =>
          building.id === selected.id ? { ...building, status: "active", unlocked: true } : building,
        ),
      };
    });
  }, []);

  const answerEncounter = (choiceId: EncounterChoiceId) => {
    setTown((current) => {
      const encounter = current.encounter;
      const targetBuilding =
        current.buildings.find((building) => building.id === encounter.buildingId) ??
        current.buildings[0];
      if (!encounter.active || !targetBuilding) return current;
      if (choiceId === "assist") {
        return {
          ...current,
          heroes: current.heroes.map((hero, index) => ({
            ...hero,
            status: index < 3 ? "questing" : hero.status === "idle" ? "walking" : hero.status,
          })),
          buildings: current.buildings.map((building) =>
            building.id === targetBuilding.id
              ? { ...building, status: "active", unlocked: true }
              : building,
          ),
          debug: {
            ...current.debug,
            selectedBuildingId: targetBuilding.id,
            simulatedTask: taskForBuilding(targetBuilding.id),
          },
          mission: {
            active: true,
            phase: "gathering",
            title: `${targetBuilding.name} Street Encounter`,
            objective: encounter.prompt,
            progress: 14,
            simulatedApiCall: `encounter:${encounter.id}`,
            log: [
              `${encounter.title}`,
              "Choice: dispatch heroes.",
              `${targetBuilding.name} becomes the active mission site.`,
            ],
          },
          encounter: {
            ...encounter,
            active: false,
            log: [`Accepted encounter at ${targetBuilding.name}.`],
          },
        };
      }
      if (choiceId === "question") {
        return {
          ...current,
          buildings: current.buildings.map((building) =>
            building.id === targetBuilding.id
              ? {
                  ...building,
                  tier: clampTier(building.tier + 1),
                  status: "upgrading",
                  unlocked: true,
                }
              : building,
          ),
          settings: {
            ...current.settings,
            prosperity: Math.min(100, current.settings.prosperity + 6),
          },
          encounter: {
            ...encounter,
            active: false,
            log: [`Asked the right question at ${targetBuilding.name}.`, "Town insight improved."],
          },
          mission: {
            ...current.mission,
            log: [
              ...current.mission.log.slice(-4),
              `Question resolved: ${encounter.title}`,
              `${targetBuilding.name} gained a visual upgrade state.`,
            ],
          },
        };
      }
      return {
        ...current,
        encounter: {
          ...encounter,
          active: false,
          log: [`Ignored encounter at ${targetBuilding.name}.`],
        },
      };
    });
  };

  const simulateTask = (task: HermesDebugState["simulatedTask"]) => {
    setTown((current) => {
      const scenario = taskScenario(task);
      const selectedHeroId = current.debug.selectedHeroId ?? current.heroes[0]?.id ?? null;
      const targetBuildingId = scenario.buildingId;
      return {
        ...current,
        heroes: current.heroes.map((hero, index) => {
          const selected = hero.id === selectedHeroId;
          const partyMember = selected || index < 3;
          return {
            ...hero,
            status:
              task === "idle"
                ? index % 2 === 0
                  ? "idle"
                  : "walking"
                : partyMember
                  ? "questing"
                  : "walking",
          };
        }),
        buildings: current.buildings.map((building) =>
          building.id === targetBuildingId
            ? {
                ...building,
                unlocked: true,
                tier: Math.max(building.tier, scenario.minimumTier),
                status: "active",
              }
            : { ...building, status: building.unlocked ? "idle" : "locked" },
        ),
        settings: {
          ...current.settings,
          prosperity:
            task === "idle" ? current.settings.prosperity : Math.min(100, current.settings.prosperity + 4),
        },
        debug: {
          ...current.debug,
          simulatedTask: task,
          selectedHeroId,
          selectedBuildingId: targetBuildingId,
        },
        mission: {
          active: task !== "idle",
          phase: task === "idle" ? "idle" : "gathering",
          title: scenario.title,
          objective: scenario.objective,
          progress: scenario.progress,
          simulatedApiCall: task,
          log: scenario.log,
        },
        encounter: {
          ...current.encounter,
          active: false,
          log:
            task === "idle"
              ? current.encounter.log
              : [`Debug mission ${scenario.title} took priority over street encounters.`],
        },
      };
    });
    if (task === "idle") {
      setCombat(null);
    }
  };

  const resolveSimulation = useCallback(() => {
    setCombat(null);
    setTown((current) => ({
      ...current,
      heroes: current.heroes.map((hero) =>
        hero.status === "questing"
          ? { ...hero, status: "walking", stats: { ...hero.stats, level: hero.stats.level + 1 } }
          : hero,
      ),
      buildings: current.buildings.map((building) =>
        building.id === current.debug.selectedBuildingId
          ? { ...building, tier: clampTier(building.tier + 1), unlocked: true, status: "upgrading" }
          : building,
      ),
      settings: {
        ...current.settings,
        prosperity: Math.min(100, current.settings.prosperity + 10),
      },
      mission: {
        ...current.mission,
        active: false,
        phase: "complete",
        progress: 100,
        log: [
          "Local debug task resolved.",
          "Hero level increased.",
          "Selected building advanced one visual tier.",
        ],
      },
      debug: {
        ...current.debug,
        simulatedTask: "idle",
      },
    }));
  }, []);

  useEffect(() => {
    if (!town.mission.active || town.mission.phase !== "combat") {
      setCombat(null);
      return;
    }
    const key = `${town.mission.simulatedApiCall}:${town.mission.title}`;
    setCombat((current) =>
      current?.key === key
        ? current
        : {
            key,
            maxMobHp: 520,
            mobHp: 520,
            turn: 0,
            floats: [
              { id: Date.now(), text: "Mission start!", x: 50, y: 34, tone: "heal" },
            ],
            victory: false,
            decision: null,
            decisionResolved: false,
          },
    );
  }, [town.mission.active, town.mission.phase, town.mission.simulatedApiCall, town.mission.title]);

  useEffect(() => {
    if (
      !town.mission.active ||
      town.mission.phase !== "combat" ||
      !combat ||
      combat.victory ||
      combat.decision
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setCombat((current) => {
        if (!current || current.victory || current.decision) return current;
        if (!current.decisionResolved && shouldAskQuestDecision(town.mission, current.turn)) {
          const decision = buildQuestDecision(town.mission);
          setTown((state) => ({
            ...state,
            mission: {
              ...state.mission,
              log: [
                ...state.mission.log.slice(-5),
                "Hermes needs a user choice before continuing.",
                decision.prompt,
              ],
            },
          }));
          return {
            ...current,
            decision,
          };
        }
        const party = combatParty.length ? combatParty : town.heroes.slice(0, 3);
        const hero = party[current.turn % Math.max(1, party.length)];
        const crit = current.turn % 4 === 0;
        const heal = current.turn % 5 === 2;
        const baseDamage = hero
          ? hero.stats.strength * 14 + hero.stats.agility * 4 + hero.stats.level * 6
          : 65;
        const damage = Math.round(baseDamage * (crit ? 1.55 : 1));
        const nextHp = Math.max(0, current.mobHp - damage);
        const progress = Math.round(((current.maxMobHp - nextHp) / current.maxMobHp) * 100);
        const floatBase = Date.now() + current.turn;
        const floats: CombatFloat[] = [
          ...current.floats.slice(-5),
          {
            id: floatBase,
            text: crit ? `${damage} CRIT!` : `${damage}`,
            x: 58 + ((current.turn * 23) % 22),
            y: 28 + ((current.turn * 17) % 34),
            tone: crit ? "crit" : "damage",
          },
        ];
        if (heal) {
          floats.push({
            id: floatBase + 1,
            text: "HEAL!",
            x: 26 + ((current.turn * 19) % 24),
            y: 34 + ((current.turn * 13) % 26),
            tone: "heal",
          });
        }

        setTown((state) => ({
          ...state,
          mission: {
            ...state.mission,
            progress,
            log: [
              ...state.mission.log.slice(-5),
              `${hero?.name ?? "Party"} attacks for ${damage}.`,
              ...(nextHp === 0 ? ["Mob group defeated. Awaiting debug resolve."] : []),
            ],
          },
        }));

        return {
          ...current,
          mobHp: nextHp,
          turn: current.turn + 1,
          floats,
          victory: nextHp === 0,
        };
      });
    }, 920);

    return () => window.clearInterval(timer);
  }, [combat, combatParty, town.heroes, town.mission, town.mission.active, town.mission.phase]);

  const chooseQuestDecision = (choice: QuestDecisionChoice) => {
    const floatId = Date.now();
    setCombat((current) => {
      if (!current || !current.decision) return current;
      const nextHp = Math.max(0, current.mobHp - choice.bonus);
      return {
        ...current,
        mobHp: nextHp,
        decision: null,
        decisionResolved: true,
        floats: [
          ...current.floats.slice(-4),
          {
            id: floatId,
            text: `+${choice.bonus}`,
            x: 64,
            y: 25,
            tone: "crit",
          },
        ],
        victory: nextHp === 0,
      };
    });
    setTown((current) => ({
      ...current,
      mission: {
        ...current.mission,
        progress: Math.min(96, current.mission.progress + 12),
        log: [
          ...current.mission.log.slice(-5),
          `Choice selected: ${choice.title}.`,
          choice.effect,
        ],
      },
    }));
  };

  useEffect(() => {
    if (!combat?.victory || !town.mission.active || town.mission.phase !== "combat") return;
    const timer = window.setTimeout(() => {
      resolveSimulation();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [combat?.victory, resolveSimulation, town.mission.active, town.mission.phase]);

  useEffect(() => {
    if (!town.mission.active) return;
    if (town.mission.phase === "gathering") {
      const timer = window.setTimeout(() => {
        setTown((current) => {
          if (!current.mission.active || current.mission.phase !== "gathering") return current;
          return {
            ...current,
            mission: {
              ...current.mission,
              phase: "embarking",
              progress: Math.max(current.mission.progress, 28),
              log: [
                ...current.mission.log.slice(-5),
                "Party gathered at the Guild Hall while Hermes prepared context.",
                "Adventurers are marching toward the main city gate.",
              ],
            },
          };
        });
      }, 6200);
      return () => window.clearTimeout(timer);
    }
    if (town.mission.phase === "embarking") {
      const timer = window.setTimeout(() => {
        setTown((current) => {
          if (!current.mission.active || current.mission.phase !== "embarking") return current;
          return {
            ...current,
            mission: {
              ...current.mission,
              phase: "combat",
              progress: Math.max(current.mission.progress, 36),
              log: [
                ...current.mission.log.slice(-5),
                "Departure fallback confirmed after the party reached the city road.",
                "Encounter begins beyond the town walls.",
              ],
            },
          };
        });
      }, 20000);
      return () => window.clearTimeout(timer);
    }
  }, [town.mission.active, town.mission.phase, town.mission.title]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTown((current) => {
        if (!current.settings.autoEncounters || current.mission.active || current.encounter.active) {
          return current;
        }
        const shouldTrigger = Date.now() % 3 === 0;
        if (!shouldTrigger) return current;
        const unlocked = current.buildings.filter((building) => building.unlocked);
        const selected = unlocked[(Date.now() + current.settings.prosperity) % Math.max(1, unlocked.length)];
        if (!selected) return current;
        return {
          ...current,
          debug: { ...current.debug, selectedBuildingId: selected.id },
          encounter: buildStreetEncounter(selected, current.settings.prosperity),
          buildings: current.buildings.map((building) =>
            building.id === selected.id ? { ...building, status: "active" } : building,
          ),
        };
      });
    }, 22000);

    return () => window.clearInterval(timer);
  }, []);

  const movePanel = (id: PanelId, position: { x: number; y: number }) => {
    setPanelPositions((current) => ({ ...current, [id]: position }));
  };

  const cycleBuilding = (direction: -1 | 1) => {
    const unlocked = town.buildings.filter((building) => building.unlocked);
    const currentIndex = Math.max(
      0,
      unlocked.findIndex((building) => building.id === town.debug.selectedBuildingId),
    );
    const next = unlocked[(currentIndex + direction + unlocked.length) % unlocked.length];
    if (next) updateDebug({ selectedBuildingId: next.id });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0c1218] text-[#fff6d8]">
      <section
        className="absolute inset-x-0 top-9 overflow-hidden border-y border-[#1a1a1a] bg-[#86c3e8] shadow-[0_18px_46px_rgba(0,0,0,0.42)]"
        style={{
          height: `min(${town.settings.streetViewportVh}vh, ${town.settings.streetViewportPx}px)`,
          minHeight: 340,
        }}
      >
        <HermesTownCanvas state={town} onSceneStateChange={applySceneStatePatch} />
      </section>

      <div className="pointer-events-none absolute inset-x-0 top-1 z-30 flex justify-center">
        <div className="pointer-events-auto rounded-[4px] border border-[#86776f] bg-[#2f2d2d] px-7 py-1 font-mono text-sm font-bold text-white shadow-[3px_3px_0_rgba(0,0,0,0.65)] ring-2 ring-[#151515]">
          Hermes-town
        </div>
      </div>

      <TownDashboardHud
        activeTab={hudTab}
        metrics={townMetrics}
        missionLog={missionLog}
        onOpenSettings={() => setPanelOpen((current) => ({ ...current, settings: true }))}
        onPulseMemory={recordMemoryPulse}
        onSelectTab={setHudTab}
        onThemeChange={(visualTheme) => updateSettings({ visualTheme })}
        onAttuneSignal={attuneRuntimeSignal}
        onEmbarkSignal={embarkRuntimeSignal}
        onTriggerEncounter={triggerEncounter}
        onUpgradeSelected={() =>
          updateBuilding(selectedBuilding.id, {
            tier: clampTier(selectedBuilding.tier + 1),
            status: "upgrading",
            unlocked: true,
          })
        }
        selectedBuilding={selectedBuilding}
        runtimeSignals={runtimeSignals}
        runtimeSnapshot={runtimeSnapshot}
        settings={town.settings}
        state={town}
      />

      <button
        type="button"
        onClick={() => cycleBuilding(-1)}
        className="absolute left-2 top-1/2 z-20 grid h-9 w-7 -translate-y-1/2 place-items-center rounded-[3px] border border-black/70 bg-[#323232]/78 text-white shadow-[2px_2px_0_rgba(0,0,0,0.55)] hover:bg-[#4a4a4a]"
        aria-label="Select previous building"
      >
        <ChevronLeft className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={() => cycleBuilding(1)}
        className="absolute right-2 top-1/2 z-20 grid h-9 w-7 -translate-y-1/2 place-items-center rounded-[3px] border border-black/70 bg-[#323232]/78 text-white shadow-[2px_2px_0_rgba(0,0,0,0.55)] hover:bg-[#4a4a4a]"
        aria-label="Select next building"
      >
        <ChevronRight className="h-7 w-7" />
      </button>

      {!panelOpen.godmode || !panelOpen.gateway || !panelOpen.settings ? (
        <div className="absolute left-2 top-2 z-50 flex gap-1">
          {!panelOpen.godmode ? (
            <PixelButton onClick={() => setPanelOpen((current) => ({ ...current, godmode: true }))}>
              Godmode
            </PixelButton>
          ) : null}
          {!panelOpen.gateway ? (
            <PixelButton onClick={() => setPanelOpen((current) => ({ ...current, gateway: true }))}>
              Gateway
            </PixelButton>
          ) : null}
          {!panelOpen.settings ? (
            <PixelButton onClick={() => setPanelOpen((current) => ({ ...current, settings: true }))}>
              Open settings
            </PixelButton>
          ) : null}
        </div>
      ) : null}

      {panelOpen.godmode ? (
        <DraggablePanel
          id="godmode"
          title="Godmode"
          position={panelPositions.godmode}
          widthClass="w-[132px] sm:w-[172px]"
          onClose={() => setPanelOpen((current) => ({ ...current, godmode: false }))}
          onMove={movePanel}
        >
          <GodmodePanel
            selectedBuilding={selectedBuilding}
            selectedHero={selectedHero}
            town={town}
            updateBuilding={updateBuilding}
            updateDebug={updateDebug}
            updateHero={updateHero}
            updateHeroStats={updateHeroStats}
            updateProsperity={updateProsperity}
            simulateTask={simulateTask}
            triggerEncounter={triggerEncounter}
            openSettings={() => setPanelOpen((current) => ({ ...current, settings: true }))}
          />
        </DraggablePanel>
      ) : null}

      {panelOpen.gateway ? (
        <DraggablePanel
          id="gateway"
          title="Remote Gateway"
          position={panelPositions.gateway}
          widthClass="w-[min(332px,calc(100vw-16px))]"
          onClose={() => setPanelOpen((current) => ({ ...current, gateway: false }))}
          onMove={movePanel}
        >
          <RemoteGatewayPanel
            activeAdapterType={props.activeAdapterType ?? null}
            gatewayUrl={props.gatewayUrl ?? ""}
            gatewayStatus={gatewayStatus}
            missionLog={missionLog}
            pendingGatewayUrl={pendingGatewayConnect?.url ?? null}
            selectedBuilding={selectedBuilding}
            selectedAdapterType={props.selectedAdapterType ?? "hermes"}
            town={town}
            onConnect={connectHermesGateway}
            onDisconnect={() => props.onGatewayDisconnect?.()}
            onSelect={() => props.onAddAgent?.()}
          />
        </DraggablePanel>
      ) : null}

      {panelOpen.settings ? (
        <DraggablePanel
          id="settings"
          title="Settings"
          position={panelPositions.settings}
          widthClass="w-[min(330px,calc(100vw-16px))]"
          onClose={() => setPanelOpen((current) => ({ ...current, settings: false }))}
          onMove={movePanel}
        >
          <SettingsPanel settings={town.settings} updateSettings={updateSettings} />
        </DraggablePanel>
      ) : null}

      {town.mission.active && (town.mission.phase === "gathering" || town.mission.phase === "embarking") ? (
        <MissionPhaseBanner mission={town.mission} />
      ) : null}

      {town.mission.active && town.mission.phase === "combat" && combat ? (
        <CombatOverlay
          combat={combat}
          missionLog={missionLog}
          onChooseDecision={chooseQuestDecision}
          party={combatParty}
          progress={town.mission.progress}
          title={town.mission.title}
        />
      ) : null}

      {town.encounter.active && !town.mission.active ? (
        <EncounterOverlay
          encounter={town.encounter}
          onAnswer={answerEncounter}
          targetBuilding={selectedBuilding}
        />
      ) : null}
    </div>
  );
}

function TownDashboardHud(props: {
  activeTab: HudTab;
  metrics: ReturnType<typeof buildTownMetrics>;
  missionLog: string[];
  onAttuneSignal: (signal: HermesRuntimeSignal) => void;
  onEmbarkSignal: (signal: HermesRuntimeSignal) => void;
  onOpenSettings: () => void;
  onPulseMemory: () => void;
  onSelectTab: (tab: HudTab) => void;
  onThemeChange: (theme: HermesTownTheme) => void;
  onTriggerEncounter: () => void;
  onUpgradeSelected: () => void;
  runtimeSignals: HermesRuntimeSignal[];
  runtimeSnapshot: HermesRuntimeSnapshot;
  selectedBuilding: HermesBuilding;
  settings: HermesTownSettings;
  state: HermesTownState;
}) {
  const activeTheme = themeOptions.find((theme) => theme.value === props.settings.visualTheme) ?? themeOptions[0];
  return (
    <section
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-10 overflow-hidden rounded-[6px] border border-[#8b6b2e] bg-[#14100a]/96 shadow-[0_0_0_2px_#2b1d0d,0_12px_34px_rgba(0,0,0,0.5)]"
      style={{
        top: `calc(2.25rem + min(${props.settings.streetViewportVh}vh, ${props.settings.streetViewportPx}px) + 12px)`,
      }}
    >
      <div className="flex min-h-0 h-full flex-col">
        <div className="grid gap-2 border-b border-[#6d5125] bg-[#24180b] px-3 py-2 xl:grid-cols-[minmax(280px,1fr)_minmax(360px,1.35fr)]">
          <div className="flex min-w-0 items-center gap-2">
            <Crown className="h-4 w-4 text-[#f4c869]" />
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-bold uppercase text-[#ffe7a2]">
                Guild Dashboard
              </div>
              <div className="truncate font-mono text-[10px] text-[#d9c89e]">
                {activeTheme.label} / {props.selectedBuilding.name} / {props.state.gatewayStatus}
              </div>
            </div>
          </div>
          <div className="grid gap-2 lg:grid-cols-[auto_minmax(240px,1fr)]">
            <div className="flex flex-wrap gap-1">
              <GoldStat icon={<Coins className="h-3.5 w-3.5" />} label="Gold" value={props.metrics.gold} />
              <GoldStat icon={<Gem className="h-3.5 w-3.5" />} label="Memory" value={props.metrics.memoryShards} />
              <GoldStat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Renown" value={props.metrics.renown} />
            </div>
            <RunLedger summaries={props.runtimeSnapshot.runSummaries ?? []} />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[132px_1fr] overflow-hidden">
          <nav className="border-r border-[#6d5125] bg-[#1b1309] p-2">
            {[
              { id: "progress", label: "Progress", icon: <ScrollText className="h-3.5 w-3.5" /> },
              { id: "process", label: "Process", icon: <Waypoints className="h-3.5 w-3.5" /> },
              { id: "oracle", label: "Oracle", icon: <Bot className="h-3.5 w-3.5" /> },
              { id: "memory", label: "Memory", icon: <BookOpen className="h-3.5 w-3.5" /> },
              { id: "themes", label: "Themes", icon: <Sparkles className="h-3.5 w-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => props.onSelectTab(tab.id as HudTab)}
                className={[
                  "mb-1 flex w-full items-center gap-2 rounded-[3px] border px-2 py-1.5 text-left font-mono text-[10px] font-bold uppercase",
                  props.activeTab === tab.id
                    ? "border-[#e0b75f] bg-[#5a3b13] text-[#fff1ba]"
                    : "border-[#46331a] bg-[#21170c] text-[#cbb78b] hover:border-[#9a7435]",
                ].join(" ")}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <div className="mt-2 grid gap-1">
              <PixelButton onClick={props.onTriggerEncounter}>Encounter</PixelButton>
              <PixelButton onClick={props.onOpenSettings}>Settings</PixelButton>
            </div>
          </nav>

          <div className="min-h-0 overflow-y-auto bg-[#100d08] p-3">
            {props.activeTab === "progress" ? (
              <HudProgress metrics={props.metrics} state={props.state} />
            ) : null}
            {props.activeTab === "process" ? (
              <HudProcess metrics={props.metrics} onUpgradeSelected={props.onUpgradeSelected} />
            ) : null}
            {props.activeTab === "oracle" ? (
              <HudOracle
                onAttuneSignal={props.onAttuneSignal}
                onEmbarkSignal={props.onEmbarkSignal}
                signals={props.runtimeSignals}
                snapshot={props.runtimeSnapshot}
              />
            ) : null}
            {props.activeTab === "memory" ? (
              <HudMemory missionLog={props.missionLog} onPulseMemory={props.onPulseMemory} state={props.state} />
            ) : null}
            {props.activeTab === "themes" ? (
              <HudThemes activeTheme={props.settings.visualTheme} onThemeChange={props.onThemeChange} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function GoldStat(props: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex min-w-[86px] items-center gap-1 rounded-[3px] border border-[#8b6b2e] bg-[#2a1c0b] px-2 py-1 font-mono text-[10px] text-[#ffe8a8]">
      <span className="text-[#f2c76c]">{props.icon}</span>
      <span>{props.label}</span>
      <span className="ml-auto font-bold text-white">{props.value}</span>
    </div>
  );
}

function RunLedger(props: { summaries: HermesRuntimeRunSummary[] }) {
  const active = props.summaries.find((summary) => summary.status === "running" || summary.status === "waiting");
  const recent = props.summaries.filter((summary) => summary.id !== active?.id).slice(0, 2);
  return (
    <div className="min-w-0 rounded-[4px] border border-[#7d5e2b] bg-[#16110a] px-2 py-1 font-mono shadow-[inset_0_0_0_1px_rgba(255,227,156,0.06)]">
      <div className="mb-1 flex items-center justify-between gap-2 text-[9px] font-bold uppercase text-[#e8c779]">
        <span>Run Ledger</span>
        <span>{active ? "Active commission" : "Recent commissions"}</span>
      </div>
      {active ? (
        <RunLedgerRow summary={active} primary />
      ) : (
        <div className="truncate text-[10px] text-[#bca77a]">No active Hermes commission detected.</div>
      )}
      <div className="mt-1 grid gap-1 md:grid-cols-2">
        {recent.length > 0 ? (
          recent.map((summary) => <RunLedgerRow key={summary.id} summary={summary} />)
        ) : (
          <div className="truncate text-[9px] text-[#8f7b58]">Previous tasks will appear here after Hermes reports activity.</div>
        )}
      </div>
    </div>
  );
}

function RunLedgerRow(props: { primary?: boolean; summary: HermesRuntimeRunSummary }) {
  const building = props.summary.buildingId ? buildingLabel(props.summary.buildingId) : "Guild Hall";
  return (
    <div
      className={[
        "min-w-0 rounded-[3px] border px-2 py-1",
        props.primary
          ? "border-[#d3a94d] bg-[#31220d] text-[#fff0ba]"
          : "border-[#4c3920] bg-[#1c140a] text-[#d7c294]",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 text-[10px]">
        <span className="truncate font-bold">{props.summary.title}</span>
        <span className="shrink-0 uppercase text-[#d4b263]">{fantasyRunSummaryStatus(props.summary.status)}</span>
      </div>
      <div className="truncate text-[9px] text-[#bca77a]">
        {props.summary.heroName ?? building} / {props.summary.detail}
      </div>
    </div>
  );
}

function HudProgress(props: { metrics: ReturnType<typeof buildTownMetrics>; state: HermesTownState }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <HudTitle icon={<Crown className="h-4 w-4" />} title="Town Progress" />
        <HudMeter label="Prosperity" value={props.state.settings.prosperity} />
        <HudMeter label="Mission" value={props.state.mission.active ? props.state.mission.progress : 0} />
        <HudMeter label="Unlocked" value={props.metrics.unlockPercent} />
      </div>
      <div>
        <HudTitle icon={<Building2 className="h-4 w-4" />} title="Building Ledger" />
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {props.state.buildings.map((building) => (
            <div
              key={building.id}
              className="rounded-[3px] border border-[#5b4320] bg-[#1b1309] px-2 py-1 font-mono text-[10px]"
            >
              <div className="flex items-center justify-between gap-2 text-[#ffe4a1]">
                <span className="truncate font-bold">{building.name}</span>
                <span>Lv {building.tier}</span>
              </div>
              <div className="truncate text-[#bba77a]">{building.status} / {building.skill}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HudProcess(props: {
  metrics: ReturnType<typeof buildTownMetrics>;
  onUpgradeSelected: () => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <HudTitle icon={<Waypoints className="h-4 w-4" />} title="Hermes Process Chain" />
        <div className="grid gap-2 sm:grid-cols-4">
          {props.metrics.processSteps.map((step) => (
            <div
              key={step.label}
              className={[
                "rounded-[4px] border px-2 py-2 font-mono text-[10px]",
                step.done
                  ? "border-[#d5ac55] bg-[#3a270d] text-[#fff1bf]"
                  : "border-[#4b3920] bg-[#171109] text-[#a99467]",
              ].join(" ")}
            >
              <div className="font-bold uppercase">{step.label}</div>
              <div className="mt-1">{step.detail}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <HudTitle icon={<Swords className="h-4 w-4" />} title="Quick Orders" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <PixelButton onClick={props.onUpgradeSelected}>Upgrade selected building</PixelButton>
          <div className="rounded-[3px] border border-[#5b4320] bg-[#1b1309] p-2 font-mono text-[10px] text-[#d8c492]">
            Active heroes: {props.metrics.activeHeroes}. Questing and working heroes increase mission pressure.
          </div>
        </div>
      </div>
    </div>
  );
}

function HudOracle(props: {
  onAttuneSignal: (signal: HermesRuntimeSignal) => void;
  onEmbarkSignal: (signal: HermesRuntimeSignal) => void;
  signals: HermesRuntimeSignal[];
  snapshot: HermesRuntimeSnapshot;
}) {
  const readySkills = props.snapshot.skills?.filter((skill) => skill.ready).length ?? 0;
  const totalSkills = props.snapshot.skills?.length ?? 0;
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.35fr]">
      <div className="space-y-3">
        <div>
          <HudTitle icon={<Bot className="h-4 w-4" />} title="Guild Crystal" />
          <div className="grid gap-2 sm:grid-cols-2">
            <OracleStat label="Gate Ward" value={fantasyGatewayStatus(props.snapshot.gatewayStatus)} tone="aether" />
            <OracleStat label="Realm" value={fantasyAdapterName(props.snapshot.adapterType)} tone="skill" />
            <OracleStat label="Active Quests" value={props.snapshot.runningCount ?? 0} tone="quest" />
            <OracleStat label="Omens" value={props.snapshot.unseenInboxCount ?? 0} tone="warning" />
          </div>
          <div className="mt-2 rounded-[4px] border border-[#5b4320] bg-[#151009] p-2 font-mono text-[10px] leading-4 text-[#d8c492]">
            <div className="truncate text-[#ffe4a1]">
              {props.snapshot.gatewayUrl ? `Gate rune: ${props.snapshot.gatewayUrl}` : "Gate rune: local town mirror"}
            </div>
            <div className="truncate">
              {props.snapshot.remoteStatus ?? `${props.snapshot.eventCount ?? 0} oracle omens inked`}
            </div>
          </div>
        </div>

        <div>
          <HudTitle icon={<ScrollText className="h-4 w-4" />} title="Guild Contracts" />
          <div className="grid gap-1">
            {(props.snapshot.tasks ?? []).slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="rounded-[3px] border border-[#5b4320] bg-[#1b1309] px-2 py-1 font-mono text-[10px]"
              >
                <div className="flex items-center justify-between gap-2 text-[#ffe4a1]">
                  <span className="truncate font-bold">{task.title}</span>
                  <span className="text-[9px] uppercase text-[#d0b36f]">{fantasyTaskStatus(task.status)}</span>
                </div>
                <div className="truncate text-[#bba77a]">{task.agentName ?? "No hero assigned"}</div>
              </div>
            ))}
            {(props.snapshot.tasks?.length ?? 0) === 0 ? (
              <div className="rounded-[3px] border border-[#5b4320] bg-[#1b1309] p-2 font-mono text-[10px] text-[#bba77a]">
                No contracts have been posted to the guild board yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <HudTitle icon={<Sparkles className="h-4 w-4" />} title="Omens & Dispatches" />
          <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
            {props.signals.map((signal) => (
              <div
                key={signal.id}
                className={[
                  "rounded-[5px] border p-2 font-mono text-[10px] shadow-[1px_1px_0_rgba(0,0,0,0.5)]",
                  oracleToneClass(signal.tone),
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[11px] font-bold uppercase text-white">{signal.title}</div>
                  <div className="text-[9px] text-[#ead49d]">{signal.timestamp ?? fantasyToneName(signal.tone)}</div>
                </div>
                <div className="mt-1 line-clamp-2 leading-4 text-[#f1dfb2]">{signal.summary}</div>
                <div className="mt-2 flex gap-1">
                  <PixelButton onClick={() => props.onAttuneSignal(signal)}>Attune</PixelButton>
                  <PixelButton onClick={() => props.onEmbarkSignal(signal)}>Quest</PixelButton>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <HudTitle icon={<Gem className="h-4 w-4" />} title="Relic Vault" />
          <div className="grid gap-1 sm:grid-cols-2">
            <div className="rounded-[3px] border border-[#5b4320] bg-[#1b1309] p-2 font-mono text-[10px] text-[#d8c492]">
              Awakened relics: <span className="text-[#ffe4a1]">{readySkills}/{Math.max(1, totalSkills)}</span>
            </div>
            {(props.snapshot.skills ?? []).slice(0, 5).map((skill) => (
              <div
                key={skill.key}
                className={[
                  "rounded-[3px] border px-2 py-1 font-mono text-[10px]",
                  skill.ready
                    ? "border-[#d5ac55] bg-[#3a270d] text-[#fff1bf]"
                    : "border-[#4b3920] bg-[#171109] text-[#a99467]",
                ].join(" ")}
              >
                <span className="mr-1">{skill.emoji ?? "◇"}</span>
                {skill.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OracleStat(props: { label: string; tone: HermesRuntimeTone; value: number | string }) {
  return (
    <div className={["rounded-[4px] border px-2 py-2 font-mono text-[10px]", oracleToneClass(props.tone)].join(" ")}>
      <div className="text-[9px] uppercase text-[#ead49d]">{props.label}</div>
      <div className="truncate text-sm font-bold text-white">{props.value}</div>
    </div>
  );
}

function HudMemory(props: {
  missionLog: string[];
  onPulseMemory: () => void;
  state: HermesTownState;
}) {
  const memoryRows = buildMemoryRows(props.state, props.missionLog);
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
      <div>
        <HudTitle icon={<BookOpen className="h-4 w-4" />} title="Memory Archive" />
        <div className="max-h-36 overflow-y-auto rounded-[4px] border border-[#5b4320] bg-[#151009] p-2 font-mono text-[10px] text-[#d8c492]">
          {memoryRows.map((row, index) => (
            <div key={`${row}-${index}`} className="border-b border-[#3b2a15] py-1 last:border-b-0">
              {row}
            </div>
          ))}
        </div>
      </div>
      <div>
        <HudTitle icon={<Gem className="h-4 w-4" />} title="Memory Tools" />
        <div className="grid gap-2 sm:grid-cols-2">
          <PixelButton onClick={props.onPulseMemory}>Index memory crystal</PixelButton>
          <div className="rounded-[3px] border border-[#5b4320] bg-[#1b1309] p-2 font-mono text-[10px] text-[#d8c492]">
            Streams tracked: {Object.values(props.state.streamingTextByAgentId).filter(Boolean).length}
          </div>
        </div>
      </div>
    </div>
  );
}

function HudThemes(props: {
  activeTheme: HermesTownTheme;
  onThemeChange: (theme: HermesTownTheme) => void;
}) {
  return (
    <div>
      <HudTitle icon={<Sparkles className="h-4 w-4" />} title="Isekai Themes" />
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {themeOptions.map((theme) => (
          <button
            key={theme.value}
            type="button"
            onClick={() => props.onThemeChange(theme.value)}
            className={[
              "rounded-[5px] border p-3 text-left font-mono text-[10px]",
              props.activeTheme === theme.value
                ? "border-[#f1c96d] bg-[#51330f] text-[#fff3c4]"
                : "border-[#4f3920] bg-[#181109] text-[#c8b27c] hover:border-[#b88b3c]",
            ].join(" ")}
          >
            <div className="text-xs font-bold uppercase">{theme.label}</div>
            <div className="mt-1 leading-4">{theme.summary}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HudTitle(props: { icon: ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase text-[#ffd879]">
      {props.icon}
      {props.title}
    </div>
  );
}

function HudMeter(props: { label: string; value: number }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-[#dbc48d]">
        <span>{props.label}</span>
        <span>{props.value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-[#33230e]">
        <div className="h-full bg-[#d9ad52]" style={{ width: `${Math.max(4, Math.min(100, props.value))}%` }} />
      </div>
    </div>
  );
}

function GodmodePanel(props: {
  town: HermesTownState;
  selectedHero: HermesHero | null;
  selectedBuilding: HermesBuilding;
  updateDebug: (patch: Partial<HermesDebugState>) => void;
  updateHero: (id: string, patch: Partial<HermesHero>) => void;
  updateHeroStats: (id: string, patch: Partial<HermesHero["stats"]>) => void;
  updateBuilding: (id: HermesBuilding["id"], patch: Partial<HermesBuilding>) => void;
  updateProsperity: (prosperity: number) => void;
  simulateTask: (task: HermesDebugState["simulatedTask"]) => void;
  triggerEncounter: () => void;
  openSettings: () => void;
}) {
  const { selectedBuilding, selectedHero, town } = props;
  return (
    <div className="space-y-1 font-mono text-[10px] leading-tight">
      <PixelSelect
        label="Main panels"
        value={town.debug.simulatedTask}
        onChange={(value) => props.simulateTask(value as HermesDebugState["simulatedTask"])}
        options={taskOptions.map((task) => ({ label: task.replace("_", " "), value: task }))}
      />
      <div className="grid grid-cols-2 gap-1">
        <PixelButton onClick={() => props.simulateTask("code_patch")}>
          <Play className="h-3 w-3" />
          Inject
        </PixelButton>
        <PixelButton onClick={() => props.simulateTask("approval")}>
          <Activity className="h-3 w-3" />
          Choice
        </PixelButton>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <PixelButton onClick={props.triggerEncounter}>Encounter</PixelButton>
        <PixelButton onClick={props.openSettings}>Settings</PixelButton>
      </div>
      <PixelToggle
        checked={town.debug.labelsVisible}
        label="Labels"
        onChange={(labelsVisible) => props.updateDebug({ labelsVisible })}
      />
      <PixelRange
        label="Scroll"
        max={2}
        min={0.4}
        step={0.1}
        value={town.debug.scrollSensitivity}
        onChange={(scrollSensitivity) => props.updateDebug({ scrollSensitivity })}
      />
      <PixelSelect
        label="Light"
        value={town.debug.timeMode}
        onChange={(value) => props.updateDebug({ timeMode: value as HermesTimeMode })}
        options={timeOptions.map((timeMode) => ({ label: timeMode, value: timeMode }))}
      />
      <PixelRange
        label="Prosperity"
        max={100}
        min={0}
        value={town.settings.prosperity}
        onChange={props.updateProsperity}
      />
      <div className="grid grid-cols-2 gap-1">
        <PixelButton
          onClick={() =>
            props.updateBuilding(selectedBuilding.id, {
              tier: clampTier(selectedBuilding.tier + 1),
              unlocked: true,
              status: "upgrading",
            })
          }
        >
          Upgrade
        </PixelButton>
        <PixelButton
          onClick={() =>
            props.updateBuilding(selectedBuilding.id, {
              status: selectedBuilding.status === "locked" ? "idle" : "locked",
              unlocked: selectedBuilding.status === "locked",
            })
          }
        >
          {selectedBuilding.status === "locked" ? "Unlock" : "Lock"}
        </PixelButton>
      </div>
      <PixelSelect
        label="Building"
        value={selectedBuilding.id}
        onChange={(value) => props.updateDebug({ selectedBuildingId: value as HermesBuilding["id"] })}
        options={town.buildings.map((building) => ({ label: building.name, value: building.id }))}
      />
      <PixelSelect
        label="State"
        value={selectedBuilding.status}
        onChange={(value) =>
          props.updateBuilding(selectedBuilding.id, {
            status: value as HermesBuilding["status"],
            unlocked: value !== "locked",
          })
        }
        options={["idle", "active", "upgrading", "locked"].map((value) => ({ label: value, value }))}
      />
      {selectedHero ? (
        <>
          <PixelSelect
            label="Hero"
            value={selectedHero.id}
            onChange={(selectedHeroId) => props.updateDebug({ selectedHeroId })}
            options={town.heroes.map((hero) => ({ label: hero.name, value: hero.id }))}
          />
          <PixelSelect
            label="Pose"
            value={selectedHero.status}
            onChange={(value) =>
              props.updateHero(selectedHero.id, { status: value as HermesHeroStatus })
            }
            options={statusOptions.map((status) => ({ label: status, value: status }))}
          />
          <PixelRange
            label="Strength"
            max={20}
            min={1}
            value={selectedHero.stats.strength}
            onChange={(strength) => props.updateHeroStats(selectedHero.id, { strength })}
          />
          <PixelRange
            label="Agility"
            max={20}
            min={1}
            value={selectedHero.stats.agility}
            onChange={(agility) => props.updateHeroStats(selectedHero.id, { agility })}
          />
          <PixelRange
            label="Level"
            max={99}
            min={1}
            value={selectedHero.stats.level}
            onChange={(level) => props.updateHeroStats(selectedHero.id, { level })}
          />
        </>
      ) : null}
      <div className="rounded-[2px] border border-[#504646] bg-[#1b1a1a] px-1 py-1 text-[#d7d7d7]">
        <div className="flex items-center gap-1 text-white">
          <Gauge className="h-3 w-3 text-[#e7d089]" />
          {selectedBuilding.name}
        </div>
        <div className="mt-0.5 text-[9px] text-[#bfb8b0]">{selectedBuilding.skill}</div>
      </div>
    </div>
  );
}

function RemoteGatewayPanel(props: {
  activeAdapterType: HermesGatewayAdapterType | null;
  gatewayUrl: string;
  gatewayStatus: string;
  missionLog: string[];
  pendingGatewayUrl: string | null;
  selectedBuilding: HermesBuilding;
  selectedAdapterType: HermesGatewayAdapterType;
  town: HermesTownState;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelect: () => void;
}) {
  const targetUrl = resolveHermesGatewayUrl(props.town.settings);
  const apiUrl = resolveHermesApiUrl(props.town.settings);
  return (
    <div className="space-y-2 font-mono text-[11px] leading-tight text-white">
      <div className="font-bold">Hermes gateway relay</div>
      <p className="text-[#e6e6e6]">
        Connect the town to the Hermes agent runtime over the configured gateway URL.
      </p>
      <div className="space-y-1 text-[#d7d7d7]">
        <div>Selected backend: {props.selectedAdapterType}</div>
        <div>Active backend: {props.activeAdapterType ?? "none"}</div>
        <div>Status: {props.gatewayStatus}</div>
        <div className="break-all">Hermes API: {apiUrl}</div>
        <div className="break-all">Adapter URL: {targetUrl}</div>
        <div className="break-all">Runtime URL: {props.gatewayUrl || "-"}</div>
        {props.pendingGatewayUrl ? <div className="text-[#f5cf7b]">Connecting: {props.pendingGatewayUrl}</div> : null}
        <div>Local debug: {props.town.debug.simulatedTask.replace("_", " ")}</div>
        <div>Target: {props.selectedBuilding.name}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <PixelButton onClick={props.onConnect}>
          <Bot className="h-3 w-3" />
          Connect
        </PixelButton>
        <PixelButton onClick={props.gatewayStatus === "connected" ? props.onDisconnect : props.onSelect}>
          <Building2 className="h-3 w-3" />
          {props.gatewayStatus === "connected" ? "Disconnect" : "Select"}
        </PixelButton>
      </div>
      <div className="max-h-20 overflow-hidden rounded-[2px] border border-[#504646] bg-[#151515] p-1 text-[9px] text-[#d8d0c7]">
        {props.missionLog.slice(-4).map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel(props: {
  settings: HermesTownSettings;
  updateSettings: (patch: Partial<HermesTownSettings>) => void;
}) {
  const apiUrl = resolveHermesApiUrl(props.settings);
  const adapterUrl = resolveHermesGatewayUrl(props.settings);
  return (
    <div className="space-y-2 font-mono text-[10px] leading-tight text-white">
      <PixelSelect
        label="Gateway profile"
        value={props.settings.connectionProfile}
        onChange={(value) =>
          props.updateSettings({ connectionProfile: value as HermesTownSettings["connectionProfile"] })
        }
        options={[
          { label: "Tailscale IP", value: "tailscale" },
          { label: "Home IP", value: "home" },
          { label: "Localhost", value: "local" },
        ]}
      />
      <PixelInput
        label="Tailscale IP"
        value={props.settings.tailscaleHost}
        onChange={(tailscaleHost) => props.updateSettings({ tailscaleHost })}
      />
      <PixelInput
        label="Home IP"
        value={props.settings.homeHost}
        onChange={(homeHost) => props.updateSettings({ homeHost })}
      />
      <div className="rounded-[2px] border border-[#504646] bg-[#151515] p-1 text-[#d8d0c7]">
        Hermes API: {apiUrl}
      </div>
      <div className="rounded-[2px] border border-[#504646] bg-[#151515] p-1 text-[#d8d0c7]">
        Adapter URL: {adapterUrl}
      </div>
      <PixelRange
        label="Hermes API port"
        max={65535}
        min={1}
        value={props.settings.hermesApiPort}
        onChange={(hermesApiPort) => props.updateSettings({ hermesApiPort })}
      />
      <PixelRange
        label="Adapter port"
        max={65535}
        min={1}
        value={props.settings.gatewayPort}
        onChange={(gatewayPort) => props.updateSettings({ gatewayPort })}
      />
      <PixelRange
        label="Max agents"
        max={24}
        min={1}
        value={props.settings.maxAgents}
        onChange={(maxAgents) => props.updateSettings({ maxAgents })}
      />
      <PixelRange
        label="NPC density"
        max={12}
        min={0}
        value={props.settings.npcDensity}
        onChange={(npcDensity) => props.updateSettings({ npcDensity })}
      />
      <PixelToggle
        checked={props.settings.autoEncounters}
        label="Auto encounters"
        onChange={(autoEncounters) => props.updateSettings({ autoEncounters })}
      />
      <PixelSelect
        label="Town theme"
        value={props.settings.visualTheme}
        onChange={(value) => props.updateSettings({ visualTheme: value as HermesTownTheme })}
        options={themeOptions.map((theme) => ({ label: theme.label, value: theme.value }))}
      />
      <PixelRange
        label="View height"
        max={74}
        min={42}
        value={props.settings.streetViewportVh}
        onChange={(streetViewportVh) => props.updateSettings({ streetViewportVh })}
      />
      <PixelRange
        label="Max pixels"
        max={620}
        min={360}
        value={props.settings.streetViewportPx}
        onChange={(streetViewportPx) => props.updateSettings({ streetViewportPx })}
      />
      <div className="grid grid-cols-2 gap-1">
        <PixelButton
          onClick={() =>
            props.updateSettings({
              connectionProfile: "tailscale",
              tailscaleHost: "100.81.200.32",
              homeHost: "192.168.1.10",
              hermesApiPort: 8642,
              gatewayPort: 18789,
              maxAgents: 8,
              npcDensity: 5,
              autoEncounters: true,
              streetViewportVh: 58,
              streetViewportPx: 500,
              visualTheme: "royal-guild",
            })
          }
        >
          Defaults
        </PixelButton>
        <PixelButton
          onClick={() =>
            props.updateSettings({
              streetViewportVh: 46,
              streetViewportPx: 420,
            })
          }
        >
          Street strip
        </PixelButton>
      </div>
    </div>
  );
}

function EncounterOverlay(props: {
  encounter: HermesEncounter;
  onAnswer: (choiceId: EncounterChoiceId) => void;
  targetBuilding: HermesBuilding;
}) {
  return (
    <section className="pointer-events-auto absolute bottom-[calc(38vh+14px)] left-1/2 z-[55] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 rounded-[4px] border border-[#81786f] bg-[#202020] p-1 text-white shadow-[4px_4px_0_rgba(0,0,0,0.66)] ring-2 ring-[#111]">
      <div className="flex items-center justify-between rounded-[2px] border border-[#544e48] bg-[#303030] px-2 py-0.5 font-mono text-[10px] font-bold">
        <span>{props.encounter.title}</span>
        <span className="text-[#d7c6a8]">{props.targetBuilding.name}</span>
      </div>
      <div className="p-2 font-mono text-[11px] leading-5 text-[#f2ead8]">
        {props.encounter.prompt}
      </div>
      <div className="grid gap-1 px-2 pb-2 sm:grid-cols-3">
        {props.encounter.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => props.onAnswer(choice.id as EncounterChoiceId)}
            className="rounded-[2px] border border-[#76695f] bg-[#342f2d] px-2 py-1.5 text-left font-mono text-[10px] text-white shadow-[1px_1px_0_rgba(0,0,0,0.7)] hover:bg-[#49413d]"
          >
            <span className="block font-bold uppercase">{choice.label}</span>
            <span className="text-[9px] text-[#d6ccb8]">{choice.effect}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MissionPhaseBanner(props: { mission: HermesMission }) {
  const isGathering = props.mission.phase === "gathering";
  return (
    <section className="pointer-events-none absolute left-1/2 top-[43%] z-[58] w-[min(360px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-[#8b6b2e] bg-[#17110a]/94 p-1 text-[#fff6d8] shadow-[4px_4px_0_rgba(0,0,0,0.66)] ring-2 ring-[#111]">
      <div className="rounded-[2px] border border-[#5f4720] bg-[#2d1f0e] px-2 py-1 font-mono text-[10px] font-bold uppercase text-[#ffe7a2]">
        {isGathering ? "Gathering at Guild Hall" : "Embarking Through City Gate"}
      </div>
      <div className="px-2 py-2 font-mono text-[11px] leading-5 text-[#ead8ad]">
        <div className="font-bold text-white">{props.mission.title}</div>
        <div>
          {isGathering
            ? "Hermes is preparing context, memory, and route details before departure."
            : "The adventurers are leaving the visible town before the quest screen opens."}
        </div>
      </div>
      <div className="mx-2 mb-2 h-1.5 overflow-hidden rounded bg-[#2a2114]">
        <div
          className="h-full bg-[#d5ad52]"
          style={{ width: `${Math.max(8, Math.min(100, props.mission.progress))}%` }}
        />
      </div>
    </section>
  );
}

function CombatOverlay(props: {
  combat: CombatState;
  missionLog: string[];
  onChooseDecision: (choice: QuestDecisionChoice) => void;
  party: HermesHero[];
  progress: number;
  title: string;
}) {
  const mob = mobFrames[props.combat.turn % mobFrames.length];
  return (
    <section className="pointer-events-auto absolute left-1/2 top-[43%] z-[60] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-[#81786f] bg-[#202020] p-1 shadow-[4px_4px_0_rgba(0,0,0,0.66)] ring-2 ring-[#111]">
      <div className="flex items-center justify-between rounded-[2px] border border-[#544e48] bg-[#2f2d2d] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
        <span>{props.title}</span>
        <X className="h-3 w-3 text-[#d7d7d7]" />
      </div>
      <div className="relative mt-1 h-[210px] overflow-hidden rounded-[3px] border border-[#53452f] bg-[#95bd91]">
        <div className="absolute inset-0 bg-[linear-gradient(#7fb8c7_0%,#c9dfbd_48%,#6a9157_49%,#48643d_100%)]" />
        <div className="absolute bottom-9 left-0 h-10 w-full bg-[#58734b]" />
        <div className="absolute bottom-0 left-0 h-10 w-full bg-[#3d4d35]" />
        <div className="absolute left-4 top-10 grid grid-cols-2 gap-x-2 gap-y-1">
          {props.party.slice(0, 4).map((hero, index) => (
            <div
              key={hero.id}
              className="relative"
              style={{ transform: `translateY(${index % 2 === 0 ? 0 : 20}px)` }}
            >
              <SheetSprite frame={combatHeroFrames[hero.className]} scale={0.62} />
              <div className="absolute -left-5 top-8 w-max rounded-[2px] border border-black bg-[#252525]/90 px-1 py-0.5 font-mono text-[9px] text-white">
                {hero.name} Lv{hero.stats.level}: Attacking
              </div>
            </div>
          ))}
        </div>
        <div className="absolute right-6 top-20 grid grid-cols-2 gap-x-1 gap-y-2">
          {mobFrames.slice(0, 4).map((enemy, index) => (
            <div key={enemy.name} className={index % 2 === 0 ? "translate-y-3" : ""}>
              <SheetSprite frame={enemy.frame} scale={0.62} />
            </div>
          ))}
        </div>
        <div className="absolute right-4 top-14 rounded-[2px] border border-black bg-[#252525]/90 px-1.5 py-0.5 font-mono text-[9px] text-white">
          {mob.name}: HP {props.combat.mobHp}/{props.combat.maxMobHp}
        </div>
        {props.combat.floats.map((float) => (
          <div
            key={float.id}
            className={[
              "absolute animate-bounce font-mono text-sm font-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]",
              float.tone === "crit"
                ? "text-[#ff5c4d]"
                : float.tone === "heal"
                  ? "text-[#72ff87]"
                  : "text-[#ffe26f]",
            ].join(" ")}
            style={{ left: `${float.x}%`, top: `${float.y}%` }}
          >
            {float.text}
          </div>
        ))}
        {props.combat.decision ? (
          <div className="absolute inset-x-3 bottom-3 rounded-[4px] border border-[#a77a2d] bg-[#17110a]/95 p-2 shadow-[2px_2px_0_rgba(0,0,0,0.55)]">
            <div className="mb-2 font-mono text-[10px] font-bold uppercase text-[#ffe7a2]">
              Hermes needs your choice
            </div>
            <div className="mb-2 font-mono text-[10px] leading-4 text-[#f5e7bf]">
              {props.combat.decision.prompt}
            </div>
            <div className="grid gap-1 sm:grid-cols-3">
              {props.combat.decision.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => props.onChooseDecision(choice)}
                  className="rounded-[3px] border border-[#8c6c33] bg-[#2a1d0c] p-2 text-left font-mono text-[9px] text-[#f8e8b4] shadow-[1px_1px_0_rgba(0,0,0,0.65)] hover:border-[#e1bc65] hover:bg-[#4c3211]"
                >
                  <span className="block text-[10px] font-bold uppercase text-white">{choice.title}</span>
                  <span className="mt-1 block leading-3">{choice.effect}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="rounded-[3px] border border-[#5b554d] bg-[#191919] px-2 py-1 font-mono text-[10px] text-[#d7d7d7]">
          Mission Status:{" "}
          {props.combat.decision
            ? "Awaiting Choice"
            : props.combat.victory
              ? "Complete, indexing memory"
              : "Agent Run Active"}
        </div>
        <div className="font-mono text-[10px] text-[#c9bfae]">Auto-resolves</div>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#171717]">
        <div className="h-full bg-[#d5ad52]" style={{ width: `${Math.max(4, props.progress)}%` }} />
      </div>
      <div className="mt-1 max-h-12 overflow-hidden font-mono text-[9px] leading-4 text-[#d7d0c5]">
        {props.missionLog.slice(-3).map((line, index) => (
          <div key={`${line}-${index}`}>{line}</div>
        ))}
      </div>
    </section>
  );
}

function DraggablePanel(props: {
  children: ReactNode;
  id: PanelId;
  onClose: () => void;
  onMove: (id: PanelId, position: { x: number; y: number }) => void;
  position: { x: number; y: number };
  title: string;
  widthClass: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      dx: event.clientX - props.position.x,
      dy: event.clientY - props.position.y,
    };
    const move = (moveEvent: PointerEvent) => {
      const width = panelRef.current?.offsetWidth ?? 240;
      const height = panelRef.current?.offsetHeight ?? 220;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      props.onMove(props.id, {
        x: Math.max(8, Math.min(maxX, moveEvent.clientX - (dragRef.current?.dx ?? 0))),
        y: Math.max(8, Math.min(maxY, moveEvent.clientY - (dragRef.current?.dy ?? 0))),
      });
    };
    const stop = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <aside
      ref={panelRef}
      className={[
        "absolute z-50 rounded-[4px] border border-[#8d8a84] bg-[#222] p-1 text-white shadow-[4px_4px_0_rgba(0,0,0,0.68)] ring-2 ring-[#111]",
        props.widthClass,
      ].join(" ")}
      style={{ left: props.position.x, top: props.position.y }}
    >
      <div
        role="button"
        tabIndex={0}
        onPointerDown={startDrag}
        className="mb-1 flex cursor-move select-none items-center justify-between rounded-[2px] border border-[#5b5855] bg-[#303030] px-2 py-0.5 font-mono text-xs font-bold"
      >
        <span>{props.title}</span>
        <button
          type="button"
          onClick={props.onClose}
          className="grid h-4 w-4 place-items-center rounded-[2px] border border-[#7c7168] bg-[#3c312d] text-[#efe6d7] hover:bg-[#644238]"
          aria-label={`Close ${props.title}`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {props.children}
    </aside>
  );
}

function PixelButton(props: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="inline-flex min-h-5 items-center justify-center gap-1 rounded-[2px] border border-[#76695f] bg-[#342f2d] px-2 py-1 font-mono text-[10px] font-bold uppercase text-white shadow-[1px_1px_0_rgba(0,0,0,0.7)] hover:bg-[#49413d]"
    >
      {props.children}
    </button>
  );
}

function PixelSelect(props: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 flex items-center gap-1 text-[#f1e3c0]">{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-5 w-full rounded-[2px] border border-[#5f5852] bg-[#1a1a1a] px-1 text-[10px] text-white"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PixelInput(props: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 flex items-center gap-1 text-[#f1e3c0]">{props.label}</span>
      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-6 w-full rounded-[2px] border border-[#5f5852] bg-[#1a1a1a] px-1 font-mono text-[10px] text-white"
      />
    </label>
  );
}

function PixelRange(props: {
  inert?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[#f1e3c0]">
        <span>{props.label}</span>
        <span className="text-[#c8c0b4]">{props.value}</span>
      </span>
      <input
        disabled={props.inert}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="h-4 w-full accent-[#d8a657]"
      />
    </label>
  );
}

function PixelToggle(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-[2px] border border-[#504646] bg-[#1b1a1a] px-1 py-0.5 text-[#f1e3c0]">
      <span>{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
    </label>
  );
}

function SheetSprite(props: {
  frame: readonly [number, number, number, number];
  scale: number;
}) {
  const [x, y, width, height] = props.frame;
  return (
    <span
      className="relative block overflow-hidden"
      style={{ width: width * props.scale, height: height * props.scale, imageRendering: "pixelated" }}
    >
      <img
        alt=""
        draggable={false}
        src={spriteSheet}
        className="absolute left-0 top-0 max-w-none select-none"
        style={{
          width: spriteSheetSize.width * props.scale,
          height: spriteSheetSize.height * props.scale,
          transform: `translate(${-x * props.scale}px, ${-y * props.scale}px)`,
          imageRendering: "pixelated",
        }}
      />
    </span>
  );
}

const mergeBackendHeroes = (current: HermesHero[], incoming: HermesHero[]) => {
  const currentById = new Map(current.map((hero) => [hero.id, hero]));
  return incoming.map((hero) => {
    const local = currentById.get(hero.id);
    if (!local) return hero;
    return {
      ...hero,
      status: local.status === "questing" ? "questing" : hero.status,
      stats: local.stats,
    };
  });
};

const areHeroRostersEqual = (left: HermesHero[], right: HermesHero[]) => {
  if (left.length !== right.length) return false;
  return left.every((hero, index) => {
    const next = right[index];
    return (
      Boolean(next) &&
      hero.id === next.id &&
      hero.name === next.name &&
      hero.subtitle === next.subtitle &&
      hero.className === next.className &&
      hero.status === next.status &&
      hero.color === next.color &&
      hero.weapon === next.weapon &&
      hero.stats.strength === next.stats.strength &&
      hero.stats.agility === next.stats.agility &&
      hero.stats.level === next.stats.level
    );
  });
};

const areRecordValuesEqual = <T,>(left: Record<string, T>, right: Record<string, T>) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && left[key] === right[key]);
};

const mergeTownPatch = (current: HermesTownState, patch: Partial<HermesTownState>): HermesTownState => ({
  ...current,
  ...patch,
  debug: {
    ...current.debug,
    ...(patch.debug ?? {}),
  },
  mission: {
    ...current.mission,
    ...(patch.mission ?? {}),
  },
  encounter: {
    ...current.encounter,
    ...(patch.encounter ?? {}),
  },
  settings: {
    ...current.settings,
    ...(patch.settings ?? {}),
  },
});

const areTownStatesEqual = (left: HermesTownState, right: HermesTownState) => {
  return (
    areHeroRostersEqual(left.heroes, right.heroes) &&
    areBuildingsEqual(left.buildings, right.buildings) &&
    areMissionEqual(left.mission, right.mission) &&
    areEncounterEqual(left.encounter, right.encounter) &&
    areDebugEqual(left.debug, right.debug) &&
    areSettingsEqual(left.settings, right.settings) &&
    left.gatewayStatus === right.gatewayStatus &&
    areRecordValuesEqual(left.streamingTextByAgentId, right.streamingTextByAgentId) &&
    areRecordValuesEqual(left.runCountByAgentId, right.runCountByAgentId)
  );
};

const areBuildingsEqual = (left: HermesBuilding[], right: HermesBuilding[]) => {
  if (left.length !== right.length) return false;
  return left.every((building, index) => {
    const next = right[index];
    return (
      Boolean(next) &&
      building.id === next.id &&
      building.name === next.name &&
      building.theme === next.theme &&
      building.skill === next.skill &&
      building.x === next.x &&
      building.width === next.width &&
      building.height === next.height &&
      building.tier === next.tier &&
      building.unlocked === next.unlocked &&
      building.zBand === next.zBand &&
      building.status === next.status
    );
  });
};

const areMissionEqual = (left: HermesMission, right: HermesMission) =>
  left.active === right.active &&
  left.phase === right.phase &&
  left.title === right.title &&
  left.objective === right.objective &&
  left.progress === right.progress &&
  left.simulatedApiCall === right.simulatedApiCall &&
  areStringArraysEqual(left.log, right.log);

const areEncounterEqual = (left: HermesEncounter, right: HermesEncounter) =>
  left.active === right.active &&
  left.id === right.id &&
  left.title === right.title &&
  left.prompt === right.prompt &&
  left.buildingId === right.buildingId &&
  areStringArraysEqual(left.log, right.log) &&
  left.choices.length === right.choices.length &&
  left.choices.every((choice, index) => {
    const next = right.choices[index];
    return Boolean(next) && choice.id === next.id && choice.label === next.label && choice.effect === next.effect;
  });

const areDebugEqual = (left: HermesDebugState, right: HermesDebugState) =>
  left.open === right.open &&
  left.timeMode === right.timeMode &&
  left.selectedHeroId === right.selectedHeroId &&
  left.selectedBuildingId === right.selectedBuildingId &&
  left.simulatedTask === right.simulatedTask &&
  left.labelsVisible === right.labelsVisible &&
  left.scrollSensitivity === right.scrollSensitivity;

const areSettingsEqual = (left: HermesTownSettings, right: HermesTownSettings) =>
  left.prosperity === right.prosperity &&
  left.npcDensity === right.npcDensity &&
  left.connectionProfile === right.connectionProfile &&
  left.tailscaleHost === right.tailscaleHost &&
  left.homeHost === right.homeHost &&
  left.hermesApiPort === right.hermesApiPort &&
  left.gatewayPort === right.gatewayPort &&
  left.maxAgents === right.maxAgents &&
  left.autoEncounters === right.autoEncounters &&
  left.streetViewportVh === right.streetViewportVh &&
  left.streetViewportPx === right.streetViewportPx &&
  left.visualTheme === right.visualTheme;

const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

const taskForBuilding = (buildingId: HermesBuilding["id"]): HermesDebugState["simulatedTask"] => {
  if (buildingId === "blacksmith") return "code_patch";
  if (buildingId === "library" || buildingId === "observatory") return "research";
  if (buildingId === "chapel") return "approval";
  if (buildingId === "training-yard") return "test_run";
  return "code_patch";
};

const resolveHermesGatewayUrl = (settings: HermesTownSettings) => {
  return `ws://127.0.0.1:${settings.gatewayPort}`;
};

const resolveHermesApiUrl = (settings: HermesTownSettings) => {
  const rawHost =
    settings.connectionProfile === "tailscale"
      ? settings.tailscaleHost
      : settings.connectionProfile === "home"
        ? settings.homeHost
        : "127.0.0.1";
  const trimmed = rawHost.trim();
  const host = trimmed || "100.81.200.32";
  if (/^https?:\/\//i.test(host)) {
    return host.replace(/\/+$/, "");
  }
  const withoutHttp = host.replace(/^wss?:\/\//i, "").replace(/\/+$/, "");
  const hasExplicitPort = /:\d+$/.test(withoutHttp);
  return `http://${withoutHttp}${hasExplicitPort ? "" : `:${settings.hermesApiPort}`}`;
};

const buildStreetEncounter = (
  building: HermesBuilding,
  prosperity: number,
): HermesEncounter => {
  const variants = [
    {
      id: "lost-scroll",
      title: "Lost Scroll",
      prompt: `A courier misplaced a sealed request near ${building.name}. Should the party decode it, ask for context, or let it wait?`,
    },
    {
      id: "odd-signal",
      title: "Odd Gateway Signal",
      prompt: `${building.name} picked up a strange runtime pulse. It might be a useful task, or it might need one careful question first.`,
    },
    {
      id: "npc-request",
      title: "Townsperson Request",
      prompt: `An NPC asks for help at ${building.name}. The request looks small, but it could improve the town if handled well.`,
    },
    {
      id: "crafting-rush",
      title: "Crafting Rush",
      prompt: `${building.name} is overloaded. Dispatch heroes now, clarify requirements, or leave it for idle patrol?`,
    },
  ];
  const variant = variants[(building.x + prosperity) % variants.length];
  return {
    active: true,
    id: `${variant.id}-${building.id}-${Date.now()}`,
    title: variant.title,
    prompt: variant.prompt,
    buildingId: building.id,
    choices: [
      {
        id: "assist",
        label: "Dispatch",
        effect: "Starts a local mission encounter.",
      },
      {
        id: "question",
        label: "Ask",
        effect: "Clarifies and upgrades town state.",
      },
      {
        id: "decline",
        label: "Wait",
        effect: "Dismisses without changing backend.",
      },
    ],
    log: [`Encounter spawned near ${building.name}.`],
  };
};

const buildFallbackRuntimeSnapshot = (town: HermesTownState): HermesRuntimeSnapshot => {
  return {
    gatewayStatus: town.gatewayStatus,
    adapterType: "local-debug",
    runningCount: town.heroes.filter((hero) => hero.status === "working" || hero.status === "questing").length,
    unseenInboxCount: 0,
    eventCount: town.mission.log.length,
    runSummaries: buildFallbackRunSummaries(town),
    signals: [],
    skills: [
      { key: "blacksmith-code", name: "Code Forge", ready: true, emoji: "*" },
      { key: "library-memory", name: "Memory Archive", ready: true, emoji: "*" },
      { key: "chapel-approval", name: "Approval Ward", ready: true, emoji: "*" },
    ],
    tasks: town.mission.active
      ? [
          {
            id: town.mission.simulatedApiCall,
            title: town.mission.title,
            status: town.mission.phase === "complete" ? "done" : "in_progress",
          },
        ]
      : [],
  };
};

const buildFallbackRunSummaries = (town: HermesTownState): HermesRuntimeRunSummary[] => {
  const activeHero = town.heroes.find((hero) => hero.status === "working" || hero.status === "questing");
  const summaries: HermesRuntimeRunSummary[] = [];
  if (town.mission.active) {
    summaries.push({
      id: `local:${town.mission.simulatedApiCall}`,
      title: town.mission.title,
      heroName: activeHero?.name ?? "Local party",
      status: town.mission.phase === "complete" ? "complete" : "running",
      detail: `${town.mission.progress}% / ${town.mission.objective}`,
      buildingId: town.debug.selectedBuildingId,
      tone: "quest",
    });
  }
  summaries.push(
    ...town.mission.log.slice(-3).reverse().map((line, index) => ({
      id: `local-log:${index}:${line}`,
      title: "Town Memory",
      heroName: activeHero?.name ?? null,
      status: "recent" as const,
      detail: line,
      buildingId: town.debug.selectedBuildingId,
      tone: "memory" as const,
    })),
  );
  return summaries.slice(0, 4);
};

const buildRuntimeSignals = (
  town: HermesTownState,
  snapshot: HermesRuntimeSnapshot,
): HermesRuntimeSignal[] => {
  const signals: HermesRuntimeSignal[] = [];
  signals.push(...(snapshot.signals ?? []).map(enchantRuntimeSignal));

  for (const hero of town.heroes) {
    const stream = town.streamingTextByAgentId[hero.id]?.trim();
    const runCount = town.runCountByAgentId[hero.id] ?? 0;
    if (stream) {
      signals.push({
        id: `stream:${hero.id}:${stream.slice(0, 18)}`,
        title: `${hero.name} Opens a Memory Tome`,
        summary: `The Library records a live thought-stream: ${stream.slice(0, 150)}`,
        tone: "memory",
        buildingId: "library",
        theme: "arcane-night",
        task: "research",
      });
    }
    if (hero.status === "working" || hero.status === "questing" || runCount > 0) {
      signals.push({
        id: `run:${hero.id}:${runCount}`,
        title: `${hero.name} Takes a Guild Commission`,
        summary: `${hero.name} has completed ${runCount} recorded commissions and is now ${fantasyHeroStatus(hero.status)}.`,
        tone: "quest",
        buildingId: "guild-hall",
        theme: "royal-guild",
        task: "code_patch",
      });
    }
  }

  if (snapshot.gatewayStatus && snapshot.gatewayStatus !== "connected") {
    signals.push({
      id: `gateway:${snapshot.gatewayStatus}`,
      title: "Gate Ward Flickers",
      summary: `The town gate reads ${fantasyGatewayStatus(snapshot.gatewayStatus)}. Send heroes to the Chapel before dispatch.`,
      tone: "warning",
      buildingId: "chapel",
      theme: "forest-shrine",
      task: "approval",
    });
  } else {
    signals.push({
      id: "gateway:connected",
      title: "Guild Gate Stable",
      summary: "The crystal gate is open. Heroes can receive Hermes commissions from beyond town.",
      tone: "aether",
      buildingId: "guild-hall",
      theme: "royal-guild",
      task: "code_patch",
    });
  }

  for (const task of snapshot.tasks ?? []) {
    if (task.status === "done") continue;
    signals.push({
      id: `task:${task.id}`,
      title: fantasyContractTitle(task.title, task.status),
      summary: `${task.agentName ?? "No hero assigned"} / ${fantasyTaskStatus(task.status)}`,
      tone: task.status === "blocked" ? "warning" : "quest",
      buildingId: buildingForTaskText(`${task.title} ${task.status}`),
      theme: task.status === "blocked" ? "forest-shrine" : "royal-guild",
      task: taskForBuilding(buildingForTaskText(`${task.title} ${task.status}`)),
      taskCardId: task.id,
    });
  }

  for (const skill of snapshot.skills ?? []) {
    if (!skill.ready) continue;
    signals.push({
      id: `skill:${skill.key}`,
      title: `${skill.name} Relic Awakens`,
      summary: `The Marketplace vault confirms ${skill.name} can empower a hero party.`,
      tone: "skill",
      buildingId: buildingForTaskText(`${skill.key} ${skill.name} skill market tool`),
      theme: "sunlit-market",
      task: taskForBuilding(buildingForTaskText(`${skill.key} ${skill.name} skill market tool`)),
    });
  }

  return dedupeRuntimeSignals(signals).slice(0, 12);
};

const dedupeRuntimeSignals = (signals: HermesRuntimeSignal[]) => {
  const seen = new Set<string>();
  const result: HermesRuntimeSignal[] = [];
  for (const signal of signals) {
    const key = signal.id || `${signal.title}:${signal.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(signal);
  }
  return result;
};

const selectAmbientRuntimeSignal = (signals: HermesRuntimeSignal[]) => {
  const storySignals = signals.filter((signal) => !signal.id.startsWith("run:"));
  return (
    storySignals.find((signal) => signal.tone === "warning") ??
    storySignals.find((signal) => signal.tone === "quest") ??
    storySignals.find((signal) => signal.tone === "memory") ??
    storySignals.find((signal) => signal.tone === "skill") ??
    signals.find((signal) => signal.tone === "warning") ??
    signals.find((signal) => signal.tone === "quest") ??
    signals.find((signal) => signal.tone === "memory") ??
    signals.find((signal) => signal.tone === "skill") ??
    signals[0] ??
    null
  );
};

const enchantRuntimeSignal = (signal: HermesRuntimeSignal): HermesRuntimeSignal => {
  const buildingId = signal.buildingId ?? buildingForTaskText(`${signal.title} ${signal.summary}`);
  const tone = signal.tone;
  return {
    ...signal,
    title: fantasySignalTitle(signal.title, tone, buildingId),
    summary: fantasySignalSummary(signal.summary, tone, buildingId),
    buildingId,
    theme: signal.theme ?? themeForRuntimeTone(tone),
    task: signal.task ?? taskForBuilding(buildingId),
  };
};

const buildingForTaskText = (text: string): HermesBuilding["id"] => {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("approval") ||
    normalized.includes("permission") ||
    normalized.includes("blocked") ||
    normalized.includes("reject") ||
    normalized.includes("error") ||
    normalized.includes("safety")
  ) {
    return "chapel";
  }
  if (
    normalized.includes("test") ||
    normalized.includes("qa") ||
    normalized.includes("verify") ||
    normalized.includes("lint") ||
    normalized.includes("playwright")
  ) {
    return "training-yard";
  }
  if (
    normalized.includes("research") ||
    normalized.includes("memory") ||
    normalized.includes("context") ||
    normalized.includes("reasoning") ||
    normalized.includes("summary") ||
    normalized.includes("chat")
  ) {
    return "library";
  }
  if (
    normalized.includes("cron") ||
    normalized.includes("schedule") ||
    normalized.includes("automation") ||
    normalized.includes("background")
  ) {
    return "windmill";
  }
  if (
    normalized.includes("skill") ||
    normalized.includes("plugin") ||
    normalized.includes("market") ||
    normalized.includes("tool")
  ) {
    return "market";
  }
  if (
    normalized.includes("runtime") ||
    normalized.includes("gateway") ||
    normalized.includes("log") ||
    normalized.includes("event") ||
    normalized.includes("telemetry")
  ) {
    return "observatory";
  }
  if (
    normalized.includes("code") ||
    normalized.includes("patch") ||
    normalized.includes("build") ||
    normalized.includes("file") ||
    normalized.includes("diff") ||
    normalized.includes("refactor")
  ) {
    return "blacksmith";
  }
  if (normalized.includes("doc") || normalized.includes("copy") || normalized.includes("polish")) {
    return "bakery";
  }
  return "guild-hall";
};

const buildingForRuntimeTone = (tone: HermesRuntimeTone): HermesBuilding["id"] => {
  if (tone === "memory") return "library";
  if (tone === "warning") return "chapel";
  if (tone === "skill") return "market";
  if (tone === "quest") return "guild-hall";
  return "guild-hall";
};

const themeForRuntimeTone = (tone: HermesRuntimeTone): HermesTownTheme => {
  if (tone === "memory") return "arcane-night";
  if (tone === "warning") return "forest-shrine";
  if (tone === "skill") return "sunlit-market";
  return "royal-guild";
};

const buildingLabel = (buildingId: HermesBuilding["id"]) => {
  return createDefaultBuildings().find((building) => building.id === buildingId)?.name ?? buildingId;
};

const oracleToneClass = (tone: HermesRuntimeTone) => {
  if (tone === "memory") return "border-[#7b62bb] bg-[#211738] text-[#eee4ff]";
  if (tone === "warning") return "border-[#b17448] bg-[#2f1a10] text-[#ffe1c2]";
  if (tone === "skill") return "border-[#c29945] bg-[#2f230e] text-[#fff0bc]";
  if (tone === "quest") return "border-[#567bbd] bg-[#121f35] text-[#dbeaff]";
  return "border-[#5fa6b5] bg-[#102b33] text-[#d9fbff]";
};

const fantasyGatewayStatus = (status?: string | null) => {
  if (!status) return "unknown";
  if (status === "connected") return "open";
  if (status === "connecting") return "attuning";
  if (status === "disconnected") return "sealed";
  return status.replace(/_/g, " ");
};

const fantasyAdapterName = (adapter?: string | null) => {
  if (!adapter) return "unknown realm";
  if (adapter === "hermes") return "Hermes realm";
  if (adapter === "openclaw") return "OpenClaw realm";
  if (adapter === "demo" || adapter === "local-debug") return "training realm";
  return `${adapter} realm`;
};

const fantasyTaskStatus = (status: HermesRuntimeTaskStatus) => {
  if (status === "todo") return "posted";
  if (status === "in_progress") return "on quest";
  if (status === "blocked") return "warded";
  if (status === "review") return "at council";
  if (status === "done") return "claimed";
  return "posted";
};

const fantasyToneName = (tone: HermesRuntimeTone) => {
  if (tone === "aether") return "aether";
  if (tone === "memory") return "tome";
  if (tone === "quest") return "contract";
  if (tone === "skill") return "relic";
  if (tone === "warning") return "ward";
  return tone;
};

const fantasyHeroStatus = (status: HermesHeroStatus) => {
  if (status === "working") return "preparing gear";
  if (status === "questing") return "beyond the gate";
  if (status === "walking") return "patrolling";
  if (status === "error") return "under a ward";
  return "resting in town";
};

const fantasyRunSummaryStatus = (status: HermesRuntimeRunSummary["status"]) => {
  if (status === "running") return "on quest";
  if (status === "waiting") return "awaiting choice";
  if (status === "complete") return "claimed";
  if (status === "blocked") return "warded";
  return "recent";
};

const fantasyContractTitle = (title: string, status: HermesRuntimeTaskStatus) => {
  const building = buildingLabel(buildingForTaskText(`${title} ${status}`));
  if (title.toLowerCase().includes(building.toLowerCase())) return title;
  return `${building} Contract: ${title}`;
};

const fantasySignalTitle = (
  title: string,
  tone: HermesRuntimeTone,
  buildingId: HermesBuilding["id"],
) => {
  const building = buildingLabel(buildingId);
  if (title.toLowerCase().includes(building.toLowerCase())) return title;
  if (tone === "warning") return `${building} Ward: ${title}`;
  if (tone === "memory") return `${building} Tome: ${title}`;
  if (tone === "skill") return `${building} Relic: ${title}`;
  if (tone === "quest") return `${building} Contract: ${title}`;
  return `${building} Crystal: ${title}`;
};

const fantasySignalSummary = (
  summary: string,
  tone: HermesRuntimeTone,
  buildingId: HermesBuilding["id"],
) => {
  const building = buildingLabel(buildingId);
  const trimmed = summary.trim();
  if (trimmed.toLowerCase().startsWith(`${building.toLowerCase()} `)) return trimmed;
  if (tone === "warning") return `${building} raised a ward: ${trimmed}`;
  if (tone === "memory") return `${building} archived a memory echo: ${trimmed}`;
  if (tone === "skill") return `${building} prepared a relic: ${trimmed}`;
  if (tone === "quest") return `${building} posted a contract: ${trimmed}`;
  return `${building} crystal reports: ${trimmed}`;
};

const shouldAskQuestDecision = (mission: HermesMission, turn: number) => {
  const task = mission.simulatedApiCall.toLowerCase();
  return turn >= 2 && (task.includes("approval") || mission.title.toLowerCase().includes("approval"));
};

const buildQuestDecision = (mission: HermesMission): QuestDecision => {
  const isApproval = mission.simulatedApiCall.toLowerCase().includes("approval");
  return {
    prompt: isApproval
      ? "The chapel gate detects an approval boundary. Choose how Hermes should proceed."
      : "Hermes found a fork in the task route. Pick the best tactic for the run.",
    choices: [
      {
        id: "cautious-route",
        title: "Cautious Route",
        effect: "Proceed with stricter safety checks and preserve context.",
        bonus: 70,
      },
      {
        id: "spend-gold",
        title: "Spend Gold",
        effect: "Invest town resources to speed up the agent run.",
        bonus: 118,
      },
      {
        id: "ask-context",
        title: "Ask Context",
        effect: "Pause for one clarifying memory pass, then continue stronger.",
        bonus: 92,
      },
    ],
  };
};

const buildTownMetrics = (town: HermesTownState, missionLog: string[]) => {
  const unlocked = town.buildings.filter((building) => building.unlocked).length;
  const tierTotal = town.buildings.reduce((total, building) => total + building.tier, 0);
  const activeHeroes = town.heroes.filter(
    (hero) => hero.status === "questing" || hero.status === "working",
  ).length;
  const memoryStreams = Object.values(town.streamingTextByAgentId).filter(Boolean).length;
  const missionDone = town.mission.active ? town.mission.progress >= 100 : missionLog.length > 2;
  const missionDispatched =
    town.mission.active &&
    (town.mission.phase === "gathering" ||
      town.mission.phase === "embarking" ||
      town.mission.phase === "combat");
  const processSteps = [
    {
      label: "Intake",
      detail: town.encounter.active ? "Street encounter waiting" : "Guild board listening",
      done: town.encounter.active || town.mission.active,
    },
    {
      label: "Dispatch",
      detail:
        town.mission.phase === "gathering"
          ? "Party assembling at Guild Hall"
          : town.mission.phase === "embarking"
            ? "Party marching to city gate"
            : activeHeroes > 0
              ? `${activeHeroes} heroes assigned`
              : "Idle party roaming",
      done: missionDispatched || activeHeroes > 0,
    },
    {
      label: "Resolve",
      detail:
        town.mission.phase === "combat"
          ? `${town.mission.progress}% complete`
          : town.mission.active
            ? `Awaiting departure: ${town.mission.progress}%`
            : "No mission running",
      done: town.mission.phase === "combat" || town.mission.progress > 35,
    },
    {
      label: "Remember",
      detail: `${Math.max(1, missionLog.length)} log entries indexed`,
      done: memoryStreams > 0 || missionLog.length > 3,
    },
  ];

  return {
    activeHeroes,
    gold: 420 + town.settings.prosperity * 17 + tierTotal * 85,
    memoryShards: Math.max(3, missionLog.length + memoryStreams * 4 + unlocked),
    processSteps,
    renown: Math.min(999, town.settings.prosperity + unlocked * 18 + activeHeroes * 9),
    unlockPercent: Math.round((unlocked / Math.max(1, town.buildings.length)) * 100),
  };
};

const buildMemoryRows = (town: HermesTownState, missionLog: string[]) => {
  const streams = town.heroes
    .map((hero) => {
      const stream = town.streamingTextByAgentId[hero.id]?.trim();
      return stream ? `${hero.name}: ${stream.slice(0, 110)}` : null;
    })
    .filter(Boolean) as string[];
  const encounterRows = town.encounter.log.map((line) => `Encounter: ${line}`);
  const rows = [...streams, ...missionLog, ...encounterRows];
  return rows.length > 0 ? rows.slice(-10).reverse() : ["No memory entries yet."];
};

const taskScenario = (task: HermesDebugState["simulatedTask"]) => {
  switch (task) {
    case "code_patch":
      return {
        buildingId: "blacksmith" as const,
        minimumTier: 2,
        title: "Patch Forge Request",
        objective: "Simulate a Hermes code-generation call routed through the blacksmith.",
        progress: 16,
        log: [
          "debug.hermes.task.type = code_patch",
          "Blacksmith receives patch payload.",
          "Questing heroes move to the forge lane.",
        ],
      };
    case "research":
      return {
        buildingId: "library" as const,
        minimumTier: 2,
        title: "Library Context Dive",
        objective: "Simulate a research/summarization call and watch the party relocate.",
        progress: 16,
        log: [
          "debug.hermes.task.type = research",
          "Library shelves unlock context scrolls.",
          "Mage and scout prioritize search movement.",
        ],
      };
    case "approval":
      return {
        buildingId: "chapel" as const,
        minimumTier: 2,
        title: "Chapel Approval Gate",
        objective: "Preview an approval-required task without touching real permissions.",
        progress: 12,
        log: [
          "debug.hermes.task.type = approval",
          "Chapel lights indicate a pending decision.",
          "No live approval request has been emitted.",
        ],
      };
    case "test_run":
      return {
        buildingId: "training-yard" as const,
        minimumTier: 1,
        title: "Training Yard Test Run",
        objective: "Simulate test execution and unlock the training yard visual state.",
        progress: 18,
        log: [
          "debug.hermes.task.type = test_run",
          "Training yard unlocked for verification.",
          "Heroes rehearse combat/task animations.",
        ],
      };
    case "idle":
    default:
      return {
        buildingId: "guild-hall" as const,
        minimumTier: 1,
        title: "Idle town patrol",
        objective: "No simulated Hermes task is active.",
        progress: 0,
        log: ["debug.hermes.task.type = idle", "Town returns to side-scrolling idle patrol."],
      };
  }
};

const buildMissionLog = (town: HermesTownState) => {
  const lines = [...town.mission.log];
  for (const hero of town.heroes) {
    const stream = town.streamingTextByAgentId[hero.id]?.trim();
    if (stream) {
      lines.push(`${hero.name} inscribed a memory tome: ${stream.slice(0, 120)}`);
    }
  }
  lines.push(
    town.gatewayStatus === "connected"
      ? "Aether relay: connected to the Hermes realm."
      : "Aether relay: local town mirror only.",
  );
  return lines.slice(-8);
};
