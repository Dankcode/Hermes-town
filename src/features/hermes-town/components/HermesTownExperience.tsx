"use client";

import {
  Activity,
  Bot,
  Building2,
  Clock3,
  FlaskConical,
  Gauge,
  Play,
  Sparkles,
  Swords,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HermesTownCanvas } from "@/features/hermes-town/components/HermesTownCanvas";
import {
  createInitialTownState,
  mapOfficeAgentsToHeroes,
  type HermesBuilding,
  type HermesDebugState,
  type HermesHero,
  type HermesHeroStatus,
  type HermesTimeMode,
  type HermesTownState,
} from "@/features/hermes-town/data/town";
import type { OfficeAgent } from "@/features/retro-office/core/types";

type HermesTownExperienceProps = {
  agents?: OfficeAgent[];
  gatewayStatus?: string;
  streamingTextByAgentId?: Record<string, string | null>;
  runCountByAgentId?: Record<string, number>;
  onAddAgent?: () => void;
  onAgentChatSelect?: (agentId: string) => void;
  onAgentDelete?: (agentId: string) => void;
  onAgentEdit?: (agentId: string) => void;
  onMonitorSelect?: (agentId: string | null) => void;
  onQaLabDismiss?: () => void;
  onStandupArrivalsChange?: (arrivedAgentIds: string[]) => void;
  onTaskBoardSelectCard?: (cardId: string) => void;
  onVoiceRepliesPreview?: (voiceId: string, voiceName: string) => void;
  [key: string]: unknown;
};

const statusOptions: HermesHeroStatus[] = ["idle", "walking", "working", "questing", "error"];
const timeOptions: HermesTimeMode[] = ["system", "day", "dusk", "night"];
const taskOptions: HermesDebugState["simulatedTask"][] = [
  "idle",
  "code_patch",
  "research",
  "approval",
  "test_run",
];

const clampTier = (value: number) => Math.max(1, Math.min(4, value));

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

  useEffect(() => {
    setTown((current) => ({
      ...current,
      heroes: mergeBackendHeroes(current.heroes, mapOfficeAgentsToHeroes(agents)),
      gatewayStatus,
      streamingTextByAgentId,
      runCountByAgentId,
    }));
  }, [agents, gatewayStatus, runCountByAgentId, streamingTextByAgentId]);

  const selectedHero =
    town.heroes.find((hero) => hero.id === town.debug.selectedHeroId) ?? town.heroes[0] ?? null;
  const selectedBuilding =
    town.buildings.find((building) => building.id === town.debug.selectedBuildingId) ??
    town.buildings[0];
  const activeHeroes = town.heroes.filter(
    (hero) => hero.status === "working" || hero.status === "questing",
  );
  const missionLog = buildMissionLog(town);

  const updateDebug = (patch: Partial<HermesDebugState>) => {
    setTown((current) => ({
      ...current,
      debug: { ...current.debug, ...patch },
    }));
  };

  const applySceneStatePatch = useCallback((patch: Partial<HermesTownState>) => {
    setTown((current) => ({
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
      settings: {
        ...current.settings,
        ...(patch.settings ?? {}),
      },
    }));
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

  const simulateTask = (task: HermesDebugState["simulatedTask"]) => {
    setTown((current) => {
      const scenario = taskScenario(task);
      const selectedHeroId = current.debug.selectedHeroId ?? current.heroes[0]?.id ?? null;
      const targetBuildingId = scenario.buildingId;
      return {
        ...current,
        heroes: current.heroes.map((hero, index) => {
          const selected = hero.id === selectedHeroId;
          const partyMember = selected || index < 2;
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
          prosperity: task === "idle" ? current.settings.prosperity : Math.min(100, current.settings.prosperity + 4),
        },
        debug: {
          ...current.debug,
          simulatedTask: task,
          selectedHeroId,
          selectedBuildingId: targetBuildingId,
        },
        mission: {
          active: task !== "idle",
          title: scenario.title,
          objective: scenario.objective,
          progress: scenario.progress,
          simulatedApiCall: task,
          log: scenario.log,
        },
      };
    });
  };

  const resolveSimulation = () => {
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
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#10161f] text-[#fff6d8]">
      <section className="absolute inset-x-0 top-20 h-[min(52vh,500px)] min-h-[330px] overflow-hidden border-y border-[#523a25]/70 bg-[#86c3e8] shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
        <HermesTownCanvas state={town} onSceneStateChange={applySceneStatePatch} />
      </section>

      <div className="pointer-events-none absolute left-4 top-4 z-20 flex max-w-[min(780px,calc(100vw-2rem))] flex-wrap items-center gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-[#5d4026]/70 bg-[#20130a]/86 px-3 py-2 shadow-xl backdrop-blur">
          <Sparkles className="h-4 w-4 text-[#f8ce72]" />
          <div>
            <div className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
              Hermes-town
            </div>
            <div className="text-sm font-semibold leading-tight">2D side-scroller prototype</div>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-[#5d4026]/60 bg-[#20130a]/76 px-3 py-2 font-mono text-[11px] shadow-xl backdrop-blur">
          <Bot className="h-4 w-4 text-[#9ee6ba]" />
          <span>
            {town.heroes.length} {town.heroes.length === 1 ? "hero" : "heroes"}
          </span>
          <span className="text-[#fff6d8]/40">/</span>
          <span>{gatewayStatus}</span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-[#5d4026]/60 bg-[#20130a]/76 px-3 py-2 font-mono text-[11px] shadow-xl backdrop-blur">
          <Gauge className="h-4 w-4 text-[#f8ce72]" />
          <span>Debug task: {town.debug.simulatedTask.replace("_", " ")}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex max-w-[min(820px,calc(100vw-2rem))] flex-wrap gap-2">
        {town.buildings
          .filter((building) => building.unlocked)
          .slice(0, 7)
          .map((building) => (
            <button
              key={building.id}
              type="button"
              onClick={() => {
                updateDebug({ selectedBuildingId: building.id });
                if (building.id === "guild-hall") props.onAddAgent?.();
              }}
              className="pointer-events-auto rounded-md border border-[#4f3825]/70 bg-[#20130a]/78 px-2.5 py-2 text-left shadow-lg backdrop-blur transition hover:border-[#ce9c4e]"
              title={building.theme}
            >
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#f8ce72]">
                <Building2 className="h-3.5 w-3.5" />
                <span>Tier {building.tier}</span>
              </div>
              <div className="text-xs font-semibold">{building.name}</div>
            </button>
          ))}
      </div>

      {town.mission.active ? (
        <section className="absolute left-[calc(50%-220px)] top-1/2 z-30 w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#d59c54]/70 bg-[#1a1008]/94 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                <Swords className="h-4 w-4" />
                <span>Simulated Hermes task</span>
              </div>
              <h2 className="mt-1 text-xl font-bold leading-tight">{town.mission.title}</h2>
              <p className="mt-1 max-w-xl text-sm text-[#fff6d8]/76">{town.mission.objective}</p>
            </div>
            <button
              type="button"
              onClick={resolveSimulation}
              className="inline-flex items-center gap-2 rounded-md border border-[#74b878]/60 bg-[#1e4627]/80 px-3 py-2 text-sm font-semibold text-[#d9ffd6] transition hover:border-[#9be79c]"
            >
              <Activity className="h-4 w-4" />
              <span>Resolve</span>
            </button>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded bg-[#3c2918]">
            <div
              className="h-full bg-[#e7b95f]"
              style={{ width: `${Math.max(8, town.mission.progress)}%` }}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[0.75fr_1fr]">
            <div className="rounded-md border border-[#5d4026] bg-black/18 p-3">
              <div className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                Party
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {(activeHeroes.length ? activeHeroes : town.heroes.slice(0, 3)).map((hero) => (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => props.onAgentChatSelect?.(hero.id)}
                    className="flex items-center justify-between rounded border border-[#5d4026]/70 bg-[#2b1a0d]/70 px-2 py-1.5 text-left text-xs transition hover:border-[#d59c54]"
                  >
                    <span>{hero.name}</span>
                    <span className="font-mono text-[10px] text-[#f8ce72]">Lv {hero.stats.level}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-[#5d4026] bg-black/18 p-3">
              <div className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                Local task log
              </div>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px] leading-5 text-[#fff6d8]/78">
                {missionLog.map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <aside className="absolute right-3 top-3 z-40 flex max-h-[calc(100vh-1.5rem)] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-[#5d4026]/80 bg-[#130d08]/94 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-[#5d4026]/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-[#f8ce72]" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                Debug Simulation
              </div>
              <div className="text-xs text-[#fff6d8]/66">Local Hermes API state preview</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => simulateTask(town.debug.simulatedTask === "idle" ? "code_patch" : town.debug.simulatedTask)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#80633d] bg-[#31200f] px-2.5 py-1.5 text-xs font-semibold text-[#ffe3a4] transition hover:border-[#d6a84f]"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Inject</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <section className="space-y-3">
            <label className="block">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                <Swords className="h-3.5 w-3.5" />
                Simulated task
              </span>
              <select
                value={town.debug.simulatedTask}
                onChange={(event) => simulateTask(event.target.value as HermesDebugState["simulatedTask"])}
                className="mt-2 w-full rounded border border-[#6a4a2c] bg-[#130d08] px-2 py-1.5 text-xs text-[#fff6d8]"
              >
                {taskOptions.map((task) => (
                  <option key={task} value={task}>
                    {task.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 rounded-md border border-[#5d4026]/60 bg-[#211407]/54 px-2 py-2">
              <span className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                Labels
              </span>
              <input
                type="checkbox"
                checked={town.debug.labelsVisible}
                onChange={(event) => updateDebug({ labelsVisible: event.target.checked })}
              />
            </label>

            <label className="block">
              <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                <span>Scroll sensitivity</span>
                <span className="text-[#fff6d8]/58">{town.debug.scrollSensitivity.toFixed(1)}</span>
              </span>
              <input
                type="range"
                min={0.4}
                max={2}
                step={0.1}
                value={town.debug.scrollSensitivity}
                onChange={(event) => updateDebug({ scrollSensitivity: Number(event.target.value) })}
                className="mt-2 w-full"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                <Clock3 className="h-3.5 w-3.5" />
                Time of day
              </span>
              <select
                value={town.debug.timeMode}
                onChange={(event) => updateDebug({ timeMode: event.target.value as HermesTimeMode })}
                className="mt-2 w-full rounded border border-[#6a4a2c] bg-[#130d08] px-2 py-1.5 text-xs text-[#fff6d8]"
              >
                {timeOptions.map((timeMode) => (
                  <option key={timeMode} value={timeMode}>
                    {timeMode}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
                Prosperity
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={town.settings.prosperity}
                onChange={(event) =>
                  setTown((current) => ({
                    ...current,
                    settings: { ...current.settings, prosperity: Number(event.target.value) },
                  }))
                }
                className="mt-2 w-full"
              />
              <div className="font-mono text-[11px] text-[#fff6d8]/58">{town.settings.prosperity}/100</div>
            </label>
          </section>

          <section className="mt-4">
            <div className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
              Hero stats
            </div>
            <select
              value={selectedHero?.id ?? ""}
              onChange={(event) => updateDebug({ selectedHeroId: event.target.value })}
              className="mt-2 w-full rounded border border-[#6a4a2c] bg-[#130d08] px-2 py-1.5 text-xs text-[#fff6d8]"
            >
              {town.heroes.map((hero) => (
                <option key={hero.id} value={hero.id}>
                  {hero.name}
                </option>
              ))}
            </select>
            {selectedHero ? (
              <div className="mt-2 rounded-md border border-[#5d4026]/70 bg-[#211407]/72 p-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => props.onAgentChatSelect?.(selectedHero.id)}
                    className="min-w-0 truncate text-left text-sm font-semibold text-[#fff6d8] hover:text-[#f8ce72]"
                  >
                    {selectedHero.name}
                  </button>
                  <select
                    value={selectedHero.status}
                    onChange={(event) =>
                      updateHero(selectedHero.id, { status: event.target.value as HermesHeroStatus })
                    }
                    className="rounded border border-[#6a4a2c] bg-[#130d08] px-2 py-1 text-xs text-[#fff6d8]"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <StatSlider
                  label="Strength"
                  value={selectedHero.stats.strength}
                  min={1}
                  max={20}
                  onChange={(strength) => updateHeroStats(selectedHero.id, { strength })}
                />
                <StatSlider
                  label="Agility"
                  value={selectedHero.stats.agility}
                  min={1}
                  max={20}
                  onChange={(agility) => updateHeroStats(selectedHero.id, { agility })}
                />
                <StatSlider
                  label="Level"
                  value={selectedHero.stats.level}
                  min={1}
                  max={99}
                  onChange={(level) => updateHeroStats(selectedHero.id, { level })}
                />
              </div>
            ) : null}
          </section>

          <section className="mt-4">
            <div className="font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
              Building upgrade state
            </div>
            <select
              value={selectedBuilding?.id ?? "guild-hall"}
              onChange={(event) =>
                updateDebug({ selectedBuildingId: event.target.value as HermesBuilding["id"] })
              }
              className="mt-2 w-full rounded border border-[#6a4a2c] bg-[#130d08] px-2 py-1.5 text-xs text-[#fff6d8]"
            >
              {town.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
            {selectedBuilding ? (
              <div className="mt-2 rounded-md border border-[#5d4026]/70 bg-[#211407]/72 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{selectedBuilding.name}</div>
                    <div className="text-[11px] text-[#fff6d8]/58">{selectedBuilding.skill}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedBuilding.unlocked}
                    onChange={(event) =>
                      updateBuilding(selectedBuilding.id, {
                        unlocked: event.target.checked,
                        status: event.target.checked ? "idle" : "locked",
                      })
                    }
                  />
                </div>
                <select
                  value={selectedBuilding.status}
                  onChange={(event) =>
                    updateBuilding(selectedBuilding.id, {
                      status: event.target.value as HermesBuilding["status"],
                      unlocked: event.target.value !== "locked",
                    })
                  }
                  className="mt-2 w-full rounded border border-[#6a4a2c] bg-[#130d08] px-2 py-1.5 text-xs text-[#fff6d8]"
                >
                  <option value="idle">idle</option>
                  <option value="active">active</option>
                  <option value="upgrading">upgrading</option>
                  <option value="locked">locked</option>
                </select>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={selectedBuilding.tier}
                  onChange={(event) =>
                    updateBuilding(selectedBuilding.id, { tier: Number(event.target.value) })
                  }
                  className="mt-2 w-full"
                />
                <div className="font-mono text-[11px] text-[#fff6d8]/58">Tier {selectedBuilding.tier}</div>
              </div>
            ) : null}
          </section>
        </div>
      </aside>
    </div>
  );
}

function StatSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-normal text-[#f8ce72]">
        <span>{props.label}</span>
        <span className="text-[#fff6d8]/58">{props.value}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="mt-1 w-full"
      />
    </label>
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

const taskScenario = (task: HermesDebugState["simulatedTask"]) => {
  switch (task) {
    case "code_patch":
      return {
        buildingId: "blacksmith" as const,
        minimumTier: 2,
        title: "Patch Forge Request",
        objective: "Simulate a Hermes code-generation call routed through the blacksmith.",
        progress: 48,
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
        progress: 35,
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
        progress: 22,
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
        progress: 64,
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
      lines.push(`${hero.name}: ${stream.slice(0, 140)}`);
    }
  }
  lines.push("Backend link: disabled; this is a local debug object.");
  return lines.slice(-8);
};
