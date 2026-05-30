import { Link, useLocation } from "wouter";
import { useAuth, type Role } from "@/lib/auth-context";
import {
  FileText, Upload, LayoutDashboard, BarChart2,
  Database, Server, Shield, Archive,
  LogOut, Building2, Users, Settings, ChevronRight, AlertTriangle
} from "lucide-react";

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
      { label: "Pipeline dossiers", href: "/analyste/pipeline", icon: <BarChart2 size={16} /> },
    ],
  },
  admin: {
    section: "Administrateur SI",
    defaultHref: "/admin/utilisateurs",
    nav: [
      { label: "Utilisateurs & Habilitations", href: "/admin/utilisateurs", icon: <Users size={16} /> },
      { label: "Paramètres Scoring", href: "/admin/scoring", icon: <Settings size={16} /> },
      { label: "Infrastructure & Sécurité", href: "/admin/infrastructure", icon: <Server size={16} /> },
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

        {/* User identity */}
        <div className="px-4 py-4 border-b border-sidebar-border/40">
          <div className="px-3 py-2.5 rounded-xl bg-white/10">
            <p className="text-sm font-semibold text-white">{user.displayName}</p>
            <p className="text-xs text-white/50 mt-0.5">{user.login}</p>
            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[user.role]}`}>
              {config.section}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3 px-2">Navigation</p>
          {config.nav.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.href.replace(/\//g, "-").slice(1)}`}
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
            data-testid="button-logout"
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
