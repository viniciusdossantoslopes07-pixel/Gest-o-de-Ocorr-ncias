


export const OCCURRENCE_CATEGORIES = [
  'Ocorrências de Emergência',
  'Controle de Acesso e Credenciamento',
  'Segurança Orgânica / Patrimonial',
  'Segurança Operacional',
  'Segurança de Sistemas e Tecnologia',
  'Veículos e Tráfego Interno',
  'Pessoas e Conduta',
  'Materiais e Logística'
];

export const TYPES_BY_CATEGORY: Record<string, string[]> = {
  'Ocorrências de Emergência': ['Incêndio em edificação', 'Princípio de incêndio', 'Vazamento de gás', 'Explosão', 'Acionamento de alarme'],
  'Controle de Acesso e Credenciamento': ['Tentativa de acesso indevido', 'Uso de credencial de terceiro', 'Veículo não credenciado'],
  'Segurança Orgânica / Patrimonial': ['Arrombamento', 'Tentativa de invasão', 'Furto', 'Vandalismo', 'Dano ao patrimônio'],
  'Segurança Operacional': ['Disparo indevido', 'Falha em procedimento', 'Posto abandonado'],
  'Segurança de Sistemas e Tecnologia': ['Falha sistema acesso', 'Indisponibilidade CFTV', 'Câmera inoperante'],
  'Veículos e Tráfego Interno': ['Acidente interno', 'Excesso velocidade', 'Estacionamento proibido'],
  'Pessoas e Conduta': ['Aglomeração restrita', 'Comportamento suspeito', 'Conflito usuários'],
  'Materiais e Logística': ['Entrada sem registro', 'Saída sem autorização', 'Item proibido']
};

export const STATUS_COLORS: Record<string, string> = {
  'Registrada (Aguardando N1)': 'bg-blue-100 text-blue-700',
  'Pendente': 'bg-yellow-100 text-yellow-700',
  'N1: Adjunto / Oficial de Dia': 'bg-amber-100 text-amber-700',
  'N2: Contrainteligência / Seg. Orgânica': 'bg-purple-100 text-purple-700',
  'N3: Homologação OSD': 'bg-orange-100 text-orange-700',
  'OM: Revisão do Comandante': 'bg-slate-900 text-amber-400 border border-amber-900/50',
  'Arquivado / Finalizado': 'bg-emerald-100 text-emerald-700',
  'Retornado para Ajuste': 'bg-red-100 text-red-700',
};

export const URGENCY_COLORS: Record<string, string> = {
  Baixa: 'bg-slate-100 text-slate-600',
  Média: 'bg-blue-50 text-blue-600',
  Alta: 'bg-orange-50 text-orange-600',
  Crítica: 'bg-red-50 text-red-600 border border-red-100',
};


export const TIPOS_MISSAO = [
  "Escolta", "Policiamento", "Controle de Trânsito", "Segurança e Proteção de Autoridades",
  "Transporte de Militares", "Apoio a Formaturas e Eventos", "Apoios de Infraestrutura", "Outro"
];

export const RANKS = [
  'TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP',
  'SO', '1S', '2S', '3S', 'CB', 'S1', 'S2'
];

export const SETORES = [
  'BASP', 'SOP', 'SAP', 'EPA-SEÇÃO', 'EPA-TROPA', 'CANIL', 'EFSD', 'ESI-SEÇÃO', 'ESI-TROPA'
];

export const PRESENCE_STATUS = {
  'P': 'PRESENTE',
  'F': 'FALTA',
  'ESV': 'SERVIÇO',
  'DSV': 'DISP DE SERVIÇO',
  'MIS': 'MISSAO',
  'FE': 'FERIAS',
  'C-E': 'CURSO-ESTÁGIO',
  'DPM': 'DISPENSA MÉDICA',
  'JS': 'JUNTA DE SAÚDE',
  'INSP': 'INSPEÇÃO DE SAÚDE',
  'TRA': 'TRANSFERIDO',
  'LI': 'LICENÇA',
  'AGD': 'DESLIGAMENTO',
  'DESL': 'DESLIGADO',
  'INST': 'INTRUÇAO',
  'A': 'AUSENTE'
} as const;

export const CALL_TYPES = {
  'INICIO': '1ª Chamada (Início de Expediente)',
  'TERMINO': '2ª Chamada (Término de Expediente)'
} as const;

export type PresenceStatusCode = keyof typeof PRESENCE_STATUS;
export type CallTypeCode = keyof typeof CALL_TYPES;

export const ARMAMENT_OPTIONS = ['Pistola', 'Fuzil', 'Nenhum'];

export const LOAN_STATUS_COLORS: Record<string, string> = {
  'PENDENTE': 'bg-yellow-100 text-yellow-700',
  'APROVADA': 'bg-blue-100 text-blue-700',
  'RETIRADO': 'bg-purple-100 text-purple-700',
  'DEVOLVIDO': 'bg-green-100 text-green-700',
  'REJEITADA': 'bg-red-100 text-red-700',
};

export const MISSION_STATUS_LABELS: Record<string, string> = {
  'GERADA': 'Rascunho',
  'PENDENTE_SOP': 'Pendente SOP-01',
  'EM_ELABORACAO': 'Em Elaboração (SOP)',
  'AGUARDANDO_ASSINATURA': 'Aguardando Assinatura CH-SOP',
  'PRONTA_PARA_EXECUCAO': 'Pronta para Iniciar',
  'EM_MISSAO': 'Em Missão',
  'CONCLUIDA': 'Concluída',
  'REJEITADA': 'Rejeitada',
  'CANCELADA': 'Cancelada'
};

export const MISSION_STATUS_COLORS: Record<string, string> = {
  'GERADA': 'bg-slate-100 text-slate-700',
  'PENDENTE_SOP': 'bg-yellow-100 text-yellow-700',
  'EM_ELABORACAO': 'bg-blue-100 text-blue-700',
  'AGUARDANDO_ASSINATURA': 'bg-orange-100 text-orange-700',
  'PRONTA_PARA_EXECUCAO': 'bg-emerald-100 text-emerald-700',
  'EM_MISSAO': 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500',
  'CONCLUIDA': 'bg-slate-800 text-white',
  'REJEITADA': 'bg-red-100 text-red-700 line-through',
  'CANCELADA': 'bg-gray-100 text-gray-500'
};

export const MISSION_FUNCTIONS = [
  'Comandante',
  'Aux Comandante',
  'Efetivo S.I',
  'Efetivo PA',
  'Motorista (D)',
  'Motorista (B)'
];

export const MATERIAL_TYPES = [
  'EXEC', 'TRÂNSITO', 'CHOQUE', 'OPERACIONAL', 'FORMATURA',
  'ROUPARIA', 'OUTROS', 'FERRAGENS', 'FERRAMENTAS', 'COMUNICAÇÃO', 'BANDEIRAS'
];

export const GESTAO_MATERIAL_SETORES = [
  'VERDE', 'AZUL', 'BRANCO', 'AMARELO', 'SALA DE MEIOS',
  'DEPÓSITO 01', 'DEPÓSITO 02', 'DEPÓSITO 03', 'DEPÓSITO 04',
  'DEPÓSITO 05', 'DEPÓSITO 06', 'DEPÓSITO 07', 'DEPÓSITO 08',
  'DEPÓSITO 09', 'DEPÓSITO 10', 'DEPÓSITO 11'
];
