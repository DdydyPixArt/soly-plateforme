import { useParams, Link } from "wouter";
import { useGetDossier, type Dossier } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, User, Briefcase, CreditCard, FileText,
  CheckCircle, XCircle, Clock, AlertTriangle, Building2
} from "lucide-react";

const statutConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  brouillon: { label: "Brouillon", color: "bg-slate-100 text-slate-600", icon: <FileText size={14} /> },
  en_attente_risque: { label: "En attente Risque", color: "bg-amber-50 text-amber-700", icon: <Clock size={14} /> },
  en_cours_analyse: { label: "En cours d'analyse", color: "bg-blue-50 text-blue-700", icon: <AlertTriangle size={14} /> },
  approuve: { label: "Approuvé", color: "bg-emerald-50 text-emerald-700", icon: <CheckCircle size={14} /> },
  refuse: { label: "Refusé", color: "bg-red-50 text-red-700", icon: <XCircle size={14} /> },
  conditionnel: { label: "Conditionnel", color: "bg-purple-50 text-purple-700", icon: <AlertTriangle size={14} /> },
};

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-700">{value ?? "—"}</dd>
    </div>
  );
}

function PrintableContent({ dossier }: { dossier: Dossier }) {
  const client = dossier.client;
  const sc = statutConfig[dossier.statut] || statutConfig.brouillon;
  const mensualite = dossier.montant / dossier.duree_mois;
  const tauxAnn = 0.0365; // indicatif
  const mensualiteCredit = (dossier.montant * (tauxAnn / 12)) / (1 - Math.pow(1 + tauxAnn / 12, -dossier.duree_mois));

  return (
    <>
      {/* Print header */}
      <div className="hidden print:block mb-8 pb-6 border-b-2 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={28} />
            <div>
              <h1 className="text-xl font-bold tracking-wider">SOLVY</h1>
              <p className="text-xs tracking-widest uppercase">Plateforme de Crédit Privé</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Dossier #{dossier.id}</p>
            <p>Édité le {new Date().toLocaleDateString("fr-FR")}</p>
            <p>Document confidentiel — Usage interne</p>
          </div>
        </div>
      </div>

      {/* Screen header */}
      <div className="print:hidden">
        <Link href="/conseiller/dossiers">
          <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
            <ArrowLeft size={16} /> Retour à mes dossiers
          </button>
        </Link>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Dossier #{dossier.id} — {client ? `${client.prenom} ${client.nom}` : "Client inconnu"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{dossier.objet}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${sc.color}`}>
              {sc.icon} {sc.label}
            </span>
            <Button
              onClick={() => window.print()}
              className="gap-2 bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white"
              data-testid="button-export-pdf"
            >
              <Printer size={15} /> Export PDF du Contrat
            </Button>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
        {/* Identité */}
        {client && (
          <Card className="border-0 shadow-sm print:shadow-none print:border print:border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User size={14} className="text-[hsl(345,65%,28%)]" /> Identité client
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <dl>
                <InfoRow label="Nom complet" value={`${client.prenom} ${client.nom}`} />
                <InfoRow label="Email" value={client.email} />
                <InfoRow label="Téléphone" value={client.telephone} />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Situation pro */}
        {client && (
          <Card className="border-0 shadow-sm print:shadow-none print:border print:border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Briefcase size={14} className="text-[hsl(345,65%,28%)]" /> Situation professionnelle
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <dl>
                <InfoRow label="Statut professionnel" value={client.statut_pro} />
                <InfoRow label="Revenus nets/mois" value={formatEur(client.revenus_nets)} />
                <InfoRow label="Autres revenus" value={client.autres_revenus ? formatEur(client.autres_revenus) : "—"} />
                <InfoRow label="Charges fixes/mois" value={formatEur(client.charges_fixes)} />
                <InfoRow label="Patrimoine total" value={client.patrimoine ? formatEur(client.patrimoine) : "—"} />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Crédit */}
        <Card className="border-0 shadow-sm print:shadow-none print:border print:border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CreditCard size={14} className="text-[hsl(345,65%,28%)]" /> Crédit demandé
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <dl>
              <InfoRow label="Montant demandé" value={formatEur(dossier.montant)} />
              <InfoRow label="Durée" value={`${dossier.duree_mois} mois (${Math.round(dossier.duree_mois / 12 * 10) / 10} ans)`} />
              <InfoRow label="Apport personnel" value={dossier.apport_personnel ? formatEur(dossier.apport_personnel) : "Aucun"} />
              <InfoRow label="Objet du crédit" value={dossier.objet} />
              <InfoRow label="Mensualité estimée" value={`${formatEur(mensualiteCredit)} / mois`} />
              <InfoRow label="Coût total estimé" value={formatEur(mensualiteCredit * dossier.duree_mois)} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card className="border-0 shadow-sm print:shadow-none print:border print:border-slate-200 mt-6 print:mt-4">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileText size={14} className="text-[hsl(345,65%,28%)]" />
            Documents fournis ({(dossier.documents || []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          {(dossier.documents || []).length === 0 ? (
            <p className="text-sm text-slate-400">Aucun document fourni</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(dossier.documents || []).map((doc, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">
                  <FileText size={11} />
                  {typeof doc === "string" ? doc : `Document ${i + 1}`}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avis + statut */}
      <div className="grid grid-cols-2 gap-6 mt-6 print:mt-4">
        <Card className="border-0 shadow-sm print:shadow-none print:border print:border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">Avis indicatif du système</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
              dossier.avis_indicatif === "favorable" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
              dossier.avis_indicatif === "defavorable" ? "bg-red-50 text-red-700 border border-red-200" :
              "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {dossier.avis_indicatif === "favorable" ? <CheckCircle size={16} /> :
               dossier.avis_indicatif === "defavorable" ? <XCircle size={16} /> :
               <AlertTriangle size={16} />}
              {dossier.avis_indicatif === "favorable" ? "Avis favorable" :
               dossier.avis_indicatif === "defavorable" ? "Avis défavorable" :
               "Analyse approfondie requise"}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Cet avis est indicatif et non opposable. La décision finale relève exclusivement de l'équipe Risque.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm print:shadow-none print:border print:border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">Traçabilité</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <dl>
              <InfoRow label="Créé par" value={dossier.created_by || "—"} />
              <InfoRow label="Analyste assigné" value={dossier.assigned_to || "Non assigné"} />
              <InfoRow label="Date de création" value={new Date(dossier.created_at).toLocaleDateString("fr-FR")} />
              <InfoRow label="Dernière mise à jour" value={dossier.updated_at ? new Date(dossier.updated_at).toLocaleDateString("fr-FR") : "—"} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Print footer */}
      <div className="hidden print:block mt-10 pt-6 border-t border-slate-300 text-xs text-slate-400 text-center">
        <p>SOLVY — Document généré le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR")}</p>
        <p className="mt-1">Confidentiel — Réservé à l'usage interne de la banque — Ne pas divulguer à des tiers</p>
      </div>
    </>
  );
}

export default function ConseillerDossierDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);
  const { data: dossier, isLoading } = useGetDossier(id, {
    query: { enabled: !!id, queryKey: ["dossier", id] }
  });

  if (isLoading) return <div className="p-12 text-center text-slate-400">Chargement du dossier...</div>;
  if (!dossier) return (
    <div className="p-12 text-center">
      <p className="text-red-500">Dossier introuvable</p>
      <Link href="/conseiller/dossiers"><button className="text-sm text-[hsl(345,65%,28%)] mt-3 hover:underline">← Retour</button></Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 print:px-6 print:py-4 print:max-w-none">
      <PrintableContent dossier={dossier} />
    </div>
  );
}
