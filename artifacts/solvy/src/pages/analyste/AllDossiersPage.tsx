import { useState, useMemo } from "react";
import { useListDossiers, useListDecisions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileText, ChevronRight, SlidersHorizontal, UserCheck } from "lucide-react";

const statutConfig: Record<string, { label: string; color: string }> = {
  en_attente_risque: { label: "En attente Risque", color: "bg-amber-50 text-amber-700" },
  en_cours_analyse: { label: "En cours d'analyse", color: "bg-blue-50 text-blue-700" },
  approuve: { label: "Approuvé", color: "bg-emerald-50 text-emerald-700" },
  refuse: { label: "Refusé", color: "bg-red-50 text-red-700" },
  conditionnel: { label: "Conditionnel", color: "bg-purple-50 text-purple-700" },
  archive: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
};

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function AllDossiersPage() {
  const { data: allDossiers, isLoading } = useListDossiers();
  const { data: decisions } = useListDecisions();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterAvis, setFilterAvis] = useState("tous");
  const [sortBy, setSortBy] = useState("date_desc");

  // Build map dossier_id → analyste name from decisions
  const analysteByDossier = useMemo(() => {
    const map: Record<number, string> = {};
    for (const d of decisions || []) {
      map[d.dossier_id] = d.analyste;
    }
    return map;
  }, [decisions]);

  // Analyste view: NEVER show brouillons
  const dossiers = useMemo(() => (allDossiers || []).filter(d => d.statut !== "brouillon"), [allDossiers]);

  const filtered = useMemo(() => {
    let list = dossiers;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.objet.toLowerCase().includes(q) ||
        String(d.id).includes(q) ||
        (d.client?.nom?.toLowerCase().includes(q)) ||
        (d.client?.prenom?.toLowerCase().includes(q)) ||
        (d.created_by?.toLowerCase().includes(q)) ||
        (d.assigned_to?.toLowerCase().includes(q))
      );
    }

    if (filterStatut !== "tous") list = list.filter(d => d.statut === filterStatut);
    if (filterAvis !== "tous") list = list.filter(d => d.avis_indicatif === filterAvis);

    list = [...list].sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "montant_desc") return b.montant - a.montant;
      if (sortBy === "montant_asc") return a.montant - b.montant;
      return 0;
    });

    return list;
  }, [dossiers, search, filterStatut, filterAvis, sortBy]);

  const DECIDED = new Set(["approuve", "refuse", "conditionnel"]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tous les dossiers</h1>
        <p className="text-slate-500 text-sm mt-1">Vue globale de l'équipe — {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""} transmis</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher par client, objet, conseiller..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-48 text-sm">
            <SlidersHorizontal size={13} className="mr-1.5 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(statutConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAvis} onValueChange={setFilterAvis}>
          <SelectTrigger className="w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les avis</SelectItem>
            <SelectItem value="favorable">Favorable</SelectItem>
            <SelectItem value="defavorable">Défavorable</SelectItem>
            <SelectItem value="analyse_requise">Analyse requise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Plus récent d'abord</SelectItem>
            <SelectItem value="date_asc">Plus ancien d'abord</SelectItem>
            <SelectItem value="montant_desc">Montant ↓</SelectItem>
            <SelectItem value="montant_asc">Montant ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}{search || filterStatut !== "tous" || filterAvis !== "tous" ? " (filtrés)" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={36} className="mx-auto mb-3 opacity-30" />
              <p>Aucun dossier ne correspond aux filtres</p>
              <button className="text-sm text-[hsl(345,65%,28%)] mt-2 hover:underline" onClick={() => { setSearch(""); setFilterStatut("tous"); setFilterAvis("tous"); }}>
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">#</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Objet</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Conseiller</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Décision</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(d => {
                  const sc = statutConfig[d.statut] || { label: d.statut, color: "bg-slate-100 text-slate-600" };
                  const analyste = analysteByDossier[d.id];
                  const isDecided = DECIDED.has(d.statut);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">#{d.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">
                          {d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[160px]">
                        <p className="truncate">{d.objet}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{d.created_by || "—"}</td>
                      <td className="px-4 py-3">
                        {isDecided && analyste ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600">
                              Validé par <span className="font-semibold">{analyste}</span>
                            </span>
                          </div>
                        ) : isDecided ? (
                          <span className="text-xs text-slate-400 italic">Analyste inconnu</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/analyste/dossier/${d.id}`}>
                          <button className="flex items-center gap-1 text-xs font-medium text-[hsl(345,65%,28%)] hover:underline">
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
