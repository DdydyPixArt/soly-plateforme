import { useListDossiers, getListDossiersQueryKey, useGetPipelineStats, useGetDashboardStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, CheckCircle, XCircle, AlertTriangle, FileText, ChevronRight } from "lucide-react";

const statutConfig: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: "Brouillon", color: "#94a3b8", bg: "bg-slate-100 text-slate-600" },
  en_attente_risque: { label: "En attente", color: "#f59e0b", bg: "bg-amber-50 text-amber-700" },
  en_cours_analyse: { label: "En cours", color: "#3b82f6", bg: "bg-blue-50 text-blue-700" },
  approuve: { label: "Approuvé", color: "#10b981", bg: "bg-emerald-50 text-emerald-700" },
  refuse: { label: "Refusé", color: "#ef4444", bg: "bg-red-50 text-red-700" },
  conditionnel: { label: "Conditionnel", color: "#8b5cf6", bg: "bg-purple-50 text-purple-700" },
  archive: { label: "Archivé", color: "#6b7280", bg: "bg-gray-100 text-gray-500" },
};

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function PipelinePage() {
  const { data: dossiers, isLoading } = useListDossiers();
  const { data: pipeline } = useGetPipelineStats();
  const { data: stats } = useGetDashboardStats();

  const pending = dossiers?.filter(d => d.statut === "en_attente_risque" || d.statut === "en_cours_analyse") || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Pipeline des dossiers</h1>
        <p className="text-slate-500 text-sm mt-1">Suivi des demandes de crédit en attente d'analyse</p>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "En attente", value: stats.en_attente, icon: <Clock size={18} className="text-amber-500" />, color: "border-l-amber-400" },
            { label: "Approuvés", value: stats.approuves, icon: <CheckCircle size={18} className="text-emerald-500" />, color: "border-l-emerald-400" },
            { label: "Refusés", value: stats.refuses, icon: <XCircle size={18} className="text-red-500" />, color: "border-l-red-400" },
            { label: "Taux d'accord", value: `${Math.round(stats.taux_accord * 100)}%`, icon: <TrendingUp size={18} className="text-blue-500" />, color: "border-l-blue-400" },
          ].map((s) => (
            <Card key={s.label} className={`border-0 shadow-sm border-l-4 ${s.color}`}>
              <CardContent className="pt-5 pb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                </div>
                {s.icon}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Pipeline chart */}
        {pipeline && pipeline.length > 0 && (
          <Card className="border-0 shadow-sm col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Répartition du pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [v, "Dossiers"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pipeline.map((entry) => (
                      <Cell key={entry.statut} fill={statutConfig[entry.statut]?.color || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pending dossiers */}
        <Card className="border-0 shadow-sm col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Dossiers en attente d'analyse ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Chargement...</div>
            ) : pending.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <CheckCircle size={36} className="mx-auto mb-3 text-emerald-300" />
                <p className="font-medium">Aucun dossier en attente</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Client</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((d) => {
                    const sc = statutConfig[d.statut];
                    return (
                      <tr key={d.id} data-testid={`row-pipeline-${d.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 text-sm">
                            {d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}
                          </p>
                          <p className="text-xs text-slate-400">#{d.id} — {d.objet}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">
                          {formatEur(d.montant)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${sc?.bg || "bg-slate-100 text-slate-600"}`}>
                            {sc?.label || d.statut}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/analyste/dossier/${d.id}`}>
                            <button
                              data-testid={`button-analyser-${d.id}`}
                              className="flex items-center gap-1 text-xs font-medium text-[hsl(345,65%,28%)] hover:underline"
                            >
                              Analyser <ChevronRight size={12} />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All dossiers */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700">Tous les dossiers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Chargement...</div>
          ) : !dossiers?.length ? (
            <div className="p-10 text-center text-slate-400">
              <FileText size={36} className="mx-auto mb-3 opacity-30" />
              <p>Aucun dossier</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Objet</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dossiers.map((d) => {
                  const sc = statutConfig[d.statut];
                  return (
                    <tr key={d.id} data-testid={`row-dossier-all-${d.id}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800 text-sm">
                          {d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}
                        </p>
                        <p className="text-xs text-slate-400">#{d.id}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">{d.objet}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${sc?.bg || "bg-slate-100 text-slate-600"}`}>
                          {sc?.label || d.statut}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/analyste/dossier/${d.id}`}>
                          <button className="text-xs font-medium text-[hsl(345,65%,28%)] hover:underline flex items-center gap-1">
                            Voir <ChevronRight size={12} />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
