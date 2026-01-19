// Definición de Roles
export type UserRole = 'Admin' | 'Project Manager' | 'Viewer' | string | null;

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions?: string[];
  companyName: string;
  imageUri?: string;
}

export type ProjectStatus = 'Not Started' | 'In Progress' | 'Delayed' | 'Completed' | 'On Time';

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  address?: string;
  progress: number;
  participants: any[];
  architecturalPlanUri?: string;
  imageUri?: string;
  startDate?: string;
  endDate?: string;
  statusHistory?: {
    status: ProjectStatus;
    changedBy: string;
    date: string;
    comment?: string;
  }[];
}

export interface Evidence {
  id: string;
  type: 'image' | 'video';
  uri: string;
}

export interface Comment {
  id: string;
  text: string;
  date: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  itemId: string;
  completed: boolean;
  evidenceUri?: string; // URI de la imagen de evidencia (Legacy)
  x?: number; // Coordenada X en porcentaje (0-100)
  y?: number; // Coordenada Y en porcentaje (0-100)
  width?: number; // Ancho en porcentaje
  height?: number; // Alto en porcentaje
  assignedTo?: string; // Usuario asignado
  shape?: 'rectangle' | 'circle' | 'pencil' | 'pin'; // Forma del área
  path?: string; // Datos del trazo SVG para lápiz
  evidence?: Evidence[];
  comments?: Comment[];
  deadline?: string; // Fecha de vencimiento
  startDate?: string;
  endDate?: string;
  color?: string; // Color personalizado para el trazo
  categoryId: string; // ID de la categoría de checklist
  stepId?: string; // ID del paso al que pertenece
  blueprintId?: string; // ID del blueprint al que pertenece
}

// --- Tipos para Presupuestos ---
export interface Expense {
  id: string;
  date: string;
  concept: string;
  category: string; // Partida
  amount: number;
  attachment?: boolean;
  projectId?: string;
  attachmentId?: string;
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
}

export interface ProjectBudget {
  projectId: string;
  totalBudget: number;
  categories: BudgetCategory[];
  expenses: Expense[];
}
