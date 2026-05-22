import { useGetInfraMetrics, getGetInfraMetricsQueryKey, useRotateEncryptionKeys, useTriggerReplication } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, GitBranch, Server, HardDrive, Activity, CheckCircle } from "lucide-react";

function ProgressBar({ value, max = 100, color = "bg-emerald-500" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function InfrastructurePage() {
  const { data: metrics, isLoading } = useGetInfraMetrics();
  const queryClient = useQueryClient();
  const rotateKeys = useRotateEncryptionKeys();
  const replicate = useTriggerReplication();
  const { toast } = useToast();

  const handleRotate = () => {
    rotateKeys.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetInfraMetricsQueryKey() });
        toast({ title: "Rotation effectuée", description: data.message });
      },
    });
  };

  const handleReplicate = () => {
    replicate.mutate(undefined, {
      onSuccess: (data) => {
        toast({ title: "Réplication déclenchée", description: data.message });
      },
    });
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400">Chargement des métriques...</div>;

  const aks = metrics?.azure_aks;
  const storage = metrics?.ovhcloud_storage;
  const kv = metrics?.key_vault;
  const repl = metrics?.replication_status;

  const cpuHistory = (metrics?.cpu_history || []).map(p => ({
    time: formatTime(p.time),
    value: p.value,
  }));
  const storageHistory = (metrics?.storage_history || []).map(p => ({
    time: formatTime(p.time),
    value: p.value,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Infrastructure et sécurité Cloud</h1>
          <p className="text-slate-500 text-sm mt-1">Azure AKS · OVHcloud SecNumCloud · Marseille DR</p>
        </div>
        <div className="flex gap-3">
          <Button
            data-testid="button-rotate-keys"
            variant="outline"
            className="gap-2 text-sm border-[hsl(345,65%,28%)] text-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,28%)]/5"
            onClick={handleRotate}
            disabled={rotateKeys.isPending}
          >
            <Key size={14} />
            Rotation des clés (Key Vault)
          </Button>
          <Button
            data-testid="button-replicate"
            variant="outline"
            className="gap-2 text-sm"
            onClick={handleReplicate}
            disabled={replicate.isPending}
          >
            <GitBranch size={14} />
            Réplication → Marseille
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Azure AKS */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Server size={14} className="text-blue-500" />
              Azure AKS — Cluster Kubernetes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">CPU</span>
                <span className="font-semibold text-slate-700" data-testid="metric-cpu">{aks?.cpu_percent}%</span>
              </div>
              <ProgressBar value={aks?.cpu_percent ?? 0} color={aks && aks.cpu_percent > 70 ? "bg-amber-400" : "bg-blue-400"} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Mémoire</span>
                <span className="font-semibold text-slate-700">{aks?.memory_percent}%</span>
              </div>
              <ProgressBar value={aks?.memory_percent ?? 0} color={aks && aks.memory_percent > 80 ? "bg-red-400" : "bg-purple-400"} />
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">Pods actifs</span>
              <span className="font-semibold text-slate-700">{aks?.pods_running}/{aks?.pods_total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">{aks?.status}</span>
            </div>
          </CardContent>
        </Card>

        {/* OVHcloud */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <HardDrive size={14} className="text-orange-500" />
              OVHcloud SecNumCloud — Stockage objet
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Espace utilisé</span>
                <span className="font-semibold text-slate-700">{storage?.used_gb} Go / {storage?.total_gb} Go</span>
              </div>
              <ProgressBar value={storage?.used_gb ?? 0} max={storage?.total_gb ?? 10} color="bg-orange-400" />
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">Utilisation</span>
              <span className="font-semibold text-slate-700" data-testid="metric-storage">{storage?.percent_used}%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">{storage?.status}</span>
            </div>

            {/* Key vault */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Key size={12} /> Azure Key Vault
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Algorithme</span>
                  <span className="font-mono text-slate-700 font-medium">{kv?.algorithm}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Prochaine rotation</span>
                  <span className="text-slate-700">{kv?.next_rotation ? new Date(kv.next_rotation).toLocaleDateString("fr-FR") : "—"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity size={14} /> Consommation CPU — 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={cpuHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${v}%`, "CPU"]}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <HardDrive size={14} /> Stockage OVH — 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={storageHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="storGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} unit="Go" />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${v} Go`, "Stockage"]}
                />
                <Area type="monotone" dataKey="value" stroke="#f97316" fill="url(#storGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Replication status */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <GitBranch size={14} className="text-purple-500" />
            Réplication asynchrone — Site de secours
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-slate-500">Région</p>
              <p className="font-semibold text-slate-800 text-sm mt-0.5">{repl?.region}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Lag de réplication</p>
              <p className="font-semibold text-slate-800 text-sm mt-0.5">{repl?.lag_ms} ms</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Statut</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="font-semibold text-emerald-600 text-sm">{repl?.status}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Dernière synchronisation</p>
              <p className="font-semibold text-slate-800 text-sm mt-0.5">
                {repl?.last_sync ? new Date(repl.last_sync).toLocaleTimeString("fr-FR") : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
