import { useState } from "react";
import { useParams } from "wouter";
import { useGetDossier, useGetDossierScore, useCreateDecision, getListDossiersQueryKey, getGetDossierQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// Semi-circular gauge using recharts
function SolvencyGauge({ score }: { score: number }) {
  const pct = score / 1000;
  const filled = pct;
  const empty = 1 - pct;

  // Color zones
  let color = "#ef4444";
  if (score >= 750) color = "#10b981";
  else if (score >= 600) color = "#f59e0b";
  else if (score >= 400) color = "#f97316";

  const data = [
    { value: filled, color },
    { value: empty, color: "#f1f5f9" },
  ];

  // Needle angle: -90deg = score 0, +90deg = score 1000
  const needleAngle = -90 + pct * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const cx = 100, cy = 100, r = 72;
  const nx = cx + r * Math.cos(needleRad);
  const ny = cy + r * Math.sin(needleRad);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-52 h-28 overflow-hidden">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Needle overlay */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid meet">
          <line
            x1="100" y1="100"
            x2={100 + 60 * Math.cos(needleRad)}
            y2={100 + 60 * Math.sin(needleRad)}
            stroke="#1e293b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="5" fill="#1e293b" />
        </svg>
      </div>
      <div className="text-center -mt-2">
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-slate-500 mt-0.5">Score de solvabilité / 1000</p>
      </div>
      <div className="flex justify-between w-full text-xs text-slate-400 mt-1 px-4">
        <span>0</span><span>250</span><span>500</span><span>750</span><span>1000</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "ok") return <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium"><CheckCircle size={14} /> Conforme</span>;
  if (status === "alerte") return <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium"><XCircle size={14} /> Alerte</span>;
  return <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium"><AlertTriangle size={14} /> Erreur</span>;
}

export default function DossierDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);
  const [verdict, setVerdict] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dossier, isLoading: loadingDossier } = useGetDossier(id, {
    query: { enabled: !!id, queryKey: getGetDossierQueryKey(id) }
  });
  const { data: score, isLoading: loadingScore } = useGetDossierScore(id, {
    query: { enabled: !!id, queryKey: ["dossier-score", id] }
  });
  const createDecision = useCreateDecision();

  const handleDecision = () => {
    if (!verdict) { toast({ title: "Verdict requis", variant: "destructive" }); return; }
    if (!commentaire.trim()) { toast({ title: "Commentaire obligatoire", variant: "destructive" }); return; }
    createDecision.mutate({ data: { dossier_id: id, analyste: user?.displayName || "Analyste", verdict, commentaire } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDossiersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDossierQueryKey(id) });
        toast({ title: "Décision enregistrée", description: `Dossier #${id} — ${verdict.toUpperCase()}` });
        setVerdict(""); setCommentaire("");
      },
    });
  };

  if (loadingDossier) return <div className="p-12 text-center text-slate-400">Chargement du dossier...</div>;
  if (!dossier) return <div className="p-12 text-center text-red-500">Dossier introuvable</div>;

  const client = dossier.client;
  const taux = score?.taux_endettement ?? 0;
  const tauxPct = Math.round(taux * 100);
  const tauxAlert = tauxPct > 35;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <Link href="/analyste/pipeline">
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft size={16} /> Retour pipeline
        </button>
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dossier #{dossier.id} — {client ? `${client.prenom} ${client.nom}` : "Client"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{dossier.objet} — {formatEur(dossier.montant)} sur {dossier.duree_mois} mois</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Score gauge */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Score de solvabilité</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScore ? (
                <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Calcul en cours...</div>
              ) : score ? (
                <SolvencyGauge score={score.score} />
              ) : null}
            </CardContent>
          </Card>

          {/* Debt ratio */}
          {score && (
            <Card className={`border-0 shadow-sm ${tauxAlert ? "ring-2 ring-red-300" : ""}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  Taux d'endettement
                  {tauxAlert && <span className="text-xs font-medium text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Alerte &gt;35%</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 mb-3">
                  <span className={`text-3xl font-bold ${tauxAlert ? "text-red-600" : "text-slate-800"}`}>{tauxPct}%</span>
                  <span className="text-slate-400 text-sm mb-1">seuil: 35%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${tauxAlert ? "bg-red-500" : tauxPct > 25 ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(tauxPct / 50 * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">RAV: {formatEur(score.reste_a_vivre)}/mois</p>
              </CardContent>
            </Card>
          )}

          {/* API Controls */}
          {score && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Contrôles automatisés (APIs)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Banque de France (FICP/FCC)", status: score.controles_api.banque_de_france },
                  { label: "Bases PPE", status: score.controles_api.ppe_check },
                  { label: "Listes LCB-FT", status: score.controles_api.lcb_ft_check },
                ].map(({ label, status }) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-600">{label}</span>
                    <StatusDot status={status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle column */}
        <div className="space-y-4">
          {/* Client info */}
          {client && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Informations client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  ["Statut pro.", client.statut_pro],
                  ["Revenus nets", formatEur(client.revenus_nets) + "/mois"],
                  ["Autres revenus", client.autres_revenus ? formatEur(client.autres_revenus) + "/mois" : "—"],
                  ["Charges fixes", formatEur(client.charges_fixes) + "/mois"],
                  ["Patrimoine", client.patrimoine ? formatEur(client.patrimoine) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500">{k}</span>
                    <span className="text-xs font-semibold text-slate-700">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Scoring engine */}
          {score && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">Moteur de scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500">Probabilité de défaut (PD)</span>
                  <span className={`text-lg font-bold ${score.probabilite_defaut > 0.3 ? "text-red-600" : score.probabilite_defaut > 0.15 ? "text-amber-600" : "text-emerald-600"}`}>
                    {score.probabilite_defaut.toFixed(3)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Top 3 facteurs explicatifs (RGPD Art. 22)</p>
                <div className="space-y-3">
                  {score.top_facteurs.map((f) => (
                    <div key={f.rang}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">#{f.rang} {f.facteur}</span>
                        <span className={`text-xs font-medium ${f.direction === "negatif" ? "text-red-500" : "text-emerald-500"}`}>
                          {f.direction === "negatif" ? "−" : "+"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.direction === "negatif" ? "bg-red-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(f.impact / 3 * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Decision form */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Décision finale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Verdict</Label>
                <Select onValueChange={setVerdict} value={verdict}>
                  <SelectTrigger data-testid="select-verdict" className="mt-1.5">
                    <SelectValue placeholder="Sélectionner un verdict..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accord">Accord</SelectItem>
                    <SelectItem value="refus">Refus</SelectItem>
                    <SelectItem value="conditionnel">Conditionnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Commentaire <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  data-testid="textarea-commentaire"
                  className="mt-1.5 min-h-[120px] text-sm"
                  placeholder="Motiver la décision (obligatoire)..."
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                />
              </div>
              <Button
                data-testid="button-valider-decision"
                className="w-full bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white"
                onClick={handleDecision}
                disabled={createDecision.isPending || !verdict || !commentaire.trim()}
              >
                {createDecision.isPending ? "Enregistrement..." : "Valider la décision"}
              </Button>

              {score && (
                <div className={`p-3 rounded-xl text-center border text-sm font-medium ${
                  score.avis === "favorable" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                  score.avis === "defavorable" ? "bg-red-50 border-red-200 text-red-700" :
                  "bg-amber-50 border-amber-200 text-amber-700"
                }`}>
                  Avis système : {score.avis === "favorable" ? "Favorable" : score.avis === "defavorable" ? "Défavorable" : "Analyse humaine requise"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
