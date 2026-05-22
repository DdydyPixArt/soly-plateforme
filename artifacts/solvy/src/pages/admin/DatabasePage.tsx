import { useState } from "react";
import { useSyncDatabase } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw, CheckCircle, Users, FileText, BarChart2 } from "lucide-react";

const tables = [
  {
    name: "clients",
    icon: <Users size={16} className="text-blue-500" />,
    description: "Données personnelles et financières des clients",
    fields: [
      { name: "id", type: "SERIAL", pk: true, nullable: false, classification: "Technique" },
      { name: "nom", type: "TEXT", pk: false, nullable: false, classification: "PII" },
      { name: "prenom", type: "TEXT", pk: false, nullable: false, classification: "PII" },
      { name: "email", type: "TEXT", pk: false, nullable: false, classification: "PII" },
      { name: "telephone", type: "TEXT", pk: false, nullable: true, classification: "PII" },
      { name: "statut_pro", type: "TEXT", pk: false, nullable: false, classification: "Sensible" },
      { name: "revenus_nets", type: "NUMERIC(12,2)", pk: false, nullable: false, classification: "Sensible" },
      { name: "autres_revenus", type: "NUMERIC(12,2)", pk: false, nullable: true, classification: "Sensible" },
      { name: "charges_fixes", type: "NUMERIC(12,2)", pk: false, nullable: false, classification: "Sensible" },
      { name: "patrimoine", type: "NUMERIC(15,2)", pk: false, nullable: true, classification: "Sensible" },
      { name: "ficp", type: "BOOLEAN", pk: false, nullable: false, classification: "Sensible" },
      { name: "ppe", type: "BOOLEAN", pk: false, nullable: false, classification: "Sensible" },
      { name: "created_at", type: "TIMESTAMP", pk: false, nullable: false, classification: "Technique" },
    ],
  },
  {
    name: "dossiers",
    icon: <FileText size={16} className="text-purple-500" />,
    description: "Demandes de crédit et leurs caractéristiques",
    fields: [
      { name: "id", type: "SERIAL", pk: true, nullable: false, classification: "Technique" },
      { name: "client_id", type: "INTEGER FK→clients", pk: false, nullable: false, classification: "Technique" },
      { name: "montant", type: "NUMERIC(12,2)", pk: false, nullable: false, classification: "Sensible" },
      { name: "duree_mois", type: "INTEGER", pk: false, nullable: false, classification: "Métier" },
      { name: "objet", type: "TEXT", pk: false, nullable: false, classification: "Métier" },
      { name: "apport_personnel", type: "NUMERIC(12,2)", pk: false, nullable: true, classification: "Sensible" },
      { name: "statut", type: "TEXT", pk: false, nullable: false, classification: "Métier" },
      { name: "avis_indicatif", type: "TEXT", pk: false, nullable: true, classification: "Métier" },
      { name: "documents", type: "JSONB", pk: false, nullable: true, classification: "Technique" },
      { name: "created_at", type: "TIMESTAMP", pk: false, nullable: false, classification: "Technique" },
    ],
  },
  {
    name: "scoring_historique",
    icon: <BarChart2 size={16} className="text-emerald-500" />,
    description: "Historique des scores de solvabilité (calculé dynamiquement)",
    fields: [
      { name: "id", type: "SERIAL", pk: true, nullable: false, classification: "Technique" },
      { name: "dossier_id", type: "INTEGER FK→dossiers", pk: false, nullable: false, classification: "Technique" },
      { name: "score", type: "INTEGER", pk: false, nullable: false, classification: "Sensible" },
      { name: "probabilite_defaut", type: "NUMERIC(5,4)", pk: false, nullable: false, classification: "Sensible" },
      { name: "taux_endettement", type: "NUMERIC(5,4)", pk: false, nullable: false, classification: "Sensible" },
      { name: "computed_at", type: "TIMESTAMP", pk: false, nullable: false, classification: "Technique" },
    ],
  },
];

const classifColor: Record<string, string> = {
  PII: "bg-red-50 text-red-700 border-red-200",
  Sensible: "bg-orange-50 text-orange-700 border-orange-200",
  Métier: "bg-blue-50 text-blue-700 border-blue-200",
  Technique: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function DatabasePage() {
  const [activeTable, setActiveTable] = useState("clients");
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const syncDb = useSyncDatabase();
  const { toast } = useToast();

  const handleSync = () => {
    syncDb.mutate(undefined, {
      onSuccess: (data) => {
        setSyncResult(data.message);
        toast({ title: "Synchronisation terminée", description: data.message });
      },
    });
  };

  const current = tables.find(t => t.name === activeTable)!;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion de la base de données</h1>
          <p className="text-slate-500 text-sm mt-1">Schémas PostgreSQL — Architecture SOLVY Data Lake</p>
        </div>
        <div className="flex gap-3">
          <Button
            data-testid="button-sync-db"
            variant="outline"
            className="gap-2 text-sm"
            onClick={handleSync}
            disabled={syncDb.isPending}
          >
            <RefreshCw size={14} className={syncDb.isPending ? "animate-spin" : ""} />
            Synchronisation
          </Button>
        </div>
      </div>

      {syncResult && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          <CheckCircle size={16} />
          {syncResult}
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Table selector */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-medium">Tables</p>
          {tables.map((t) => (
            <button
              key={t.name}
              data-testid={`tab-table-${t.name}`}
              onClick={() => setActiveTable(t.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                activeTable === t.name
                  ? "bg-[hsl(345,65%,28%)] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.icon}
              {t.name}
            </button>
          ))}
        </div>

        {/* Schema viewer */}
        <div className="col-span-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {current.icon}
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">{current.name}</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">{current.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Colonne</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Nullable</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {current.fields.map((f) => (
                    <tr key={f.name} data-testid={`field-${f.name}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-sm text-slate-700 font-medium">{f.name}</span>
                        {f.pk && <span className="ml-2 text-xs text-amber-600 font-medium">PK</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-slate-500">{f.type}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs ${f.nullable ? "text-slate-400" : "text-slate-700 font-medium"}`}>
                          {f.nullable ? "NULL" : "NOT NULL"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${classifColor[f.classification]}`}>
                          {f.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
