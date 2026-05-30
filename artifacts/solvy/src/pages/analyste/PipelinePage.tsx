import { useState, useMemo } from "react";
import { useListDossiers, useClaimDossier, getListDossiersQueryKey, useGetPipelineStats, useGetDashboardStats } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle, XCircle, TrendingUp, FileText, ChevronRight, User, AlertTriangle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statutConfig: Record<string, { label: string; color: string; bg: string; chartColor: string }> = {
  brouillon: { label: "Brouillon", color: "text-slate-600", bg: "bg-slate-100 text-slate-600", chartColor: "#94a3b8" },
  en_attente_risque: { label: "En attente", color: "text-amber-700", bg: "bg-amber-50 text-amber-700", chartColor: "#f59e0b" },
  en_cours_analyse: { label: "En cours", color: "text-blue-700", bg: "bg-blue-50 text-blue-700", chartColor: "#3b82f6" },
  approuve: { label: "Approuvé", color: "text-emerald-700", bg: "bg-emerald-50 text-emerald-700", chartColor: "#10b981" },
  refuse: { label: "Refusé", color: "text-red-700", bg: "bg-red-50 text-red-700", chartColor: "#ef4444" },
  conditionnel: { label: "Conditionnel", color: "text-purple-700", bg: "bg-purple-50 text-purple-700", chartColor: "#8b5cf6" },
};

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

type Tab = "a_traiter" | "en_cours";

export default function PipelinePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("a_traiter");
  const [search, setSearch] = useState("");
  const [filterConseiller, setFilterConseiller] = useState("tous");
  const { data: dossiers, isLoading } = useListDossiers();
  const { data: pipeline } = useGetPipelineStats();
  const { data: stats } = useGetDashboardStats();
  const claimDossier = useClaimDossier();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const allDossiers = dossiers || [];
  const conseillers = [...new Set(allDossiers.map(d => d.created_by).filter(Boolean))] as string[];

  const filter = (list: typeof allDossiers) => {
    let filtered = list;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d =>
        (d.client?.nom?.toLowerCase().includes(q)) ||
        (d.client?.prenom?.toLowerCase().includes(q)) ||
        d.objet.toLowerCase().includes(q) ||
        String(d.id).includes(q)
      );
    }
    if (filterConseiller !== "tous") filtered = filtered.filter(d => d.created_by === filterConseiller);
    return filtered;
  };

  const aTraiter = filter(allDossiers.filter(d => d.statut === "en_attente_risque"));
  const enCours = filter(allDossiers.filter(d => d.statut === "en_cours_analyse"));

  const handleClaim = (id: number) => {
    if (!user) return;
    claimDossier.mutate(
      { id, data: { analyste_login: user.login, analyste_nom: user.displayName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDossiersQueryKey() });
          toast({ title: "Dossier pris en charge", description: `Dossier #${id} vous est attribué.` });
        },
        onError: (e: unknown) => {
          const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error || "Impossible de prendre ce dossier en charge.";
          toast({ title: "Erreur", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "a_traiter", label: "À traiter", count: allDossiers.filter(d => d.statut === "en_attente_risque").length },
    { key: "en_cours", label: "En cours d'analyse", count: allDossiers.filter(d => d.statut === "en_cours_analyse").length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pipeline Risque</h1>
        <p className="text-slate-500 text-sm mt-1">Dossiers en attente et en cours — {user?.displayName}</p>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "À traiter", value: stats.en_attente, icon: <Clock size={18} className="text-amber-500" />, border: "border-l-amber-400" },
            { label: "Approuvés", value: stats.approuves, icon: <CheckCircle size={18} className="text-emerald-500" />, border: "border-l-emerald-400" },
            { label: "Refusés", value: stats.refuses, icon: <XCircle size={18} className="text-red-500" />, border: "border-l-red-400" },
            { label: "Taux d'accord", value: `${Math.round(stats.taux_accord * 100)}%`, icon: <TrendingUp size={18} className="text-blue-500" />, border: "border-l-blue-400" },
          ].map(s => (
            <Card key={s.label} className={`border-0 shadow-sm border-l-4 ${s.border}`}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-0.5">{s.value}</p>
                </div>
                {s.icon}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === t.key ? "bg-[hsl(345,65%,28%)] text-white" : "bg-slate-200 text-slate-600"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Rechercher par client, objet..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <Select value={filterConseiller} onValueChange={setFilterConseiller}>
          <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="Tous les conseillers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les conseillers</SelectItem>
            {conseillers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {pipeline && pipeline.length > 0 && (
          <Card className="border-0 shadow-sm col-span-1">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-700">Pipeline global</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={pipeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, "Dossiers"]} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {pipeline.map((entry) => (
                      <Cell key={entry.statut} fill={statutConfig[entry.statut]?.chartColor || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">
              {activeTab === "a_traiter" ? `Dossiers en attente (${aTraiter.length})` : `Dossiers en cours d'analyse (${enCours.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? <div className="p-8 text-center text-slate-400">Chargement...</div> : (
              (() => {
                const list = activeTab === "a_traiter" ? aTraiter : enCours;
                if (list.length === 0) return (
                  <div className="p-10 text-center text-slate-400">
                    <CheckCircle size={36} className="mx-auto mb-3 text-emerald-300" />
                    <p>{search || filterConseiller !== "tous" ? "Aucun résultat pour ce filtre" : "Aucun dossier"}</p>
                  </div>
                );
                return (
                  <table className="w-full">
                    <thead><tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Client</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Conseiller</th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                      <th className="px-4 py-3"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map(d => {
                        const isAssignedToMe = d.assigned_to === user?.login;
                        return (
                          <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800 text-sm">{d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}</p>
                              <p className="text-xs text-slate-400">#{d.id} — {d.objet}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{d.created_by || "—"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                            <td className="px-4 py-3 text-right">
                              {activeTab === "a_traiter" ? (
                                <Button size="sm" data-testid={`button-claim-${d.id}`}
                                  className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white text-xs gap-1.5"
                                  onClick={() => handleClaim(d.id)} disabled={claimDossier.isPending}>
                                  <User size={12} /> Traiter
                                </Button>
                              ) : isAssignedToMe ? (
                                <Link href={`/analyste/dossier/${d.id}`}>
                                  <button className="flex items-center gap-1 text-xs font-medium text-[hsl(345,65%,28%)] hover:underline">
                                    Instruire <ChevronRight size={12} />
                                  </button>
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400 flex items-center gap-1"><AlertTriangle size={12} />{d.assigned_to}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
