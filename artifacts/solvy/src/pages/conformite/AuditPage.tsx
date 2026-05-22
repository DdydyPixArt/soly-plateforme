import { useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Shield, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

const roleColor: Record<string, string> = {
  Conseiller: "bg-blue-50 text-blue-700 border-blue-200",
  "Analyste Risque": "bg-purple-50 text-purple-700 border-purple-200",
  Administrateur: "bg-amber-50 text-amber-700 border-amber-200",
  Conformité: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AuditPage() {
  const { data: logs, isLoading, isFetching } = useListAuditLogs();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getListAuditLogsQueryKey() });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Journal d'audit immuable</h1>
          <p className="text-slate-500 text-sm mt-1">Traçabilité chronologique de toutes les actions système et métier</p>
        </div>
        <Button
          data-testid="button-refresh-logs"
          variant="outline"
          className="gap-2 text-sm"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      {logs && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total entrées", value: logs.length },
            { label: "Succès", value: logs.filter(l => l.statut === "succes").length },
            { label: "Échecs", value: logs.filter(l => l.statut === "echec").length },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Shield size={14} className="text-[hsl(345,65%,28%)]" />
            Journal d'événements — Ordre chronologique inversé
          </CardTitle>
          <span className="text-xs text-slate-400 font-normal">Format: Timestamp — Utilisateur — Action — Statut</span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Chargement des logs...</div>
          ) : !logs?.length ? (
            <div className="p-10 text-center text-slate-400">
              <Shield size={36} className="mx-auto mb-3 opacity-30" />
              <p>Aucun événement enregistré</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 w-44">Timestamp</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 w-40">Utilisateur</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 w-28">Rôle</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 w-24">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => {
                  const ts = new Date(log.timestamp).toLocaleString("fr-FR", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                  });
                  const rc = roleColor[log.role] || roleColor.Conformité;
                  return (
                    <tr key={log.id} data-testid={`log-${log.id}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{ts}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-700 font-medium font-sans">{log.utilisateur}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium font-sans px-2 py-0.5 rounded-full border whitespace-nowrap ${rc}`}>{log.role}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 font-sans max-w-sm">
                        <p className="truncate">{log.action}</p>
                        {log.details && <p className="text-slate-400 text-xs mt-0.5 truncate">{log.details}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.statut === "succes" ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-sans font-medium">
                            <CheckCircle size={12} /> Succès
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-sans font-medium">
                            <XCircle size={12} /> Échec
                          </span>
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
