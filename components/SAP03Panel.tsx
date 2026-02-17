import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Package, CheckCircle, XCircle, Clock, Truck, ShieldCheck, AlertCircle, Lock, Plus, Trash2, ChevronDown, ChevronUp, BarChart3, PieChart as PieIcon, History, Fingerprint, MapPin } from 'lucide-react';
import { authenticateBiometrics } from '../services/webauthn';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
        endereco?: string;
    } | any;
    solicitante?: {
        rank: string;
        war_name: string;
        saram: string;
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
    const [showReceiveMaterial, setShowReceiveMaterial] = useState(false);
    const [directSaram, setDirectSaram] = useState('');
    const [directMaterialId, setDirectMaterialId] = useState('');
    const [directQuantity, setDirectQuantity] = useState(1);
    const [isSearchingSaram, setIsSearchingSaram] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);
    const [materialSearch, setMaterialSearch] = useState('');
    const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<{ id_material: string, material: string, quantidade: number, endereco?: string }[]>([]);
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

    // Mass Action States
    const [inUseSearch, setInUseSearch] = useState('');
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

    // Signature Modal States
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signaturePassword, setSignaturePassword] = useState('');
    const [signatureAction, setSignatureAction] = useState<'release' | 'approve' | 'return' | 'update_release' | 'update_return'>('release');
    const [signatureRequestId, setSignatureRequestId] = useState<string | string[] | null>(null);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showSignatureModal) {
                setShowSignatureModal(false);
                setSignaturePassword('');
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showSignatureModal]);

    useEffect(() => {
        fetchRequests();
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        const { data } = await supabase
            .from('gestao_estoque')
            .select('id, material, qtdisponivel, endereco')
            .gt('qtdisponivel', 0)
            .order('material');
        if (data) setInventory(data);
    };

    const fetchRequests = async () => {
        setLoading(true);
        const { data: rawData, error } = await supabase
            .from('movimentacao_cautela')
            .select(`
                id, id_material, id_usuario, status, observacao, quantidade, 
                autorizado_por, entregue_por, recebido_por, created_at,
                material:gestao_estoque(material, tipo_de_material, qtdisponivel, endereco)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching loans:', error);
            setLoading(false);
            return;
        }

        if (rawData && rawData.length > 0) {
            const userIds = Array.from(new Set(rawData.map(r => r.id_usuario)));
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, rank, war_name, name, saram')
                .in('id', userIds);

            if (userError) {
                console.error('Error fetching users for labels:', userError);
                setRequests(rawData);
            } else {
                const userMap = (userData || []).reduce((acc: any, u) => {
                    acc[u.id] = { rank: u.rank, war_name: u.war_name || u.name, saram: u.saram };
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
        const { data } = await supabase
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

    const startSignatureFlow = async (requestId: string | string[], userId: string, action: 'update_release' | 'update_return') => {
        setSignatureRequestId(requestId);
        try {
            const { data } = await supabase
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
        const { data } = await supabase
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
        // If no items selected but inputs are filled, try to add the current input item
        if (selectedItems.length === 0 && directMaterialId && foundUser) {
            const mat = inventory.find(i => i.id === directMaterialId);
            if (mat) {
                const singleItem = {
                    id_material: directMaterialId,
                    material: mat.material,
                    quantidade: directQuantity
                };
                // Proceed with this single item
                setSelectedItems([singleItem]);
                // We need to wait for state update? No, we can pass it directly or rely on state in next render.
                // Actually, state updates are async. Better to refactor to pass items to signature flow explicitly?
                // The signature flow uses 'selectedItems' from state. 
                // A safer way is to update state AND set a flag or just temporarily use a local variable if modifying signature logic.
                // But confirmSignature reads from selectedItems state.
                // Pre-add the item to selectedItems for the signature modal to see
                setSelectedItems([singleItem]);
                // We also need to ensure the state is treated as valid for the next step.
                // React state updates are async, so we might need a small delay or refactor confirmSignature to use local vars if needed.
                // However, the modal opening is what matters here.
            }
        } else if (!foundUser || selectedItems.length === 0) {
            alert('Selecione um militar válido e pelo menos um material.');
            return;
        }
        setSignatureAction('release');
        setShowSignatureModal(true);
    };

    const handleReceiveMaterial = async () => {
        // Same logic for receive
        if (selectedItems.length === 0 && directMaterialId && foundUser) {
            const mat = inventory.find(i => i.id === directMaterialId);
            if (mat) {
                const singleItem = {
                    id_material: directMaterialId,
                    material: mat.material,
                    quantidade: directQuantity
                };
                setSelectedItems([singleItem]);
            }
        } else if (!foundUser || selectedItems.length === 0) {
            alert('Selecione um militar válido e pelo menos um material.');
            return;
        }
        setSignatureAction('return');
        setShowSignatureModal(true);
    };

    const addItem = () => {
        if (!directMaterialId) {
            alert('Selecione um material primeiro.');
            return;
        }
        const mat = inventory.find(i => i.id === directMaterialId);
        if (!mat) return;

        setSelectedItems([...selectedItems, {
            id_material: directMaterialId,
            material: mat.material,
            quantidade: directQuantity,
            endereco: mat.endereco
        }]);

        setDirectMaterialId('');
        setMaterialSearch('');
        setDirectQuantity(1);
    };

    const removeItem = (idx: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== idx));
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
                const inserts = selectedItems.map(item => ({
                    id_material: item.id_material,
                    id_usuario: foundUser.id,
                    status: 'Em Uso',
                    quantidade: item.quantidade,
                    autorizado_por: userName,
                    entregue_por: userName,
                    observacao: `Assinado digitalmente por ${militaryName} em ${new Date().toLocaleString()}`,
                    created_at: now
                }));
                const { error } = await supabase.from('movimentacao_cautela').insert(inserts);
                if (error) throw error;
                alert('Materiais liberados com sucesso!');
            } else if (signatureAction === 'approve' && signatureRequestId) {
                if (Array.isArray(signatureRequestId)) {
                    const { error } = await supabase
                        .from('movimentacao_cautela')
                        .update({
                            status: 'Aprovado',
                            autorizado_por: userName,
                            observacao: `Aprovação em lote: Autorizado com assinatura digital por ${userName} em ${new Date().toLocaleString()}`
                        })
                        .in('id', signatureRequestId);
                    if (error) throw error;
                    alert(`${signatureRequestId.length} solicitações aprovadas com sucesso!`);
                } else {
                    const { error } = await supabase
                        .from('movimentacao_cautela')
                        .update({
                            status: 'Aprovado',
                            autorizado_por: userName,
                            observacao: `Autorizado com assinatura digital por ${userName} em ${new Date().toLocaleString()}`
                        })
                        .eq('id', signatureRequestId as string);
                    if (error) throw error;
                    alert('Solicitação aprovada e assinada!');
                }
            } else if (signatureAction === 'return') {
                const inserts = selectedItems.map(item => ({
                    id_material: item.id_material,
                    id_usuario: foundUser.id,
                    status: 'Concluído',
                    quantidade: item.quantidade,
                    autorizado_por: userName,
                    entregue_por: userName,
                    recebido_por: userName,
                    observacao: `Recebimento de Material: Assinado digitalmente por ${militaryName} em ${new Date().toLocaleString()}`,
                    created_at: now
                }));
                const { error } = await supabase.from('movimentacao_cautela').insert(inserts);
                if (error) throw error;
                alert('Itens registrados como devolvidos!');
            } else if (signatureAction === 'update_release' && signatureRequestId) {
                const { error } = await supabase
                    .from('movimentacao_cautela')
                    .update({
                        status: 'Em Uso',
                        entregue_por: userName,
                        observacao: `Retirada assinada digitalmente por ${militaryName} em ${new Date().toLocaleString()}`
                    })
                    .eq('id', signatureRequestId as string);
                if (error) throw error;
                alert('Entrega confirmada e assinada!');
            } else if (signatureAction === 'update_return' && signatureRequestId) {
                if (Array.isArray(signatureRequestId)) {
                    const { error } = await supabase
                        .from('movimentacao_cautela')
                        .update({
                            status: 'Concluído',
                            recebido_por: userName,
                            observacao: `Recebimento em lote: Assinado digitalmente por ${militaryName} em ${new Date().toLocaleString()}`
                        })
                        .in('id', signatureRequestId);
                    if (error) throw error;
                    alert(`${signatureRequestId.length} itens recebidos com sucesso!`);
                } else {
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
            }

            setDirectSaram('');
            setDirectMaterialId('');
            setDirectQuantity(1);
            setFoundUser(null);
            setSelectedItems([]);
            setShowDirectRelease(false);
            setShowReceiveMaterial(false);
            setShowSignatureModal(false);
            setSignaturePassword('');
            setSignatureRequestId(null);
            setMaterialSearch('');
            setSelectedBatchIds([]);
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

            if (newStatus === 'Aprovado' && auditorName) updates.autorizado_por = auditorName;
            if (newStatus === 'Em Uso' && auditorName) updates.entregue_por = auditorName;
            if (newStatus === 'Concluído' && auditorName) updates.recebido_por = auditorName;

            const { error } = await supabase.from('movimentacao_cautela').update(updates).eq('id', id);
            if (error) throw error;

            if (incrementExit && materialId) {
                const { data: matData, error: matError } = await supabase
                    .from('gestao_estoque')
                    .select('saida')
                    .eq('id', materialId)
                    .single();

                if (matError) throw matError;
                const newSaida = (matData.saida || 0) + quantity;
                await supabase.from('gestao_estoque').update({ saida: newSaida }).eq('id', materialId);
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
        if (obs === null) return;
        const isLoss = confirm('Isso configura perda/baixa de material? (Clique em OK para sim, Cancelar para rejeição simples sem baixa)');
        await updateStatus(request.id, 'Rejeitado', obs, isLoss, request.id_material, request.quantidade);
    };

    const filteredRequests = requests.filter(req => {
        let matchesTab = false;
        if (activeTab === 'Solicitações') matchesTab = ['Pendente', 'Aprovado'].includes(req.status);
        else if (activeTab === 'Devoluções') matchesTab = req.status === 'Pendente Devolução';
        else if (activeTab === 'Em Uso') matchesTab = req.status === 'Em Uso';
        else if (activeTab === 'Histórico') matchesTab = ['Concluído', 'Rejeitado'].includes(req.status);

        if (!matchesTab) return false;

        if (inUseSearch) {
            const saram = req.solicitante?.saram?.toLowerCase() || '';
            const name = req.solicitante?.war_name?.toLowerCase() || '';
            const material = req.material?.material?.toLowerCase() || '';
            const searchObj = inUseSearch.toLowerCase();
            return saram.includes(searchObj) || name.includes(searchObj) || material.includes(searchObj);
        }
        return true;
    });

    const getHistoryStats = () => {
        if (!inUseSearch || activeTab !== 'Histórico') return null;

        const stats: { [key: string]: number } = {};
        let totalItems = 0;

        filteredRequests.forEach(req => {
            const category = req.material?.tipo_de_material || 'Não Categorizado';
            const qty = req.quantidade || 1;
            stats[category] = (stats[category] || 0) + qty;
            totalItems += qty;
        });

        const chartData = Object.entries(stats).map(([name, value]) => ({ name, value }));
        const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

        return { totalItems, chartData, COLORS };
    };

    const historyStats = getHistoryStats();

    const searchedSoldier = activeTab === 'Histórico' && inUseSearch && filteredRequests.length > 0
        ? filteredRequests.find(r => r.solicitante?.saram === inUseSearch || r.solicitante?.war_name?.toLowerCase().includes(inUseSearch.toLowerCase()))?.solicitante
        : null;

    if (loading) return <div className="text-center p-8 text-slate-500">Carregando aprovações...</div>;

    const canConfirm = (foundUser && selectedItems.length > 0) || (foundUser && directMaterialId && selectedItems.length === 0);

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

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={() => { setShowDirectRelease(!showDirectRelease); setShowReceiveMaterial(false); }}
                        className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-xs md:text-sm ${showDirectRelease ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        <Package className="w-4 h-4 shrink-0" />
                        <span className="truncate">{showDirectRelease ? 'Cancelar' : 'Cautelar'}</span>
                    </button>
                    <button
                        onClick={() => { setShowReceiveMaterial(!showReceiveMaterial); setShowDirectRelease(false); }}
                        className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-xs md:text-sm ${showReceiveMaterial ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span className="truncate">{showReceiveMaterial ? 'Cancelar' : 'Receber'}</span>
                    </button>
                    <button onClick={fetchRequests} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm shrink-0">
                        <Clock className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Direct forms */}
            {(showDirectRelease || showReceiveMaterial) && (
                <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-xl shadow-blue-50 space-y-4 animate-scale-in">
                    <h2 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                        <div className={`w-2 h-2 rounded-full ${showDirectRelease ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
                        {showDirectRelease ? 'Cautelar Material (Saída do Estoque)' : 'Receber Material (Entrada no Estoque)'}
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
                        </div>
                        <div className="md:col-span-2 space-y-1 relative">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Buscar Material</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={materialSearch}
                                    onChange={(e) => { setMaterialSearch(e.target.value); setIsMaterialDropdownOpen(true); }}
                                    onFocus={() => setIsMaterialDropdownOpen(true)}
                                    placeholder="Digite o nome do material..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none pr-10"
                                />
                                <button onClick={(e) => { e.preventDefault(); setIsMaterialDropdownOpen(!isMaterialDropdownOpen); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                    {isMaterialDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>
                            {isMaterialDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                    {(materialSearch ? inventory.filter(item => item.material.toLowerCase().includes(materialSearch.toLowerCase())) : inventory).map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => { setDirectMaterialId(item.id); setMaterialSearch(item.material); setIsMaterialDropdownOpen(false); }}
                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b last:border-0 flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.material}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] text-slate-400 font-medium">{item.qtdisponivel} disponíveis</p>
                                                    {item.endereco && (
                                                        <p className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
                                                            <MapPin className="w-2.5 h-2.5" /> {item.endereco}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {directMaterialId === item.id && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                        </button>
                                    ))}
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
                        <div className="md:col-span-4 flex flex-col md:flex-row gap-4 items-end">
                            <button
                                onClick={addItem}
                                disabled={!directMaterialId || !foundUser}
                                className="px-6 h-[50px] bg-slate-800 text-white rounded-xl font-black hover:bg-slate-900 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50"
                            >
                                <Plus className="w-5 h-5" /> Adicionar Item
                            </button>
                            <div className="flex-1"></div>
                            <button
                                onClick={showDirectRelease ? handleDirectRelease : handleReceiveMaterial}
                                disabled={actionLoading === 'direct' || (!selectedItems.length && (!foundUser || !directMaterialId))}
                                className={`min-w-[200px] h-[50px] text-white rounded-xl font-black transition-all shadow-lg text-sm uppercase tracking-widest ${showDirectRelease ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {actionLoading === 'direct' ? 'Processando...' : (showDirectRelease ? 'Confirmar Cautela' : 'Confirmar Recebimento')}
                            </button>
                        </div>
                        {selectedItems.length > 0 && (
                            <div className="md:col-span-4 mt-4 space-y-2 border-t pt-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens Selecionados</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm font-bold text-blue-600 text-xs">
                                                    {item.quantidade}x
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 text-sm">{item.material}</span>
                                                    {item.endereco && (
                                                        <p className="text-[9px] text-amber-500 font-medium flex items-center gap-0.5">
                                                            <MapPin className="w-2.5 h-2.5" /> {item.endereco}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={() => removeItem(idx)} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-fit self-start border border-slate-200 overflow-x-auto scrollbar-hide">
                {(['Solicitações', 'Devoluções', 'Em Uso', 'Histórico'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setSelectedBatchIds([]);
                        }}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab}
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px]">
                            {requests.filter(req => {
                                if (tab === 'Solicitações') return ['Pendente', 'Aprovado'].includes(req.status);
                                if (tab === 'Devoluções') return req.status === 'Pendente Devolução';
                                if (tab === 'Em Uso') return req.status === 'Em Uso';
                                if (tab === 'Histórico') return ['Concluído', 'Rejeitado'].includes(req.status);
                                return false;
                            }).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search and Batch Actions */}
            {(activeTab === 'Em Uso' || activeTab === 'Histórico' || activeTab === 'Solicitações') && (
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-scale-in">
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Buscar por SARAM, Militar ou Material..."
                            value={inUseSearch}
                            onChange={(e) => setInUseSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none text-sm"
                        />
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>

                    {(activeTab === 'Em Uso' || (activeTab === 'Solicitações' && filteredRequests.some(r => r.status === 'Pendente'))) && (
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <label className="flex items-center gap-2 cursor-pointer group bg-white px-4 py-2 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    checked={filteredRequests.filter(r => activeTab === 'Em Uso' || r.status === 'Pendente').length > 0 && selectedBatchIds.length === filteredRequests.filter(r => activeTab === 'Em Uso' || r.status === 'Pendente').length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const selectable = activeTab === 'Em Uso'
                                                ? filteredRequests.map(r => r.id)
                                                : filteredRequests.filter(r => r.status === 'Pendente').map(r => r.id);
                                            setSelectedBatchIds(selectable);
                                        }
                                        else setSelectedBatchIds([]);
                                    }}
                                />
                                <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">Selecionar Tudo ({activeTab === 'Em Uso' ? filteredRequests.length : filteredRequests.filter(r => r.status === 'Pendente').length})</span>
                            </label>

                            {selectedBatchIds.length > 0 && (
                                <button
                                    onClick={() => {
                                        if (activeTab === 'Em Uso') {
                                            const firstId = selectedBatchIds[0];
                                            const firstReq = requests.find(r => r.id === firstId);
                                            if (firstReq) startSignatureFlow(selectedBatchIds, firstReq.id_usuario, 'update_return');
                                        } else {
                                            setFoundUser(user);
                                            setSignatureRequestId(selectedBatchIds);
                                            setSignatureAction('approve');
                                            setShowSignatureModal(true);
                                        }
                                    }}
                                    className={`px-4 py-2 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'Em Uso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    {activeTab === 'Em Uso' ? `Receber Selecionados (${selectedBatchIds.length})` : `Aprovar Selecionados (${selectedBatchIds.length})`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* History Dashboard */}
            {activeTab === 'Histórico' && historyStats && historyStats.totalItems > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    {searchedSoldier && (
                        <div className="bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-blue-400 border border-white/5">
                                    {searchedSoldier.rank}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Militar Identificado</p>
                                    <h3 className="text-lg font-black">{searchedSoldier.war_name}</h3>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">SARAM</p>
                                <p className="font-bold text-blue-400">{searchedSoldier.saram}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Cautelas</p>
                                    <h3 className="text-2xl font-black text-slate-800">{filteredRequests.length}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Materiais Retirados</p>
                                    <h3 className="text-2xl font-black text-slate-800">{historyStats.totalItems}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm min-h-[200px]">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" />
                                    Uso por Categoria
                                </h4>
                            </div>
                            <div className="h-[150px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={historyStats.chartData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                            width={100}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                                            {historyStats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={historyStats.COLORS[index % historyStats.COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl border-dashed border-2 border-slate-200 text-slate-400 space-y-3">
                        <AlertCircle className="w-12 h-12 text-slate-200 mx-auto" />
                        <p className="font-bold">Nenhuma cautela em "{activeTab}"</p>
                    </div>
                ) : (
                    filteredRequests.map(req => (
                        <div key={req.id} className={`bg-white rounded-xl border transition-all ${expandedRequestId === req.id ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200'}`}>
                            <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center cursor-pointer hover:bg-slate-50/50" onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}>
                                {(activeTab === 'Em Uso' || (activeTab === 'Solicitações' && req.status === 'Pendente')) && (
                                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500"
                                            checked={selectedBatchIds.includes(req.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedBatchIds([...selectedBatchIds, req.id]);
                                                else setSelectedBatchIds(selectedBatchIds.filter(id => id !== req.id));
                                            }}
                                        />
                                    </div>
                                )}
                                <div className="flex-1 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                    <div className={`p-4 rounded-full shrink-0 ${req.status === 'Pendente' ? 'bg-yellow-100 text-yellow-600' : req.status === 'Aprovado' ? 'bg-blue-100 text-blue-600' : req.status === 'Pendente Devolução' ? 'bg-purple-100 text-purple-600' : req.status === 'Concluído' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="font-bold text-base md:text-lg text-slate-900 truncate">
                                                {req.quantidade && req.quantidade > 1 && <span className="text-blue-600 mr-1">{req.quantidade}x</span>}
                                                {req.material?.material || 'Material'}
                                            </h3>
                                            <span className={`text-[8px] md:text-[10px] px-2 py-0.5 md:py-1 rounded-full font-black uppercase ${req.status === 'Em Uso' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">
                                            Solicitante: <span className="font-bold text-slate-700">{req.solicitante ? `${req.solicitante.rank} ${req.solicitante.war_name}` : `ID: ${req.id_usuario}`}</span>
                                        </p>
                                        {req.material?.endereco && (
                                            <p className="text-[10px] text-amber-500 font-medium flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" /> {req.material.endereco}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedRequestId === req.id ? 'rotate-180' : ''}`} />
                                        <div className="flex flex-col gap-2 min-w-[160px]" onClick={e => e.stopPropagation()}>
                                            {req.status === 'Pendente' && (
                                                <button onClick={() => {
                                                    setFoundUser(user); // Analyst signing
                                                    setSignatureRequestId(req.id);
                                                    setSignatureAction('approve');
                                                    setShowSignatureModal(true);
                                                }} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm">Aprovar com Senha</button>
                                            )}
                                            {req.status === 'Pendente Devolução' && (
                                                <button onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_return')} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm">Receber Material</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {expandedRequestId === req.id && (
                                <div className="px-6 pb-6 pt-0 border-t border-slate-50 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                                        <div className="col-span-2 space-y-4">
                                            <div className="p-4 bg-slate-50 rounded-xl border space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 flex items-center gap-2 border-b pb-2 uppercase tracking-widest">
                                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                    Histórico
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Autorizado Por</p>
                                                        <p className="text-sm font-semibold text-slate-700">{req.autorizado_por || '---'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Entregue Por</p>
                                                        <p className="text-sm font-semibold text-slate-700">{req.entregue_por || '---'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {req.observacao && (
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Observações</p>
                                                    <div className="text-sm text-slate-600 bg-blue-50/50 p-4 rounded-xl border italic">"{req.observacao}"</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ações</h4>
                                            {req.status === 'Pendente Devolução' && (
                                                <button onClick={(e) => { e.stopPropagation(); handleRejectReturn(req); }} className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs">Rejeitar Devolução</button>
                                            )}
                                            {req.status === 'Em Uso' && (
                                                <button onClick={(e) => { e.stopPropagation(); startSignatureFlow(req.id, req.id_usuario, 'update_return'); }} className="w-full px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs">Receber Material</button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }} className="w-full px-4 py-3 bg-slate-800 text-white rounded-xl font-bold text-xs">Visualizar Cupom</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Modal Cupom Compacto */}
            {selectedRequest && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedRequest(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header compacto */}
                        <div className={`px-4 py-3 flex items-center gap-3 relative ${selectedRequest.status === 'Concluído' ? 'bg-emerald-500' :
                            selectedRequest.status === 'Em Uso' ? 'bg-blue-500' :
                                selectedRequest.status === 'Rejeitado' ? 'bg-red-500' :
                                    'bg-amber-500'
                            }`}>
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                {selectedRequest.status === 'Concluído' ? <CheckCircle className="w-4 h-4 text-white" /> :
                                    selectedRequest.status === 'Em Uso' ? <Truck className="w-4 h-4 text-white" /> :
                                        selectedRequest.status === 'Rejeitado' ? <XCircle className="w-4 h-4 text-white" /> :
                                            <Clock className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-white font-black text-sm uppercase tracking-tight">{selectedRequest.status === 'Concluído' ? 'Cautela Concluída' : selectedRequest.status === 'Em Uso' ? 'Material em Uso' : selectedRequest.status === 'Rejeitado' ? 'Cautela Rejeitada' : 'Cautela Pendente'}</h2>
                                <p className="text-white/70 text-[10px] font-medium">Comprovante</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-1 bg-white/20 hover:bg-white/30 rounded-full transition-all">
                                <XCircle className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        <div className="border-t-2 border-dashed border-slate-200"></div>

                        {/* Corpo compacto */}
                        <div className="p-4 space-y-3">
                            {/* Material + Info */}
                            <div className="text-center pb-2 border-b border-slate-100">
                                <p className="text-lg font-black text-slate-800">{selectedRequest.material?.material || '—'}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{selectedRequest.material?.tipo_de_material || 'Sem categoria'}</p>
                                {selectedRequest.material?.endereco && (
                                    <p className="text-[10px] text-amber-600 font-bold flex items-center justify-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" /> {selectedRequest.material.endereco}
                                    </p>
                                )}
                            </div>

                            {/* Grid compacto: Qtd + Data + Solicitante */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Qtd</p>
                                    <p className="font-black text-slate-800">{selectedRequest.quantidade || 1}</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Data</p>
                                    <p className="font-bold text-slate-800 text-xs">{new Date(selectedRequest.created_at).toLocaleDateString('pt-BR')}</p>
                                    <p className="text-[9px] text-slate-400">{new Date(selectedRequest.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                {selectedRequest.solicitante && (
                                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                        <p className="text-[9px] font-bold text-blue-400 uppercase">Solic.</p>
                                        <p className="font-black text-slate-800 text-xs">{selectedRequest.solicitante.rank} {selectedRequest.solicitante.war_name}</p>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-dashed border-slate-100"></div>

                            {/* Cadeia de Responsabilidade — compacta em linhas */}
                            <div className="space-y-1.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Responsabilidade</p>
                                {selectedRequest.autorizado_por && (
                                    <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg">
                                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-amber-600 uppercase w-20 shrink-0">Autorizado</p>
                                        <p className="font-bold text-slate-700 text-xs truncate flex-1">{selectedRequest.autorizado_por}</p>
                                    </div>
                                )}
                                {selectedRequest.entregue_por && (
                                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                                        <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-blue-600 uppercase w-20 shrink-0">Entregue</p>
                                        <p className="font-bold text-slate-700 text-xs truncate flex-1">{selectedRequest.entregue_por}</p>
                                    </div>
                                )}
                                {selectedRequest.recebido_por && (
                                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase w-20 shrink-0">Recebido</p>
                                        <p className="font-bold text-slate-700 text-xs truncate flex-1">{selectedRequest.recebido_por}</p>
                                    </div>
                                )}
                                {!selectedRequest.autorizado_por && !selectedRequest.entregue_por && !selectedRequest.recebido_por && (
                                    <p className="text-[10px] text-slate-400 italic">Sem movimentação.</p>
                                )}
                            </div>

                            {/* Observações compactas */}
                            {selectedRequest.observacao && (
                                <>
                                    <div className="border-t border-dashed border-slate-100"></div>
                                    <div className="bg-slate-50 px-3 py-2 rounded-lg">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Obs</p>
                                        <p className="text-[10px] text-slate-600 italic leading-snug">"{selectedRequest.observacao}"</p>
                                    </div>
                                </>
                            )}

                            {/* Footer ID */}
                            <div className="border-t border-dashed border-slate-100 pt-2 flex justify-between text-[9px] text-slate-300 font-mono">
                                <span>ID: {selectedRequest.id.slice(0, 8).toUpperCase()}</span>
                                <span>GSD-SP • SAP-03</span>
                            </div>
                        </div>

                        <div className="px-4 pb-4">
                            <button onClick={() => setSelectedRequest(null)} className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Signature Modal */}
            {showSignatureModal && foundUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => {
                        setShowSignatureModal(false);
                        setSignaturePassword('');
                    }}
                >
                    <div
                        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6 animate-scale-in relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                setShowSignatureModal(false);
                                setSignaturePassword('');
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>

                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Assinar Cautela</h2>
                            <p className="text-slate-500 font-medium text-sm">Insira sua senha para confirmar.</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-blue-600 shadow-sm border border-blue-100">
                                {foundUser.rank}
                            </div>
                            <div>
                                <p className="font-black text-slate-800 uppercase">{foundUser.war_name || foundUser.name}</p>
                                <p className="text-xs font-bold text-slate-400">Militar Responsável</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                <Lock className="w-3 h-3" /> Senha
                            </label>
                            <input
                                autoFocus
                                type="password"
                                value={signaturePassword}
                                onChange={(e) => setSignaturePassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmSignature();
                                    if (e.key === 'Escape') {
                                        setShowSignatureModal(false);
                                        setSignaturePassword('');
                                    }
                                }}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none text-center tracking-widest text-lg"
                            />
                        </div>

                        {localStorage.getItem('gsdsp_biometric_id') && (
                            <button
                                onClick={async () => {
                                    try {
                                        const credentialId = localStorage.getItem('gsdsp_biometric_id');
                                        if (!credentialId) return;
                                        const success = await authenticateBiometrics(credentialId);
                                        if (success) {
                                            const { data: userData } = await supabase
                                                .from('users')
                                                .select('password')
                                                .filter('webauthn_credential->>id', 'eq', credentialId)
                                                .single();
                                            if (userData) {
                                                setSignaturePassword(userData.password);
                                                setTimeout(() => confirmSignature(), 100);
                                            }
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Falha na autenticação biométrica.');
                                    }
                                }}
                                className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200"
                            >
                                <Fingerprint className="w-5 h-5" /> Assinar com Biometria
                            </button>
                        )}

                        <button
                            onClick={confirmSignature}
                            disabled={!signaturePassword || actionLoading === 'signature'}
                            className="w-full h-[50px] bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading === 'signature' ? 'Assinando...' : 'Confirmar Assinatura'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SAP03Panel;
