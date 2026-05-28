"use client";

import { useEffect, useRef } from "react";

import type { HermesTownState } from "@/features/hermes-town/data/town";
import {
  createHermesTownBridge,
  type HermesTownBridge,
} from "@/features/hermes-town/phaser/HermesTownBridge";
import { createHermesTownScene } from "@/features/hermes-town/phaser/HermesTownScene";

type HermesTownCanvasProps = {
  state: HermesTownState;
  onSceneStateChange?: (patch: Partial<HermesTownState>) => void;
};

export function HermesTownCanvas({ onSceneStateChange, state }: HermesTownCanvasProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<import("phaser").Game | null>(null);
  const bridgeRef = useRef<HermesTownBridge | null>(null);

  if (!bridgeRef.current) {
    bridgeRef.current = createHermesTownBridge(state);
  }
  const bridge = bridgeRef.current;

  useEffect(() => {
    bridge.setState(state);
  }, [bridge, state]);

  useEffect(() => {
    let canceled = false;
    const setup = async () => {
      if (!rootRef.current) return;
      const PhaserLib = await import("phaser");
      if (canceled || !rootRef.current) return;
      const scene = createHermesTownScene({ PhaserLib, bridge, onStatePatch: onSceneStateChange });
      const game = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        parent: rootRef.current,
        backgroundColor: "transparent",
        width: 1600,
        height: 760,
        scene: [scene],
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        render: {
          antialias: false,
          pixelArt: true,
        },
        scale: {
          mode: PhaserLib.Scale.RESIZE,
          autoCenter: PhaserLib.Scale.CENTER_BOTH,
        },
      });
      gameRef.current = game;
    };
    void setup();
    return () => {
      canceled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [bridge]);

  return <div className="h-full w-full overflow-hidden" ref={rootRef} />;
}
