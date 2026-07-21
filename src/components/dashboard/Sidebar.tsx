import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  ListChecks,
  Upload,
  Network,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../store/ui";
import { useNavigate, useParams } from "react-router-dom";

const nav = [
  { icon: LayoutDashboard, label: "Overview", id: "dashboard" },
  { icon: Sparkles, label: "Insights", id: "discoveries" },
  { icon: ListChecks, label: "Hypotheses", id: "claims" },
  { icon: Upload, label: "Ingest", id: "ingest" },
  { icon: Network, label: "Knowledge Graph", id: "graph" },
];

export function Sidebar() {
  const { activeNav, setActiveNav, sidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const handleNav = (id: string) => {
    setActiveNav(id);
    if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/${id}`);
    }
    if (window.innerWidth < 1024) toggleSidebar();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside 
        className={cn(
          "glass fixed inset-y-4 left-4 z-50 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-2xl p-4 transition-transform duration-300 lg:sticky lg:top-4 lg:translate-x-0 lg:flex",
          sidebarOpen ? "translate-x-0" : "-translate-x-[150%] lg:translate-x-0"
        )}
      >
        <button 
          onClick={toggleSidebar} 
          className="absolute right-4 top-4 p-1.5 rounded-lg lg:hidden bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
        <button 
        onClick={() => navigate('/workspaces')}
        className="flex items-center gap-2 px-2 py-3 w-full text-left hover:bg-white/5 rounded-xl transition-colors"
      >
        <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-red)] red-glow">
          <div className="h-2.5 w-2.5 rounded-full bg-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-foreground">Nucleus</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            AI Product OS
          </div>
        </div>
      </button>

      <div className="mt-6 flex-1 space-y-1">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </div>
        {nav.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-[rgba(255,26,26,0.35)] bg-[rgba(255,26,26,0.08)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-4 w-4",
                  isActive && "text-[var(--primary)]",
                )}
              />
              <span className="relative font-medium">{item.label}</span>
              {isActive && (
                <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_10px_rgba(255,26,26,0.9)]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="glass-strong mt-4 rounded-xl p-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
          <span className="font-medium">AI Copilot Online</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Monitoring customer channels
        </p>
      </div>


    </aside>
    </>
  );
}
