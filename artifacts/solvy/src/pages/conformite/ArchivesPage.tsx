import { useState } from "react";
import { useListDossiers, useRequestDataPurge, getListDossiersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, Trash2, CheckCircle, XCircle } from "lucide-react";

export default function ArchivesPage() {
  const { data: dossiers, isLoading } = useListDossiers();
  const [purgeTarget, setPurgeTarget] = useState<{ id: number; client_id: number; nom: string } | null>(null);
  const [motif, setMotif] = useState("");
  const requestPurge = useRequestDataPurge();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Show all dossiers as potential archives + refused ones
  const archives = dossiers?.filter(d => d.statut === "archive" || d.statut === "refuse" || d.statut === "approuve") || [];

  const handlePurge = () => {
    if (!purgeTarget || !motif.trim()) return;
    requestPurge.mutate(
      { data: { client_id: purgeTarget.client_id, motif } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDossiersQueryKey() });
          toast({
            title: "Demande de purge enregistrée",
            description: `Art. 17 RGPD — Droit à l'effacement pour ${purgeTarget.nom}. Transmis au DPO.`,
          });
          setPurgeTarget(null);
          setMotif("");
        },
      }
    );
  };

  const statutLabels: Record<string, string> = {
    archive: "Archivé",
    refuse: "Refusé",
    approuve: "Approuvé — Clôturé",
  };

  const statutColors: Record<string, string> = {
    archive: "bg-gray-100 text-gray-500",
    refuse: "bg-red-50 text-red-600",
    approuve: "bg-emerald-50 text-emerald-700",
  };

  function formatEur(n: number) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Archives RGPD</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestion du cycle de vie — Conservation légale 5 ans après clôture · Art. 17 Droit à l'effacement
        </p>
      </div>

      {/* RGPD Notice */}
      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <p className="text-sm font-semibold text-amber-800 mb-1">Règle de conservation</p>
        <p className="text-xs text-amber-700">
          Conformément à la réglementation bancaire française, les données des dossiers de crédit sont conservées pendant
          <strong> 5 ans après la date de clôture</strong>. Passé ce délai, les données personnelles peuvent faire l'objet
          d'une demande d'effacement au titre du droit à l'oubli (RGPD Art. 17), sous réserve des obligations légales de conservation.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Archive size={14} className="text-[hsl(345,65%,28%)]" />
            Dossiers archivés et clôturés ({archives.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Chargement...</div>
          ) : archives.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Archive size={36} className="mx-auto mb-3 opacity-30" />
              <p>Aucun dossier archivé</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Objet</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Date clôture</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archives.map((d) => {
                  const nom = d.client ? `${d.client.prenom} ${d.client.nom}` : `Client #${d.client_id}`;
                  return (
                    <tr key={d.id} data-testid={`archive-${d.id}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800 text-sm">{nom}</p>
                        <p className="text-xs text-slate-400">#{d.id}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate">{d.objet}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 text-sm tabular-nums">{formatEur(d.montant)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statutColors[d.statut] || "bg-slate-100 text-slate-500"}`}>
                          {statutLabels[d.statut] || d.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {d.updated_at ? new Date(d.updated_at).toLocaleDateString("fr-FR") : new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-purge-${d.id}`}
                          className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setPurgeTarget({ id: d.id, client_id: d.client_id, nom })}
                        >
                          <Trash2 size={12} />
                          Demande purge (Art. 17)
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Purge dialog */}
      <AlertDialog open={!!purgeTarget} onOpenChange={(open) => { if (!open) { setPurgeTarget(null); setMotif(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demande d'effacement — RGPD Art. 17</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  Vous demandez l'effacement des données personnelles de <strong>{purgeTarget?.nom}</strong>.
                  Cette demande sera transmise au Délégué à la Protection des Données (DPO) pour validation.
                </p>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Motif de la demande <span className="text-red-500">*</span></label>
                <Textarea
                  data-testid="textarea-motif-purge"
                  className="min-h-[80px] text-sm"
                  placeholder="Ex: Demande du client par courrier recommandé du 22/05/2026..."
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-purge"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handlePurge}
              disabled={!motif.trim() || requestPurge.isPending}
            >
              Confirmer la demande
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
