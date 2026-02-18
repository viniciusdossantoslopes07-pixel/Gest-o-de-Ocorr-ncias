
export enum Urgency {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum Status {
  REGISTERED = 'Registrada (Aguardando N1)',
  PENDING = 'Pendente',
  TRIAGE = 'N1: Adjunto / Oficial de Dia',
  ESCALATED = 'N2: Contrainteligência / Seg. Orgânica',
  RESOLVED = 'N3: Homologação OSD',
  COMMAND_REVIEW = 'OM: Revisão do Comandante',
  CLOSED = 'Arquivado / Finalizado',
  RETURNED = 'Retornado para Ajuste',
  FINALIZED = 'Finalizada'
}

export enum UserRole {
  PUBLIC = 'Público/Anônimo',
  OPERATIONAL = 'Lançador Operacional',
  ADMIN = 'Gestor Master / OSD',
  COMMANDER = 'Comandante OM'
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
  cpf?: string;
  warName?: string;
  militarId?: number;
  themePreference?: 'light' | 'dark';
  pending_password_reset?: boolean;
  reset_password_at_login?: boolean;
  password_status?: 'ACTIVE' | 'PENDING_RESET' | 'EXPIRED';
  displayOrder?: number;
  menu_order?: string[];
  home_order?: string[];
  functionId?: string; // ID da Função (ex: 'SOP_01')
  customPermissions?: string[]; // Array de keys de permissão (ex: ['view_dashboard'])
  photo_url?: string;
}

export interface UserFunction {
  id: string;
  name: string;
  description: string;
  permissions: string[];
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

export interface MissionOrderPersonnel {
  id: string;
  function: string;
  rank: string;
  warName: string;
  saram: string;
  uniform: string;
  armament: string;
  ammunition: string;
}

export interface MissionOrderSchedule {
  id: string;
  activity: string;
  location: string;
  date: string;
  time: string;
}

export interface MissionOrder {
  id: string;
  omisNumber: string;
  date: string;
  isInternal: boolean;
  mission: string;
  location: string;
  description: string;
  requester: string;
  transport: boolean;
  food: boolean;
  personnel: MissionOrderPersonnel[];
  schedule: MissionOrderSchedule[];
  permanentOrders: string;
  specialOrders: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status?: 'GERADA' | 'PENDENTE_SOP' | 'EM_ELABORACAO' | 'AGUARDANDO_ASSINATURA' | 'PRONTA_PARA_EXECUCAO' | 'EM_MISSAO' | 'CONCLUIDA' | 'REJEITADA' | 'CANCELADA';
  timeline?: {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    text: string;
    type: 'STATUS_CHANGE' | 'REPORT';
  }[];
  missionCommanderId?: string;
  observation?: string;
  chSopSignature?: string;
  startTime?: string;
  endTime?: string;
  missionReport?: string;
}

export interface Mission {
  id: string;
  solicitante_id: string;
  dados_missao: {
    posto: string;
    nome_guerra: string;
    setor: string;
    tipo_missao: string;
    data: string;
    inicio: string;
    termino: string;
    local: string;
    responsavel?: {
      nome: string;
      om: string;
      telefone: string;
    };
    efetivo: string;
    viaturas: string | { operacional: number; descaracterizada: number; caminhao_tropa: number };
    alimentacao: {
      cafe: boolean;
      almoco: boolean;
      janta: boolean;
      ceia: boolean;
      lanche: boolean;
    };
  };
  status: 'RASCUNHO' | 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'ESCALONADA' | 'AGUARDANDO_ORDEM' | 'ATRIBUIDA' | 'FINALIZADA';
  parecer_sop?: string;
  data_criacao: string;
  historico?: HistoricoItem[];
}

export interface HistoricoItem {
  id: string;
  tipo: 'edicao' | 'comentario' | 'status';
  usuario: string;
  usuario_id: string;
  data: string;
  campo?: string;
  valor_anterior?: any;
  valor_novo?: any;
  comentario?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  details: any;
  status: 'DISPONIVEL' | 'MANUTENCAO' | 'BAIXADO';
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialLoan {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  requestDate: string;
  authorizedBy?: string;
  deliveredBy?: string;
  receivedBy?: string;
  pickupDate?: string;
  expectedReturnDate: string;
  returnDate?: string;
  status: 'PENDENTE' | 'APROVADA' | 'RETIRADO' | 'DEVOLVIDO' | 'REJEITADA';
  observation?: string;
  item?: InventoryItem;
  requester?: User;
}
export interface AttendanceRecord {
  militarId: string;
  militarName: string;
  militarRank: string;
  saram?: string;
  status: string; // From PRESENCE_STATUS
  timestamp: string;
}

export interface DailyAttendance {
  id: string;
  date: string;
  sector: string;
  callType: string; // From CALL_TYPES
  records: AttendanceRecord[];
  responsible?: string;
  signedAt?: string;
  signedBy?: string;
  createdAt: string;
  observacao?: string;
}

export interface AbsenceJustification {
  id: string;
  attendanceId: string;
  militarId: string;
  militarName: string;
  militarRank: string;
  saram?: string;
  originalStatus: string;
  newStatus: string;
  justification: string;
  performedBy: string;
  timestamp: string;
  sector: string;
  date: string;
  callType: string;
}
