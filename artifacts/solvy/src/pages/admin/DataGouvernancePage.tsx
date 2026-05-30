import { useState } from "react";
import { useSyncDatabase } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Database, BookOpen, Shield, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle, Users, FileText, BarChart2, AlertTriangle, Key
} from "lucide-react";

// ── Classification levels ──────────────────────────────────────────────────
const classifLevels = [
  {
    level: "Critique",
    color: "bg-red-50 text-red-700 border-red-300",
    dot: "bg-red-500",
    desc: "Données dont la divulgation peut causer un préjudice irréparable (PPE, FICP, données biométriques)",
    examples: ["ficp", "ppe", "lcb_ft", "mot_de_passe"],
    controls: ["Chiffrement AES-256", "Accès Need-to-Know", "Audit complet", "MFA obligatoire"],
  },
  {
    level: "Modéré",
    color: "bg-orange-50 text-orange-700 border-orange-300",
    dot: "bg-orange-500",
    desc: "Données financières et personnelles — Sensibles au sens RGPD",
    examples: ["revenus_nets", "montant", "patrimoine", "email"],
    controls: ["Chiffrement en transit (TLS 1.3)", "Pseudonymisation", "Accès RBAC", "Log accès"],
  },
  {
    level: "Faible",
    color: "bg-blue-50 text-blue-700 border-blue-300",
    dot: "bg-blue-500",
    desc: "Données métier et techniques — Usage interne uniquement",
    examples: ["statut", "avis_indicatif", "created_at", "duree_mois"],
    controls: ["Accès authentifié", "Log minimal"],
  },
];

// ── Database schema ────────────────────────────────────────────────────────
const tables = [
  {
    name: "clients",
    icon: <Users size={16} className="text-blue-500" />,
    description: "Données personnelles et financières des clients (PII + Sensible)",
    count: "~50 lignes",
    fields: [
      { name: "id", type: "SERIAL", pk: true, nullable: false, classif: "Faible" },
      { name: "nom", type: "TEXT", pk: false, nullable: false, classif: "Modéré" },
      { name: "prenom", type: "TEXT", pk: false, nullable: false, classif: "Modéré" },
      { name: "email", type: "TEXT", pk: false, nullable: false, classif: "Modéré" },
      { name: "telephone", type: "TEXT", pk: false, nullable: true, classif: "Modéré" },
      { name: "statut_pro", type: "TEXT", pk: false, nullable: false, classif: "Modéré" },
      { name: "revenus_nets", type: "NUMERIC(12,2)", pk: false, nullable: false, classif: "Modéré" },
      { name: "autres_revenus", type: "NUMERIC(12,2)", pk: false, nullable: true, classif: "Modéré" },
      { name: "charges_fixes", type: "NUMERIC(12,2)", pk: false, nullable: false, classif: "Modéré" },
      { name: "patrimoine", type: "NUMERIC(15,2)", pk: false, nullable: true, classif: "Modéré" },
      { name: "ficp", type: "BOOLEAN", pk: false, nullable: false, classif: "Critique" },
      { name: "ppe", type: "BOOLEAN", pk: false, nullable: false, classif: "Critique" },
      { name: "lcb_ft", type: "BOOLEAN", pk: false, nullable: false, classif: "Critique" },
      { name: "created_at", type: "TIMESTAMP", pk: false, nullable: false, classif: "Faible" },
    ],
  },
  {
    name: "dossiers",
    icon: <FileText size={16} className="text-purple-500" />,
    description: "Demandes de crédit, statuts et workflow de traitement",
    count: "~13 lignes",
    fields: [
      { name: "id", type: "SERIAL", pk: true, nullable: false, classif: "Faible" },
      { name: "client_id", type: "INTEGER FK→clients", pk: false, nullable: false, classif: "Faible" },
      { name: "montant", type: "NUMERIC(12,2)", pk: false, nullable: false, classif: "Modéré" },
      { name: "duree_mois", type: "INTEGER", pk: false, nullable: false, classif: "Faible" },
      { name: "objet", type: "TEXT", pk: false, nullable: false, classif: "Faible" },
      { name: "apport_personnel", type: "NUMERIC(12,2)", pk: false, nullable: true, classif: "Modéré" },
      { name: "statut", type: "TEXT", pk: false, nullable: false, classif: "Faible" },
      { name: "avis_indicatif", type: "TEXT", pk: false, nullable: true, classif: "Faible" },
      { name: "documents", type: "JSONB", pk: false, nullable: true, classif: "Modéré" },
      { name: "created_by", type: "TEXT", pk: false, nullable: true, classif: "Faible" },
      { name: "assigned_to", type: "TEXT", pk: false, nullable: true, classif: "Faible" },
      { name: "created_at", type: "TIMESTAMP", pk: false, nullable: false, classif: "Faible" },
      { name: "updated_at", type: "TIMESTAMP", pk: false, nullable: true, classif: "Faible" },
    ],
  },
  {
    name: "decisions",
    icon: <CheckCircle size={16} className="text-emerald-500" />,
    description: "Décisions finales de l'équipe Risque (accord/refus/conditionnel)",
    count: "~3 lignes",
    fields: [
      { name: "id", type: "SERIAL", pk: true, nullable: false, classif: "Faible" },
      { name: "dossier_id", type: "INTEGER FK→dossiers", pk: false, nullable: false, classif: "Faible" },
      { name: "analyste", type: "TEXT", pk: false, nullable: false, classif: "Modéré" },
      { name: "verdict", type: "TEXT", pk: false, nullable: false, classif: "Faible" },
      { name: "commentaire", type: "TEXT", pk: false, nullable: true, classif: "Modéré" },
      { name: "created_at", type: "TIMESTAMP", pk: false, nullable: false, classif: "Faible" },
    ],
  },
  {
    name: "audit_logs",
    icon: <Shield size={16} className="text-amber-500" />,
    description: "Journal immuable de toutes les actions système — non modifiable",
    count: "~20 lignes",
    fields: [
      { name: "id", type: "SERIAL", pk: true, nullable: false, classif: "Faible" },
      { name: "utilisateur", type: "TEXT", pk: false, nullable: false, classif: "Modéré" },
      { name: "role", type: "TEXT", pk: false, nullable: false, classif: "Faible" },
      { name: "action", type: "TEXT", pk: false, nullable: false, classif: "Faible" },
      { name: "statut", type: "TEXT", pk: false, nullable: false, classif: "Faible" },
      { name: "details", type: "TEXT", pk: false, nullable: true, classif: "Faible" },
      { name: "timestamp", type: "TIMESTAMP", pk: false, nullable: false, classif: "Faible" },
    ],
  },
];

// ── Data quality rules ─────────────────────────────────────────────────────
const qualityRules = [
  { entite: "Client", champ: "email", regle: "Format RFC 5321", controle: "REGEXP", criticite: "Bloquant", statut: "OK" },
  { entite: "Client", champ: "revenus_nets", regle: "Valeur > 0 et < 100 000", controle: "RANGE CHECK", criticite: "Bloquant", statut: "OK" },
  { entite: "Client", champ: "ficp", regle: "Source BdF vérifiée sous 48h", controle: "API CHECK", criticite: "Critique", statut: "OK" },
  { entite: "Dossier", champ: "montant", regle: "Valeur > 0 et < 5 000 000", controle: "RANGE CHECK", criticite: "Bloquant", statut: "OK" },
  { entite: "Dossier", champ: "documents", regle: "Min 3 pièces fournies pour soumission", controle: "COMPLETENESS", criticite: "Avertissement", statut: "OK" },
  { entite: "Scoring", champ: "score", regle: "Score entre 0 et 1000", controle: "RANGE CHECK", criticite: "Bloquant", statut: "OK" },
  { entite: "Audit", champ: "timestamp", regle: "Timestamp UTC non modifiable", controle: "IMMUTABILITY", criticite: "Critique", statut: "OK" },
];

const classifColor: Record<string, string> = {
  Critique: "bg-red-50 text-red-700 border-red-200",
  Modéré: "bg-orange-50 text-orange-700 border-orange-200",
  Faible: "bg-blue-50 text-blue-700 border-blue-200",
};

type Tab = "schema" | "classification" | "qualite" | "dictionnaire";

const dictionnaire = [
  { entite: "Client", champ: "revenus_nets", type: "NUMERIC", description: "Revenus salariaux nets mensuels après prélèvement à la source", classification: "Modéré", proprietaire: "DSI / Conformité", retention: "5 ans après clôture" },
  { entite: "Client", champ: "ficp", type: "BOOLEAN", description: "Inscription au Fichier d'incidents de remboursement des crédits aux particuliers (BdF)", classification: "Critique", proprietaire: "Risque / Conformité", retention: "5 ans après clôture" },
  { entite: "Client", champ: "ppe", type: "BOOLEAN", description: "Statut Personne Politiquement Exposée — LCB-FT", classification: "Critique", proprietaire: "Conformité", retention: "10 ans" },
  { entite: "Client", champ: "email", type: "TEXT", description: "Adresse électronique — données personnelles RGPD", classification: "Modéré", proprietaire: "DSI", retention: "Durée contrat + 5 ans" },
  { entite: "Dossier", champ: "montant", type: "NUMERIC", description: "Capital demandé en euros", classification: "Modéré", proprietaire: "Conseiller", retention: "5 ans après clôture" },
  { entite: "Dossier", champ: "statut", type: "TEXT", description: "État du dossier dans le workflow de traitement", classification: "Faible", proprietaire: "Risque", retention: "Durée dossier" },
  { entite: "Dossier", champ: "avis_indicatif", type: "TEXT", description: "Avis préliminaire calculé — non opposable, usage interne uniquement", classification: "Faible", proprietaire: "Risque / IA", retention: "Durée dossier" },
  { entite: "Scoring", champ: "probabilite_defaut", type: "NUMERIC", description: "Probabilité de défaut issue du modèle logistique — RGPD Art. 22 explicabilité", classification: "Modéré", proprietaire: "IA / Risque", retention: "5 ans après décision" },
  { entite: "Scoring", champ: "top_facteurs", type: "JSONB", description: "Facteurs explicatifs du score — obligatoire RGPD Art. 22", classification: "Modéré", proprietaire: "IA / DPO", retention: "5 ans après décision" },
  { entite: "Audit", champ: "action", type: "TEXT", description: "Description de l'action réalisée — journal immuable", classification: "Faible", proprietaire: "Conformité / DSI", retention: "10 ans" },
  { entite: "Audit", champ: "timestamp", type: "TIMESTAMP", description: "Horodatage UTC de l'action — non modifiable", classification: "Faible", proprietaire: "DSI / RSSI", retention: "10 ans" },
];

export default function DataGouvernancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("schema");
  const [expandedTable, setExpandedTable] = useState<string | null>("clients");
  const syncDb = useSyncDatabase();
  const { toast } = useToast();

  const handleSync = () => {
    syncDb.mutate(undefined, {
      onSuccess: () => toast({ title: "Synchronisation effectuée", description: "Schéma PostgreSQL synchronisé." }),
    });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "schema", label: "Schéma PostgreSQL" },
    { key: "classification", label: "Classification des données" },
    { key: "qualite", label: "Qualité des données" },
    { key: "dictionnaire", label: "Dictionnaire de données" },
  ];

  const critiques = dictionnaire.filter(d => d.classification === "Critique").length;
  const moderes = dictionnaire.filter(d => d.classification === "Modéré").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administration Data & Gouvernance</h1>
          <p className="text-slate-500 text-sm mt-1">Schéma PostgreSQL · Classification · Qualité · Dictionnaire de données</p>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={handleSync} disabled={syncDb.isPending}>
          <RefreshCw size={14} className={syncDb.isPending ? "animate-spin" : ""} />
          Synchroniser schéma
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Tables PostgreSQL", value: tables.length, color: "text-blue-600" },
          { label: "Champs Critiques", value: critiques, color: "text-red-600" },
          { label: "Champs Modérés", value: moderes, color: "text-orange-600" },
          { label: "Règles qualité actives", value: qualityRules.length, color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SCHEMA TAB */}
      {activeTab === "schema" && (
        <div className="space-y-3">
          {tables.map(table => {
            const isExpanded = expandedTable === table.name;
            return (
              <Card key={table.name} className="border-0 shadow-sm overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedTable(isExpanded ? null : table.name)}
                >
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {table.icon}
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-700 font-mono">{table.name}</CardTitle>
                          <p className="text-xs text-slate-400 font-normal mt-0.5">{table.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">{table.fields.length} colonnes · {table.count}</span>
                        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </div>
                    </div>
                  </CardHeader>
                </button>
                {isExpanded && (
                  <CardContent className="p-0 border-t border-slate-100">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/70">
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Colonne</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Type</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Nullable</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Classification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {table.fields.map(f => (
                          <tr key={f.name} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-mono text-sm text-slate-700 font-medium">
                              {f.name}
                              {f.pk && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-sans">PK</span>}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{f.type}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-500">{f.nullable ? "NULL" : "NOT NULL"}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${classifColor[f.classif]}`}>{f.classif}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CLASSIFICATION TAB */}
      {activeTab === "classification" && (
        <div className="space-y-4">
          {classifLevels.map(cl => (
            <Card key={cl.level} className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${cl.dot}`} />
                  <CardTitle className="text-sm font-bold text-slate-700">Niveau {cl.level}</CardTitle>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${cl.color}`}>{cl.level}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-slate-600 mb-4">{cl.desc}</p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Exemples de champs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cl.examples.map(e => (
                        <span key={e} className="font-mono text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mesures de protection</p>
                    <ul className="space-y-1">
                      {cl.controls.map(c => (
                        <li key={c} className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QUALITE TAB */}
      {activeTab === "qualite" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500" />
              Règles de qualité des données — {qualityRules.filter(r => r.statut === "OK").length}/{qualityRules.length} conformes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Entité</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Champ</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Règle métier</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Contrôle</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Criticité</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qualityRules.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">{r.entite}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{r.champ}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 max-w-xs">{r.regle}</td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{r.controle}</span></td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        r.criticite === "Critique" ? "bg-red-50 text-red-700 border-red-200" :
                        r.criticite === "Bloquant" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>{r.criticite}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.statut === "OK"
                        ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle size={12} />OK</span>
                        : <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><AlertTriangle size={12} />KO</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* DICTIONNAIRE TAB */}
      {activeTab === "dictionnaire" && (
        <div className="space-y-6">
          {[...new Set(dictionnaire.map(d => d.entite))].map(entite => (
            <Card key={entite} className="border-0 shadow-sm">
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
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2.5">Propriétaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dictionnaire.filter(d => d.entite === entite).map(d => (
                      <tr key={d.champ} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-mono text-sm text-slate-700 font-medium">{d.champ}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{d.type}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-xs">{d.description}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${classifColor[d.classification]}`}>{d.classification}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{d.retention}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{d.proprietaire}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
