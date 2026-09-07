
export interface MilitaryOrganization {
  id: string;
  name: string;
  acronym: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logo_url?: string;
  host_logo_url?: string;
  host_unit?: string;
  zip_code?: string;
  url?: string;
  commander_id?: string;
  founded_at?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
}

export interface AccessGate {
  id: string;
  om_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

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
  ESCALATED = 'N2: OSD',
  RESOLVED = 'N3: Setor Responsável',
  COMMAND_REVIEW = 'OM: Revisão do Comandante',
  CLOSED = 'Arquivado / Finalizado',
  RETURNED = 'Retornado para Ajuste',
  FINALIZED = 'Finalizada'
}

export enum UserRole {
  PUBLIC = 'Público/Anônimo',
  OPERATIONAL = 'Lançador Operacional',
  ADMIN = 'Gestor Master / OSD',
  COMMANDER = 'Comandante OM',
  USER = 'USER'
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
  accessLevel?: 'N0' | 'N1' | 'N2' | 'N3' | 'OM';
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
  biometric_credentials_id?: string;
  active?: boolean;
  specialty?: string;
  class_year?: string;
  service?: string;
  address?: string;
  enlistment_date?: string;
  presentation_date?: string;
  last_promotion_date?: string;
  military_identity?: string;
  rc?: string;
  workplace?: string;
  emergency_contact?: string;
  is_functional?: boolean;
  external_service?: boolean;
  external_om?: string;
  external_sector?: string;
  administrativeRole?: 'CMT_GSD_SP' | 'CH_OP_GSD_SP' | 'CMT_BASP' | 'CH_SAP' | null;
  om_id?: string;
  om?: MilitaryOrganization;
}

export interface UserFunction {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  created_at?: string;
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
  startTime: string;
  endTime: string;
  event: string;
  location?: string;
}

export interface MissionOrder {
  id: string;
  omisNumber: string;
  date: string;
  isInternal: boolean;
  missionCategory?: 'INTERNA' | 'EXTERNA' | 'FORA_DE_SEDE';
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
  isExternalCommander?: boolean;
  externalCommanderName?: string;
  observation?: string;
  chSopSignature?: string;
  cmtName?: string;
  chSopName?: string;
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
    efetivo: string | { oficial: number; graduado: number; praca: number };
    viaturas: string | { operacional: number; descaracterizada: number; caminhao_tropa: number };
    alimentacao: {
      cafe: boolean;
      almoco: boolean;
      janta: boolean;
      ceia: boolean;
      lanche: boolean;
    };
    informacoes_complementares?: string;
  };
  status: 'RASCUNHO' | 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'ESCALONADA' | 'AGUARDANDO_ORDEM' | 'ATRIBUIDA' | 'FINALIZADA';
  parecer_sop?: string;
  data_criacao: string;
  om_id?: string;
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
  om_id?: string;
}

export interface AbsenceJustification {
  id: string;
  attendanceId: string;
  militarId: string;
  militarName: string;
  militarRank: string;
  om_id?: string;
  saram?: string;
  originalStatus: string;
  newStatus: string;
  justification: string;
  performedBy: string;
  timestamp: string;
  sector: string;
  callType: string;
  date: string;
}

export interface EventGuest {
  id: string;
  event_id: string;
  name: string;
  cpf?: string;
  age?: number;
  has_vehicle?: boolean;
  vehicle_plate?: string;
  vehicle_model?: string;
  created_at?: string;
}

export interface AccessEvent {
  id: string;
  seq_id?: number;
  name?: string;
  location: string;
  address?: string;
  responsible_name: string;
  responsible_saram?: string;
  responsible_contact?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FINALIZED';
  date: string;
  created_at?: string;
  registered_by?: string;
  guests?: EventGuest[];
  manage_password?: string;
  image_url?: string;
}

export interface EmergencyLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  created_at: string;
  details?: string;
}

export enum VacationStatus {
  PLANEJADO = 'PLANEJADO',
  HOMOLOGADO = 'HOMOLOGADO',
  EM_FRUICAO = 'EM_FRUIÇÃO'
}

export type InstallmentModel = '30' | '15+15' | '20+10' | '10+20' | '10+10+10';

export interface VacationPeriod {
  id?: string;
  vacation_id?: string;
  start_date: string;
  end_date: string;
  days: number;
  parcel_number: number;
}

export interface Vacation {
  id: string;
  militar_id: string;
  year: number;
  status: VacationStatus;
  installment_model: InstallmentModel;
  created_at?: string;
  updated_at?: string;
  periods?: VacationPeriod[];
  user?: User; // Joined user data
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  rank: string;
  war_name: string;
  content: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  om_id?: string;
  reg_fab: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  fuel_type?: string;
  current_odometer: number;
  current_fuel_level: string;
  status: 'Disponível' | 'Cautelada' | 'Em Manutenção' | 'Manutenção' | 'Alienação' | 'Baixada';
  category?: string; // Classificação FAB: P-1 a P-20
  description?: string; // Descrição TDV oficial FAB: ex. CARRO DE PRESOS, CARRO PATRULHA, CAMINHÃO MILITAR
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleDamagePoint {
  id: string;
  x: number; // percentual x (0-100) no diagrama
  y: number; // percentual y (0-100) no diagrama
  part: string; // Frente, Traseira, Lateral Esquerda, Lateral Direita, Teto, Vidros
  type: 'Amassado' | 'Riscado' | 'Quebrado' | 'Trincado' | 'Furo' | 'Outros';
  code: string; // Ex: '1A', '2R'
  description?: string;
  photo_url?: string;
  created_at?: string;
}

export interface VehicleChecklistItems {
  parabrisa: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  limpadores: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  agua_reservatorio: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  agua_radiador: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  oleo_motor: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  farol_sinalizadores: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  antena: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  documento: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  difusores_ar: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  luzes_painel: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  revisao_km: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  buzina: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  tapetes: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  sem_odores: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  multimidia: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  porta_luvas: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  pneu_diant_esq: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  pneu_diant_dir: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  pneu_tras_esq: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  pneu_tras_dir: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  estepe: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  triangulo_chave_macaco: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
  [key: string]: 'OK' | 'ACEITÁVEL' | 'RUIM' | 'OUTROS' | 'N/A';
}

export interface VehicleLoan {
  id: string;
  loan_number: string;
  vehicle_id: string;
  om_id?: string;
  driver_id?: string;
  driver_name: string;
  driver_rank: string;
  driver_saram: string;
  driver_signature?: boolean;
  driver_signature_data?: string;
  dispatcher_id?: string;
  dispatcher_name: string;
  dispatcher_saram: string;
  departure_date: string;
  expected_return_date?: string;
  destination?: string;
  mission_reason?: string;
  status: 'Em Uso' | 'Devolvido' | 'Cancelado';
  departure_odometer: number;
  departure_fuel_level: string;
  departure_items?: VehicleChecklistItems;
  departure_damages?: VehicleDamagePoint[];
  departure_photos?: string[];
  departure_notes?: string;
  return_date?: string;
  return_dispatcher_id?: string;
  return_dispatcher_name?: string;
  return_dispatcher_saram?: string;
  return_odometer?: number;
  distance_traveled?: number;
  return_fuel_level?: string;
  return_items?: VehicleChecklistItems;
  return_damages?: VehicleDamagePoint[];
  return_photos?: string[];
  return_notes?: string;
  return_signature?: boolean;
  return_signature_data?: string;
  created_at?: string;
  updated_at?: string;
  vehicle?: Vehicle;
}

