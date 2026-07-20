import { Bell, Command, Search, Plus, Download, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useUIStore } from "../../store/ui";

export function TopNav() {
  const { openCreateClaimModal, openUploadModal, toggleSidebar } = useUIStore();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className="glass sticky top-4 z-30 flex items-center gap-3 rounded-2xl p-2 pl-4"
    >
      <button 
        onClick={toggleSidebar} 
        className="p-1.5 rounded-lg lg:hidden bg-white/5 hover:bg-white/10 transition-colors"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      <div className="hidden items-center gap-2 md:flex">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Workspace
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="text-sm font-semibold">Nucleus / Overview</div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="glass-strong hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground md:flex">
          <Search className="h-4 w-4" />
          <input
            placeholder="Ask AI or search…"
            className="w-56 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px]">
            <Command className="h-3 w-3" /> K
          </div>
        </div>
        
        <button 
          onClick={openUploadModal}
          className="glass-strong flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-white/10"
        >
          <Download className="h-4 w-4" /> Ingest
        </button>
        
        <button 
          onClick={openCreateClaimModal}
          className="flex items-center gap-2 rounded-xl bg-[var(--gradient-red)] px-4 py-2.5 text-sm font-semibold text-white red-glow transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> Hypothesis
        </button>
        
        <div className="glass-strong grid h-10 w-10 place-items-center rounded-xl text-xs font-bold ml-2">
          AC
        </div>
      </div>
    </motion.header>
  );
}
