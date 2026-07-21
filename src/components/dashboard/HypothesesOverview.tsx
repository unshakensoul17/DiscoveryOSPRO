import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { TrendingUp, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import type { Claim } from "../../types";

interface HypothesesOverviewProps {
  claims: Claim[];
}

export function HypothesesOverview({ claims }: HypothesesOverviewProps) {
  // Get active assumptions, sort by lowest confidence
  const weakestClaims = claims
    .filter((c) => c.type === "assumption")
    .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))
    .slice(0, 5);

  return (
    <GlassCard className="p-6 h-full" hover={false}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Validation
          </div>
          <div className="text-lg font-bold">Weakest Hypotheses</div>
        </div>
        <Search className="h-4 w-4 text-[var(--primary)]" />
      </div>

      <div className="space-y-3">
        {weakestClaims.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No active hypotheses found.
          </div>
        ) : (
          weakestClaims.map((claim, i) => {
            const health = Math.round((claim.confidence ?? 0) * 100);
            const status = health < 40 ? "at-risk" : health > 70 ? "healthy" : "warning";
            
            const Icon = status === 'healthy' ? CheckCircle2 : AlertTriangle;
            const colorClass = status === 'healthy' ? "text-emerald-400" : status === 'at-risk' ? "text-[var(--primary)]" : "text-amber-400";
            const bgClass = status === 'healthy' ? "bg-emerald-400/10" : status === 'at-risk' ? "bg-[rgba(255,26,26,0.12)]" : "bg-amber-400/10";

            return (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
                whileHover={{ x: 2 }}
                className="glass-strong group cursor-pointer rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{claim.content}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Status: {status === 'at-risk' ? 'Critical Data Gap' : status === 'healthy' ? 'Verified' : 'Needs Validation'}
                    </div>
                  </div>
                  <div className={`flex shrink-0 items-center gap-1.5 rounded-full ${bgClass} px-2 py-1 text-[10px] font-semibold ${colorClass}`}>
                    <Icon className="h-3 w-3" />
                    {health}%
                  </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${health}%` }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                    className={`h-full rounded-full ${status === 'healthy' ? 'bg-emerald-500' : 'bg-[var(--gradient-red)]'}`}
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
