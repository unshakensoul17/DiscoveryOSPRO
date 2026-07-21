import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { TrendingUp, AlertTriangle, Lightbulb, Clock, ShieldAlert, Crosshair, Search } from "lucide-react";
import type { Discovery } from "../../types";

interface DiscoveriesInsightsProps {
  discoveries: Discovery[];
}

const DISC_ICONS: Record<string, any> = {
  contradiction:      AlertTriangle,
  belief_drift:       TrendingUp,
  assumption_exposure:ShieldAlert,
  stale_evidence:     Clock,
  research_bias:      Crosshair,
  unknown_unknown:    Search,
};

const toneMap = {
  up: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  warn: "text-[var(--primary)] border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.1)]",
  info: "text-sky-300 border-sky-300/25 bg-sky-300/10",
};

export function DiscoveriesInsights({ discoveries }: DiscoveriesInsightsProps) {
  const activeDiscoveries = discoveries.filter(d => d.status === 'active');

  return (
    <GlassCard className="p-6 h-full" hover={false}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Auto-generated
          </div>
          <div className="text-lg font-bold">Active Insights</div>
        </div>
        <button className="text-xs text-[var(--primary)] hover:underline">View all</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {activeDiscoveries.length === 0 ? (
          <div className="md:col-span-2 text-center py-8 text-sm text-muted-foreground">
            No active insights or contradictions found.
          </div>
        ) : (
          activeDiscoveries.slice(0, 4).map((disc, i) => {
            const Icon = DISC_ICONS[disc.type] || Lightbulb;
            const tag = disc.type.replace(/_/g, ' ');
            
            // Map severity to tone
            let tone = "info";
            if (disc.severity > 0.75) tone = "warn";
            else if (disc.type === "belief_drift" && disc.severity < 0.5) tone = "up";

            return (
              <motion.div
                key={disc.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                whileHover={{ y: -3 }}
                className="glass-strong rounded-xl p-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${toneMap[tone as keyof typeof toneMap]}`}>
                    <Icon className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{tag}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold ${tone === 'warn' ? 'text-[var(--primary)]' : 'text-muted-foreground'}`}>
                    {Math.round(disc.severity * 100)}%
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-foreground font-medium">
                  {disc.description}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
