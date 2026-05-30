import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Pause, Trash2, CheckCircle, AlertTriangle, Key, X } from "lucide-react";

interface User {
  id: string;
  login: string;
  nom: string;
  prenom: string;
  role: string;
  status: "actif" | "suspendu";
  lastLogin: string;
  mfa: boolean;
}

const INITIAL_USERS: User[] = [
  { id: "1", login: "sophie.martin", nom: "Martin", prenom: "Sophie", role: "conseiller", status: "actif", lastLogin: "Aujourd'hui 09:14", mfa: true },
  { id: "2", login: "marc.lefebvre", nom: "Lefebvre", prenom: "Marc", role: "conseiller", status: "actif", lastLogin: "Aujourd'hui 08:52", mfa: true },
  { id: "3", login: "jean.risque", nom: "Risque", prenom: "Jean", role: "analyste", status: "actif", lastLogin: "Aujourd'hui 10:01", mfa: true },
  { id: "4", login: "admin.si", nom: "SI", prenom: "Admin", role: "admin", status: "actif", lastLogin: "Aujourd'hui 07:30", mfa: true },
  { id: "5", login: "compliance.officer", nom: "Officer", prenom: "Compliance", role: "conformite", status: "actif", lastLogin: "Hier 16:22", mfa: true },
];

const roleLabels: Record<string, string> = {
  conseiller: "Conseiller Bancaire",
  analyste: "Analyste Risque",
  admin: "Administrateur SI",
  conformite: "Service Conformité",
};

const roleColors: Record<string, string> = {
  conseiller: "bg-blue-50 text-blue-700 border-blue-200",
  analyste: "bg-purple-50 text-purple-700 border-purple-200",
  admin: "bg-amber-50 text-amber-700 border-amber-200",
  conformite: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ prenom: "", nom: "", login: "", role: "" });
  const { toast } = useToast();

  const handleToggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "actif" ? "suspendu" : "actif" } : u));
    const u = users.find(u => u.id === id);
    toast({ title: `Accès ${u?.status === "actif" ? "suspendu" : "réactivé"}`, description: `${u?.prenom} ${u?.nom}` });
  };

  const handleDelete = (id: string) => {
    const u = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    toast({ title: "Utilisateur supprimé", description: `${u?.prenom} ${u?.nom} — droits révoqués`, variant: "destructive" });
  };

  const handleCreate = () => {
    if (!newUser.prenom || !newUser.nom || !newUser.login || !newUser.role) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    const user: User = {
      id: Date.now().toString(),
      ...newUser,
      status: "actif",
      lastLogin: "Jamais",
      mfa: false,
    };
    setUsers(prev => [...prev, user]);
    setNewUser({ prenom: "", nom: "", login: "", role: "" });
    setShowForm(false);
    toast({ title: "Utilisateur créé", description: `${user.prenom} ${user.nom} — ${roleLabels[user.role]}` });
  };

  const active = users.filter(u => u.status === "actif").length;
  const suspended = users.filter(u => u.status === "suspendu").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Utilisateurs & Habilitations</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion des accès à la plateforme SOLVY</p>
        </div>
        <Button
          data-testid="button-add-user"
          className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-2"
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Annuler" : "Ajouter un utilisateur"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Utilisateurs actifs", value: active, color: "text-emerald-600" },
          { label: "Comptes suspendus", value: suspended, color: "text-amber-600" },
          { label: "MFA configuré", value: users.filter(u => u.mfa).length, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-0 shadow-sm mb-6 border-l-4 border-l-[hsl(345,65%,28%)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Créer un nouvel utilisateur</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            <Input data-testid="input-new-prenom" placeholder="Prénom" value={newUser.prenom} onChange={e => setNewUser(v => ({ ...v, prenom: e.target.value }))} />
            <Input data-testid="input-new-nom" placeholder="Nom" value={newUser.nom} onChange={e => setNewUser(v => ({ ...v, nom: e.target.value }))} />
            <Input data-testid="input-new-login" placeholder="Identifiant (prenom.nom)" value={newUser.login} onChange={e => setNewUser(v => ({ ...v, login: e.target.value }))} />
            <Select onValueChange={role => setNewUser(v => ({ ...v, role }))}>
              <SelectTrigger data-testid="select-new-role"><SelectValue placeholder="Rôle..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="col-span-4 flex justify-end gap-3 pt-2 border-t border-slate-100 mt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button data-testid="button-save-user" onClick={handleCreate} className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white">Créer l'utilisateur</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Users size={14} /> Annuaire des utilisateurs ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Utilisateur</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Rôle</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Dernière connexion</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">MFA</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} data-testid={`user-row-${u.login}`} className={`transition-colors ${u.status === "suspendu" ? "opacity-60 bg-slate-50" : "hover:bg-slate-50/70"}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-sm">{u.prenom} {u.nom}</p>
                    <p className="text-xs text-slate-400">{u.login}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${roleColors[u.role] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.lastLogin}</td>
                  <td className="px-4 py-3">
                    {u.mfa
                      ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle size={12} />Actif</span>
                      : <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><AlertTriangle size={12} />Non configuré</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${u.status === "actif" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <span className={`text-xs font-medium ${u.status === "actif" ? "text-emerald-600" : "text-slate-500"}`}>
                        {u.status === "actif" ? "Actif" : "Suspendu"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        data-testid={`button-toggle-${u.id}`}
                        onClick={() => handleToggleStatus(u.id)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          u.status === "actif"
                            ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <Pause size={11} />{u.status === "actif" ? "Suspendre" : "Réactiver"}
                      </button>
                      <button
                        data-testid={`button-delete-${u.id}`}
                        onClick={() => handleDelete(u.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={11} />Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
