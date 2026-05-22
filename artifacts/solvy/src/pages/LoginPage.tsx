import { Building2, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(345 65% 22%) 0%, hsl(345 65% 32%) 100%)" }}>
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wider">SOLVY</h1>
          <p className="text-white/60 text-sm tracking-widest uppercase mt-1">Plateforme de Crédit Privé</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Accès sécurisé</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="login-identifiant" className="text-slate-700 text-sm font-medium">Identifiant</Label>
              <Input
                id="login-identifiant"
                data-testid="input-identifiant"
                type="text"
                placeholder="nom.prenom@banque.fr"
                defaultValue="m.dupont@solvy.fr"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="login-password" className="text-slate-700 text-sm font-medium">Mot de passe</Label>
              <Input
                id="login-password"
                data-testid="input-password"
                type="password"
                placeholder="••••••••••"
                defaultValue="••••••••••"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* MFA Notice */}
          <div className="mt-5 flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex-shrink-0 mt-0.5">
              <Smartphone size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">Double authentification MFA active</p>
              <p className="text-xs text-slate-500 mt-0.5">via Microsoft Authenticator</p>
            </div>
            <div className="ml-auto flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          <Button
            data-testid="button-connexion"
            className="w-full mt-6 bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white font-semibold py-2.5"
          >
            Se connecter
          </Button>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 justify-center">
            <Shield size={12} />
            <span>Connexion chiffrée TLS 1.3 — Données conformes RGPD</span>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          SOLVY v2.4.1 — Accès réservé au personnel autorisé
        </p>
      </div>
    </div>
  );
}
