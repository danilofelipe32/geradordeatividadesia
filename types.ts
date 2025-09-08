export enum ComputationalThinkingPillar {
  DECOMPOSICAO = 'Decomposição',
  ABSTRACAO = 'Abstração',
  RECONHECIMENTO_PADROES = 'Reconhecimento de Padrões',
  ALGORITMOS = 'Algoritmos',
}

export enum ActivityLevel {
  FACIL = 'Fácil',
  MEDIO = 'Médio',
  DIFICIL = 'Difícil',
}

export interface ActivityFormData {
  subject: string;
  topic: string;
  pillar: ComputationalThinkingPillar;
  grade: string;
  level: ActivityLevel;
  quantity: number;
}

// Parte da atividade que é gerada pela IA
export interface AiGeneratedActivity {
  titulo: string;
  descricao: string;
  competenciaBNCC: string;
  competenciaBNCCComputacao: string;
  duracaoEstimada: number;
  recursosNecessarios: string[];
}

// Objeto completo da atividade, combinando dados do formulário e da IA
export interface Activity extends AiGeneratedActivity {
  id: number;
  subject: string;
  topic: string;
  grade: string;
  level: ActivityLevel;
  pillar: ComputationalThinkingPillar;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  content: string; // base64 data URL
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}