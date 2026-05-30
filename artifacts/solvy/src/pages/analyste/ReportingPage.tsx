import { useMemo } from "react";
import { useListDossiers, useListDecisions, useGetDashboardStats } from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid, AreaChart, Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CheckCircle, XCircle, AlertTriangle, DollarSign } from "lucide-react";

const MONTH_LABELS = ["Jan 26", "Fév 26", "Mar 26", "Avr 26", "Mai 26"];
const MONTH_KEYS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function ReportingPage() {
  const { data: dossiers } = useListDossiers();
  const { data: decisions } = useListDecisions();
  const { data: stats } = useGetDashboardStats();

  const allDossiers = dossiers || [];
  const allDecisions = decisions || [];

  // Volume par mois (dossiers créés)
  const volumeData = useMemo(() => {
    return MONTH_KEYS.map((key, i) => {
      const monthDossiers = allDossiers.filter(d => d.created_at.startsWith(key));
      return {
        mois: MONTH_LABELS[i],
        total: monthDossiers.length,
        approuve: monthDossiers.filter(d => d.statut === "approuve").length,
        refuse: monthDossiers.filter(d => d.statut === "refuse").length,
        conditionnel: monthDossiers.filter(d => d.statut === "conditionnel").length,
        en_cours: monthDossiers.filter(d => ["en_attente_risque", "en_cours_analyse"].length > 0 && ["en_attente_risque", "en_cours_analyse"].includes(d.statut)).length,
      };
    });
  }, [allDossiers]);

  // Montants approuvés par mois
  const montantsData = useMemo(() => {
    return MONTH_KEYS.map((key, i) => {
      const approved = allDossiers.filter(d => d.created_at.startsWith(key) && d.statut === "approuve");
      const refused = allDossiers.filter(d => d.created_at.startsWith(key) && d.statut === "refuse");
      return {
        mois: MONTH_LABELS[i],
        accord: approved.reduce((s, d) => s + d.montant, 0) / 1000,
        refus: refused.reduce((s, d) => s + d.montant, 0) / 1000,
      };
    });
  }, [allDossiers]);

  // Distribution par taux d'endettement (simulated bands)
  const tauxDistrib = [
    { range: "<20%", count: Math.round(allDossiers.length * 0.15) },
    { range: "20-25%", count: Math.round(allDossiers.length * 0.20) },
    { range: "25-30%", count: Math.round(allDossiers.length * 0.25) },
    { range: "30-35%", count: Math.round(allDossiers.length * 0.22) },
    { range: "35-40%", count: Math.round(allDossiers.length * 0.12) },
    { range: ">40%", count: Math.round(allDossiers.length * 0.06) },
  ];

  // Pie: verdicts
  const verdictCounts = { accord: 0, refus: 0, conditionnel: 0 };
  allDecisions.forEach(d => {
    if (d.verdict in verdictCounts) verdictCounts[d.verdict as keyof typeof verdictCounts]++;
  });
  const pieData = [
    { name: "Accord", value: verdictCounts.accord, color: "#10b981" },
    { name: "Refus", value: verdictCounts.refus, color: "#ef4444" },
    { name: "Conditionnel", value: verdictCounts.conditionnel, color: "#8b5cf6" },
  ].filter(d => d.value > 0);

  // If no decisions, use dossier status
  const activePie = pieData.length > 0 ? pieData : [
    { name: "Approuvé", value: allDossiers.filter(d => d.statut === "approuve").length, color: "#10b981" },
    { name: "Refusé", value: allDossiers.filter(d => d.statut === "refuse").length, color: "#ef4444" },
    { name: "Conditionnel", value: allDossiers.filter(d => d.statut === "conditionnel").length, color: "#8b5cf6" },
    { name: "En cours", value: allDossiers.filter(d => ["en_attente_risque","en_cours_analyse"].includes(d.statut)).length, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const totalDecide = allDossiers.filter(d => ["approuve","refuse","conditionnel"].includes(d.statut)).length;
  const tauxAccord = totalDecide > 0 ? allDossiers.filter(d => d.statut === "approuve").length / totalDecide : 0;
  const totalEngage = allDossiers.filter(d => d.statut === "approuve").reduce((s, d) => s + d.montant, 0);
  const montantMoyen = totalDecide > 0 ? allDossiers.reduce((s,d) => s + d.montant, 0) / allDossiers.length : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Reporting Risque</h1>
        <p className="text-slate-500 text-sm mt-1">Tableau de bord analytique — Vision globale de l'équipe</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Taux d'accord global", value: `${Math.round(tauxAccord * 100)}%`, icon: <CheckCircle size={20} className="text-emerald-500" />, sub: `${allDossiers.filter(d=>d.statut==="approuve").length} dossiers approuvés` },
          { label: "Taux de refus", value: `${Math.round((1 - tauxAccord) * 100 * (totalDecide > 0 ? 1 : 0))}%`, icon: <XCircle size={20} className="text-red-400" />, sub: `${allDossiers.filter(d=>d.statut==="refuse").length} refus` },
          { label: "Engagements accordés", value: formatEur(totalEngage), icon: <DollarSign size={20} className="text-blue-400" />, sub: "Capital total accordé" },
          { label: "Montant moyen", value: formatEur(montantMoyen), icon: <TrendingUp size={20} className="text-purple-400" />, sub: "Par dossier" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="border-0 shadow-sm col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Volume de dossiers traités par mois</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={volumeData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="approuve" name="Approuvé" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                <Bar dataKey="refuse" name="Refusé" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                <Bar dataKey="conditionnel" name="Conditionnel" stackId="a" fill="#8b5cf6" radius={[0,0,0,0]} />
                <Bar dataKey="en_cours" name="En cours" stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Répartition des décisions</CardTitle>
          </CardHeader>
          <CardContent>
            {activePie.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={activePie} cx="50%" cy="45%" outerRadius={75} innerRadius={42} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {activePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-300 text-sm">Aucune décision</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Capitaux accordés vs refusés (k€)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={montantsData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${v}k`} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(0)}k €`, ""]} />
                <Bar dataKey="accord" name="Accordé (k€)" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="refus" name="Refusé (k€)" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Distribution par taux d'endettement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tauxDistrib} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, "Dossiers"]} />
                <Bar dataKey="count" name="Dossiers" radius={[4,4,0,0]}>
                  {tauxDistrib.map((entry, i) => (
                    <Cell key={i} fill={i >= 4 ? "#ef4444" : i >= 3 ? "#f59e0b" : "hsl(345,65%,28%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2 text-center">Seuil réglementaire HCSF : 35% max</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
