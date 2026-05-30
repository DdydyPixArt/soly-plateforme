import { useState } from "react";
import { useListDossiers, useClaimDossier, useListDecisions, getListDossiersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, TrendingUp, FileText, ChevronRight, User, AlertTriangle, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGetPipelineStats, useGetDashboardStats } from "@workspace/api-client-react";

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

type Tab = "a_traiter" | "en_cours" | "reporting" | "timeline";

export default function PipelinePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("a_traiter");
  const { data: dossiers, isLoading } = useListDossiers();
  const { data: pipeline } = useGetPipelineStats();
  const { data: stats } = useGetDashboardStats();
  const { data: decisions } = useListDecisions();
  const claimDossier = useClaimDossier();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const aTraiter = (dossiers || []).filter(d => d.statut === "en_attente_risque");
  const enCours = (dossiers || []).filter(d => d.statut === "en_cours_analyse");
  const decided = (dossiers || []).filter(d => ["approuve","refuse","conditionnel"].includes(d.statut));

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

  // Activity timeline: show audit logs filtered for analyst activity
  const myActivity = decisions
    ? decisions
        .filter(d => d.analyste?.toLowerCase().includes(user?.prenom?.toLowerCase() || ""))
        .slice(0, 20)
        .map(d => ({
          time: new Date(d.created_at),
          text: `Décision ${d.verdict.toUpperCase()} sur dossier #${d.dossier_id}`,
          sub: d.commentaire?.slice(0, 80),
          color: d.verdict === "accord" ? "bg-emerald-400" : d.verdict === "refus" ? "bg-red-400" : "bg-purple-400",
        }))
    : [];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "a_traiter", label: "Dossiers à traiter", count: aTraiter.length },
    { key: "en_cours", label: "En cours", count: enCours.length },
    { key: "reporting", label: "Reporting", count: decided.length },
    { key: "timeline", label: "Chronologie" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pipeline des dossiers</h1>
        <p className="text-slate-500 text-sm mt-1">Portefeuille global — {user?.displayName}</p>
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
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            data-testid={`tab-${t.key}`}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === t.key ? "bg-[hsl(345,65%,28%)] text-white" : "bg-slate-200 text-slate-600"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* À TRAITER */}
      {activeTab === "a_traiter" && (
        <div className="grid grid-cols-3 gap-6">
          {pipeline && pipeline.length > 0 && (
            <Card className="border-0 shadow-sm col-span-1">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-700">Pipeline global</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={pipeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
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
              <CardTitle className="text-sm font-semibold text-slate-700">Dossiers en attente de traitement ({aTraiter.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? <div className="p-8 text-center text-slate-400">Chargement...</div> :
               aTraiter.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <CheckCircle size={36} className="mx-auto mb-3 text-emerald-300" />
                  <p>Aucun dossier en attente</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead><tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Client</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                    <th className="px-4 py-3"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {aTraiter.map(d => (
                      <tr key={d.id} data-testid={`row-pipeline-${d.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 text-sm">{d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}</p>
                          <p className="text-xs text-slate-400">#{d.id} — {d.objet}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            data-testid={`button-claim-${d.id}`}
                            className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white text-xs gap-1.5"
                            onClick={() => handleClaim(d.id)}
                            disabled={claimDossier.isPending}
                          >
                            <User size={12} /> Traiter le dossier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* EN COURS */}
      {activeTab === "en_cours" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">Dossiers en cours d'analyse ({enCours.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {enCours.length === 0 ? (
              <div className="p-10 text-center text-slate-400"><FileText size={36} className="mx-auto mb-3 opacity-30" /><p>Aucun dossier en cours</p></div>
            ) : (
              <table className="w-full">
                <thead><tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Analyste en charge</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="px-6 py-3"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {enCours.map(d => {
                    const isAssignedToMe = d.assigned_to === user?.login;
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-800 text-sm">{d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}</p>
                          <p className="text-xs text-slate-400">#{d.id} — {d.objet}</p>
                        </td>
                        <td className="px-4 py-3">
                          {d.assigned_to ? (
                            <div className={`text-xs font-medium px-2 py-1 rounded-lg inline-flex items-center gap-1.5 ${isAssignedToMe ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                              <User size={12} />
                              {isAssignedToMe ? "Vous" : d.assigned_to}
                              {!isAssignedToMe && <span className="text-slate-400 ml-1">(bloqué)</span>}
                            </div>
                          ) : <span className="text-slate-400 text-xs">Non assigné</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                        <td className="px-6 py-3 text-right">
                          {isAssignedToMe ? (
                            <Link href={`/analyste/dossier/${d.id}`}>
                              <button data-testid={`button-analyser-${d.id}`} className="flex items-center gap-1 text-xs font-medium text-[hsl(345,65%,28%)] hover:underline">
                                Instruire <ChevronRight size={12} />
                              </button>
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-1"><AlertTriangle size={12} />Accès restreint</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* REPORTING */}
      {activeTab === "reporting" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">Dossiers analysés — Historique des décisions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {decided.length === 0 ? (
              <div className="p-10 text-center text-slate-400"><FileText size={36} className="mx-auto mb-3 opacity-30" /><p>Aucun dossier décidé</p></div>
            ) : (
              <table className="w-full">
                <thead><tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Objet</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Décision</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Analyste</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {decided.map(d => {
                    const decision = decisions?.find(dec => dec.dossier_id === d.id);
                    const sc = statutConfig[d.statut];
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-800 text-sm">{d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}</p>
                          <p className="text-xs text-slate-400">#{d.id}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">{d.objet}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${sc?.bg || "bg-slate-100 text-slate-600"}`}>{sc?.label || d.statut}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{decision?.analyste || d.assigned_to || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TIMELINE */}
      {activeTab === "timeline" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <History size={14} /> Chronologie de l'activité — {user?.displayName}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-4">
            {myActivity.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <History size={36} className="mx-auto mb-3 opacity-30" />
                <p>Aucune activité enregistrée</p>
              </div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />
                {myActivity.map((a, i) => (
                  <div key={i} className="relative mb-6 last:mb-0">
                    <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full ${a.color} border-2 border-white shadow`} />
                    <p className="text-xs text-slate-400 mb-0.5">{a.time.toLocaleString("fr-FR")}</p>
                    <p className="text-sm font-medium text-slate-700">{a.text}</p>
                    {a.sub && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-lg">{a.sub}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
