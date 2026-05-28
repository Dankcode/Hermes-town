"use client";

import { useMemo } from "react";
import {
  type AgentAvatarProfile,
  createDefaultAgentAvatarProfile,
} from "@/lib/avatars/profile";

export const AgentAvatarPreview3D = ({
  profile,
  className = "",
}: {
  profile: AgentAvatarProfile | null | undefined;
  className?: string;
}) => {
  const resolvedProfile = useMemo(
    () => profile ?? createDefaultAgentAvatarProfile("preview"),
    [profile],
  );

  const skin = resolvedProfile.body.skinTone;
  const topColor = resolvedProfile.clothing.topColor;
  const bottomColor = resolvedProfile.clothing.bottomColor;
  const shoeColor = resolvedProfile.clothing.shoesColor;
  const hairColor = resolvedProfile.hair.color;
  const accessoryColor = topColor;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[#070b16] ${className}`}
      aria-label="2D avatar preview"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(120,160,255,0.18),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.25),rgba(2,6,23,0.92))]" />
      <div className="relative h-[78%] min-h-[220px] w-[220px]">
        <div className="absolute bottom-[7%] left-1/2 h-4 w-32 -translate-x-1/2 rounded-full bg-black/30 blur-[1px]" />

        {resolvedProfile.accessories.backpack ? (
          <div
            className="absolute bottom-[34%] left-1/2 h-24 w-20 -translate-x-1/2 rounded-md border border-black/20"
            style={{ backgroundColor: accessoryColor }}
          />
        ) : null}

        <div
          className="absolute bottom-[18%] left-[40%] h-20 w-8 rounded-sm border border-black/20"
          style={{ backgroundColor: bottomColor }}
        />
        <div
          className="absolute bottom-[18%] right-[40%] h-20 w-8 rounded-sm border border-black/20"
          style={{ backgroundColor: bottomColor }}
        />
        <div
          className="absolute bottom-[13%] left-[37%] h-5 w-12 rounded-sm border border-black/20"
          style={{ backgroundColor: shoeColor }}
        />
        <div
          className="absolute bottom-[13%] right-[37%] h-5 w-12 rounded-sm border border-black/20"
          style={{ backgroundColor: shoeColor }}
        />

        <div
          className="absolute bottom-[43%] left-1/2 h-28 w-28 -translate-x-1/2 rounded-md border border-black/20"
          style={{ backgroundColor: topColor }}
        />
        {resolvedProfile.clothing.topStyle === "jacket" ? (
          <div className="absolute bottom-[44%] left-1/2 h-24 w-6 -translate-x-1/2 rounded bg-white/90" />
        ) : null}
        {resolvedProfile.clothing.topStyle === "hoodie" ? (
          <div
            className="absolute bottom-[61%] left-1/2 h-9 w-24 -translate-x-1/2 rounded-t-full border border-black/15"
            style={{ backgroundColor: topColor }}
          />
        ) : null}

        <div
          className="absolute bottom-[43%] left-[21%] h-24 w-8 origin-top rotate-12 rounded-sm border border-black/20"
          style={{ backgroundColor: topColor }}
        />
        <div
          className="absolute bottom-[43%] right-[21%] h-24 w-8 origin-top -rotate-12 rounded-sm border border-black/20"
          style={{ backgroundColor: topColor }}
        />
        <div
          className="absolute bottom-[36%] left-[18%] h-8 w-8 rounded-full border border-black/20"
          style={{ backgroundColor: skin }}
        />
        <div
          className="absolute bottom-[36%] right-[18%] h-8 w-8 rounded-full border border-black/20"
          style={{ backgroundColor: skin }}
        />

        <div
          className="absolute bottom-[67%] left-1/2 h-9 w-9 -translate-x-1/2 rounded-sm border border-black/20"
          style={{ backgroundColor: skin }}
        />
        <div
          className="absolute bottom-[73%] left-1/2 h-24 w-24 -translate-x-1/2 rounded-[34%] border border-black/20"
          style={{ backgroundColor: skin }}
        />

        <div
          className={`absolute left-1/2 -translate-x-1/2 border border-black/20 ${
            resolvedProfile.hair.style === "spiky"
              ? "bottom-[94%] h-11 w-28 rounded-t-[45%]"
              : resolvedProfile.hair.style === "bun"
                ? "bottom-[94%] h-9 w-28 rounded-t-full"
                : "bottom-[92%] h-10 w-28 rounded-t-[38%]"
          }`}
          style={{ backgroundColor: hairColor }}
        />
        {resolvedProfile.hair.style === "bun" ? (
          <div
            className="absolute bottom-[99%] left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border border-black/20"
            style={{ backgroundColor: hairColor }}
          />
        ) : null}
        {resolvedProfile.accessories.hatStyle !== "none" ? (
          <div
            className="absolute bottom-[98%] left-1/2 h-8 w-32 -translate-x-1/2 rounded-t-full border border-black/20"
            style={{ backgroundColor: accessoryColor }}
          />
        ) : null}
        {resolvedProfile.accessories.headset ? (
          <div className="absolute bottom-[81%] left-1/2 h-20 w-32 -translate-x-1/2 rounded-t-full border-4 border-slate-400 border-b-0" />
        ) : null}

        <div className="absolute bottom-[82%] left-[42%] h-3 w-3 rounded-sm bg-slate-950" />
        <div className="absolute bottom-[82%] right-[42%] h-3 w-3 rounded-sm bg-slate-950" />
        {resolvedProfile.accessories.glasses ? (
          <>
            <div className="absolute bottom-[80.5%] left-[36%] h-7 w-7 rounded border-2 border-slate-950" />
            <div className="absolute bottom-[80.5%] right-[36%] h-7 w-7 rounded border-2 border-slate-950" />
            <div className="absolute bottom-[82.5%] left-1/2 h-1 w-5 -translate-x-1/2 bg-slate-950" />
          </>
        ) : null}
        <div className="absolute bottom-[77%] left-1/2 h-1.5 w-9 -translate-x-1/2 rounded-full bg-rose-700/80" />
      </div>
    </div>
  );
};
