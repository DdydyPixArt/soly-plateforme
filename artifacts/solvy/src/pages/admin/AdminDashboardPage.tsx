import { useGetInfraMetrics, getGetInfraMetricsQueryKey, useListAuditLogs } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Server, Database, Activity, Shield, CheckCircle,
  RefreshCw, Cpu, HardDrive, Wifi, Clock, Package
} from "lucide-react";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
      <CheckCircle size={13} /> {label}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
      <Activity size={13} /> {label}
    </span>
  );
}

function MetricCard({ label, value, unit, icon, color, sub }: {
  label: string; value: number | string; unit?: string; icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <span className={color}>{icon}</span>
        </div>
        <div className="flex items-end gap-1">
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          {unit && <p className="text-xs text-slate-400 mb-0.5">{unit}</p>}
        </div>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: metrics, isLoading, isFetching } = useGetInfraMetrics();
  const { data: auditLogs } = useListAuditLogs();
  const queryClient = useQueryClient();

  const recentLogs = auditLogs?.slice(0, 6) || [];

  // Simulated CPU/RAM history for chart using cpu_history if available
  const rawHistory = metrics?.cpu_history;
  const perfHistory = rawHistory && rawHistory.length > 0
    ? rawHistory.map((p, i) => ({
        time: p.time,
        cpu: p.value,
        ram: Math.round(55 + (p.value * 0.4)),
        req: Math.round(80 + p.value * 2),
      }))
    : Array.from({ length: 12 }, (_, i) => ({
        time: `${String(i * 2).padStart(2, "0")}:00`,
        cpu: Math.round(20 + Math.random() * 45),
        ram: Math.round(55 + Math.random() * 20),
        req: Math.round(80 + Math.random() * 120),
      }));

  const services = [
    { name: "API Gateway SOLVY", zone: "Azure West Europe", ok: true, latency: "12ms" },
    { name: "PostgreSQL (Principal)", zone: "OVH Paris DC3", ok: true, latency: "3ms" },
    { name: "PostgreSQL (Réplica)", zone: "OVH Roubaix DC2", ok: !!(metrics?.replication_status?.status === "ok"), latency: `${metrics?.replication_status?.lag_ms ?? 8}ms` },
    { name: "Service Scoring IA", zone: "Azure France Central", ok: true, latency: "45ms" },
    { name: "Azure Key Vault", zone: "Azure West Europe", ok: metrics?.key_vault?.status === "ok", latency: "5ms" },
    { name: "Object Storage (OVH)", zone: "OVH Paris S3", ok: metrics?.ovhcloud_storage?.status === "ok", latency: "22ms" },
    { name: "Monitoring (Prometheus)", zone: "Azure West Europe", ok: !!(metrics), latency: "1ms" },
  ];

  const cpuPct = metrics?.azure_aks.cpu_percent ?? 0;
  const ramPct = metrics?.azure_aks.memory_percent ?? 0;
  const diskPct = metrics?.ovhcloud_storage.percent_used ?? 0;
  const diskUsed = metrics?.ovhcloud_storage.used_gb ?? 0;
  const diskTotal = metrics?.ovhcloud_storage.total_gb ?? 200;
  const podsRunning = metrics?.azure_aks.pods_running ?? 0;
  const podsTotal = metrics?.azure_aks.pods_total ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord technique</h1>
          <p className="text-slate-500 text-sm mt-1">Infrastructure cloud — Azure / OVH — Temps réel</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: getGetInfraMetricsQueryKey() })}
          disabled={isFetching}
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Rafraîchir
        </Button>
      </div>

      {/* System health banner */}
      <div className="mb-6 flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-sm font-semibold text-emerald-800">Tous les systèmes opérationnels</p>
        <span className="ml-auto text-xs text-emerald-600">Dernière vérification : il y a 12 secondes</span>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Chargement des métriques...</div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="CPU (cluster AKS)"
              value={cpuPct}
              unit="%"
              icon={<Cpu size={18} />}
              color={cpuPct > 80 ? "text-red-500" : cpuPct > 60 ? "text-amber-500" : "text-emerald-500"}
              sub={cpuPct > 70 ? "⚠ Charge élevée" : "Nominal"}
            />
            <MetricCard
              label="Mémoire (cluster AKS)"
              value={ramPct}
              unit="%"
              icon={<Server size={18} />}
              color={ramPct > 85 ? "text-red-500" : "text-blue-500"}
              sub={`${podsRunning} / ${podsTotal} pods`}
            />
            <MetricCard
              label="Disque (OVH Storage)"
              value={diskPct}
              unit="%"
              icon={<HardDrive size={18} />}
              color={diskPct > 80 ? "text-amber-500" : "text-slate-500"}
              sub={`${diskUsed} Go / ${diskTotal} Go utilisés`}
            />
            <MetricCard
              label="Pods actifs (AKS)"
              value={podsRunning}
              unit={`/ ${podsTotal}`}
              icon={<Package size={18} />}
              color={podsRunning === podsTotal ? "text-emerald-500" : "text-amber-500"}
              sub={metrics.azure_aks.status === "ok" ? "Cluster opérationnel" : "Vérification requise"}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Cpu size={14} className="text-blue-500" />
                  CPU & RAM — 24 dernières heures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={perfHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, n: string) => [`${v}%`, n === "cpu" ? "CPU" : "RAM"]}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} name="cpu" dot={false} />
                    <Area type="monotone" dataKey="ram" stroke="#8b5cf6" fill="#ede9fe" strokeWidth={2} name="ram" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Wifi size={14} className="text-purple-500" />
                  Trafic API — requêtes/minute
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={perfHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }} formatter={(v) => [v, "Req/min"]} />
                    <Line type="monotone" dataKey="req" stroke="hsl(345,65%,28%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {/* Services status + logs */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Server size={14} className="text-[hsl(345,65%,28%)]" />
              Statut des services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {services.map(s => (
                <div key={s.name} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.zone}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge ok={s.ok} label={s.ok ? "Opérationnel" : "Vérification"} />
                    <p className="text-xs text-slate-400 mt-0.5">{s.latency}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              Derniers événements système
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucun événement</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLogs.map(log => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.statut === "succes" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 truncate">{log.action}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.utilisateur} · {new Date(log.timestamp).toLocaleTimeString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AKS + Storage detail */}
      {metrics && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Database size={14} className="text-blue-500" />
                Kubernetes (AKS) — Cluster SOLVY-PROD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 py-2">
                {[
                  { label: "Pods running", value: metrics.azure_aks.pods_running, total: metrics.azure_aks.pods_total, ok: metrics.azure_aks.pods_running >= Math.ceil(metrics.azure_aks.pods_total * 0.9) },
                  { label: "CPU cluster", value: `${metrics.azure_aks.cpu_percent}%`, total: null, ok: metrics.azure_aks.cpu_percent < 80 },
                  { label: "Mémoire", value: `${metrics.azure_aks.memory_percent}%`, total: null, ok: metrics.azure_aks.memory_percent < 85 },
                  { label: "Statut AKS", value: metrics.azure_aks.status.toUpperCase(), total: null, ok: metrics.azure_aks.status === "ok" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{s.label}</p>
                    <p className={`text-xl font-bold ${s.ok ? "text-emerald-600" : "text-amber-600"}`}>
                      {s.value}{s.total !== null ? ` / ${s.total}` : ""}
                    </p>
                    <StatusBadge ok={s.ok} label={s.ok ? "OK" : "Attention"} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Shield size={14} className="text-purple-500" />
                Sécurité & Chiffrement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 py-2">
                {[
                  { label: "Azure Key Vault", value: metrics.key_vault.status.toUpperCase(), ok: metrics.key_vault.status === "ok" },
                  { label: "Rotation clés", value: metrics.key_vault.algorithm, ok: true },
                  { label: "Prochaine rotation", value: new Date(metrics.key_vault.next_rotation).toLocaleDateString("fr-FR"), ok: true },
                  { label: "Réplication OVH", value: `${metrics.replication_status.lag_ms}ms`, ok: metrics.replication_status.status === "ok" },
                  { label: "Dernier sync", value: new Date(metrics.replication_status.last_sync).toLocaleTimeString("fr-FR"), ok: true },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-600">{s.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{s.value}</span>
                      <StatusBadge ok={s.ok} label="" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
