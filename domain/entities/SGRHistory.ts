// Entrée historique d'un calcul SGR — alimente la section 4.2 du mémoire
export interface SGRHistoryEntity {
  id: string;
  projectId: string;
  /** Score Global de Risque [0, 100] */
  sgr: number;
  /** Niveau de risque interprété */
  niveau: 'faible' | 'modéré' | 'élevé' | 'critique';
  /** Alertes actives au moment du calcul (sérialisées JSON) */
  alertes: string;
  createdAt: Date;
}
