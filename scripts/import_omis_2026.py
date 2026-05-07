"""
import_omis_2026.py
Importa os PDFs de OMIS 2026 para a tabela mission_orders do Supabase.
Executa por lotes — defina o LOTE desejado antes de rodar.

Uso:
  python scripts/import_omis_2026.py --lote 1           (Janeiro)
  python scripts/import_omis_2026.py --lote 2           (Fevereiro)
  python scripts/import_omis_2026.py --lote 3           (Março)
  python scripts/import_omis_2026.py --lote 4           (Abril)
  python scripts/import_omis_2026.py --lote 5           (Maio)
  python scripts/import_omis_2026.py --todos            (todos os lotes)
  python scripts/import_omis_2026.py --lote 1 --dry-run (simula sem inserir)
  python scripts/import_omis_2026.py --lote 1 --sql     (gera SQL para copiar/executar via MCP)
"""

import sys, os, re, json, uuid, argparse, traceback
from datetime import datetime, date
from pathlib import Path

# ── Adiciona site-packages do usuário (pdfplumber instalado com --user) ────────
sys.path.insert(0, r'C:\Users\Vinicius\AppData\Roaming\Python\Python314\site-packages')
import pdfplumber

# ── Carrega .env do projeto ────────────────────────────────────────────────────
PROJECT_DIR = Path(__file__).parent.parent
SUPABASE_URL = None
SUPABASE_KEY = None

for env_file in ['.env', '.env.local', '.env.production']:
    env_path = PROJECT_DIR / env_file
    if env_path.exists():
        for line in env_path.read_text(encoding='utf-8', errors='ignore').splitlines():
            if '=' in line and not line.startswith('#'):
                k, _, v = line.partition('=')
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k in ('VITE_SUPABASE_URL', 'SUPABASE_URL') and not SUPABASE_URL:
                    SUPABASE_URL = v
                if k in ('SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY',
                          'VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') and not SUPABASE_KEY:
                    SUPABASE_KEY = v

import urllib.request, urllib.error

# ── Constantes ─────────────────────────────────────────────────────────────────
OM_ID_GSD_SP = 'e5418770-62bd-49d7-9229-a608e3a2895b'
OMIS_BASE     = Path(r'C:\Users\Vinicius\Downloads\omiss 2026\OMISS 2026')
LOTES = {
    1: OMIS_BASE / '1 - JAN',
    2: OMIS_BASE / '2 - FEV',
    3: OMIS_BASE / '3 - MAR',
    4: OMIS_BASE / '4 - ABRIL',
    5: OMIS_BASE / '5 - MAI',
}

# Número da última OMIS já no sistema (inclusive). Não inserir acima disso.
OMIS_JA_NO_SISTEMA_ACIMA = 726

# Horários médios por tipo de missão (hora início, hora fim)
HORARIOS_MEDIOS = {
    'POLICIAMENTO': ('08:00', '18:00'),
    'RONDA':        ('08:00', '18:00'),
    'SEGURANÇA DE AERONAVE': ('06:00', '20:00'),
    'FARO':         ('08:00', '12:00'),
    'TRANSPORTE':   ('07:00', '14:00'),
    'ESCOLTA':      ('07:00', '16:00'),
    'APOIO':        ('08:00', '17:00'),
    'DEFAULT':      ('08:00', '17:00'),
}

# ── Extração de texto do PDF ───────────────────────────────────────────────────
def extrair_texto_pdf(path: Path) -> str:
    texto = []
    try:
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    texto.append(t)
    except Exception as e:
        return ''
    return '\n'.join(texto)

# ── Parsing dos campos ─────────────────────────────────────────────────────────
def safe_group(m, idx, default=''):
    try:
        v = m.group(idx)
        return v.strip() if v else default
    except:
        return default

def parse_numero(texto: str, nome_arquivo: str) -> str | None:
    """Retorna o número da OMIS (ex: '2') ou None se não encontrado."""
    m = re.search(r'N[°º]\s*da\s*OMIS[:\s]+(\d+)/GSD-SP', texto, re.IGNORECASE)
    if m:
        return m.group(1)
    # Tenta extrair do nome do arquivo: OMISS 123 - Descricao.pdf
    m2 = re.search(r'OMIS+\s+(\d+)', nome_arquivo, re.IGNORECASE)
    if m2:
        return m2.group(1)
    return None

def parse_data(texto: str) -> str | None:
    """Retorna 'YYYY-MM-DD' ou None."""
    m = re.search(r'Data:\s*(\d{1,2})/(\d{1,2})/(\d{2,4})', texto)
    if m:
        d, mo, a = m.group(1), m.group(2), m.group(3)
        if len(a) == 2:
            a = '20' + a
        try:
            return date(int(a), int(mo), int(d)).isoformat()
        except:
            pass
    return None

def parse_missao(texto: str) -> str:
    # Procura Missão: e pega o texto até o próximo campo ou fim de linha
    m = re.search(r'Miss[ãa]o:\s*(.*?)(?=Local:|Descri[çc][ãa]o|Solicitante|PESSOAL|\n)', texto, re.DOTALL | re.IGNORECASE)
    if m:
        missao = m.group(1).replace('\n', ' ').strip().upper()
        if missao:
            return missao
    return 'MISSÃO NÃO IDENTIFICADA'

def parse_local(texto: str) -> str:
    m = re.search(r'Local:\s*(.*?)(?=Descri[çc][ãa]o|Solicitante|PESSOAL|\n)', texto, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).replace('\n', ' ').strip()
    return 'LOCAL NÃO INFORMADO'

def parse_descricao(texto: str) -> str:
    m = re.search(r'Descri[çc][ãa]o\s+da\s+Miss[ãa]o:\s*(.+?)(?:Solicitante:|PESSOAL)', texto, re.DOTALL | re.IGNORECASE)
    if m:
        return safe_group(m, 1).replace('\n', ' ').strip()
    return ''

def parse_solicitante(texto: str) -> str:
    m = re.search(r'Solicitante:\s*(.+?)(?:Transporte|Alimenta)', texto, re.DOTALL | re.IGNORECASE)
    if m:
        return safe_group(m, 1).replace('\n', ' ').strip()
    return 'NÃO INFORMADO'

def parse_booleano(texto: str, campo: str) -> bool:
    m = re.search(campo + r':\s*(SIM|N[ÃA]O)', texto, re.IGNORECASE)
    if m:
        return m.group(1).upper() == 'SIM'
    return False

def parse_categoria(texto: str, local: str) -> str:
    """Interna ou Externa baseado no checkbox ou no local."""
    # Verifica se "Externa:" está marcada (□ ou ☑ ou X logo após)
    if re.search(r'Externa:\s*[X☑✓]', texto, re.IGNORECASE):
        return 'EXTERNA'
    locais_externos = ['CONGONHAS', 'GUARULHOS', 'SÃO CARLOS', 'SAO CARLOS', 'BRASÍLIA',
                       'BRASILIA', 'RECIFE', 'HFASP', 'PAMA', 'CFSD', 'AFA', 'COMGAP',
                       'CRCEA', 'GAP-SP', 'SEREP', 'GSAU', 'MATBEL', 'SAR']
    local_up = local.upper()
    for ext in locais_externos:
        if ext in local_up:
            return 'EXTERNA'
    return 'INTERNA'

def parse_pessoal(texto: str) -> list:
    """Extrai a tabela de pessoal."""
    pessoal = []
    # Encontra a seção de pessoal
    m = re.search(r'PESSOAL E MATERIAL(.+?)(?:QUADRO HOR[ÁA]RIO|ORDENS PERMANENTES)', texto, re.DOTALL | re.IGNORECASE)
    if not m:
        return pessoal
    bloco = m.group(1)
    # Cada linha tem: FUNÇÃO | POSTO/GRAD | NOME DE GUERRA | SARAM | UNIF | ARMT | MUNIÇÃO
    # Pula o cabeçalho
    linhas = [l.strip() for l in bloco.splitlines() if l.strip()]
    # Remove cabeçalho
    linhas = [l for l in linhas if not re.match(r'FUN[ÇC][ÃA]O|POSTO|NOME DE GUERRA', l, re.IGNORECASE)]
    for linha in linhas:
        partes = linha.split()
        if len(partes) < 3:
            continue
        # Heurística: SARAM é sequência de 7-8 dígitos com hífen
        saram_idx = None
        saram_val = 'NÃO CADASTRADO'
        for i, p in enumerate(partes):
            if re.match(r'\d{6,8}[-]?\d?', p):
                saram_idx = i
                saram_val = p
                break
        if saram_idx is None:
            continue
        # Posto é a parte antes do SARAM que corresponde a posto militar
        # Função é tudo antes do posto
        posto_val = partes[saram_idx - 1] if saram_idx > 0 else ''
        nome_val  = ' '.join(partes[saram_idx - 2:saram_idx - 1]) if saram_idx > 1 else ''
        funcao_val = ' '.join(partes[:max(0, saram_idx - 2)])
        # Tudo após SARAM: uniforme, armamento, munição
        resto = partes[saram_idx + 1:]
        uniforme  = resto[0] if len(resto) > 0 else ''
        armamento = resto[1] if len(resto) > 1 else ''
        municao   = ' '.join(resto[2:]) if len(resto) > 2 else ''
        # Normalização de Função para Estatísticas
        funcao_norm = funcao_val.upper()
        if 'P.A' in funcao_norm or 'PA' in funcao_norm: funcao_val = 'Efetivo PA'
        elif 'S.I' in funcao_norm or 'SI' in funcao_norm: funcao_val = 'Efetivo S.I'
        elif 'REC' in funcao_norm or 'ALUNO' in funcao_norm or 'CADETE' in funcao_norm: funcao_val = 'Efetivo REC'
        elif 'SEÇÃO' in funcao_norm or 'SECAO' in funcao_norm: funcao_val = 'Efetivo Seção'

        pessoal.append({
            'id': str(uuid.uuid4()),
            'function': funcao_val,
            'rank': posto_val,
            'warName': nome_val,
            'saram': saram_val,
            'uniform': uniforme,
            'armament': armamento,
            'ammunition': municao,
        })
    return pessoal

def parse_horario(texto: str) -> list:
    """Extrai o quadro horário."""
    schedule = []
    m = re.search(r'QUADRO HOR[ÁA]RIO(.+?)(?:ORDENS PERMANENTES|$)', texto, re.DOTALL | re.IGNORECASE)
    if not m:
        return schedule
    bloco = m.group(1)
    linhas = [l.strip() for l in bloco.splitlines() if l.strip()]
    linhas = [l for l in linhas if not re.match(r'ATIVIDADE|LOCAL|DATA|HORA', l, re.IGNORECASE)]
    for linha in linhas:
        # Procura padrão: [atividade] [local] [data dd/mm/aa] [hora HH H MM MIN ou HH:MM ou ASD]
        m_hora = re.search(r'(\d{2})\s*H\s*(\d{2})', linha)
        hora_str = ''
        if m_hora:
            hora_str = f"{m_hora.group(1)}:{m_hora.group(2)}"
        else:
            m_hora2 = re.search(r'(\d{2}):(\d{2})', linha)
            if m_hora2:
                hora_str = f"{m_hora2.group(1)}:{m_hora2.group(2)}"

        m_data = re.search(r'(\d{1,2})/(\d{2})/(\d{2,4})', linha)
        data_str = ''
        if m_data:
            d, mo, a = m_data.group(1), m_data.group(2), m_data.group(3)
            if len(a) == 2: a = '20' + a
            data_str = f"{d}/{mo}/{a}"

        # Remove data e hora da linha para pegar atividade e local
        linha_clean = re.sub(r'\d{1,2}/\d{2}/\d{2,4}', '', linha)
        linha_clean = re.sub(r'\d{2}\s*H\s*\d{2}\s*(MIN)?', '', linha_clean)
        linha_clean = re.sub(r'\d{2}:\d{2}', '', linha_clean)
        linha_clean = re.sub(r'ASD', '', linha_clean, flags=re.IGNORECASE)
        partes_clean = linha_clean.split()
        atividade = partes_clean[0] if partes_clean else ''
        local_ev  = ' '.join(partes_clean[1:]) if len(partes_clean) > 1 else ''

        if atividade:
            schedule.append({
                'id': str(uuid.uuid4()),
                'event': atividade,
                'location': local_ev,
                'startTime': hora_str,
                'endTime': '',
            })
    return schedule

def parse_ordens(texto: str, tipo: str) -> str:
    if tipo == 'permanentes':
        m = re.search(r'ORDENS PERMANENTES\s*(.+?)(?:ORDENS ESPECIAIS|$)', texto, re.DOTALL | re.IGNORECASE)
    else:
        m = re.search(r'ORDENS ESPECIAIS\s*(.+?)(?:[A-Z]{2,}\s+[A-Z]{2,}\s+[A-Z]{2,}|$)', texto, re.DOTALL | re.IGNORECASE)
    if m:
        return safe_group(m, 1).replace('\n', ' ').strip()
    return 'Nil.'

def parse_assinaturas(texto: str) -> tuple:
    """Retorna (ch_sop_name, cmt_name)."""
    ch_sop = ''
    cmt = ''
    
    # Lista de cargos para limpeza
    cargos = ['Chefe da Seção de Operações', 'Chefe interino da Seção de Operações', 'Chefe da SOP', 'Cmt do GSD-SP']

    def clean_name(name_str: str) -> str:
        res = name_str.strip()
        for c in cargos:
            res = re.sub(re.escape(c), '', res, flags=re.IGNORECASE).strip()
        # Se houver dois nomes grandes na mesma linha (ex: side-by-side no PDF), tenta pegar o primeiro ou segundo
        return res

    m_cmt = re.search(r'Cmt do GSD-SP', texto, re.IGNORECASE)
    if m_cmt:
        trecho = texto[:m_cmt.start()]
        linhas_rev = [l.strip() for l in trecho.splitlines() if l.strip()]
        if linhas_rev:
            full_line = clean_name(linhas_rev[-1])
            # Se a linha for muito longa, provavelmente tem dois nomes. O do CMT geralmente é o segundo (direita)
            if len(full_line) > 35 and 'Inf' in full_line:
                partes = re.split(r'(?<=[a-z])\s+(?=[A-Z])', full_line)
                cmt = partes[-1] if partes else full_line
            else:
                cmt = full_line
                
    m_sop = re.search(r'Chefe\s+(interino\s+da\s+Se[çc][ãa]o|da\s+SOP|da\s+Se[çc][ãa]o\s+de\s+Opera)', texto, re.IGNORECASE)
    if m_sop:
        trecho = texto[:m_sop.start()]
        linhas_rev = [l.strip() for l in trecho.splitlines() if l.strip()]
        if linhas_rev:
            full_line = clean_name(linhas_rev[-1])
            # O do SOP geralmente é o primeiro (esquerda)
            if len(full_line) > 35 and 'Inf' in full_line:
                partes = re.split(r'(?<=[a-z])\s+(?=[A-Z])', full_line)
                ch_sop = partes[0] if partes else full_line
            else:
                ch_sop = full_line
                
    return ch_sop, cmt

def horario_medio(missao: str, data_iso: str) -> tuple:
    """Retorna (start_time_iso, end_time_iso) baseado no tipo de missão."""
    missao_up = missao.upper()
    for chave, (h_ini, h_fim) in HORARIOS_MEDIOS.items():
        if chave in missao_up:
            start = f"{data_iso}T{h_ini}:00-03:00"
            end   = f"{data_iso}T{h_fim}:00-03:00"
            return start, end
    h_ini, h_fim = HORARIOS_MEDIOS['DEFAULT']
    return f"{data_iso}T{h_ini}:00-03:00", f"{data_iso}T{h_fim}:00-03:00"

# ── Construção do objeto JSON ──────────────────────────────────────────────────
def construir_omis(numero: str, texto: str) -> dict | None:
    data_iso = parse_data(texto)
    if not data_iso:
        return None
    missao     = parse_missao(texto)
    local      = parse_local(texto)
    descricao  = parse_descricao(texto)
    solicitante= parse_solicitante(texto)
    transporte = parse_booleano(texto, 'Transporte')
    alimentacao= parse_booleano(texto, 'Alimenta[çc][ãa]o')
    categoria  = parse_categoria(texto, local)
    pessoal    = parse_pessoal(texto)
    horario    = parse_horario(texto)
    ord_perm   = parse_ordens(texto, 'permanentes')
    ord_esp    = parse_ordens(texto, 'especiais')
    ch_sop, cmt= parse_assinaturas(texto)
    start_time, end_time = horario_medio(missao, data_iso)

    omis_number = f"{numero}/GSD-SP"
    now_iso = datetime.now().isoformat()

    return {
        'omis_number': omis_number,
        'date': data_iso,
        'mission': missao,
        'location': local,
        'description': descricao,
        'requester': solicitante,
        'transport': transporte,
        'food': alimentacao,
        'personnel': pessoal,
        'schedule': horario,
        'permanent_orders': ord_perm,
        'special_orders': ord_esp,
        'created_by': 'IMPORTAÇÃO HISTÓRICA 2026',
        'status': 'CONCLUIDA',
        'mission_category': categoria,
        'is_internal': categoria == 'INTERNA',
        'is_external_commander': False,
        'start_time': start_time,
        'end_time': end_time,
        'mission_report': 'Missão executada conforme planejado. (Importado do histórico físico 2026)',
        'cmt_name': cmt or 'TEN CEL FELIPE BARBOSA ALVARENGA',
        'ch_sop_name': ch_sop or 'NÃO IDENTIFICADO',
        'om_id': OM_ID_GSD_SP,
        'created_at': now_iso,
        'updated_at': now_iso,
        'timeline': [
            {
                'id': str(uuid.uuid4()),
                'timestamp': now_iso,
                'userId': 'system',
                'userName': 'Sistema (Importação Histórica)',
                'text': 'Missão finalizada — importação do histórico físico 2026.',
                'type': 'STATUS_CHANGE',
            }
        ],
    }

# ── Geração de SQL para executar via MCP ──────────────────────────────────────
def gerar_sql(registros: list) -> str:
    """Gera INSERT SQL compatível com execute_sql do MCP Supabase."""
    linhas = []
    for r in registros:
        def esc(v):
            if v is None: return 'NULL'
            if isinstance(v, bool): return 'true' if v else 'false'
            if isinstance(v, (dict, list)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
            return "'" + str(v).replace("'", "''") + "'"
        linha = (
            f"INSERT INTO mission_orders "
            f"(omis_number,date,mission,location,description,requester,transport,food,"
            f"personnel,schedule,permanent_orders,special_orders,created_by,status,"
            f"mission_category,is_internal,is_external_commander,start_time,end_time,"
            f"mission_report,cmt_name,ch_sop_name,om_id,created_at,updated_at,timeline) VALUES ("
            f"{esc(r['omis_number'])},{esc(r['date'])},{esc(r['mission'])},{esc(r['location'])},"
            f"{esc(r['description'])},{esc(r['requester'])},{esc(r['transport'])},{esc(r['food'])},"
            f"{esc(r['personnel'])},{esc(r['schedule'])},{esc(r['permanent_orders'])},"
            f"{esc(r['special_orders'])},{esc(r['created_by'])},{esc(r['status'])},"
            f"{esc(r['mission_category'])},{esc(r['is_internal'])},{esc(r['is_external_commander'])},"
            f"{esc(r['start_time'])},{esc(r['end_time'])},{esc(r['mission_report'])},"
            f"{esc(r['cmt_name'])},{esc(r['ch_sop_name'])},{esc(r['om_id'])}::uuid,"
            f"{esc(r['created_at'])},{esc(r['updated_at'])},{esc(r['timeline'])}"
            f") ON CONFLICT (omis_number) DO NOTHING;"
        )
        linhas.append(linha)
    return '\n'.join(linhas)

# ── Inserção no Supabase via REST API ─────────────────────────────────────────
def inserir_supabase(registros: list, dry_run: bool = False, gerar_sql_file: bool = False) -> tuple:
    """Retorna (sucessos, erros)."""
    if dry_run:
        for r in registros:
            print(f"  [DRY-RUN] {r['omis_number']} | {r['date']} | {r['mission'][:40]}")
        return len(registros), 0

    if gerar_sql_file:
        return 0, 0  # SQL gerado no caller

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  ✗ SUPABASE_URL/KEY não configurado — use --sql para gerar SQL")
        return 0, len(registros)

    url = f"{SUPABASE_URL}/rest/v1/mission_orders"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates',
    }
    sucessos = 0
    erros = 0
    for i in range(0, len(registros), 10):
        sublote = registros[i:i+10]
        body = json.dumps(sublote, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(url, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp.read()
                sucessos += len(sublote)
                print(f"  ✓ Sublote {i//10+1}: {len(sublote)} OMIS inseridas")
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', errors='ignore')
            if e.code == 409:
                print(f"  - Sublote {i//10+1}: Registros já existentes (ignorado)")
                sucessos += len(sublote)
            else:
                print(f"  ✗ ERRO sublote {i//10+1}: {e.code} — {msg[:200]}")
                erros += len(sublote)
        except Exception as e:
            print(f"  ✗ ERRO sublote {i//10+1}: {e}")
            erros += len(sublote)
    return sucessos, erros

# ── Processo principal ─────────────────────────────────────────────────────────
def processar_lote(pasta: Path, dry_run: bool = False):
    print(f"\n{'='*60}")
    print(f"PROCESSANDO: {pasta.name}")
    print(f"{'='*60}")

    pdfs = sorted(pasta.glob('*.pdf'))
    registros = []
    ignorados = []
    erros_parsing = []
    numeros_vistos = set()

    for pdf_path in pdfs:
        nome = pdf_path.name
        # Ignora planilhas de sobreaviso e relações nominais
        if any(kw in nome.lower() for kw in ['sobreaviso', 'relação', 'relacao', 'relaçao', 'planilha', 'google']):
            ignorados.append(nome)
            continue

        texto = extrair_texto_pdf(pdf_path)
        if not texto:
            erros_parsing.append((nome, 'PDF sem texto extraível'))
            continue

        numero = parse_numero(texto, nome)
        if not numero:
            ignorados.append(nome)
            continue

        # Verifica se já está no sistema (>= 726)
        try:
            if int(numero) >= OMIS_JA_NO_SISTEMA_ACIMA:
                ignorados.append(f"{nome} [já no sistema: {numero}]")
                continue
        except:
            pass

        # Trata duplicatas de número no mesmo lote (ex: dois arquivos com OMISS 61)
        omis_key = numero
        if numero in numeros_vistos:
            # Gera sufixo B, C...
            for suffix in 'BCDEFGH':
                candidate = f"{numero}-{suffix}"
                if candidate not in numeros_vistos:
                    omis_key = candidate
                    break
        numeros_vistos.add(omis_key)

        try:
            obj = construir_omis(omis_key, texto)
            if obj:
                registros.append(obj)
                print(f"  ✓ {obj['omis_number']} | {obj['date']} | {obj['mission'][:45]}")
            else:
                erros_parsing.append((nome, 'Data não encontrada'))
        except Exception as e:
            erros_parsing.append((nome, str(e)))
            print(f"  ✗ ERRO em {nome}: {e}")

    print(f"\nTotal parsados: {len(registros)} | Ignorados: {len(ignorados)} | Erros: {len(erros_parsing)}")
    if erros_parsing:
        print("\n⚠ Arquivos com erro de parsing:")
        for nome, motivo in erros_parsing:
            print(f"   - {nome}: {motivo}")

    return registros, ignorados, erros_parsing

# ── Entrypoint ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Importa OMIS 2026 para o Supabase')
    parser.add_argument('--lote', type=int, choices=[1,2,3,4,5], help='Mês a processar (1=Jan, 2=Fev, ...)')
    parser.add_argument('--todos', action='store_true', help='Processa todos os lotes em sequência')
    parser.add_argument('--dry-run', action='store_true', help='Simula sem inserir no banco')
    parser.add_argument('--sql', action='store_true', help='Gera arquivo SQL para executar via MCP')
    args = parser.parse_args()

    lotes_processar = list(LOTES.keys()) if args.todos else ([args.lote] if args.lote else [])
    if not lotes_processar:
        parser.print_help()
        sys.exit(0)

    todos_registros = []
    for n in lotes_processar:
        regs, ign, errs = processar_lote(LOTES[n], dry_run=args.dry_run)
        todos_registros.extend(regs)

    if args.sql and todos_registros:
        sql_path = PROJECT_DIR / 'scripts' / 'omis_2026_import.sql'
        sql_content = gerar_sql(todos_registros)
        sql_path.write_text(sql_content, encoding='utf-8')
        print(f"\n✓ SQL gerado em: {sql_path}")
        print(f"  Total de INSERT statements: {len(todos_registros)}")
        print(f"  Execute via MCP: mcp_supabase-mcp-server_execute_sql")
    elif not args.dry_run and not args.sql and todos_registros:
        print(f"\nInserindo {len(todos_registros)} OMIS no Supabase...")
        suc, err = inserir_supabase(todos_registros)
        print(f"\nResultado final: {suc} inseridas, {err} erros.")
