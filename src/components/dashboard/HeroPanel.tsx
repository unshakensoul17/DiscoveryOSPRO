import { motion } from "framer-motion";
import { ArrowUpRight, Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useNavigate, useParams } from "react-router-dom";
import { useUIStore } from "../../store/ui";

interface HeroPanelProps {
  activeHypothesesCount: number;
  unresolvedRisksCount: number;
  avgConfidence: number;
}

export function HeroPanel({ activeHypothesesCount, unresolvedRisksCount, avgConfidence }: HeroPanelProps) {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { setActiveNav } = useUIStore();

  const handleNavigate = (nav: string) => {
    setActiveNav(nav);
    navigate(`/workspaces/${workspaceId}/${nav}`);
  };

  const stats = [
    { label: "Active Hypotheses", value: activeHypothesesCount.toString(), icon: Activity, tone: "info" },
    { label: "Unresolved Risks", value: unresolvedRisksCount.toString(), icon: AlertTriangle, tone: unresolvedRisksCount > 0 ? "warn" : "success" },
    { label: "Avg Confidence", value: `${avgConfidence}%`, icon: ShieldCheck, tone: avgConfidence >= 80 ? "success" : "warn" },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl">
      <div className="glass grid-noise relative rounded-3xl p-8 md:p-10">
        {/* glow orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,26,26,0.35),transparent_60%)] blur-2xl" />
        <div className="pointer-events-none absolute -left-24 top-32 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(120,0,0,0.5),transparent_60%)] blur-2xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.08)] px-3 py-1 text-xs font-medium text-[var(--primary)]"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              Discovery Agent · Live
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl"
            >
              Your AI product{" "}
              <motion.span 
                animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-transparent text-glow"
                style={{ 
                  backgroundImage: 'var(--gradient-red)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block'
                }}
              >
                brain
              </motion.span>
              ,<br />
              always thinking.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground"
            >
              From discovery to shipping — Nucleus reads every signal from your
              customer interviews, feedback, and metrics to validate your roadmap.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <button 
                onClick={() => handleNavigate('discoveries')}
                className="group flex items-center gap-2 rounded-xl bg-[var(--gradient-red)] px-5 py-3 text-sm font-semibold text-white red-glow transition-transform hover:scale-[1.02]"
              >
                View Active Insights
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button 
                onClick={() => handleNavigate('claims')}
                className="glass-strong rounded-xl px-5 py-3 text-sm font-semibold hover:bg-white/10"
              >
                View Hypotheses
              </button>
            </motion.div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[440px]">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, type: "spring" }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between">
                    <s.icon className={`h-4 w-4 ${s.tone === 'warn' ? 'text-[var(--primary)]' : s.tone === 'success' ? 'text-emerald-400' : 'text-sky-400'}`} />
                  </div>
                  <div className={`mt-6 text-2xl font-bold tracking-tight ${s.tone === 'warn' ? 'text-[var(--primary)] text-glow' : ''}`}>
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
