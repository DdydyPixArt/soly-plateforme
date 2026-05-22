import { useListDossiers, useSubmitDossier, getListDossiersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Send, Clock, CheckCircle, XCircle, AlertTriangle, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const statutConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  brouillon: { label: "Brouillon", color: "bg-slate-100 text-slate-600 border-slate-200", icon: <FileText size={12} /> },
  en_attente_risque: { label: "En attente Risque", color: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={12} /> },
  en_cours_analyse: { label: "En cours d'analyse", color: "bg-blue-50 text-blue-700 border-blue-200", icon: <TrendingUp size={12} /> },
  approuve: { label: "Approuvé", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle size={12} /> },
  refuse: { label: "Refusé", color: "bg-red-50 text-red-700 border-red-200", icon: <XCircle size={12} /> },
  conditionnel: { label: "Conditionnel", color: "bg-purple-50 text-purple-700 border-purple-200", icon: <AlertTriangle size={12} /> },
  archive: { label: "Archivé", color: "bg-gray-100 text-gray-500 border-gray-200", icon: <FileText size={12} /> },
};

const avisConfig: Record<string, { label: string; color: string }> = {
  favorable: { label: "Favorable", color: "text-emerald-600" },
  defavorable: { label: "Défavorable", color: "text-red-600" },
  analyse_requise: { label: "Analyse requise", color: "text-amber-600" },
};

function formatEur(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export default function DossiersPage() {
  const { data: dossiers, isLoading } = useListDossiers();
  const { data: stats } = useGetDashboardStats();
  const submitDossier = useSubmitDossier();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async (id: number) => {
    submitDossier.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDossiersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: "Dossier transmis", description: "Le dossier a été envoyé au service Risque pour validation." });
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mes dossiers</h1>
          <p className="text-slate-500 text-sm mt-1">Gestion des demandes de crédit en cours</p>
        </div>
        <Link href="/conseiller/nouveau-dossier">
          <Button data-testid="button-nouveau-dossier" className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-2">
            <Plus size={16} />
            Nouveau dossier
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total dossiers", value: stats.total_dossiers, sub: "en portefeuille" },
            { label: "En attente", value: stats.en_attente, sub: "service Risque" },
            { label: "Approuvés", value: stats.approuves, sub: "ce trimestre" },
            { label: "Taux d'accord", value: `${Math.round(stats.taux_accord * 100)}%`, sub: "sur période" },
          ].map((s) => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dossiers list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-700">Tous les dossiers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Chargement...</div>
          ) : !dossiers?.length ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun dossier</p>
              <p className="text-sm mt-1">Créez votre premier dossier de crédit</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Objet</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Avis indicatif</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dossiers.map((d) => {
                  const sc = statutConfig[d.statut] || statutConfig.brouillon;
                  const ac = d.avis_indicatif ? avisConfig[d.avis_indicatif] : null;
                  const canSubmit = d.statut === "brouillon";
                  return (
                    <tr key={d.id} data-testid={`row-dossier-${d.id}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800 text-sm">
                          {d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Dossier #{d.id}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 max-w-[180px] truncate">{d.objet}</td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                      <td className="px-4 py-4">
                        {ac ? (
                          <span className={`text-sm font-medium ${ac.color}`}>{ac.label}</span>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${sc.color}`}>
                          {sc.icon}{sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canSubmit && (
                          <Button
                            size="sm"
                            data-testid={`button-submit-${d.id}`}
                            className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-1.5 text-xs"
                            onClick={() => handleSubmit(d.id)}
                            disabled={submitDossier.isPending}
                          >
                            <Send size={12} />
                            Transmettre au Risque
                          </Button>
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
    </div>
  );
}
