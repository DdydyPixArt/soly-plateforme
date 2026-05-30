import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth, DEMO_USER_LIST } from "@/lib/auth-context";
import { Building2, Shield, Smartphone, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const roleLabels: Record<string, string> = {
  conseiller: "Conseiller Bancaire",
  analyste: "Analyste Risque",
  admin: "Administrateur SI",
  conformite: "Service Conformité",
};

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Simulate MFA delay
    await new Promise(r => setTimeout(r, 700));
    const ok = login(identifiant.trim(), password);
    setLoading(false);
    if (ok) {
      setLocation("/");
    } else {
      setError("Identifiant ou mot de passe incorrect.");
    }
  };

  const handleQuickLogin = (login_id: string) => {
    setIdentifiant(login_id);
    setPassword("password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(345 65% 20%) 0%, hsl(345 65% 32%) 100%)" }}>
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wider">SOLVY</h1>
          <p className="text-white/60 text-sm tracking-widest uppercase mt-1">Plateforme de Crédit Privé</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Accès sécurisé</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="identifiant" className="text-slate-700 text-sm font-medium">Identifiant</Label>
              <Input
                id="identifiant"
                data-testid="input-identifiant"
                type="text"
                placeholder="prenom.nom"
                value={identifiant}
                onChange={e => setIdentifiant(e.target.value)}
                className="mt-1.5"
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Mot de passe</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  data-testid="input-password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* MFA notice */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Smartphone size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">Double Authentification MFA Active</p>
                <p className="text-xs text-slate-500 mt-0.5">via Microsoft Authenticator</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1 flex-shrink-0" />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="button-connexion"
              disabled={loading || !identifiant || !password}
              className="w-full bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white font-semibold py-2.5 mt-2"
            >
              {loading ? "Vérification MFA..." : "Se connecter"}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 justify-center">
            <Shield size={12} />
            <span>Connexion chiffrée TLS 1.3 — Données conformes RGPD</span>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-4">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3 text-center">
            Comptes de démonstration
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_USER_LIST.map(u => (
              <button
                key={u.login}
                data-testid={`demo-user-${u.login}`}
                onClick={() => handleQuickLogin(u.login)}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-left"
              >
                <div>
                  <p className="text-white text-sm font-medium">{u.displayName}</p>
                  <p className="text-white/50 text-xs">{u.login}</p>
                </div>
                <span className="text-white/50 text-xs">{roleLabels[u.role]}</span>
              </button>
            ))}
          </div>
          <p className="text-white/40 text-xs text-center mt-3">Mot de passe : <code className="text-white/60">password</code></p>
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          SOLVY v2.4.1 — Accès réservé au personnel autorisé
        </p>
      </div>
    </div>
  );
}
