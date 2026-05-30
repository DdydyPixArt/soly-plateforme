import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateClient, useCreateDossier, getListDossiersQueryKey, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle, AlertTriangle, XCircle, User, Briefcase, CreditCard, ChevronRight,
  CloudUpload, File, X
} from "lucide-react";

const schema = z.object({
  nom: z.string().min(1, "Requis"),
  prenom: z.string().min(1, "Requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  statut_pro: z.string().min(1, "Requis"),
  revenus_nets: z.coerce.number().positive("Montant positif requis"),
  autres_revenus: z.coerce.number().optional(),
  charges_fixes: z.coerce.number().min(0, "Requis"),
  patrimoine: z.coerce.number().optional(),
  montant: z.coerce.number().positive("Montant positif requis"),
  duree_mois: z.coerce.number().int().positive("Durée requise"),
  objet: z.string().min(1, "Requis"),
  apport_personnel: z.coerce.number().optional(),
});
type FormValues = z.infer<typeof schema>;

const avisConfig = {
  favorable: { label: "Avis indicatif : Favorable", icon: <CheckCircle size={18} />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  defavorable: { label: "Avis indicatif : Défavorable", icon: <XCircle size={18} />, color: "text-red-600 bg-red-50 border-red-200" },
  analyse_requise: { label: "Avis indicatif : Analyse requise", icon: <AlertTriangle size={18} />, color: "text-amber-600 bg-amber-50 border-amber-200" },
};

const REQUIRED_DOCS = [
  { key: "pièce_identité", label: "Pièce d'identité (CNI/Passeport)", accept: ".pdf,.jpg,.png" },
  { key: "bulletins_salaire", label: "3 derniers bulletins de salaire", accept: ".pdf" },
  { key: "avis_imposition", label: "2 derniers avis d'imposition", accept: ".pdf" },
  { key: "relevés_compte", label: "Relevés de compte (3 mois)", accept: ".pdf" },
  { key: "justificatif_domicile", label: "Justificatif de domicile (-3 mois)", accept: ".pdf,.jpg,.png" },
];

interface UploadedDoc {
  key: string;
  filename: string;
  progress: number;
  done: boolean;
}

function formatEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function NouveauDossierPage() {
  const [avisResult, setAvisResult] = useState<{ avis: string; client_id: number; dossier_id: number } | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createClient = useCreateClient();
  const createDossier = useCreateDossier();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: "", prenom: "", email: "", telephone: "", statut_pro: "CDI",
      revenus_nets: undefined, autres_revenus: undefined, charges_fixes: undefined,
      patrimoine: undefined, montant: undefined, duree_mois: undefined, objet: "",
      apport_personnel: undefined,
    },
  });

  const simulateUpload = useCallback((key: string, filename: string) => {
    const doc: UploadedDoc = { key, filename, progress: 0, done: false };
    setUploadedDocs(prev => [...prev.filter(d => d.key !== key), doc]);
    let p = 0;
    const iv = setInterval(() => {
      p += 25 + Math.random() * 30;
      if (p >= 100) {
        clearInterval(iv);
        setUploadedDocs(prev => prev.map(d => d.key === key ? { ...d, progress: 100, done: true } : d));
      } else {
        setUploadedDocs(prev => prev.map(d => d.key === key ? { ...d, progress: p } : d));
      }
    }, 250);
  }, []);

  const handleDocInput = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(key, file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (file) {
      const matchedDoc = REQUIRED_DOCS.find(d => {
        const name = file.name.toLowerCase();
        return name.includes(d.key.split("_")[0]) || name.includes(d.key.replace("_", ""));
      }) || REQUIRED_DOCS.find(d => !uploadedDocs.find(u => u.key === d.key));
      if (matchedDoc) simulateUpload(matchedDoc.key, file.name);
    }
  };

  const removeDoc = (key: string) => {
    setUploadedDocs(prev => prev.filter(d => d.key !== key));
  };

  const getDocForKey = (key: string) => uploadedDocs.find(d => d.key === key);
  const docNames = uploadedDocs.filter(d => d.done).map(d => d.filename);

  const onSubmit = async (values: FormValues) => {
    createClient.mutate({
      data: {
        nom: values.nom, prenom: values.prenom, email: values.email,
        telephone: values.telephone || null,
        statut_pro: values.statut_pro,
        revenus_nets: values.revenus_nets,
        autres_revenus: values.autres_revenus ?? null,
        charges_fixes: values.charges_fixes,
        patrimoine: values.patrimoine ?? null,
        ficp: false, ppe: false, lcb_ft: false,
      }
    }, {
      onSuccess: (client) => {
        createDossier.mutate({
          data: {
            client_id: client.id,
            montant: values.montant,
            duree_mois: values.duree_mois,
            objet: values.objet,
            apport_personnel: values.apport_personnel ?? null,
            documents: docNames.length > 0 ? docNames : [],
            created_by: user?.login,
          }
        }, {
          onSuccess: (dossier) => {
            queryClient.invalidateQueries({ queryKey: getListDossiersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
            setAvisResult({ avis: dossier.avis_indicatif || "analyse_requise", client_id: client.id, dossier_id: dossier.id });
          },
          onError: () => toast({ title: "Erreur", description: "Impossible de créer le dossier.", variant: "destructive" }),
        });
      },
      onError: () => toast({ title: "Erreur", description: "Impossible de créer le client.", variant: "destructive" }),
    });
  };

  if (avisResult) {
    const ac = avisConfig[avisResult.avis as keyof typeof avisConfig] || avisConfig.analyse_requise;
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Card className="border-0 shadow-lg text-center">
          <CardContent className="pt-10 pb-10">
            <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-semibold mb-6 ${ac.color}`}>
              {ac.icon}{ac.label}
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Dossier #{avisResult.dossier_id} créé</h2>
            <p className="text-slate-500 text-sm mb-8">
              {docNames.length} document{docNames.length > 1 ? "s" : ""} joint{docNames.length > 1 ? "s" : ""}.
              Le dossier doit être transmis au service Risque pour validation officielle.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setLocation("/conseiller/dossiers")} className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white gap-2">
                Voir mes dossiers <ChevronRight size={16} />
              </Button>
              <Button variant="outline" onClick={() => { setAvisResult(null); form.reset(); setUploadedDocs([]); }}>
                Nouveau dossier
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Nouveau dossier de crédit</h1>
        <p className="text-slate-500 text-sm mt-1">Saisie complète du dossier client</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Identité client */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User size={16} className="text-[hsl(345,65%,28%)]" /> Identité du client
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nom" render={({ field }) => (
                <FormItem><FormLabel>Nom</FormLabel><FormControl><Input data-testid="input-nom" placeholder="MARTIN" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="prenom" render={({ field }) => (
                <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input data-testid="input-prenom" placeholder="Jean" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input data-testid="input-email" type="email" placeholder="jean.martin@email.fr" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telephone" render={({ field }) => (
                <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input data-testid="input-telephone" placeholder="+33 6 12 34 56 78" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Situation pro */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Briefcase size={16} className="text-[hsl(345,65%,28%)]" /> Situation professionnelle et financière
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="statut_pro" render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut professionnel</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-statut-pro"><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="independant">Indépendant / TNS</SelectItem>
                      <SelectItem value="retraite">Retraité</SelectItem>
                      <SelectItem value="sans_emploi">Sans emploi</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="revenus_nets" render={({ field }) => (
                <FormItem><FormLabel>Revenus nets mensuels (€)</FormLabel><FormControl><Input data-testid="input-revenus" type="number" placeholder="3500" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="autres_revenus" render={({ field }) => (
                <FormItem><FormLabel>Autres revenus mensuels (€)</FormLabel><FormControl><Input data-testid="input-autres-revenus" type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="charges_fixes" render={({ field }) => (
                <FormItem><FormLabel>Charges fixes mensuelles (€)</FormLabel><FormControl><Input data-testid="input-charges" type="number" placeholder="800" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="patrimoine" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Patrimoine total (€)</FormLabel><FormControl><Input data-testid="input-patrimoine" type="number" placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Crédit */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CreditCard size={16} className="text-[hsl(345,65%,28%)]" /> Caractéristiques du crédit demandé
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="montant" render={({ field }) => (
                <FormItem><FormLabel>Montant demandé (€)</FormLabel><FormControl><Input data-testid="input-montant" type="number" placeholder="150000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="duree_mois" render={({ field }) => (
                <FormItem><FormLabel>Durée (mois)</FormLabel><FormControl><Input data-testid="input-duree" type="number" placeholder="240" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="objet" render={({ field }) => (
                <FormItem><FormLabel>Objet du crédit</FormLabel><FormControl><Input data-testid="input-objet" placeholder="Acquisition résidence principale" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="apport_personnel" render={({ field }) => (
                <FormItem><FormLabel>Apport personnel (€)</FormLabel><FormControl><Input data-testid="input-apport" type="number" placeholder="30000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Ingestion documentaire */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <CloudUpload size={16} className="text-[hsl(345,65%,28%)]" />
                Documents justificatifs
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {uploadedDocs.filter(d => d.done).length} / {REQUIRED_DOCS.length} fournis
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Per-document upload */}
              <div className="space-y-2">
                {REQUIRED_DOCS.map(doc => {
                  const uploaded = getDocForKey(doc.key);
                  return (
                    <div key={doc.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      uploaded?.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50/50"
                    }`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${uploaded?.done ? "bg-emerald-500" : "bg-slate-200"}`}>
                        {uploaded?.done ? <CheckCircle size={14} className="text-white" /> : <File size={14} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${uploaded?.done ? "text-emerald-700" : "text-slate-700"}`}>{doc.label}</p>
                        {uploaded && !uploaded.done && (
                          <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[hsl(345,65%,28%)] rounded-full transition-all" style={{ width: `${uploaded.progress}%` }} />
                          </div>
                        )}
                        {uploaded?.done && <p className="text-xs text-emerald-600 mt-0.5 truncate">{uploaded.filename}</p>}
                      </div>
                      {uploaded?.done ? (
                        <button type="button" onClick={() => removeDoc(doc.key)} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors">
                          <X size={14} />
                        </button>
                      ) : (
                        <label className="cursor-pointer flex-shrink-0">
                          <input type="file" accept={doc.accept} className="hidden" onChange={e => handleDocInput(doc.key, e)} />
                          <span className="text-xs font-medium text-[hsl(345,65%,28%)] hover:underline whitespace-nowrap">Choisir un fichier</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Drag and drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  isDragging ? "border-[hsl(345,65%,28%)] bg-[hsl(345,65%,28%)]/5" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const m = REQUIRED_DOCS.find(d => !uploadedDocs.find(u => u.key === d.key));
                    if (m) simulateUpload(m.key, f.name);
                  }
                }} />
                <CloudUpload size={24} className={`mx-auto mb-2 ${isDragging ? "text-[hsl(345,65%,28%)]" : "text-slate-300"}`} />
                <p className="text-sm text-slate-500">Glisser-déposer ou <span className="text-[hsl(345,65%,28%)] font-medium">parcourir</span></p>
                <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG — max 20 Mo</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              data-testid="button-soumettre"
              disabled={createClient.isPending || createDossier.isPending}
              className="bg-[hsl(345,65%,28%)] hover:bg-[hsl(345,65%,24%)] text-white px-8 gap-2"
            >
              {(createClient.isPending || createDossier.isPending) ? "Création en cours..." : "Créer le dossier"}
              <ChevronRight size={16} />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
