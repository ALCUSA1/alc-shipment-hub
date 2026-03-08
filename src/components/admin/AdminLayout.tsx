import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminAlertsBell } from "./AdminAlertsBell";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useState } from "react";

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[hsl(220,20%,7%)] text-white flex">
      {/* Subtle grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Sidebar */}
      <div
        className={`relative z-20 transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-14 flex items-center justify-between px-6 border-b border-[hsl(220,15%,13%)] bg-[hsl(220,20%,7%)]/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-[hsl(220,15%,15%)] text-[hsl(220,10%,50%)] hover:text-white transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
              Admin
            </span>
          </div>
          <AdminAlertsBell />
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
