import { Bell, Command, Search, Plus, Download, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useUIStore } from "../../store/ui";
import { useWorkspaceStore } from "../../store/workspace";
import { useNavigate, useParams, useLocation } from "react-router-dom";

export function TopNav() {
  const { openCreateClaimModal, openUploadModal, toggleSidebar } = useUIStore();
  const { workspaces } = useWorkspaceStore();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newWsId = e.target.value;
    if (newWsId && newWsId !== workspaceId) {
      const currentPath = location.pathname;
      const parts = currentPath.split('/');
      if (parts.length > 3 && parts[1] === 'workspaces') {
        parts[2] = newWsId;
        navigate(parts.join('/'));
      } else {
        navigate(`/workspaces/${newWsId}/dashboard`);
      }
    }
  };

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
        <select 
          value={workspaceId || ''} 
          onChange={handleWorkspaceChange}
          className="bg-transparent text-sm font-semibold text-foreground outline-none cursor-pointer hover:text-[var(--primary)] transition-colors pr-2 [&>option]:bg-zinc-900 [&>option]:text-white"
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name} / {location.pathname.split('/')[3] || 'Overview'}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2">
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
