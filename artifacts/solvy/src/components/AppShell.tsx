import { Link, useLocation } from "wouter";
import { useRole, type Role } from "@/lib/role-context";
import {
  FileText, Upload, LayoutDashboard, BarChart2,
  Database, BookOpen, Server, Shield, Archive,
  ChevronDown, LogOut, Building2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const roleConfig: Record<Role, { label: string; nav: NavItem[]; defaultHref: string }> = {
  conseiller: {
    label: "Conseiller Bancaire",
    defaultHref: "/conseiller/dossiers",
    nav: [
      { label: "Mes dossiers", href: "/conseiller/dossiers", icon: <FileText size={16} /> },
      { label: "Nouveau dossier", href: "/conseiller/nouveau-dossier", icon: <LayoutDashboard size={16} /> },
      { label: "Documents", href: "/conseiller/documents", icon: <Upload size={16} /> },
    ],
  },
  analyste: {
    label: "Analyste Risque",
    defaultHref: "/analyste/pipeline",
    nav: [
      { label: "Pipeline dossiers", href: "/analyste/pipeline", icon: <BarChart2 size={16} /> },
    ],
  },
  admin: {
    label: "Administrateur Data",
    defaultHref: "/admin/infrastructure",
    nav: [
      { label: "Base de données", href: "/admin/database", icon: <Database size={16} /> },
      { label: "Gouvernance", href: "/admin/gouvernance", icon: <BookOpen size={16} /> },
      { label: "Infrastructure", href: "/admin/infrastructure", icon: <Server size={16} /> },
    ],
  },
  conformite: {
    label: "Service Conformité",
    defaultHref: "/conformite/audit",
    nav: [
      { label: "Journal d'audit", href: "/conformite/audit", icon: <Shield size={16} /> },
      { label: "Archives RGPD", href: "/conformite/archives", icon: <Archive size={16} /> },
    ],
  },
};

const roleLabels: Record<Role, string> = {
  conseiller: "Conseiller Bancaire",
  analyste: "Analyste Risque",
  admin: "Administrateur Data",
  conformite: "Service Conformité",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { role, setRole } = useRole();
  const [location, setLocation] = useLocation();
  const config = roleConfig[role];

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setLocation(roleConfig[newRole].defaultHref);
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "hsl(40 30% 96%)" }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-sidebar-border/40">
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

        {/* Role Selector */}
        <div className="px-4 py-3 border-b border-sidebar-border/40">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-2 px-2">Profil actif</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="role-selector"
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm text-white font-medium"
              >
                <span className="truncate">{roleLabels[role]}</span>
                <ChevronDown size={14} className="text-white/60 flex-shrink-0 ml-2" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 ml-2" align="start">
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <DropdownMenuItem
                  key={r}
                  data-testid={`role-option-${r}`}
                  onClick={() => handleRoleChange(r)}
                  className={role === r ? "bg-accent" : ""}
                >
                  {roleLabels[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
            <Shield size={12} />
            <span>MFA actif — Microsoft Authenticator</span>
          </div>
          <Link href="/login">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer mt-1">
              <LogOut size={16} />
              Déconnexion
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
