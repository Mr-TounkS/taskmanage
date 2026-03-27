import { ColumnWIPConfigEntity } from '../entities/ColumnWIPConfig';

// Interface pour la gestion des limites WIP par colonne — utilisée par le calcul R_WIP du SGR
export interface IColumnWIPConfigRepository {
  findByProject(projectId: string): Promise<ColumnWIPConfigEntity[]>;
  findByProjectAndColumn(projectId: string, column: string): Promise<ColumnWIPConfigEntity | null>;
  upsert(projectId: string, column: string, wipLimit: number): Promise<ColumnWIPConfigEntity>;
}
