import { Link, useLocation } from "wouter";
import { useAuth, type Role } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import {
  FileText, Upload, LayoutDashboard, BarChart2,
  Database, Server, Shield, Archive,
  LogOut, Building2, Users, Settings, ChevronRight,
  List, TrendingUp, BookOpen, Activity, Bell, X,
  AlertCircle, CheckCircle2
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const roleNav: Record<Role, { section: string; nav: NavItem[]; defaultHref: string }> = {
  conseiller: {
    section: "Conseiller Bancaire",
    defaultHref: "/conseiller/dashboard",
    nav: [
      { label: "Tableau de bord", href: "/conseiller/dashboard", icon: <LayoutDashboard size={16} /> },
      { label: "Mes dossiers", href: "/conseiller/dossiers", icon: <FileText size={16} /> },
      { label: "Nouveau dossier", href: "/conseiller/nouveau-dossier", icon: <ChevronRight size={16} /> },
      { label: "Documents", href: "/conseiller/documents", icon: <Upload size={16} /> },
    ],
  },
  analyste: {
    section: "Analyste Risque",
    defaultHref: "/analyste/pipeline",
    nav: [
      { label: "Pipeline Risque", href: "/analyste/pipeline", icon: <Activity size={16} /> },
      { label: "Tous les dossiers", href: "/analyste/dossiers", icon: <List size={16} /> },
      { label: "Reporting Risque", href: "/analyste/reporting", icon: <BarChart2 size={16} /> },
    ],
  },
  admin: {
    section: "Administrateur SI",
    defaultHref: "/admin/dashboard",
    nav: [
      { label: "Tableau de bord technique", href: "/admin/dashboard", icon: <LayoutDashboard size={16} /> },
      { label: "Utilisateurs & Habilitations", href: "/admin/utilisateurs", icon: <Users size={16} /> },
      { label: "Paramètres Scoring", href: "/admin/scoring", icon: <Settings size={16} /> },
      { label: "Infrastructure & Sécurité", href: "/admin/infrastructure", icon: <Server size={16} /> },
      { label: "Data & Gouvernance", href: "/admin/data-gouvernance", icon: <Database size={16} /> },
    ],
  },
  conformite: {
    section: "Service Conformité",
    defaultHref: "/conformite/audit",
    nav: [
      { label: "Journal Système (Audit)", href: "/conformite/audit", icon: <Shield size={16} /> },
      { label: "Cycle de vie & RGPD", href: "/conformite/archives", icon: <Archive size={16} /> },
    ],
  },
};

const roleColors: Record<Role, string> = {
  conseiller: "bg-blue-500/20 text-blue-200",
  analyste: "bg-purple-500/20 text-purple-200",
  admin: "bg-amber-500/20 text-amber-200",
  conformite: "bg-emerald-500/20 text-emerald-200",
};

function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        title="Notifications"
      >
        <Bell size={15} className="text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Tout lire</button>
                  <span className="text-slate-300">·</span>
                  <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500">Effacer</button>
                </>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 ml-1">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${n.read ? "opacity-60" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    n.type === "nouveau_dossier" ? "bg-amber-100" : n.type === "decision" ? "bg-emerald-100" : "bg-blue-100"
                  }`}>
                    {n.type === "nouveau_dossier"
                      ? <AlertCircle size={13} className="text-amber-600" />
                      : <CheckCircle2 size={13} className="text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${n.read ? "text-slate-500" : "text-slate-800"}`}>{n.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {n.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const config = roleNav[user.role];

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "hsl(40 30% 96%)" }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-sidebar-border/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">SOLVY</h1>
              <p className="text-xs text-white/50 tracking-widest uppercase">Crédit Privé</p>
            </div>
          </div>
        </div>

        {/* User identity + notifications */}
        <div className="px-4 py-4 border-b border-sidebar-border/40">
          <div className="px-3 py-2.5 rounded-xl bg-white/10">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                <p className="text-xs text-white/50 mt-0.5 truncate">{user.login}</p>
              </div>
              <NotificationPanel />
            </div>
            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[user.role]}`}>
              {config.section}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3 px-2">Navigation</p>
          {config.nav.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href.split("/:")[0]));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-white/60"}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border/40">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/40">
            <Shield size={12} />
            <span>MFA actif — Microsoft Authenticator</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors mt-1"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
