import { useState, useMemo } from "react";
import { useListDossiers, useSubmitDossier, getListDossiersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  FileText, Send, Clock, CheckCircle, XCircle, AlertTriangle,
  Plus, TrendingUp, Eye, Search, SlidersHorizontal, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
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

  const baseList = activeTab === "incomplets" ? incomplets : activeTab === "en_cours" ? enCours : allDossiers;

  const filtered = useMemo(() => {
    let list = baseList;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.objet.toLowerCase().includes(q) ||
        String(d.id).includes(q) ||
        (d.client?.nom?.toLowerCase().includes(q)) ||
        (d.client?.prenom?.toLowerCase().includes(q))
      );
    }
    if (filterStatut !== "tous") list = list.filter(d => d.statut === filterStatut);
    return list;
  }, [baseList, search, filterStatut]);

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
          <Button className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-2">
            <Plus size={16} /> Nouveau dossier
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSearch(""); setFilterStatut("tous"); }}
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

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher par client, objet..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-44 text-sm">
            <SlidersHorizontal size={13} className="mr-1.5 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(statutConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {activeTab === "incomplets" && incomplets.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <strong>Documents requis :</strong> Pièce d'identité, 3 bulletins de paie, avis d'imposition, relevés de compte (3 mois), justificatif de domicile.
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun dossier trouvé</p>
              {(search || filterStatut !== "tous") && (
                <button className="text-sm text-[hsl(345,65%,28%)] mt-2 hover:underline" onClick={() => { setSearch(""); setFilterStatut("tous"); }}>
                  Réinitialiser les filtres
                </button>
              )}
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
                {filtered.map(d => {
                  const sc = statutConfig[d.statut] || statutConfig.brouillon;
                  const ac = d.avis_indicatif ? avisConfig[d.avis_indicatif] : null;
                  const missing = getMissingDocs(d.documents || []);

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-slate-800 text-sm">
                          {d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Dossier #{d.id}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[160px]">
                        <p className="truncate">{d.objet}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                      {activeTab === "incomplets" ? (
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {missing.map(m => (
                              <span key={m} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                {m.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </td>
                      ) : (
                        <td className="px-4 py-3.5">
                          {ac ? <span className={`text-sm font-medium ${ac.color}`}>{ac.label}</span> : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${sc.color}`}>
                          {sc.icon}{sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <Link href={`/conseiller/dossier/${d.id}`}>
                            <button className="flex items-center gap-1 text-xs font-medium text-[hsl(345,65%,28%)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye size={13} /> Ouvrir
                            </button>
                          </Link>
                          {d.statut === "brouillon" && (
                            <Button
                              size="sm"
                              className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-1.5 text-xs"
                              onClick={() => handleSubmit(d.id)}
                              disabled={submitDossier.isPending}
                            >
                              <Send size={12} /> Transmettre
                            </Button>
                          )}
                        </div>
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
