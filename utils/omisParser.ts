
import * as pdfjsLib from 'pdfjs-dist';
// Configura o worker para o pdfjs-dist no Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
    // @ts-ignore
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
} else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface ParsedOmis {
    omisNumber?: string;
    date?: string;
    mission?: string;
    location?: string;
    description?: string;
    requester?: string;
    transport?: boolean;
    food?: boolean;
    personnel: any[];
    schedule: any[];
    permanentOrders?: string;
    specialOrders?: string;
    missionCategory?: string;
    isInternal?: boolean;
}

export const parseOmisPdf = async (file: File): Promise<ParsedOmis | null> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return parseOmisText(fullText);
    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        return null;
    }
};

const parseOmisText = (text: string): ParsedOmis => {
    const result: ParsedOmis = {
        personnel: [],
        schedule: []
    };

    // 1. Número da OMIS
    const numMatch = text.match(/N[°º]\s*da\s*OMIS[:\s]+(\d+)\/GSD-SP/i);
    if (numMatch) {
        result.omisNumber = `${numMatch[1]}/GSD-SP`;
    }

    // 2. Data
    const dataMatch = text.match(/Data:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
    if (dataMatch) {
        let [_, d, m, y] = dataMatch;
        if (y.length === 2) y = `20${y}`;
        result.date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 3. Missão
    const missaoMatch = text.match(/Miss[ãa]o:\s*(.*?)(?=Local:|Descri[çc][ãa]o|Solicitante|PESSOAL|\n)/i);
    if (missaoMatch) {
        result.mission = missaoMatch[1].trim().toUpperCase();
    }

    // 4. Local
    const localMatch = text.match(/Local:\s*(.*?)(?=Descri[çc][ãa]o|Solicitante|PESSOAL|\n)/i);
    if (localMatch) {
        result.location = localMatch[1].trim().toUpperCase();
    }

    // 5. Descrição
    const descMatch = text.match(/Descri[çc][ãa]o\s+da\s+Miss[ãa]o:\s*(.*?)(?=Solicitante:|PESSOAL)/is);
    if (descMatch) {
        result.description = descMatch[1].trim();
    }

    // 6. Solicitante
    const solMatch = text.match(/Solicitante:\s*(.*?)(?=Transporte|Alimenta|PESSOAL)/i);
    if (solMatch) {
        result.requester = solMatch[1].trim();
    }

    // 7. Transporte / Alimentação
    result.transport = /Transporte:\s*SIM/i.test(text);
    result.food = /Alimenta[çc][ãa]o:\s*SIM/i.test(text);

    // 8. Categoria
    if (/Externa:\s*[X☑✓]/i.test(text)) {
        result.missionCategory = 'EXTERNA';
        result.isInternal = false;
    } else {
        result.missionCategory = 'INTERNA';
        result.isInternal = true;
    }

    // 9. Pessoal (Simplificado mas robusto)
    const RANKS = ['CEL', 'TEN CEL', 'TEN-CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP', 'SO', '1S', '2S', '3S', 'CB', 'S1', 'S2', 'REC', 'ALUNO', 'CADETE', 'SUB', 'TEN', 'SGT', 'SD'];
    
    // Procura o bloco de pessoal
    const pessoalBloco = text.match(/PESSOAL E MATERIAL(.*?)((?:QUADRO HOR[ÁA]RIO|ORDENS PERMANENTES))/is);
    if (pessoalBloco) {
        const linhas = pessoalBloco[1].split('\n').map(l => l.trim()).filter(l => l.length > 5);
        linhas.forEach(linha => {
            // Procura SARAM (7 a 8 dígitos, opcionalmente com hífen)
            const saramMatch = linha.match(/(\d{6,8}[-]?\d?)/);
            if (saramMatch) {
                const saram = saramMatch[1].replace(/[^0-9]/g, '');
                const partes = linha.split(/\s+/);
                const saramIdx = partes.findIndex(p => p.includes(saramMatch[1]));
                
                if (saramIdx !== -1) {
                    let rank = '';
                    let warName = '';
                    let func = '';

                    // Tenta achar o posto antes do SARAM
                    for (let i = saramIdx - 1; i >= 0; i--) {
                        const pNorm = partes[i].toUpperCase().replace(/[°º.]/g, '');
                        if (RANKS.includes(pNorm)) {
                            rank = partes[i];
                            warName = partes.slice(i + 1, saramIdx).join(' ');
                            func = partes.slice(0, i).join(' ');
                            break;
                        }
                    }

                    if (!rank) {
                        // Fallback se não achar posto conhecido
                        warName = partes.slice(Math.max(0, saramIdx - 2), saramIdx).join(' ');
                        func = partes.slice(0, Math.max(0, saramIdx - 2)).join(' ');
                    }

                    // Normalização de Função (estatísticas)
                    let funcNorm = func.toUpperCase();
                    if (funcNorm.includes('P.A') || funcNorm.includes('PA')) func = 'Efetivo PA';
                    else if (funcNorm.includes('S.I') || funcNorm.includes('SI')) func = 'Efetivo S.I';
                    else if (/(REC|ALUNO|CADETE|EACG)/i.test(funcNorm)) func = 'Efetivo REC';
                    else if (/(SEÇÃO|SECAO|SAP|SOP)/i.test(funcNorm)) func = 'Efetivo Seção';

                    result.personnel.push({
                        id: Math.random().toString(36).substring(2, 11),
                        function: func.trim() || 'EFETIVO',
                        rank: rank.trim() || 'S2',
                        warName: warName.trim(),
                        saram: saram,
                        uniform: partes[saramIdx + 1] || '10ª',
                        armament: partes[saramIdx + 2] || '',
                        ammunition: partes.slice(saramIdx + 3).join(' ') || ''
                    });
                }
            }
        });
    }

    // 10. Quadro Horário
    const scheduleBloco = text.match(/QUADRO HOR[ÁA]RIO(.*?)((?:ORDENS PERMANENTES|$))/is);
    if (scheduleBloco) {
        const linhas = scheduleBloco[1].split('\n').map(l => l.trim()).filter(l => l.length > 5);
        linhas.forEach(linha => {
            const horaMatch = linha.match(/(\d{2})[H: ]\s*(\d{2})/);
            const dataMatch = linha.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
            
            if (horaMatch) {
                const parts = linha.split(/\s+/);
                const event = parts[0] || 'MISSÃO';
                const location = parts.slice(1).join(' ').replace(/\d{2}[H: ]\s*\d{2}/, '').replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/, '').trim();
                
                result.schedule.push({
                    id: Math.random().toString(36).substring(2, 11),
                    event: event,
                    location: location,
                    startTime: `${horaMatch[1]}:${horaMatch[2]}`,
                    endTime: ''
                });
            }
        });
    }

    // 11. Ordens
    const permMatch = text.match(/ORDENS PERMANENTES\s*(.*?)(?=ORDENS ESPECIAIS|$)/is);
    if (permMatch) result.permanentOrders = permMatch[1].trim();
    
    const espMatch = text.match(/ORDENS ESPECIAIS\s*(.*?)(?=[A-Z]{2,}\s+[A-Z]{2,}|$)/is);
    if (espMatch) result.specialOrders = espMatch[1].trim();

    return result;
};
