import type { HermesTownState } from "@/features/hermes-town/data/town";

export type HermesTownBridge = {
  getState: () => HermesTownState;
  setState: (next: Partial<HermesTownState>) => void;
  subscribe: (listener: () => void) => () => void;
};

export const createHermesTownBridge = (initialState: HermesTownState): HermesTownBridge => {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (next) => {
      state = {
        ...state,
        ...next,
        mission: {
          ...state.mission,
          ...(next.mission ?? {}),
        },
        encounter: {
          ...state.encounter,
          ...(next.encounter ?? {}),
        },
        settings: {
          ...state.settings,
          ...(next.settings ?? {}),
        },
        debug: {
          ...state.debug,
          ...(next.debug ?? {}),
        },
      };

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
