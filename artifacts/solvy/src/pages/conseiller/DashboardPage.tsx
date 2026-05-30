import { useListDossiers, useGetDashboardStats, useGetPipelineStats } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

const REQUIRED_DOCS = [
  "pièce_identité",
  "bulletins_salaire",
  "avis_imposition",
  "relevés_compte",
  "justificatif_domicile",
];

function countMissingDocs(documents: string[]): number {
  return REQUIRED_DOCS.filter(req => !documents.some(d => d.toLowerCase().includes(req.split("_")[0]))).length;
}

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const PIE_COLORS: Record<string, string> = {
  brouillon: "#94a3b8",
  en_attente_risque: "#f59e0b",
  en_cours_analyse: "#3b82f6",
  approuve: "#10b981",
  refuse: "#ef4444",
  conditionnel: "#8b5cf6",
  archive: "#6b7280",
};

const PIE_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente_risque: "En attente",
  en_cours_analyse: "En cours",
  approuve: "Approuvé",
  refuse: "Refusé",
  conditionnel: "Conditionnel",
  archive: "Archivé",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: allDossiers } = useListDossiers({ created_by: user?.login });
  const { data: stats } = useGetDashboardStats();

  const dossiers = allDossiers || [];
  const incomplets = dossiers.filter(d => {
    const docs = d.documents || [];
    return countMissingDocs(docs) > 0 && d.statut === "brouillon";
  });

  // Pie data
  const statutCounts: Record<string, number> = {};
  dossiers.forEach(d => { statutCounts[d.statut] = (statutCounts[d.statut] || 0) + 1; });
  const pieData = Object.entries(statutCounts).map(([statut, count]) => ({
    name: PIE_LABELS[statut] || statut,
    value: count,
    color: PIE_COLORS[statut] || "#94a3b8",
  }));

  // Monthly amounts (last 6 months simulated from dossier dates)
  const monthlyMap: Record<string, number> = {};
  dossiers.forEach(d => {
    const month = new Date(d.created_at).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    monthlyMap[month] = (monthlyMap[month] || 0) + d.montant;
  });
  const barData = Object.entries(monthlyMap).slice(-6).map(([month, montant]) => ({ month, montant }));

  const totalMontant = dossiers.filter(d => ["approuve","conditionnel"].includes(d.statut)).reduce((s,d) => s + d.montant, 0);
  const alertes = incomplets.length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bonjour, {user?.prenom} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Tableau de bord — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Link href="/conseiller/nouveau-dossier">
          <Button data-testid="btn-nouveau-dossier" className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-2">
            <Plus size={16} /> Nouveau dossier
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Mes dossiers", value: dossiers.length, sub: "en portefeuille", icon: <FileText size={20} className="text-blue-400" /> },
          { label: "En attente", value: dossiers.filter(d => d.statut === "en_attente_risque").length, sub: "service Risque", icon: <Clock size={20} className="text-amber-400" /> },
          { label: "Dossiers incomplets", value: alertes, sub: "pièces manquantes", icon: <AlertTriangle size={20} className={alertes > 0 ? "text-red-400" : "text-slate-300"} /> },
          { label: "Montant approuvé", value: formatEur(totalMontant), sub: "engagements actifs", icon: <CheckCircle size={20} className="text-emerald-400" /> },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1" data-testid={`kpi-${s.label.toLowerCase().replace(/ /g, "-")}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Pie chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Répartition de mes dossiers par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-300">
                <div className="text-center">
                  <FileText size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Aucun dossier</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Montants demandés (€) — par mois</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [formatEur(v), "Montant"]}
                  />
                  <Bar dataKey="montant" fill="hsl(345,65%,28%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-300">
                <div className="text-center">
                  <TrendingUp size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Aucune donnée</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertes incomplets */}
      {incomplets.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2">
              <AlertTriangle size={14} />
              Dossiers incomplets — pièces justificatives manquantes ({incomplets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Pièces manquantes</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomplets.slice(0, 4).map(d => {
                  const docs = d.documents || [];
                  const missing = REQUIRED_DOCS.filter(req => !docs.some(doc => doc.toLowerCase().includes(req.split("_")[0])));
                  const clientName = d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`;
                  return (
                    <tr key={d.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{clientName}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {missing.map(m => (
                            <span key={m} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                              {m.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href="/conseiller/dossiers">
                          <button className="text-xs font-medium text-[hsl(345,65%,28%)] hover:underline">Compléter →</button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
