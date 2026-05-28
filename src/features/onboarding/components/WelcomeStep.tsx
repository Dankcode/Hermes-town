/**
 * WelcomeStep — First onboarding screen introducing Hermes-town.
 */
import { Building2, Eye, MessageSquare, Swords, Users } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Watch heroes roam",
    description: "See agents as animated heroes in a living town",
  },
  {
    icon: Users,
    title: "Manage your fleet",
    description: "Create, configure, and monitor agents from one place",
  },
  {
    icon: MessageSquare,
    title: "Chat and approve",
    description: "Talk to agents, approve exec commands, review their work",
  },
  {
    icon: Building2,
    title: "Grow the town",
    description: "Upgrade medieval buildings as goals are completed",
  },
  {
    icon: Swords,
    title: "Preview missions",
    description: "Track active tasks in a quest panel over the town",
  },
] as const;

export const WelcomeStep = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-white/80">
        Hermes-town turns your AI automation into a{" "}
        <span className="font-medium text-white">living guild town</span> where
        your agents idle, walk, craft, research, and take on missions as 2D
        heroes.
      </p>
      <p className="text-sm text-white/60">
        This wizard will help you connect to your runtime gateway and get
        started in about two minutes.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {features.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="rounded-lg border border-white/8 bg-white/[0.03] px-3.5 py-3"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="text-xs font-semibold text-white">{title}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-white/55">
            {description}
          </p>
        </div>
      ))}
    </div>
  </div>
);
