


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
  'N2: OSD': 'bg-purple-100 text-purple-700',
  'N3: Setor Responsável': 'bg-orange-100 text-orange-700',
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
  "POSTO DE SEGURANÇA ESTÁTICO",
  "CONTROLE DE TRÂNSITO",
  "SEGURANÇA DE ANV PRESIDENCIAL",
  "POLICIAMENTO OSTENSIVO",
  "ESCOLTA DE MATBEL",
  "ESCOLTA DE PRESO",
  "ALA DE AUTORIDADE",
  "PBCV",
  "BUSCA E APREENSÃO",
  "APOIOS DE INFRAESTRUTURA",
  "MOTOPATRULHAMENTO",
  "PATRULHAMENTO COM ARP",
  "OUTRO"
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
  'A': 'AUSENTE',
  'ESV': 'SERVIÇO',
  'SSV': 'SAINDO SERVIÇO',
  'DSV': 'DISP DE SERVIÇO',
  'MIS': 'MISSÃO',
  'FE': 'FÉRIAS',
  'INST': 'INSTRUÇÃO',
  'C-E': 'CURSO-ESTÁGIO',
  'DPM': 'DISPENSA MÉDICA',
  'DCH': 'DISPENSA CHEFE',
  'JS': 'JUNTA DE SAÚDE',
  'INSP': 'INSPEÇÃO DE SAÚDE',
  'LP': 'LICENÇA PATERNIDADE',
  'LM': 'LICENÇA MATERNIDADE',
  'NIL': 'SEM EXPEDIENTE',
  'NU': 'NÚPCIAS',
  'LT': 'LUTO'
} as const;

export const CALL_TYPES = {
  'INICIO': '1ª Chamada (Início de Expediente)',
  'TERMINO': '2ª Chamada (Término de Expediente)'
} as const;

export type PresenceStatusCode = keyof typeof PRESENCE_STATUS;
export type CallTypeCode = keyof typeof CALL_TYPES;

export const ARMAMENT_OPTIONS = ['Pistola', 'Fuzil', 'Gaúgio', 'Pist/Fuzil', 'Pist/Gáugio'];

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

export const MILITARY_QUOTES = [
  { text: "A suprema arte da guerra é derrotar o inimigo sem lutar.", author: "Sun Tzu" },
  { text: "A guerra é a continuação da política por outros meios.", author: "Carl von Clausewitz" },
  { text: "Se você conhece o inimigo e a si mesmo, não precisa temer o resultado de cem batalhas.", author: "Sun Tzu" },
  { text: "A brevidade é a alma da guerra.", author: "Sun Tzu" },
  { text: "Na guerra, tudo é simples, mas o mais simples é difícil.", author: "Carl von Clausewitz" },
  { text: "Um líder lidera pelo exemplo, não pela força.", author: "Sun Tzu" },
  { text: "O soldado não luta porque odeia o que está à sua frente, mas porque ama o que deixou atrás de si.", author: "G.K. Chesterton" },
  { text: "A disciplina é a alma de um exército. Torna pequenos contingentes formidáveis.", author: "George Washington" },
  { text: "A competência é a única proteção real contra a adversidade.", author: "O Código de Honra" },
  { text: "Não diga às pessoas como fazer as coisas, diga-lhes o que fazer e deixe-as surpreendê-lo com os resultados.", author: "General George S. Patton" },
  { text: "Somos jovens, somos velhos de ferro. Não somos mais jovens. Fugimos de nós mesmos.", author: "Nada de Novo no Front" },
  { text: "A guerra é o que acontece quando a linguagem falha.", author: "Margaret Atwood" },
  { text: "O inferno é o que você carrega consigo, não o lugar para onde você vai.", author: "As Coisas que Eles Carregavam" },
  { text: "A morte de um homem é uma tragédia; a morte de milhões é uma estatística.", author: "Erich Maria Remarque" },
  { text: "A pólvora não tem consciência.", author: "Provérbio Militar" },
  { text: "Sob pressão, você não se eleva ao nível das suas expectativas; você cai ao nível do seu treinamento.", author: "Archilochus" },
  { text: "Quem tem um 'porquê' para viver pode suportar quase qualquer 'como'.", author: "Viktor Frankl" },
  { text: "O medo é uma reação. A coragem é uma decisão.", author: "Winston Churchill" },
  { text: "Em tempos de paz, os filhos enterram os pais; na guerra, os pais enterram os filhos.", author: "Heródoto" },
  { text: "O suor poupa o sangue.", author: "Erwin Rommel" },
  { text: "Somente os mortos viram o fim da guerra.", author: "Platão" },
  { text: "A guerra não determina quem está certo, apenas quem sobra.", author: "Bertrand Russell" },
  { text: "O homem é o único animal que dedica sua vida a aprender como matar seus semelhantes.", author: "Crônicas de Guerra" },
  { text: "Não há ateus nas trincheiras.", author: "William T. Cummings" },
  { text: "A história é escrita pelos vencedores.", author: "Winston Churchill" },
  { text: "A melhor estratégia é sempre ser muito forte.", author: "Carl von Clausewitz" },
  { text: "A vitória espera por aqueles que têm tudo em ordem; as pessoas chamam isso de sorte.", author: "Roald Amundsen" },
  { text: "Planos são inúteis, mas o planejamento é indispensável.", author: "Dwight D. Eisenhower" },
  { text: "O general que ganha a batalha faz muitos cálculos em seu templo antes da luta.", author: "Sun Tzu" },
  { text: "Não interrompa seu inimigo quando ele estiver cometendo um erro.", author: "Napoleão Bonaparte" },
  { text: "A logística é a linha que sustenta a espada.", author: "Anónimo" },
  { text: "Um bom plano executado agora é melhor que um plano perfeito executado semana que vem.", author: "George S. Patton" },
  { text: "Atacar é o segredo da defesa; defender é o planejamento de um ataque.", author: "Sun Tzu" },
  { text: "A velocidade é a essência da guerra.", author: "Sun Tzu" },
  { text: "Grandes exércitos, como grandes navios, são difíceis de manobrar.", author: "Clausewitz" },
  { text: "O terreno é o mestre da batalha.", author: "Ditado Militar" },
  { text: "Quem defende tudo, não defende nada.", author: "Frederico, o Grande" },
  { text: "A surpresa é a arma mais poderosa do atacante.", author: "Liddell Hart" },
  { text: "Guerra é 90% informação.", author: "Napoleão Bonaparte" },
  { text: "A tática é a arte de usar as tropas no combate; a estratégia é a arte de usar os combates para vencer a guerra.", author: "Clausewitz" },
  { text: "Na guerra, a audácia é a prudência.", author: "Anónimo" },
  { text: "O flanco é o ponto fraco de toda formação.", author: "Xenofonte" },
  { text: "A força reside na concentração, não na dispersão.", author: "Alfred Thayer Mahan" },
  { text: "Nenhum plano sobrevive ao primeiro contato com o inimigo.", author: "Helmuth von Moltke" },
  { text: "Conheça o campo de batalha como a palma da sua mão.", author: "Miyamoto Musashi" },
  { text: "Liderança é a arte de fazer alguém fazer algo que você quer porque ele quer fazer.", author: "Eisenhower" },
  { text: "Um exército de ovelhas liderado por um leão é melhor que um exército de leões liderado por uma ovelha.", author: "Alexandre, o Grande" },
  { text: "A responsabilidade é o preço da grandeza.", author: "Winston Churchill" },
  { text: "Se você quer que um homem faça um bom trabalho, dê a ele uma responsabilidade pela qual ele se orgulhe.", author: "Patton" },
  { text: "Oficiais nunca comem antes de seus soldados.", author: "Marines (USMC)" },
  { text: "O comando é uma solidão necessária.", author: "Charles de Gaulle" },
  { text: "Líderes não criam seguidores, eles criam mais líderes.", author: "Tom Peters" },
  { text: "A coragem é contagiante. Quando um homem bravo assume uma posição, os outros se fortalecem.", author: "Billy Graham" },
  { text: "Não se lidera batendo na cabeça das pessoas; isso é agressão, não liderança.", author: "Eisenhower" },
  { text: "O exemplo é a melhor forma de instrução.", author: "Lema de Liderança" },
  { text: "A confiança é a cola que une as unidades militares.", author: "Norman Schwarzkopf" },
  { text: "Um líder é um vendedor de esperança.", author: "Napoleão Bonaparte" },
  { text: "Disciplina é fazer o que precisa ser feito, mesmo quando você não quer fazer.", author: "Anónimo" },
  { text: "A autoridade flui do respeito, não do cargo.", author: "Jocko Willink" },
  { text: "A missão primeiro, os homens sempre.", author: "Lema Militar" },
  { text: "O silêncio é uma ferramenta de comando.", author: "Sun Tzu" },
  { text: "Ninguém é maior que a unidade.", author: "Lema de Operações Especiais" },
  { text: "Coragem é o que é preciso para levantar e falar; coragem é também o que é preciso para sentar e ouvir.", author: "Churchill" },
  { text: "Um general nunca deve estar atrás, mas sim onde a decisão é tomada.", author: "Rommel" },
  { text: "A lealdade é um caminho de mão dupla.", author: "Patton" },
  { text: "O combate é a prova final da alma humana.", author: "Stephen Ambrose" },
  { text: "Não há glória em uma guerra que não possa ser encontrada na paz.", author: "Anónimo" },
  { text: "A pólvora não faz distinção entre o bravo e o covarde.", author: "Ditado de Guerra" },
  { text: "O único dia fácil foi ontem.", author: "Navy SEALs" },
  { text: "A dor é a fraqueza saindo do corpo.", author: "Lema Militar" },
  { text: "O medo é natural, mas o pânico é mortal.", author: "Manual de Sobrevivência" },
  { text: "Em combate, você não sobe ao nível do seu herói, você desce ao nível do seu treinamento.", author: "Dave Grossman" },
  { text: "A guerra é um massacre de pessoas que não se conhecem para o benefício de pessoas que se conhecem mas não se massacram.", author: "Paul Valéry" },
  { text: "Soldados podem lutar por meses por um pedaço de fita colorida.", author: "Napoleão Bonaparte" },
  { text: "O barulho da batalha é o mais alto para quem está com medo.", author: "Provérbio" },
  { text: "O sangue é o preço da vitória.", author: "Clausewitz" },
  { text: "Não morra pelo seu país, faça o outro bastardo morrer pelo dele.", author: "Patton" },
  { text: "O fogo amigo não existe.", author: "Lei de Murphy" },
  { text: "As balas não têm nome, mas têm endereço.", author: "Ditado de Atiradores" },
  { text: "Se você está em uma luta justa, sua tática está errada.", author: "Anónimo" },
  { text: "A guerra despoja o homem de suas máscaras.", author: "Erich Maria Remarque" },
  { text: "No vácuo da guerra, a única lei é a sobrevivência.", author: "Platão" },
  { text: "A trincheira é o lugar onde o tempo para e a humanidade sangra.", author: "Nada de Novo no Front" },
  { text: "O combate não te torna melhor, ele apenas revela quem você é.", author: "Portões de Fogo" },
  { text: "A vitória é comprada com o suor do treinamento e o sangue do sacrifício.", author: "Anónimo" },
  { text: "A honra é a dignidade da alma.", author: "Alfred de Vigny" },
  { text: "É preferível morrer com honra do que viver com indiferença.", author: "Lema Militar" },
  { text: "A paz é o intervalo entre duas guerras.", author: "Platão" },
  { text: "O guerreiro não vive para a guerra, ele vive para proteger a paz.", author: "Bushido" },
  { text: "Se queres a paz, prepara-te para a guerra.", author: "Vegetius" },
  { text: "A mente é a arma, o corpo é a ferramenta.", author: "Forças Especiais" },
  { text: "Um homem sem propósito é um soldado sem arma.", author: "Anónimo" },
  { text: "O sacrifício é o alicerce do dever.", author: "Código de Honra" },
  { text: "A liberdade não é de graça.", author: "Lema de Veteranos" },
  { text: "O dever é a coisa mais sublime na língua humana.", author: "Robert E. Lee" },
  { text: "Para aqueles que lutaram por ela, a vida tem um sabor que os protegidos nunca conhecerão.", author: "Inscrição em Khe Sanh" },
  { text: "A integridade é fazer o certo quando ninguém está olhando.", author: "C.S. Lewis" },
  { text: "O destino sussurra ao guerreiro: 'Você não pode suportar a tempestade'. O guerreiro sussurra de volta: 'Eu sou a tempestade'.", author: "Anónimo" },
  { text: "A força de um homem está no seu autocontrole.", author: "Miyamoto Musashi" },
  { text: "O que fazemos em vida ecoa na eternidade.", author: "Gladiador" },
  { text: "A maior vitória é vencer a si mesmo.", author: "Miyamoto Musashi" },
  { text: "A covardia pergunta: é seguro? O dever pergunta: é correto?", author: "Martin Luther King Jr." },
  { text: "O patriotismo é apoiar o seu país o tempo todo, e o seu governo quando ele merece.", author: "Mark Twain" },
  { text: "Ninguém é tão forte que não precise de ajuda, nem tão fraco que não possa ajudar.", author: "Provérbio Militar" },
  { text: "Honra e Pátria acima de tudo.", author: "Lema Militar" },
  { text: "A história é um conjunto de mentiras sobre as quais se chegou a um acordo.", author: "Napoleão Bonaparte" },
  { text: "A guerra faz estranhos companheiros de cama.", author: "Provérbio" },
  { text: "O soldado é o último a desejar a guerra, pois é ele quem deve sofrer as feridas mais profundas.", author: "Douglas MacArthur" },
  { text: "O custo da liberdade é sempre alto, mas sempre o pagamos.", author: "John F. Kennedy" },
  { text: "Nunca tantos deveram tanto a tão poucos.", author: "Winston Churchill" },
  { text: "A guerra não é um jogo, é uma doença.", author: "Florence Nightingale" },
  { text: "Memória é o que resta quando o tiro para.", author: "Tim O'Brien" },
  { text: "O mundo é perigoso por causa daqueles que olham e não fazem nada.", author: "Albert Einstein" },
  { text: "A primeira vítima da guerra é a verdade.", author: "Hiram Johnson" },
  { text: "A velhice é um prêmio para o soldado que sobreviveu.", author: "Ditado Militar" },
  { text: "Escrevemos com tinta, mas a história é escrita com sangue.", author: "Anónimo" },
  { text: "Um herói é alguém que entende a responsabilidade que vem com sua liberdade.", author: "Bob Dylan" },
  { text: "A tecnologia muda, a natureza humana não.", author: "Thucydides" },
  { text: "Bravo não é quem não sente medo, mas quem o vence.", author: "Nelson Mandela" },
  { text: "O silêncio do cemitério militar é o grito mais alto da história.", author: "Anónimo" },
  { text: "As cicatrizes são as medalhas da alma.", author: "Ditado de Veterano" },
  { text: "O exército é a nação em armas.", author: "Rui Barbosa" },
  { text: "A disciplina militar é o laço que une a ordem à força.", author: "Duque de Caxias" },
  { text: "Guerra: jovens que não se odeiam matam-se por ordem de velhos que se odeiam.", author: "Atribuído a Diversos" },
  { text: "Sempre prontos, para qualquer missão, em qualquer lugar.", author: "Lema de Prontidão" },
];
