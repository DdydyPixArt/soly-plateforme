import { useState, useEffect } from "react";
import { useGetScoringSettings, useUpdateScoringSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings, AlertTriangle, CheckCircle, Info, RotateCcw } from "lucide-react";

const DEFAULTS = {
  taux_endettement_max: 0.35,
  score_accord_auto: 750,
  score_refus_auto: 300,
  reste_a_vivre_min: 500,
  duree_max_mois: 360,
};

export default function ScoringSettingsPage() {
  const { data: settings, isLoading } = useGetScoringSettings();
  const updateSettings = useUpdateScoringSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({ ...DEFAULTS });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) { setForm({ ...settings }); setDirty(false); }
  }, [settings]);

  const handleChange = (key: keyof typeof form, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate({ data: form }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setDirty(false);
        toast({ title: "Paramètres enregistrés", description: "Le moteur de scoring utilisera ces nouveaux seuils." });
      },
    });
  };

  const handleReset = () => {
    setForm({ ...DEFAULTS });
    setDirty(true);
  };

  const tauxPct = Math.round(form.taux_endettement_max * 100);
  const tauxWarning = tauxPct > 40;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Paramètres du moteur de scoring</h1>
          <p className="text-slate-500 text-sm mt-1">Seuils et règles métier du moteur de crédit SOLVY</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} className="gap-2 text-sm">
            <RotateCcw size={14} /> Réinitialiser
          </Button>
          <Button
            data-testid="button-save-settings"
            onClick={handleSave}
            disabled={!dirty || updateSettings.isPending}
            className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-2 text-sm"
          >
            {dirty ? <AlertTriangle size={14} className="text-amber-300" /> : <CheckCircle size={14} />}
            {updateSettings.isPending ? "Enregistrement..." : dirty ? "Sauvegarder les modifications" : "À jour"}
          </Button>
        </div>
      </div>

      {isLoading ? <div className="p-12 text-center text-slate-400">Chargement...</div> : (
        <div className="space-y-5">
          {/* Taux d'endettement max */}
          <Card className={`border-0 shadow-sm ${tauxWarning ? "ring-2 ring-amber-300" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings size={14} className="text-[hsl(345,65%,28%)]" />
                  Taux d'endettement maximum
                </div>
                {tauxWarning && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <AlertTriangle size={12} /> Au-dessus des recommandations HCSF
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Slider
                    data-testid="slider-taux-endettement"
                    min={25} max={50} step={1}
                    value={[tauxPct]}
                    onValueChange={([v]) => handleChange("taux_endettement_max", v / 100)}
                    className="my-2"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>25%</span><span className="text-slate-600">Recommandé: 35% (HCSF)</span><span>50%</span>
                  </div>
                </div>
                <div className="w-20 text-center">
                  <p className={`text-3xl font-bold ${tauxWarning ? "text-amber-600" : "text-slate-800"}`}>{tauxPct}%</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 text-xs text-slate-600">
                <Info size={13} className="mt-0.5 flex-shrink-0 text-slate-400" />
                Taux d'endettement maximum autorisé par rapport aux revenus nets mensuels. Le HCSF recommande 35% depuis 2022.
              </div>
            </CardContent>
          </Card>

          {/* Score accord auto */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                Score minimal pour accord automatique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Slider
                    data-testid="slider-score-accord"
                    min={500} max={950} step={10}
                    value={[form.score_accord_auto]}
                    onValueChange={([v]) => handleChange("score_accord_auto", v)}
                    className="my-2"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>500</span><span>750</span><span>950</span>
                  </div>
                </div>
                <div className="w-20 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{form.score_accord_auto}</p>
                  <p className="text-xs text-slate-400">/ 1000</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 text-xs text-slate-600">
                <Info size={13} className="mt-0.5 flex-shrink-0 text-slate-400" />
                Dossiers dont le score ≥ ce seuil ET taux d'endettement ≤ max reçoivent un avis "favorable" automatique.
              </div>
            </CardContent>
          </Card>

          {/* Score refus auto */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                Score maximal pour refus automatique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Slider
                    data-testid="slider-score-refus"
                    min={100} max={500} step={10}
                    value={[form.score_refus_auto]}
                    onValueChange={([v]) => handleChange("score_refus_auto", v)}
                    className="my-2"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>100</span><span>300</span><span>500</span>
                  </div>
                </div>
                <div className="w-20 text-center">
                  <p className="text-3xl font-bold text-red-600">{form.score_refus_auto}</p>
                  <p className="text-xs text-slate-400">/ 1000</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reste à vivre min & durée max */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Reste à vivre minimum (€/mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    data-testid="input-rav-min"
                    type="number"
                    min={200} max={2000}
                    value={form.reste_a_vivre_min}
                    onChange={e => handleChange("reste_a_vivre_min", parseFloat(e.target.value) || DEFAULTS.reste_a_vivre_min)}
                    className="text-lg font-bold"
                  />
                  <span className="text-slate-400 text-sm font-medium">€</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">En dessous de ce seuil, le dossier est automatiquement marqué défavorable.</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Durée maximale du crédit (mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    data-testid="input-duree-max"
                    type="number"
                    min={12} max={480}
                    value={form.duree_max_mois}
                    onChange={e => handleChange("duree_max_mois", parseInt(e.target.value) || DEFAULTS.duree_max_mois)}
                    className="text-lg font-bold"
                  />
                  <span className="text-slate-400 text-sm font-medium">mois</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">{Math.round(form.duree_max_mois / 12)} ans maximum. Standard marché : 25-30 ans.</p>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl bg-slate-800 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Résumé des règles actives</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-400">Taux endettement max :</span> <span className="font-bold text-white">{tauxPct}%</span></div>
              <div><span className="text-slate-400">Score accord auto ≥ :</span> <span className="font-bold text-emerald-400">{form.score_accord_auto}/1000</span></div>
              <div><span className="text-slate-400">Score refus auto ≤ :</span> <span className="font-bold text-red-400">{form.score_refus_auto}/1000</span></div>
              <div><span className="text-slate-400">RAV minimum :</span> <span className="font-bold text-white">{form.reste_a_vivre_min} €/mois</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
