// Credit scoring engine using logistic regression simulation
// Computes probability of default, solvency score, and RGPD-compliant factor explanations

interface ScoringInput {
  revenus_nets: number;
  autres_revenus: number;
  charges_fixes: number;
  montant: number;
  duree_mois: number;
  apport_personnel: number;
  ficp: boolean;
  ppe: boolean;
  statut_pro: string;
  patrimoine: number;
}

interface FacteurExplicatif {
  rang: number;
  facteur: string;
  impact: number;
  direction: "positif" | "negatif";
}

interface ControlesAPI {
  banque_de_france: "ok" | "alerte" | "erreur";
  ppe_check: "ok" | "alerte" | "erreur";
  lcb_ft_check: "ok" | "alerte" | "erreur";
}

export interface ScoringResult {
  score: number;
  probabilite_defaut: number;
  taux_endettement: number;
  reste_a_vivre: number;
  avis: "favorable" | "defavorable" | "analyse_requise";
  top_facteurs: FacteurExplicatif[];
  controles_api: ControlesAPI;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function computeScoring(input: ScoringInput): ScoringResult {
  const revenus_totaux = input.revenus_nets + input.autres_revenus;

  // Mensualité estimée (annuité constante)
  const taux_mensuel = 0.0042; // ~5% annuel
  const mensualite =
    (input.montant * taux_mensuel) /
    (1 - Math.pow(1 + taux_mensuel, -input.duree_mois));

  const charges_totales = input.charges_fixes + mensualite;
  const taux_endettement = revenus_totaux > 0 ? charges_totales / revenus_totaux : 1;
  const reste_a_vivre = revenus_totaux - charges_totales;

  // Facteurs de scoring (régression logistique simulée)
  const facteurs: { nom: string; coef: number; valeur: number }[] = [];

  // Taux d'endettement (impact négatif si > 35%)
  const endettement_norm = Math.min(taux_endettement / 0.5, 1);
  facteurs.push({ nom: "Taux d'endettement", coef: -3.2, valeur: endettement_norm });

  // Reste à vivre (impact positif)
  const rav_norm = Math.min(Math.max(reste_a_vivre / 3000, 0), 1);
  facteurs.push({ nom: "Reste à vivre mensuel", coef: -2.1, valeur: 1 - rav_norm });

  // FICP (impact très négatif)
  facteurs.push({ nom: "Incident Banque de France (FICP)", coef: -4.5, valeur: input.ficp ? 1 : 0 });

  // Statut professionnel
  const statut_score: Record<string, number> = {
    CDI: 0.1,
    CDD: 0.5,
    independant: 0.55,
    retraite: 0.2,
    sans_emploi: 0.9,
  };
  const statut_val = statut_score[input.statut_pro] ?? 0.5;
  facteurs.push({ nom: "Stabilité professionnelle", coef: -2.8, valeur: statut_val });

  // Patrimoine (impact positif)
  const patrimoine_norm = Math.min(input.patrimoine / (input.montant * 2 || 1), 1);
  facteurs.push({ nom: "Apport et patrimoine", coef: -1.8, valeur: 1 - patrimoine_norm });

  // Durée du crédit (impact modéré)
  const duree_norm = Math.min(input.duree_mois / 360, 1);
  facteurs.push({ nom: "Durée du crédit", coef: -1.2, valeur: duree_norm });

  // Calcul logit
  const intercept = 0.8;
  const logit =
    intercept + facteurs.reduce((sum, f) => sum + f.coef * f.valeur, 0);

  const probabilite_defaut = Math.round(sigmoid(logit) * 1000) / 1000;

  // Score solvabilité (0-1000), inverse de PD
  const score = Math.round(Math.max(0, Math.min(1000, (1 - probabilite_defaut) * 1000)));

  // Avis
  let avis: "favorable" | "defavorable" | "analyse_requise";
  if (input.ficp || taux_endettement > 0.48) {
    avis = "defavorable";
  } else if (score >= 750 && taux_endettement <= 0.33) {
    avis = "favorable";
  } else {
    avis = "analyse_requise";
  }

  // Top 3 facteurs explicatifs (RGPD Art. 22)
  const facteurs_avec_impact = facteurs.map((f) => ({
    facteur: f.nom,
    impact: Math.abs(f.coef * f.valeur),
    direction: f.coef * f.valeur > 0 ? ("negatif" as const) : ("positif" as const),
    rawImpact: f.coef * f.valeur,
  }));

  const top3 = facteurs_avec_impact
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((f, i) => ({
      rang: i + 1,
      facteur: f.facteur,
      impact: Math.round(f.impact * 100) / 100,
      direction: f.direction,
    }));

  // Contrôles API simulés
  const controles_api: ControlesAPI = {
    banque_de_france: input.ficp ? "alerte" : "ok",
    ppe_check: input.ppe ? "alerte" : "ok",
    lcb_ft_check: "ok",
  };

  return {
    score,
    probabilite_defaut,
    taux_endettement: Math.round(taux_endettement * 10000) / 10000,
    reste_a_vivre: Math.round(reste_a_vivre * 100) / 100,
    avis,
    top_facteurs: top3,
    controles_api,
  };
}

export function generateInfraMetrics() {
  const now = new Date();
  const cpu_history = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(now.getTime() - (23 - i) * 3600000).toISOString(),
    value: Math.round((25 + Math.random() * 40) * 10) / 10,
  }));
  const storage_history = Array.from({ length: 24 }, (_, i) => ({
    time: new Date(now.getTime() - (23 - i) * 3600000).toISOString(),
    value: Math.round((1.8 + i * 0.02 + Math.random() * 0.05) * 100) / 100,
  }));

  return {
    azure_aks: {
      cpu_percent: Math.round((28 + Math.random() * 25) * 10) / 10,
      memory_percent: Math.round((42 + Math.random() * 20) * 10) / 10,
      pods_running: 12,
      pods_total: 14,
      status: "Healthy",
    },
    ovhcloud_storage: {
      used_gb: Math.round((2.3 + Math.random() * 0.1) * 100) / 100,
      total_gb: 10,
      percent_used: Math.round((23 + Math.random() * 2) * 10) / 10,
      status: "SecNumCloud Certifié",
    },
    key_vault: {
      last_rotation: new Date(now.getTime() - 30 * 24 * 3600000).toISOString(),
      next_rotation: new Date(now.getTime() + 60 * 24 * 3600000).toISOString(),
      status: "AES-256-GCM actif",
      algorithm: "AES-256-GCM",
    },
    replication_status: {
      region: "OVHcloud Marseille (MAR1)",
      lag_ms: Math.round(8 + Math.random() * 12),
      status: "Synchronisé",
      last_sync: new Date(now.getTime() - Math.random() * 60000).toISOString(),
    },
    cpu_history,
    storage_history,
  };
}
