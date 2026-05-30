import { useState } from "react";
import { useListDossiers, useSubmitDossier, getListDossiersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { FileText, Send, Clock, CheckCircle, XCircle, AlertTriangle, Plus, TrendingUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const REQUIRED_DOCS = ["pièce_identité", "bulletins_salaire", "avis_imposition", "relevés_compte", "justificatif_domicile"];

function getMissingDocs(documents: string[]): string[] {
  return REQUIRED_DOCS.filter(req => !documents.some(d => d.toLowerCase().includes(req.split("_")[0])));
}

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

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

type TabType = "tous" | "incomplets" | "en_cours";

export default function DossiersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("tous");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: dossiers, isLoading } = useListDossiers({ created_by: user?.login });
  const submitDossier = useSubmitDossier();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const allDossiers = dossiers || [];
  const incomplets = allDossiers.filter(d => {
    const docs = d.documents || [];
    return getMissingDocs(docs).length > 0 && d.statut === "brouillon";
  });
  const enCours = allDossiers.filter(d => ["en_attente_risque","en_cours_analyse"].includes(d.statut));

  const displayed = activeTab === "incomplets" ? incomplets : activeTab === "en_cours" ? enCours : allDossiers;

  const handleSubmit = (id: number) => {
    submitDossier.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDossiersQueryKey() });
        toast({ title: "Dossier transmis", description: "Envoyé au service Risque pour validation." });
      },
    });
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "tous", label: "Tous les dossiers", count: allDossiers.length },
    { key: "incomplets", label: "Dossiers incomplets", count: incomplets.length },
    { key: "en_cours", label: "En cours de traitement", count: enCours.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mes dossiers</h1>
          <p className="text-slate-500 text-sm mt-1">Portefeuille de {user?.displayName}</p>
        </div>
        <Link href="/conseiller/nouveau-dossier">
          <Button data-testid="button-nouveau-dossier" className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-2">
            <Plus size={16} /> Nouveau dossier
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            data-testid={`tab-${t.key}`}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === t.key ? "bg-[hsl(345,65%,28%)] text-white" : "bg-slate-200 text-slate-600"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Incomplete tab info */}
      {activeTab === "incomplets" && incomplets.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <strong>Documents requis par dossier :</strong> Pièce d'identité, 3 derniers bulletins de paie, avis d'imposition, relevés de compte (3 mois), justificatif de domicile.
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Chargement...</div>
          ) : displayed.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {activeTab === "incomplets" ? "Tous les dossiers sont complets ✓" :
                 activeTab === "en_cours" ? "Aucun dossier en cours de traitement" :
                 "Aucun dossier"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Objet</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  {activeTab === "incomplets" ? (
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Pièces manquantes</th>
                  ) : (
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Avis indicatif</th>
                  )}
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(d => {
                  const sc = statutConfig[d.statut] || statutConfig.brouillon;
                  const ac = d.avis_indicatif ? avisConfig[d.avis_indicatif] : null;
                  const missing = getMissingDocs(d.documents || []);
                  const isExpanded = expandedId === d.id;

                  return (
                    <>
                      <tr key={d.id} data-testid={`row-dossier-${d.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800 text-sm">
                            {d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">Dossier #{d.id}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 max-w-[160px] truncate">{d.objet}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                        {activeTab === "incomplets" ? (
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {missing.map(m => (
                                <span key={m} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                  {m.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          </td>
                        ) : (
                          <td className="px-4 py-4">
                            {ac ? <span className={`text-sm font-medium ${ac.color}`}>{ac.label}</span> : <span className="text-slate-300 text-sm">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${sc.color}`}>
                            {sc.icon}{sc.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center gap-2 justify-end">
                          <button
                            data-testid={`button-view-${d.id}`}
                            onClick={() => setExpandedId(isExpanded ? null : d.id)}
                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                          >
                            <Eye size={14} /> {isExpanded ? "Fermer" : "Consulter"}
                          </button>
                          {d.statut === "brouillon" && (
                            <Button
                              size="sm"
                              data-testid={`button-submit-${d.id}`}
                              className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-1.5 text-xs"
                              onClick={() => handleSubmit(d.id)}
                              disabled={submitDossier.isPending}
                            >
                              <Send size={12} /> Transmettre au Risque
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && d.client && (
                        <tr key={`detail-${d.id}`} className="bg-slate-50/70">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-3 gap-6 text-xs">
                              <div>
                                <p className="font-semibold text-slate-600 uppercase tracking-wide mb-2">Identité</p>
                                <dl className="space-y-1">
                                  <div className="flex justify-between"><dt className="text-slate-500">Nom</dt><dd className="font-medium">{d.client.prenom} {d.client.nom}</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium">{d.client.email}</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Téléphone</dt><dd className="font-medium">{d.client.telephone || "—"}</dd></div>
                                </dl>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-600 uppercase tracking-wide mb-2">Situation financière</p>
                                <dl className="space-y-1">
                                  <div className="flex justify-between"><dt className="text-slate-500">Statut pro</dt><dd className="font-medium">{d.client.statut_pro}</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Revenus nets</dt><dd className="font-medium">{formatEur(d.client.revenus_nets)}/mois</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Charges</dt><dd className="font-medium">{formatEur(d.client.charges_fixes)}/mois</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Patrimoine</dt><dd className="font-medium">{d.client.patrimoine ? formatEur(d.client.patrimoine) : "—"}</dd></div>
                                </dl>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-600 uppercase tracking-wide mb-2">Crédit demandé</p>
                                <dl className="space-y-1">
                                  <div className="flex justify-between"><dt className="text-slate-500">Montant</dt><dd className="font-semibold text-[hsl(345,65%,28%)]">{formatEur(d.montant)}</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Durée</dt><dd className="font-medium">{d.duree_mois} mois</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Objet</dt><dd className="font-medium max-w-[160px] truncate">{d.objet}</dd></div>
                                  <div className="flex justify-between"><dt className="text-slate-500">Apport</dt><dd className="font-medium">{d.apport_personnel ? formatEur(d.apport_personnel) : "—"}</dd></div>
                                </dl>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
