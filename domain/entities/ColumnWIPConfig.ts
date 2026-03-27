// Limite WIP par colonne Kanban — alimente R_WIP dans l'algorithme SGR
export interface ColumnWIPConfigEntity {
  id: string;
  projectId: string;
  column: string; // "To Do" | "In Progress" | "Done"
  wipLimit: number; // 0 = pas de limite
}
