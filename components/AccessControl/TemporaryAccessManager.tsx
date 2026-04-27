
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { User as UserIcon, Shield, UserPlus, Clock, QrCode, Search, Trash2, CheckCircle, AlertCircle, Loader2, Download, Save, RefreshCw, X, ArrowRight, Users as UsersIcon } from 'lucide-react';
import { User } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { format, addHours, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Visitor {
    id: string;
    name: string;
    identification: string;
    characteristic: string;
}

interface AccessRequest {
    id: string;
    visitor_id: string;
    code: string;
    valid_until: string;
    status: string;
    created_at: string;
    visitor?: Visitor;
    destination?: string;
}

interface TemporaryAccessManagerProps {
    currentUser: User;
    isDarkMode: boolean;
}

export default function TemporaryAccessManager({ currentUser, isDarkMode }: TemporaryAccessManagerProps) {
    const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
    const [savedVisitors, setSavedVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showQR, setShowQR] = useState<AccessRequest | null>(null);

    // Form State
    const [visitorName, setVisitorName] = useState('');
    const [identification, setIdentification] = useState('');
    const [characteristic, setCharacteristic] = useState('CIVIL');
    const [destination, setDestination] = useState('');
    const [durationHours, setDurationHours] = useState('24');
    const [saveVisitor, setSaveVisitor] = useState(true);
    const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [currentUser.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch personal access requests
            const { data: requests, error: reqError } = await supabase
                .from('temporary_access_requests')
                .select('*, visitor:visitor_catalog(*)')
                .eq('requester_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;
            setAccessRequests(requests || []);

            // Fetch saved visitors
            const { data: visitors, error: visError } = await supabase
                .from('visitor_catalog')
                .select('*')
                .order('name');

            if (visError) throw visError;
            setSavedVisitors(visitors || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVisitor = (visitor: Visitor) => {
        setVisitorName(visitor.name);
        setIdentification(visitor.identification);
        setCharacteristic(visitor.characteristic);
        setSelectedVisitorId(visitor.id);
        setSaveVisitor(false); // Already saved
    };

    const resetForm = () => {
        setVisitorName('');
        setIdentification('');
        setCharacteristic('CIVIL');
        setDestination('');
        setDurationHours('24');
        setSaveVisitor(true);
        setSelectedVisitorId(null);
        setIsCreating(false);
    };

    const handleCreateAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitorName || !identification) return;

        setIsSubmitting(true);
        try {
            let visitorId = selectedVisitorId;

            // 1. Save or Update Visitor in Catalog if requested
            if (saveVisitor && !selectedVisitorId) {
                const { data: existingVis } = await supabase
                    .from('visitor_catalog')
                    .select('id')
                    .eq('identification', identification)
                    .maybeSingle();

                if (existingVis) {
                    visitorId = existingVis.id;
                } else {
                    const { data: newVis, error: visError } = await supabase
                        .from('visitor_catalog')
                        .insert([{
                            name: visitorName.toUpperCase(),
                            identification,
                            characteristic,
                            requester_id: currentUser.id
                        }])
                        .select()
                        .single();
                    
                    if (visError) throw visError;
                    visitorId = newVis.id;
                }
            }

            // If we don't have a visitorId and didn't save, we still need a visitor entry (or we could change schema)
            // For simplicity, let's ensure visitor exists in catalog
            if (!visitorId) {
                 const { data: newVis, error: visError } = await supabase
                    .from('visitor_catalog')
                    .insert([{
                        name: visitorName.toUpperCase(),
                        identification,
                        characteristic,
                        requester_id: currentUser.id
                    }])
                    .select()
                    .single();
                
                if (visError) throw visError;
                visitorId = newVis.id;
            }

            // 2. Create Access Request
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const validUntil = addHours(new Date(), parseInt(durationHours)).toISOString();

            const { error: reqError } = await supabase
                .from('temporary_access_requests')
                .insert([{
                    requester_id: currentUser.id,
                    visitor_id: visitorId,
                    code,
                    valid_until: validUntil,
                    destination: destination.toUpperCase(),
                    status: 'PENDING'
                }]);

            if (reqError) throw reqError;

            resetForm();
            fetchData();
            alert('Acesso temporário criado com sucesso!');
        } catch (error: any) {
            console.error('Error creating access:', error);
            alert(`Erro: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (request: AccessRequest) => {
        const isExpired = !isAfter(new Date(request.valid_until), new Date());
        
        if (request.status === 'USED') return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-lg">USADO</span>;
        if (request.status === 'CANCELED') return <span className="px-2 py-1 bg-slate-500/10 text-slate-500 text-[10px] font-black rounded-lg">CANCELADO</span>;
        if (isExpired) return <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded-lg">EXPIRADO</span>;
        
        return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-lg">ATIVO</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Acessos Temporários</h2>
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gerencie seus convidados e gere QR Codes</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                >
                    <UserPlus className="w-4 h-4" /> Novo Acesso
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* List of Requests */}
                <div className="lg:col-span-8 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : accessRequests.length === 0 ? (
                        <div className={`p-12 border-2 border-dashed rounded-3xl text-center ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-black uppercase tracking-widest text-sm text-slate-400">Nenhum acesso gerado</h3>
                            <p className="text-xs text-slate-500 mt-2">Você ainda não criou nenhum QR Code para visitantes.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {accessRequests.map((req) => (
                                <div 
                                    key={req.id} 
                                    className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                <QrCode className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-black uppercase truncate max-w-[120px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                    {req.visitor?.name || 'Visitante'}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(req)}
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{req.visitor?.characteristic}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowQR(req)}
                                            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            <QrCode className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-bold text-slate-500 uppercase">Identificação</span>
                                            <span className={`font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{req.visitor?.identification}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="font-bold text-slate-500 uppercase">Válido Até</span>
                                            <span className={`font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {format(new Date(req.valid_until), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                        {req.destination && (
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="font-bold text-slate-500 uppercase">Destino</span>
                                                <span className={`font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{req.destination}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`pt-3 border-t flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Código: {req.code}</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase italic">GSD-SP SECURE ACCESS</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar - Saved Visitors */}
                <div className="lg:col-span-4 space-y-6">
                    <div className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <UsersIcon className="w-4 h-4 text-blue-500" /> Visitantes Frequentes
                        </h3>
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {savedVisitors.length === 0 ? (
                                <p className="text-[10px] text-slate-500 font-bold uppercase text-center py-6">Nenhum visitante salvo</p>
                            ) : (
                                savedVisitors.map(vis => (
                                    <button
                                        key={vis.id}
                                        onClick={() => handleSelectVisitor(vis)}
                                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 group ${isDarkMode ? 'bg-slate-800 border-slate-800 hover:border-blue-500/50' : 'bg-white border-white hover:border-blue-200 shadow-sm'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isDarkMode ? 'bg-slate-900 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            {vis.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className={`text-xs font-black uppercase truncate max-w-[150px] ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{vis.name}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">{vis.characteristic} • {vis.identification}</div>
                                        </div>
                                        <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-blue-500 transition-all" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: New Access */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-xl text-white">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Gerar QR Code</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identificação segura de convidados</p>
                                </div>
                            </div>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAccess} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Visitante</label>
                                    <input 
                                        type="text"
                                        required
                                        className={`w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-600'}`}
                                        placeholder="Ex: João da Silva"
                                        value={visitorName}
                                        onChange={e => setVisitorName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação (CPF/RG)</label>
                                    <input 
                                        type="text"
                                        required
                                        className={`w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-600'}`}
                                        placeholder="000.000.000-00"
                                        value={identification}
                                        onChange={e => setIdentification(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Visitante</label>
                                    <select
                                        className={`w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-600'}`}
                                        value={characteristic}
                                        onChange={e => setCharacteristic(e.target.value)}
                                    >
                                        <option value="CIVIL">CIVIL</option>
                                        <option value="MILITAR">MILITAR</option>
                                        <option value="PRESTADOR">PRESTADOR</option>
                                        <option value="DEPENDENTE">DEPENDENTE</option>
                                        <option value="ENTREGADOR">ENTREGADOR</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validade do Acesso</label>
                                    <select
                                        className={`w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-600'}`}
                                        value={durationHours}
                                        onChange={e => setDurationHours(e.target.value)}
                                    >
                                        <option value="4">04 HORAS</option>
                                        <option value="12">12 HORAS</option>
                                        <option value="24">24 HORAS (1 DIA)</option>
                                        <option value="48">48 HORAS (2 DIAS)</option>
                                        <option value="168">01 SEMANA</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino (Residência/Setor)</label>
                                <input 
                                    type="text"
                                    className={`w-full p-3.5 border-2 rounded-xl text-xs font-black uppercase outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-blue-600'}`}
                                    placeholder="Ex: Bloco A - Apto 102"
                                    value={destination}
                                    onChange={e => setDestination(e.target.value)}
                                />
                            </div>

                            {!selectedVisitorId && (
                                <div className="pt-2">
                                    <label className={`flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${saveVisitor ? 'bg-blue-600/5 border-blue-600/30' : 'hover:bg-slate-50 border-slate-100'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={saveVisitor} 
                                            onChange={e => setSaveVisitor(e.target.checked)}
                                            className="w-5 h-5 rounded-lg text-blue-600"
                                        />
                                        <div>
                                            <span className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Salvar nos meus visitantes</span>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Facilite o preenchimento na próxima vez</p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Gerar Acesso Temporário</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Show QR Code */}
            {showQR && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
                    <div className={`w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl text-center p-8 space-y-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                        <div className="flex flex-col items-center gap-2">
                             <div className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-600/20 text-white mb-2">
                                <QrCode className="w-10 h-10" />
                            </div>
                            <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{showQR.visitor?.name}</h3>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Código: {showQR.code}</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-inner inline-block mx-auto">
                            <QRCodeSVG 
                                value={JSON.stringify({
                                    type: 'TEMP_ACCESS',
                                    id: showQR.id,
                                    code: showQR.code
                                })}
                                size={200}
                                level="H"
                                includeMargin={false}
                            />
                        </div>

                        <div className={`p-4 rounded-2xl space-y-2 text-left ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">
                                <Clock className="w-3 h-3" /> Expira em:
                            </div>
                            <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                {format(new Date(showQR.valid_until), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setShowQR(null)}
                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Fechar
                            </button>
                            <button 
                                onClick={() => {
                                    // Basic download logic
                                    const svg = document.querySelector('svg');
                                    if (svg) {
                                        const svgData = new XMLSerializer().serializeToString(svg);
                                        const canvas = document.createElement('canvas');
                                        const ctx = canvas.getContext('2d');
                                        const img = new Image();
                                        img.onload = () => {
                                            canvas.width = img.width;
                                            canvas.height = img.height;
                                            ctx?.drawImage(img, 0, 0);
                                            const pngUrl = canvas.toDataURL('image/png');
                                            const downloadLink = document.createElement('a');
                                            downloadLink.href = pngUrl;
                                            downloadLink.download = `QR_${showQR.visitor?.name}.png`;
                                            document.body.appendChild(downloadLink);
                                            downloadLink.click();
                                            document.body.removeChild(downloadLink);
                                        };
                                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                                    }
                                }}
                                className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-3 h-3" /> Baixar
                            </button>
                        </div>

                        <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">
                            Apresente este QR Code na portaria da OM para autorização de entrada. <br/>
                            <strong>Uso único por ciclo de permanência.</strong>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

