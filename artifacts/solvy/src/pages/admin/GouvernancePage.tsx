import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const dictionnaire = [
  { entite: "Client", champ: "revenus_nets", type: "NUMERIC", description: "Revenus salariaux nets mensuels après prélèvement à la source", classification: "Sensible", proprietaire: "DSI / Conformité", retention: "5 ans après clôture" },
  { entite: "Client", champ: "ficp", type: "BOOLEAN", description: "Inscription au Fichier d'incidents de remboursement des crédits aux particuliers (BdF)", classification: "Sensible", proprietaire: "Risque / Conformité", retention: "5 ans après clôture" },
  { entite: "Client", champ: "ppe", type: "BOOLEAN", description: "Statut Personne Politiquement Exposée — LCB-FT", classification: "Sensible", proprietaire: "Conformité", retention: "10 ans" },
  { entite: "Client", champ: "email", type: "TEXT", description: "Adresse électronique — données personnelles RGPD", classification: "PII", proprietaire: "DSI", retention: "Durée contrat + 5 ans" },
  { entite: "Dossier", champ: "montant", type: "NUMERIC", description: "Capital demandé en euros", classification: "Sensible", proprietaire: "Conseiller", retention: "5 ans après clôture" },
  { entite: "Dossier", champ: "statut", type: "TEXT", description: "État du dossier dans le workflow de traitement", classification: "Métier", proprietaire: "Risque", retention: "Durée dossier" },
  { entite: "Dossier", champ: "avis_indicatif", type: "TEXT", description: "Avis préliminaire calculé — non opposable, usage interne uniquement", classification: "Métier", proprietaire: "Risque / IA", retention: "Durée dossier" },
  { entite: "Scoring", champ: "probabilite_defaut", type: "NUMERIC", description: "Probabilité de défaut issue du modèle logistique — RGPD Art. 22 explicabilité", classification: "Sensible", proprietaire: "IA / Risque", retention: "5 ans après décision" },
  { entite: "Scoring", champ: "top_facteurs", type: "JSONB", description: "Facteurs explicatifs du score — obligatoire RGPD Art. 22", classification: "Sensible", proprietaire: "IA / DPO", retention: "5 ans après décision" },
  { entite: "Audit", champ: "action", type: "TEXT", description: "Description de l'action réalisée — journal immuable", classification: "Technique", proprietaire: "Conformité / DSI", retention: "10 ans" },
  { entite: "Audit", champ: "ip_address", type: "TEXT", description: "Adresse IP de la session — traçabilité de sécurité", classification: "PII", proprietaire: "DSI / RSSI", retention: "1 an" },
];

const classifColor: Record<string, string> = {
  PII: "bg-red-50 text-red-700 border-red-200",
  Sensible: "bg-orange-50 text-orange-700 border-orange-200",
  Métier: "bg-blue-50 text-blue-700 border-blue-200",
  Technique: "bg-slate-100 text-slate-500 border-slate-200",
};

const entites = [...new Set(dictionnaire.map(d => d.entite))];

export default function GouvernancePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Gouvernance et référentiels</h1>
        <p className="text-slate-500 text-sm mt-1">Dictionnaire de données actif — SOLVY v2.4</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Entités", value: entites.length, color: "text-slate-800" },
          { label: "Champs PII", value: dictionnaire.filter(d => d.classification === "PII").length, color: "text-red-600" },
          { label: "Champs sensibles", value: dictionnaire.filter(d => d.classification === "Sensible").length, color: "text-orange-600" },
          { label: "Total champs", value: dictionnaire.length, color: "text-slate-800" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dictionary */}
      {entites.map((entite) => (
        <Card key={entite} className="border-0 shadow-sm mb-6">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BookOpen size={14} className="text-[hsl(345,65%,28%)]" />
              Entité : {entite}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Champ</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Type</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Description</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Classification</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Rétention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dictionnaire.filter(d => d.entite === entite).map((d) => (
                  <tr key={d.champ} data-testid={`dict-${d.champ}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-sm text-slate-700 font-medium">{d.champ}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-slate-500">{d.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 max-w-xs">{d.description}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${classifColor[d.classification]}`}>
                        {d.classification}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{d.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
