
export enum Urgency {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum Status {
  REGISTERED = 'Registrada (Aguardando N1)',
  TRIAGE = 'N1: Adjunto / Oficial de Dia',
  ESCALATED = 'N2: Contrainteligência / Seg. Orgânica',
  RESOLVED = 'N3: Homologação OSD',
  COMMAND_REVIEW = 'OM: Revisão do Comandante',
  CLOSED = 'Arquivado / Finalizado',
  RETURNED = 'Retornado para Ajuste'
}

export enum UserRole {
  PUBLIC = 'Público/Anônimo',
  OPERATIONAL = 'Lançador Operacional',
  ADMIN = 'Gestor Master / OSD'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  email: string;
  rank: string;
  saram: string;
  sector: string;
  accessLevel?: 'N1' | 'N2' | 'N3' | 'OM';
  phoneNumber?: string;
  approved?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'doc';
  url: string;
}

export interface TimelineEvent {
  id: string;
  status: Status;
  updatedBy: string;
  timestamp: string;
  comment: string;
}

export interface Occurrence {
  id: string;
  title: string;
  type: string;
  category: string;
  status: Status;
  urgency: Urgency;
  date: string;
  location: string;
  description: string;
  creator: string;
  sector?: string;
  assigned_to?: string;
  attachments: Attachment[];
  timeline: TimelineEvent[];
  sla_deadline?: string;
  geolocation?: {
    lat: number;
    lng: number;
  };
}
