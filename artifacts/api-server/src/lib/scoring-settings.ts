// In-memory scoring settings store (survives server restart via defaults)
export interface ScoringSettings {
  taux_endettement_max: number;    // e.g. 0.35
  score_accord_auto: number;       // e.g. 750
  score_refus_auto: number;        // e.g. 300
  reste_a_vivre_min: number;       // e.g. 500 euros
  duree_max_mois: number;          // e.g. 360
}

let settings: ScoringSettings = {
  taux_endettement_max: 0.35,
  score_accord_auto: 750,
  score_refus_auto: 300,
  reste_a_vivre_min: 500,
  duree_max_mois: 360,
};

export function getSettings(): ScoringSettings {
  return { ...settings };
}

export function updateSettings(patch: Partial<ScoringSettings>): ScoringSettings {
  settings = { ...settings, ...patch };
  return getSettings();
}
