import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, CheckCircle, XCircle, Clock, Truck, ShieldCheck, AlertCircle, Lock } from 'lucide-react';

interface LoanRequest {
    id: string;
    id_material: string;
    id_usuario: string;
    status: string;
    observacao: string;
    quantidade?: number;
    autorizado_por?: string;
    entregue_por?: string;
    recebido_por?: string;
    created_at: string;
    material: {
        material: string;
        tipo_de_material: string;
        qtdisponivel: number;
    } | any;
    solicitante?: {
        rank: string;
        war_name: string;
    };
}

interface LoanApprovalsProps {
    user: any;
}

export const SAP03Panel: React.FC<LoanApprovalsProps> = ({ user }) => {
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
    const [activeTab, setActiveTab] = useState<'Solicitações' | 'Devoluções' | 'Em Uso' | 'Histórico'>('Solicitações');

    const [showDirectRelease, setShowDirectRelease] = useState(false);
    const [showDirectReturn, setShowDirectReturn] = useState(false);
    const [directSaram, setDirectSaram] = useState('');
    const [directMaterialId, setDirectMaterialId] = useState('');
    const [directQuantity, setDirectQuantity] = useState(1);
    const [isSearchingSaram, setIsSearchingSaram] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);
    const [materialSearch, setMaterialSearch] = useState('');
    const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);

    // Signature Modal States
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signaturePassword, setSignaturePassword] = useState('');
    const [signatureAction, setSignatureAction] = useState<'release' | 'return' | 'update_release' | 'update_return' | null>(null);
    const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        const { data } = await supabase
            .from('gestao_estoque')
            .select('id, material, qtdisponivel')
            .gt('qtdisponivel', 0)
            .order('material');
        if (data) setInventory(data);
    };

    const fetchRequests = async () => {
        setLoading(true);
        // Fetch raw requests with material join
        const { data: rawData, error } = await supabase
            .from('movimentacao_cautela')
            .select(`
                id, id_material, id_usuario, status, observacao, quantidade, 
                autorizado_por, entregue_por, recebido_por, created_at,
                material:gestao_estoque(material, tipo_de_material, qtdisponivel)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching loans:', error);
            setLoading(false);
            return;
        }

        if (rawData && rawData.length > 0) {
            // Manually get all unique user IDs to fetch their info
            const userIds = Array.from(new Set(rawData.map(r => r.id_usuario)));

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, rank, war_name, name')
                .in('id', userIds);

            if (userError) {
                console.error('Error fetching users for labels:', userError);
                setRequests(rawData); // show with ID if users fetch fails
            } else {
                // Map users to requests
                const userMap = (userData || []).reduce((acc: any, u) => {
                    acc[u.id] = { rank: u.rank, war_name: u.war_name || u.name };
                    return acc;
                }, {});

                const enrichedData = rawData.map(r => ({
                    ...r,
                    solicitante: userMap[r.id_usuario]
                }));

                setRequests(enrichedData);
            }
        } else {
            setRequests([]);
        }
        setLoading(false);
    };

    // Auto-search user by SARAM
    useEffect(() => {
        const timer = setTimeout(() => {
            if (directSaram.length >= 4) {
                handleSaramSearch();
            } else {
                setFoundUser(null);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [directSaram]);

    const handleSaramSearch = async () => {
        setIsSearchingSaram(true);
        const { data, error } = await supabase
            .from('users')
            .select('id, name, rank, war_name, password')
            .eq('saram', directSaram.replace(/\D/g, ''))
            .single();

        if (data) {
            setFoundUser(data);
        } else {
            setFoundUser(null);
        }
        setIsSearchingSaram(false);
    };

    const startSignatureFlow = async (requestId: string, userId: string, action: 'update_release' | 'update_return') => {
        setActionLoading(requestId);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, rank, war_name, password')
                .eq('id', userId)
                .single();

            if (data) {
                setFoundUser(data);
                setSignatureRequestId(requestId);
                setSignatureAction(action);
                setShowSignatureModal(true);
            } else {
                alert('Militar não encontrado para assinatura.');
            }
        } catch (err) {
            console.error('Error starting signature flow:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaramBlur = async () => {
        if (directSaram.length < 4) return;
        setIsSearchingSaram(true);
        setFoundUser(null);
        const { data, error } = await supabase
            .from('users')
            .select('id, name, rank, war_name')
            .eq('saram', directSaram)
            .single();

        if (data) {
            setFoundUser(data);
        } else {
            alert('Militar não encontrado com este SARAM.');
        }
        setIsSearchingSaram(false);
    };

    const handleDirectRelease = async () => {
        if (!foundUser || !directMaterialId) {
            alert('Selecione um militar válido e um material.');
            return;
        }
        setSignatureAction('release');
        setShowSignatureModal(true);
    };

    const handleDirectReturn = async () => {
        if (!foundUser || !directMaterialId) {
            alert('Selecione um militar válido e um material.');
            return;
        }
        setSignatureAction('return');
        setShowSignatureModal(true);
    };

    const confirmSignature = async () => {
        if (!foundUser || signaturePassword !== foundUser.password) {
            alert('Senha incorreta!');
            return;
        }

        setActionLoading('signature');
        try {
            const userName = `${user.rank || ''} ${user.war_name || user.name}`.trim();
            const militaryName = `${foundUser.rank} ${foundUser.war_name || foundUser.name}`.trim();
            const now = new Date().toISOString();

            if (signatureAction === 'release') {
                const { error } = await supabase
                    .from('movimentacao_cautela')
                    .insert([{
                        id_material: directMaterialId,
                        id_usuario: foundUser.id,
                        status: 'Em Uso',
                        quantidade: directQuantity,
                        autorizado_por: userName,
                        entregue_por: userName,
                        observacao: `Assinado digitalmente por ${militaryName} em ${new Date().toLocaleString()}`,
                        created_at: now
                    }]);
                if (error) throw error;
                alert('Material liberado com sucesso!');
            } else if (signatureAction === 'return') {
                const { error } = await supabase
                    .from('movimentacao_cautela')
                    .insert([{
                        id_material: directMaterialId,
                        id_usuario: foundUser.id,
                        status: 'Concluído',
                        quantidade: directQuantity,
                        autorizado_por: userName,
                        entregue_por: userName,
                        recebido_por: userName,
                        observacao: `Devolução Direta: Assinado digitalmente por ${militaryName} em ${new Date().toLocaleString()}`,
                        created_at: now
                    }]);
                if (error) throw error;
                alert('Devolução registrada com sucesso!');
            } else if (signatureAction === 'update_release' && signatureRequestId) {
                const { error } = await supabase
                    .from('movimentacao_cautela')
                    .update({
                        status: 'Em Uso',
                        entregue_por: userName,
                        observacao: `Retirada assinada digitalmente por ${militaryName} em ${new Date().toLocaleString()}`
                    })
                    .eq('id', signatureRequestId);
                if (error) throw error;
                alert('Entrega confirmada e assinada!');
            } else if (signatureAction === 'update_return' && signatureRequestId) {
                const { error } = await supabase
                    .from('movimentacao_cautela')
                    .update({
                        status: 'Concluído',
                        recebido_por: userName,
                        observacao: `Devolução assinada digitalmente por ${militaryName} em ${new Date().toLocaleString()}`
                    })
                    .eq('id', signatureRequestId);
                if (error) throw error;
                alert('Devolução aprovada e assinada!');
            }

            setDirectSaram('');
            setDirectMaterialId('');
            setDirectQuantity(1);
            setFoundUser(null);
            setShowDirectRelease(false);
            setShowDirectReturn(false);
            setShowSignatureModal(false);
            setSignaturePassword('');
            setSignatureRequestId(null);
            setMaterialSearch('');
            fetchRequests();
        } catch (err: any) {
            console.error('Error in signature action:', err);
            alert('Erro ao processar: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const updateStatus = async (id: string, newStatus: string, observation?: string, incrementExit?: boolean, materialId?: string, quantity: number = 1, auditorName?: string) => {
        setActionLoading(id);
        try {
            const updates: any = { status: newStatus };
            if (observation !== undefined) updates.observacao = observation;

            // Set audit fields based on status
            if (newStatus === 'Aprovado' && auditorName) updates.autorizado_por = auditorName;
            if (newStatus === 'Em Uso' && auditorName) updates.entregue_por = auditorName;
            if (newStatus === 'Concluído' && auditorName) updates.recebido_por = auditorName;

            const { error } = await supabase
                .from('movimentacao_cautela')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            // If rejecting return (loss), increment 'saida' in stock
            if (incrementExit && materialId) {
                // First get current 'saida'
                const { data: matData, error: matError } = await supabase
                    .from('gestao_estoque')
                    .select('saida')
                    .eq('id', materialId)
                    .single();

                if (matError) throw matError;

                const newSaida = (matData.saida || 0) + quantity;

                const { error: updateError } = await supabase
                    .from('gestao_estoque')
                    .update({ saida: newSaida })
                    .eq('id', materialId);

                if (updateError) throw updateError;
            }

            fetchRequests();
        } catch (err: any) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectReturn = async (request: LoanRequest) => {
        const obs = prompt('Motivo da rejeição (Isso pode implicar perda de material):');
        if (obs === null) return; // Cancelled

        // Ask if it's a loss
        const isLoss = confirm('Isso configura perda/baixa de material? (Clique em OK para sim, Cancelar para rejeição simples sem baixa)');

        await updateStatus(request.id, 'Rejeitado', obs, isLoss, request.id_material, request.quantidade);
    };

    const filteredRequests = requests.filter(req => {
        if (activeTab === 'Solicitações') return ['Pendente', 'Aprovado', 'Aguardando Confirmação'].includes(req.status);
        if (activeTab === 'Devoluções') return req.status === 'Pendente Devolução';
        if (activeTab === 'Em Uso') return req.status === 'Em Uso';
        if (activeTab === 'Histórico') return ['Concluído', 'Rejeitado'].includes(req.status);
        return true;
    });

    if (loading) return <div className="text-center p-8 text-slate-500">Carregando aprovações...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-slate-800">
                    <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Material e Cautela (SAP-03)</h1>
                        <p className="text-slate-500 text-sm font-medium">Gerencie o fluxo de materiais da seção.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setShowDirectRelease(!showDirectRelease); setShowDirectReturn(false); }}
                        className={`px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${showDirectRelease ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        {showDirectRelease ? 'Cancelar Liberação' : 'Liberação Direta'}
                    </button>
                    <button
                        onClick={() => { setShowDirectReturn(!showDirectReturn); setShowDirectRelease(false); }}
                        className={`px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${showDirectReturn ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                    >
                        <CheckCircle className="w-4 h-4" />
                        {showDirectReturn ? 'Cancelar Devolução' : 'Devolução Direta'}
                    </button>
                    <button onClick={fetchRequests} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm">
                        <Clock className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Direct Release/Return Form */}
            {(showDirectRelease || showDirectReturn) && (
                <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-xl shadow-blue-50 space-y-4 animate-scale-in">
                    <h2 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                        <div className={`w-2 h-2 rounded-full ${showDirectRelease ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
                        {showDirectRelease ? 'Nova Liberação Direta (Sem Solicitação)' : 'Nova Devolução Direta (Sem fluxo pendente)'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">SARAM do Militar</label>
                            <input
                                type="text"
                                value={directSaram}
                                onChange={(e) => setDirectSaram(e.target.value)}
                                placeholder="Digite o SARAM..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none"
                            />
                            {isSearchingSaram && <p className="text-[10px] font-bold text-blue-500 mt-1 animate-pulse">Buscando militar...</p>}
                            {foundUser && <p className="text-[10px] font-bold text-green-600 mt-1">✓ {foundUser.rank} {foundUser.war_name || foundUser.name}</p>}
                            {directSaram.length >= 4 && !foundUser && !isSearchingSaram && <p className="text-[10px] font-bold text-red-500 mt-1">Militar não encontrado.</p>}
                        </div>
                        <div className="md:col-span-2 space-y-1 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Buscar Material</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={materialSearch}
                                    onChange={(e) => {
                                        setMaterialSearch(e.target.value);
                                        setIsMaterialDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsMaterialDropdownOpen(true)}
                                    placeholder="Digite o nome do material..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none"
                                />
                                <Package className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            </div>

                            {isMaterialDropdownOpen && materialSearch && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden">
                                    {inventory
                                        .filter(item => item.material.toLowerCase().includes(materialSearch.toLowerCase()))
                                        .map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setDirectMaterialId(item.id);
                                                    setMaterialSearch(item.material);
                                                    setIsMaterialDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{item.material}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{item.qtdisponivel} unidades disponíveis</p>
                                                </div>
                                                {directMaterialId === item.id && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                            </button>
                                        ))}
                                    {inventory.filter(item => item.material.toLowerCase().includes(materialSearch.toLowerCase())).length === 0 && (
                                        <div className="p-4 text-center text-slate-400 text-sm font-medium">Nenhum material encontrado.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Quantidade</label>
                            <input
                                type="number"
                                min="1"
                                value={directQuantity}
                                onChange={(e) => setDirectQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-black outline-none text-center"
                            />
                        </div>

                        <div className="md:col-span-4 flex justify-end">
                            <button
                                onClick={showDirectRelease ? handleDirectRelease : handleDirectReturn}
                                disabled={actionLoading === 'direct' || !foundUser || !directMaterialId}
                                className={`min-w-[200px] h-[50px] text-white rounded-xl font-black transition-all disabled:opacity-50 shadow-lg text-sm uppercase tracking-widest ${showDirectRelease ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                {actionLoading === 'direct' ? 'Processando...' : (showDirectRelease ? 'Liberar Agora' : 'Devolver Agora')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-fit self-start border border-slate-200 overflow-x-auto">
                {(['Solicitações', 'Devoluções', 'Em Uso', 'Histórico'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab
                            ? 'bg-white text-blue-600 shadow-md'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px]">
                            {requests.filter(req => {
                                if (tab === 'Solicitações') return ['Pendente', 'Aprovado', 'Aguardando Confirmação'].includes(req.status);
                                if (tab === 'Devoluções') return req.status === 'Pendente Devolução';
                                if (tab === 'Em Uso') return req.status === 'Em Uso';
                                if (tab === 'Histórico') return ['Concluído', 'Rejeitado'].includes(req.status);
                                return false;
                            }).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl border-dashed border-2 border-slate-200 text-slate-400 space-y-3">
                        <AlertCircle className="w-12 h-12 text-slate-200 mx-auto" />
                        <p className="font-bold">Nenhuma cautela em "{activeTab}"</p>
                    </div>
                ) : (
                    filteredRequests.map(req => (
                        <div
                            key={req.id}
                            onClick={() => setSelectedRequest(req)}
                            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center cursor-pointer hover:border-blue-300 transition-all"
                        >

                            {/* Icon based on status */}
                            <div className={`p-4 rounded-full shrink-0 ${req.status === 'Pendente' ? 'bg-yellow-100 text-yellow-600' :
                                req.status === 'Aprovado' ? 'bg-blue-100 text-blue-600' :
                                    req.status === 'Pendente Devolução' ? 'bg-purple-100 text-purple-600' :
                                        req.status === 'Concluído' ? 'bg-green-100 text-green-600' :
                                            'bg-slate-100 text-slate-600'
                                }`}>
                                {req.status === 'Pendente' && <Clock className="w-6 h-6" />}
                                {req.status === 'Aprovado' && <CheckCircle className="w-6 h-6" />}
                                {req.status === 'Em Uso' && <Truck className="w-6 h-6" />}
                                {req.status === 'Pendente Devolução' && <Package className="w-6 h-6" />}
                                {req.status === 'Concluído' && <CheckCircle className="w-6 h-6" />}
                                {req.status === 'Rejeitado' && <XCircle className="w-6 h-6" />}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg text-slate-900">
                                        {req.quantidade && req.quantidade > 1 && <span className="text-blue-600 mr-2">{req.quantidade}x</span>}
                                        {req.material?.material || 'Material Desconhecido'}
                                    </h3>
                                    <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500 font-bold uppercase">{req.status}</span>
                                </div>
                                <p className="text-sm text-slate-500 mb-1">
                                    Solicitante: <span className="font-bold text-slate-700">
                                        {req.solicitante ? `${req.solicitante.rank} ${req.solicitante.war_name}` : `ID: ${req.id_usuario}`}
                                    </span>
                                </p>
                                <p className="text-xs text-slate-400">
                                    {new Date(req.created_at).toLocaleString()}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                    {req.autorizado_por && (
                                        <p className="text-[10px] text-slate-500">
                                            <span className="font-bold">Autorizado por:</span> {req.autorizado_por}
                                        </p>
                                    )}
                                    {req.entregue_por && (
                                        <p className="text-[10px] text-slate-500">
                                            <span className="font-bold">Entregue por:</span> {req.entregue_por}
                                        </p>
                                    )}
                                    {req.recebido_por && (
                                        <p className="text-[10px] text-slate-500">
                                            <span className="font-bold">Recebido por:</span> {req.recebido_por}
                                        </p>
                                    )}
                                </div>
                                {req.observacao && (
                                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-100">
                                        Obs: {req.observacao}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                {req.status === 'Pendente' && (
                                    <button
                                        onClick={() => updateStatus(req.id, 'Aprovado', undefined, false, undefined, 1, `${user.rank} ${user.war_name}`)}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Aprovar Solicitação
                                    </button>
                                )}

                                {req.status === 'Aguardando Confirmação' && (
                                    <button
                                        onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_release')}
                                        disabled={!!actionLoading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Truck className="w-4 h-4" /> Confirmar Entrega (Assinar)
                                    </button>
                                )}

                                {req.status === 'Pendente Devolução' && (
                                    <>
                                        <button
                                            onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_return')}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Aprovar Devolução (Assinar)
                                        </button>
                                        <button
                                            onClick={() => handleRejectReturn(req)}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Rejeitar Devolução
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                <Package className="w-6 h-6 text-blue-600" />
                                Detalhes da Cautela
                            </h3>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(null); }}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material</p>
                                    <p className="font-bold text-slate-800">{selectedRequest.material?.material || 'Desconhecido'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase">{selectedRequest.status}</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade</p>
                                    <p className="text-slate-800">{selectedRequest.quantidade || 1} un.</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Pedido</p>
                                    <p className="text-slate-800">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 flex items-center gap-2 border-b border-slate-200 pb-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                    TRILHA DE AUDITORIA
                                </h4>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <CheckCircle className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Autorizado Por</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedRequest.autorizado_por || '---'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                            <Truck className="w-4 h-4 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Entregue Por</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedRequest.entregue_por || '---'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Recebido Por (Devolução)</p>
                                            <p className="text-sm font-semibold text-slate-700">{selectedRequest.recebido_por || '---'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedRequest.observacao && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observações</p>
                                    <p className="text-sm text-slate-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 italic">
                                        "{selectedRequest.observacao}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Signature Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-8 pb-4 text-center">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-10 h-10 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Assinar Cautela</h3>
                            <p className="text-slate-500 text-sm font-medium mt-1">O militar deve inserir sua senha para {signatureAction === 'release' ? 'autorizar a retirada' : 'confirmar a devolução'}.</p>
                        </div>

                        <div className="p-8 pt-0 space-y-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm font-bold text-blue-600">
                                        {foundUser?.rank || '?'}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Militar</p>
                                        <p className="font-bold text-slate-800">{foundUser?.war_name || foundUser?.name}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Lock className="w-3 h-3" /> Senha do App
                                </label>
                                <input
                                    type="password"
                                    value={signaturePassword}
                                    onChange={(e) => setSignaturePassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-lg outline-none focus:border-blue-500 transition-all text-center tracking-[0.5em]"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && confirmSignature()}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => { setShowSignatureModal(false); setSignaturePassword(''); }}
                                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmSignature}
                                    disabled={!signaturePassword || !!actionLoading}
                                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? 'Verificando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SAP03Panel;
