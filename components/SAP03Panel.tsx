import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Package, CheckCircle, XCircle, Clock, Truck, ShieldCheck, AlertCircle, Lock, Plus, Trash2, ChevronDown, ChevronUp, BarChart3, PieChart as PieIcon, History, Fingerprint, MapPin, LayoutGrid, Search, FileText, QrCode, UploadCloud, X, Download, Filter } from 'lucide-react';
import { authenticateBiometrics } from '../services/webauthn';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface LoanRequest {
    id: string;
    id_material: string;
    id_usuario: string | null;
    id_usuario_externo?: string | null;
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
        contact?: string;
        isExternal?: boolean;
    };
}

interface LoanApprovalsProps {
    user: any;
    isDarkMode: boolean;
}

export const SAP03Panel: React.FC<LoanApprovalsProps> = ({ user, isDarkMode }) => {
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
    const [activeTab, setActiveTab] = useState<'Solicitações' | 'Em Uso' | 'Histórico'>('Solicitações');

    const [historyFilterDay, setHistoryFilterDay] = useState('');
    const [historyFilterMonth, setHistoryFilterMonth] = useState('');
    const [historyFilterYear, setHistoryFilterYear] = useState('');
    const [historyFilterCategory, setHistoryFilterCategory] = useState<string | null>(null);
    const [historyFilterStatus, setHistoryFilterStatus] = useState<'ALL' | 'Concluído' | 'Rejeitado'>('ALL');
    const [historyTimeRange, setHistoryTimeRange] = useState<'all' | 'today' | '7days' | '30days'>('all');

    // Estados de Filtro para aba 'Em Uso'
    const [inUseFilterDay, setInUseFilterDay] = useState('');
    const [inUseFilterMonth, setInUseFilterMonth] = useState('');
    const [inUseFilterYear, setInUseFilterYear] = useState('');
    const [inUseFilterCategory, setInUseFilterCategory] = useState<string | null>(null);
    const [inUseTimeRange, setInUseTimeRange] = useState<'all' | 'today' | '7days' | '30days'>('all');

    const availableYears = Array.from(new Set(requests.map(req => new Date(req.created_at).getFullYear()))).sort((a, b) => b - a);

    const [showDirectRelease, setShowDirectRelease] = useState(false);
    const [directSaram, setDirectSaram] = useState('');
    const [directMaterialId, setDirectMaterialId] = useState('');
    const [directQuantity, setDirectQuantity] = useState(1);
    const [isSearchingSaram, setIsSearchingSaram] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);
    const [isExternalMilitar, setIsExternalMilitar] = useState(false);
    const [extRank, setExtRank] = useState('Selecione');
    const [extWarName, setExtWarName] = useState('');
    const [extUnit, setExtUnit] = useState('');
    const [extContact, setExtContact] = useState('');

    const [materialSearch, setMaterialSearch] = useState('');
    const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<{ id_material: string, material: string, quantidade: number, endereco?: string, id_loan?: string }[]>([]);
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const materialDropdownRef = useRef<HTMLDivElement>(null);

    // Mass Action States
    const [inUseSearch, setInUseSearch] = useState('');
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

    // Signature Modal States
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signaturePassword, setSignaturePassword] = useState('');
    const [signatureAction, setSignatureAction] = useState<'release' | 'approve' | 'return' | 'update_release' | 'update_return'>('release');
    const [signatureRequestId, setSignatureRequestId] = useState<string | string[] | null>(null);
    const [isExternalSignature, setIsExternalSignature] = useState(false);
    const [externalUserSaram, setExternalUserSaram] = useState('');

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
                setIsMaterialDropdownOpen(false);
            }
        };

        if (isMaterialDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMaterialDropdownOpen]);

    const fetchInventory = async () => {
        const { data } = await supabase
            .from('gestao_estoque')
            .select('id, material, qtdisponivel, endereco')
            .gt('qtdisponivel', 0)
            .order('material');
        if (data) setInventory(data);
    };

    const updateInventoryStock = async (materialId: string, quantity: number, type: 'release' | 'return') => {
        const { data: matData, error: fetchError } = await supabase
            .from('gestao_estoque')
            .select('saida, qtdisponivel')
            .eq('id', materialId)
            .single();

        if (fetchError || !matData) {
            console.error('Error fetching material for stock update:', fetchError);
            return;
        }

        const currentSaida = matData.saida || 0;
        const newSaida = type === 'release' ? currentSaida + quantity : Math.max(0, currentSaida - quantity);

        const { error: updateError } = await supabase
            .from('gestao_estoque')
            .update({
                saida: newSaida,
                updated_at: new Date().toISOString()
            })
            .eq('id', materialId);

        if (updateError) {
            console.error('Error updating stock in gestao_estoque:', updateError);
        } else {
            // Recarregar inventário para atualizar saldos na UI (dropdowns/listas)
            fetchInventory();
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        const { data: rawData, error } = await supabase
            .from('movimentacao_cautela')
            .select(`
                id, id_material, id_usuario, id_usuario_externo, status, observacao, quantidade, 
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
            const userIds = Array.from(new Set(rawData.map(r => r.id_usuario).filter(Boolean)));
            const extUserIds = Array.from(new Set(rawData.map(r => r.id_usuario_externo).filter(Boolean)));

            // Busca paralela: usuarios internos e externos ao mesmo tempo
            const [userResult, extUserResult] = await Promise.all([
                userIds.length > 0
                    ? supabase.from('users').select('id, rank, war_name, name, saram').in('id', userIds)
                    : Promise.resolve({ data: [], error: null }),
                extUserIds.length > 0
                    ? supabase.from('external_users_cautela').select('id, rank, war_name, saram, unit, contact').in('id', extUserIds)
                    : Promise.resolve({ data: [], error: null })
            ]);

            const userMap = (userResult.data || []).reduce((acc: any, u: any) => {
                acc[u.id] = { rank: u.rank, war_name: u.war_name || u.name, saram: u.saram };
                return acc;
            }, {});

            const extUserMap = (extUserResult.data || []).reduce((acc: any, u: any) => {
                acc[u.id] = { rank: u.rank, war_name: `${u.war_name} (${u.unit || 'Ext'})`, saram: u.saram, contact: u.contact, isExternal: true };
                return acc;
            }, {});

            const enrichedData = rawData.map(r => ({
                ...r,
                solicitante: r.id_usuario_externo ? extUserMap[r.id_usuario_externo] : userMap[r.id_usuario!]
            }));
            setRequests(enrichedData);
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
        if (isExternalMilitar) {
            const { data } = await supabase
                .from('external_users_cautela')
                .select('id, rank, war_name, unit, contact')
                .eq('saram', directSaram.replace(/\D/g, ''))
                .single();

            if (data) {
                setFoundUser({ ...data, isExternal: true });
                setExtRank(data.rank);
                setExtWarName(data.war_name);
                setExtUnit(data.unit || '');
                setExtContact(data.contact || '');
            } else {
                setFoundUser(null);
            }
        } else {
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
        }
        setIsSearchingSaram(false);
    };

    const startSignatureFlow = async (requestId: string | string[], userId: string | null, action: 'update_release' | 'update_return', idUsuarioExterno?: string | null) => {
        setSignatureRequestId(requestId);
        try {
            // Militar Externo: abre o modal pedindo o SARAM como senha
            if (!userId && idUsuarioExterno) {
                const { data: extUser } = await supabase
                    .from('external_users_cautela')
                    .select('id, rank, war_name, saram, unit, contact')
                    .eq('id', idUsuarioExterno)
                    .single();

                if (!extUser) {
                    alert('Dados do militar externo não encontrados.');
                    return;
                }

                setFoundUser({ ...extUser, isExternal: true });
                setExternalUserSaram(extUser.saram || '');
                setIsExternalSignature(true);
                setSignatureAction(action);
                setSignatureRequestId(requestId);
                setShowSignatureModal(true);
                return;
            }

            // Militar Interno: fluxo normal com senha
            const { data } = await supabase
                .from('users')
                .select('id, name, rank, war_name, password')
                .eq('id', userId)
                .single();

            if (data) {
                setFoundUser(data);
                setIsExternalSignature(false);
                setSignatureRequestId(requestId);
                setSignatureAction(action);
                setShowSignatureModal(true);
            } else {
                alert('Militar não encontrado para assinatura.');
            }
        } catch (err) {
            console.error('Error starting signature flow:', err);
            alert('Erro ao processar: ' + (err as any).message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaramBlur = async () => {
        if (directSaram.length < 4) return;
        setIsSearchingSaram(true);

        if (isExternalMilitar) {
            const { data } = await supabase.from('external_users_cautela').select('id, rank, war_name').eq('saram', directSaram).single();
            if (data) setFoundUser({ ...data, isExternal: true });
        } else {
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
        }
        setIsSearchingSaram(false);
    };

    const processExternalRelease = async () => {
        setActionLoading('direct');
        try {
            let externalUserId = foundUser?.id;

            if (!externalUserId) {
                const { data: newUser, error: extError } = await supabase.from('external_users_cautela').insert({
                    saram: directSaram.replace(/\D/g, ''),
                    rank: extRank,
                    war_name: extWarName,
                    unit: extUnit,
                    contact: extContact
                }).select('id').single();

                if (extError) throw extError;
                externalUserId = newUser.id;
            }

            const userName = `${user.rank || ''} ${user.war_name || user.name}`.trim();
            const militaryName = `${extRank} ${extWarName} (Externo)`.trim();
            const now = new Date().toISOString();

            const itemsToProcess = selectedItems.length > 0 ? selectedItems : [{
                id_material: directMaterialId,
                material: inventory.find(i => i.id === directMaterialId)?.material || '',
                quantidade: directQuantity
            }];

            const inserts = itemsToProcess.map(item => ({
                id_material: item.id_material,
                id_usuario_externo: externalUserId,
                status: 'Em Uso',
                quantidade: item.quantidade,
                autorizado_por: userName,
                entregue_por: userName,
                observacao: `[OM Externa: ${extUnit}] Liberado por ${userName} em ${new Date().toLocaleString()}`,
                created_at: now
            }));

            const { error } = await supabase.from('movimentacao_cautela').insert(inserts);
            if (error) throw error;

            for (const item of itemsToProcess) {
                if (item.id_material) await updateInventoryStock(item.id_material, item.quantidade, 'release');
            }

            fetchRequests();
            fetchInventory();

            setSelectedItems([]);
            setDirectMaterialId('');
            setMaterialSearch('');
            setDirectSaram('');
            setExtWarName('');
            setExtUnit('');
            setExtContact('');
            setFoundUser(null);
            setShowDirectRelease(false);

            alert('Material liberado para militar externo com sucesso!');
        } catch (err) {
            console.error('Erro na cautela externa:', err);
            alert('Ocorreu um erro ao registrar a cautela para militar externo.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDirectRelease = async () => {
        // If no items selected but inputs are filled, try to add the current input item
        if (selectedItems.length === 0 && directMaterialId) {
            const mat = inventory.find(i => i.id === directMaterialId);
            if (mat) {
                setSelectedItems([{ id_material: directMaterialId, material: mat.material, quantidade: directQuantity }]);
            }
        }

        const validUser = foundUser || (isExternalMilitar && directSaram && extRank && extWarName);
        if (!validUser) {
            alert('Selecione/cadastre um militar válido e preencha os campos obrigatórios.');
            return;
        }

        if (isExternalMilitar) {
            processExternalRelease();
        } else {
            setSignatureAction('release');
            setShowSignatureModal(true);
        }
    };


    const addItem = () => {
        if (!directMaterialId) {
            alert('Selecione um material primeiro.');
            return;
        }

        if (showDirectRelease) {
            const mat = inventory.find(i => i.id === directMaterialId);
            if (!mat) return;

            setSelectedItems([...selectedItems, {
                id_material: directMaterialId,
                material: mat.material,
                quantidade: directQuantity,
                endereco: mat.endereco
            }]);
        }

        setDirectMaterialId('');
        setMaterialSearch('');
        setDirectQuantity(1);
    };

    const removeItem = (idx: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== idx));
    };

    const confirmSignature = async () => {
        // Validação: externa usa SARAM como senha, interna usa password
        if (isExternalSignature) {
            if (!signaturePassword || signaturePassword !== externalUserSaram) {
                alert('SARAM incorreto! Digite o SARAM exato do militar para confirmar a devolução.');
                return;
            }
        } else {
            if (!foundUser || signaturePassword !== foundUser.password) {
                alert('Senha incorreta!');
                return;
            }
        }

        setActionLoading('signature');
        try {
            const userName = `${user.rank || ''} ${user.war_name || user.name}`.trim();
            const militaryName = isExternalSignature
                ? `${foundUser.rank} ${foundUser.war_name} (Ext)`.trim()
                : `${foundUser.rank} ${foundUser.war_name || foundUser.name}`.trim();
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

                // Atualizar estoque para cada item liberado
                for (const item of selectedItems) {
                    await updateInventoryStock(item.id_material, item.quantidade, 'release');
                }

                // Recarregar dados
                fetchRequests();
                fetchInventory();
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
                const updateIds = selectedItems.filter(item => item.id_loan).map(item => item.id_loan!);

                if (updateIds.length > 0) {
                    const { error } = await supabase
                        .from('movimentacao_cautela')
                        .update({
                            status: 'Concluído',
                            recebido_por: userName,
                            observacao: `Recebimento de Material: Assinado digitalmente por ${militaryName} em ${new Date().toLocaleString()}`
                        })
                        .in('id', updateIds);
                    if (error) throw error;

                    // Atualizar estoque para cada item devolvido (com UUID)
                    for (const item of selectedItems) {
                        if (item.id_loan) {
                            await updateInventoryStock(item.id_material, item.quantidade, 'return');
                        }
                    }

                    alert('Itens registrados como recebidos!');
                } else {
                    // Fallback for manual type-in without loan id if ever occurs
                    const inserts = selectedItems.map(item => ({
                        id_material: item.id_material,
                        id_usuario: foundUser.id,
                        status: 'Concluído',
                        quantidade: item.quantidade,
                        autorizado_por: userName,
                        entregue_por: userName,
                        recebido_por: userName,
                        observacao: `Recebimento de Material (Novo Registro): Assinado digitalmente por ${militaryName} em ${new Date().toLocaleString()}`,
                        created_at: now
                    }));
                    const { error } = await supabase.from('movimentacao_cautela').insert(inserts);
                    if (error) throw error;

                    // Atualizar estoque para cada item (Fallback)
                    for (const item of selectedItems) {
                        await updateInventoryStock(item.id_material, item.quantidade, 'return');
                    }

                    alert('Itens registrados como devolvidos!');
                }
            } else if (signatureAction === 'update_release' && signatureRequestId) {
                if (Array.isArray(signatureRequestId)) {
                    const { error } = await supabase
                        .from('movimentacao_cautela')
                        .update({
                            status: 'Em Uso',
                            entregue_por: userName,
                            observacao: `Retirada em lote: Assinada digitalmente por ${militaryName} em ${new Date().toLocaleString()}`
                        })
                        .in('id', signatureRequestId);
                    if (error) throw error;

                    // Atualizar estoque para cada item no lote
                    for (const id of signatureRequestId) {
                        const { data: loan } = await supabase.from('movimentacao_cautela').select('id_material, quantidade').eq('id', id).single();
                        if (loan) await updateInventoryStock(loan.id_material, loan.quantidade || 1, 'release');
                    }

                    alert(`${signatureRequestId.length} materiais entregues com sucesso!`);
                } else {
                    const { error } = await supabase
                        .from('movimentacao_cautela')
                        .update({
                            status: 'Em Uso',
                            entregue_por: userName,
                            observacao: `Retirada assinada digitalmente por ${militaryName} em ${new Date().toLocaleString()}`
                        })
                        .eq('id', signatureRequestId as string);
                    if (error) throw error;

                    // Buscar dados da cautela para processar estoque
                    const { data: loan } = await supabase.from('movimentacao_cautela').select('id_material, quantidade').eq('id', signatureRequestId as string).single();
                    if (loan) await updateInventoryStock(loan.id_material, loan.quantidade || 1, 'release');

                    alert('Entrega confirmada e assinada!');
                }
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

                    // Atualizar estoque para cada item no lote
                    for (const id of signatureRequestId) {
                        const { data: loan } = await supabase.from('movimentacao_cautela').select('id_material, quantidade').eq('id', id).single();
                        if (loan) await updateInventoryStock(loan.id_material, loan.quantidade || 1, 'return');
                    }

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

                    // Atualizar estoque para item individual
                    const { data: loan } = await supabase.from('movimentacao_cautela').select('id_material, quantidade').eq('id', signatureRequestId).single();
                    if (loan) await updateInventoryStock(loan.id_material, loan.quantidade || 1, 'return');

                    alert('Devolução aprovada e assinada!');
                }
                setActiveTab('Histórico');
            }

            setDirectSaram('');
            setDirectMaterialId('');
            setDirectQuantity(1);
            setFoundUser(null);
            setSelectedItems([]);
            setShowDirectRelease(false);
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
                // Se incrementExit é true, significa que estamos tendo uma saída (ou perda)
                await updateInventoryStock(materialId, quantity, 'release');
            } else if (newStatus === 'Concluído' && materialId) {
                // Se o status mudou para Concluído, retornamos ao estoque
                await updateInventoryStock(materialId, quantity, 'return');
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

    const handleDeleteRequest = async (id: string) => {
        if (!confirm('Tem certeza que deseja cancelar e excluir esta solicitação?')) return;
        setActionLoading(id);
        try {
            const { error } = await supabase.from('movimentacao_cautela').delete().eq('id', id);
            if (error) throw error;
            fetchRequests();
        } catch (err: any) {
            console.error('Error deleting request:', err);
            alert('Erro ao excluir solicitação: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredRequests = requests.filter(req => {
        let matchesTab = false;
        if (activeTab === 'Solicitações') matchesTab = ['Pendente', 'Aprovado'].includes(req.status);
        else if (activeTab === 'Em Uso') matchesTab = req.status === 'Em Uso';
        else if (activeTab === 'Histórico') matchesTab = ['Concluído', 'Rejeitado'].includes(req.status);

        if (!matchesTab) return false;

        if (inUseSearch) {
            const saram = req.solicitante?.saram?.toLowerCase() || '';
            const name = req.solicitante?.war_name?.toLowerCase() || '';
            const material = req.material?.material?.toLowerCase() || '';
            const searchObj = inUseSearch.toLowerCase();
            if (!(saram.includes(searchObj) || name.includes(searchObj) || material.includes(searchObj))) {
                return false;
            }
        }

        const reqDate = new Date(req.created_at);

        if (activeTab === 'Em Uso') {
            // Filtro de Data
            if (inUseFilterYear && reqDate.getFullYear().toString() !== inUseFilterYear) return false;
            if (inUseFilterMonth && (reqDate.getMonth() + 1).toString() !== inUseFilterMonth) return false;
            if (inUseFilterDay && reqDate.getDate().toString() !== inUseFilterDay) return false;

            // Filtro de Categoria
            if (inUseFilterCategory && req.material?.tipo_de_material !== inUseFilterCategory) return false;

            // Filtro de Range de Tempo
            if (inUseTimeRange !== 'all') {
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - reqDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (inUseTimeRange === 'today' && reqDate.toDateString() !== now.toDateString()) return false;
                if (inUseTimeRange === '7days' && diffDays > 7) return false;
                if (inUseTimeRange === '30days' && diffDays > 30) return false;
            }
        }

        if (activeTab === 'Histórico') {
            const reqDate = new Date(req.created_at);

            // Filtro de Data (Dia/Mês/Ano)
            if (historyFilterYear && reqDate.getFullYear().toString() !== historyFilterYear) return false;
            if (historyFilterMonth && (reqDate.getMonth() + 1).toString() !== historyFilterMonth) return false;
            if (historyFilterDay && reqDate.getDate().toString() !== historyFilterDay) return false;

            // Filtro de Categoria
            if (historyFilterCategory && req.material?.tipo_de_material !== historyFilterCategory) return false;

            // Filtro de Status
            if (historyFilterStatus !== 'ALL' && req.status !== historyFilterStatus) return false;

            // Filtro de Range de Tempo
            if (historyTimeRange !== 'all') {
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - reqDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (historyTimeRange === 'today' && reqDate.toDateString() !== now.toDateString()) return false;
                if (historyTimeRange === '7days' && diffDays > 7) return false;
                if (historyTimeRange === '30days' && diffDays > 30) return false;
            }
        }

        return true;
    });

    const getHistoryStats = () => {
        if (activeTab !== 'Histórico') return null;

        const stats: { [key: string]: number } = {};
        let totalItems = 0;

        // Se houver busca ou filtros de data ativos, usamos os filtrados, senão mostramos o geral do histórico
        const dataToAnalyze = (inUseSearch || historyFilterYear || historyFilterMonth || historyFilterDay || historyFilterCategory || historyFilterStatus !== 'ALL' || historyTimeRange !== 'all')
            ? filteredRequests
            : requests.filter(r => ['Concluído', 'Rejeitado'].includes(r.status));

        dataToAnalyze.forEach(req => {
            const category = req.material?.tipo_de_material || 'Não Categorizado';
            const qty = req.quantidade || 1;
            stats[category] = (stats[category] || 0) + qty;
            totalItems += qty;
        });

        const chartData = Object.entries(stats).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Ordenar os mais usados

        const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-[1.5rem] shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-blue-600/30 to-blue-900/10 text-blue-400 border border-blue-500/20' : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-500/30'}`}>
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Material e Cautela <span className="text-blue-500">SAP-03</span></h1>
                        <p className="text-slate-500 font-medium">Monitoramento logístico operacional e assinaturas.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                        onClick={() => { setShowDirectRelease(!showDirectRelease); }}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 text-[11px] active:scale-95 ${showDirectRelease ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
                    >
                        <Package className="w-4.5 h-4.5" />
                        <span>{showDirectRelease ? 'Cancelar Operação' : 'Nova Cautela Direta'}</span>
                    </button>
                    <button
                        onClick={() => {
                            if (activeTab === 'Em Uso') {
                                setActiveTab('Solicitações');
                            } else {
                                setActiveTab('Em Uso');
                                setInUseSearch('');
                                setShowDirectRelease(false);
                            }
                        }}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 text-[11px] active:scale-95 ${activeTab === 'Em Uso' ? 'bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600' : 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-800/20 border border-slate-700'}`}
                    >
                        <ShieldCheck className="w-4.5 h-4.5" />
                        <span>Receber Material</span>
                    </button>
                    <button onClick={fetchRequests} className={`p-3 rounded-xl transition-all shadow-md shrink-0 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Clock className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Direct forms */}
            {showDirectRelease && (
                <div className={`p-8 rounded-[2rem] border-2 shadow-2xl space-y-6 animate-scale-in ${isDarkMode ? 'bg-slate-800 border-blue-500/30' : 'bg-white border-blue-100 shadow-blue-100/50'}`}>
                    <h2 className={`font-black flex items-center gap-3 uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full shadow-lg bg-blue-500`}></div>
                        Nova Movimentação de Cautela (Saída Rápida)
                    </h2>
                    <div className="flex gap-4 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <button
                            onClick={() => { setIsExternalMilitar(false); setFoundUser(null); setDirectSaram(''); }}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isExternalMilitar ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white') : (isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')}`}
                        >
                            Militar da OM
                        </button>
                        <button
                            onClick={() => { setIsExternalMilitar(true); setFoundUser(null); setDirectSaram(''); }}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isExternalMilitar ? (isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white') : (isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100')}`}
                        >
                            Militar Externo
                        </button>
                    </div>

                    {/* Bloco do Militar OM (SARAM isolado) */}
                    {!isExternalMilitar && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">SARAM do Militar</label>
                                <input
                                    type="text"
                                    value={directSaram}
                                    onChange={(e) => setDirectSaram(e.target.value)}
                                    placeholder="Digite o SARAM..."
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`}
                                />
                                {isSearchingSaram && <p className="text-[10px] font-bold text-blue-500 mt-1 animate-pulse">Buscando militar...</p>}
                                {foundUser && <p className="text-[10px] font-bold text-green-600 mt-1">✓ {foundUser.rank} {foundUser.war_name || foundUser.name}</p>}
                                {!isSearchingSaram && directSaram.length >= 4 && !foundUser && <p className="text-[10px] font-bold text-red-500 mt-1">✗ Militar não encontrado</p>}
                            </div>
                        </div>
                    )}

                    {/* Bloco do Militar Externo (SARAM integrado ao bloco verde) */}
                    {isExternalMilitar && (
                        <div className={`p-5 rounded-xl border-2 border-dashed ${foundUser ? 'border-emerald-500/70' : 'border-emerald-500/30'} ${isDarkMode ? 'bg-emerald-900/10' : 'bg-emerald-50/40'} space-y-4`}>
                            <div className="flex items-center justify-between">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    Dados do Militar Externo
                                </p>
                                {foundUser?.isExternal && (
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                        ✓ Cadastro encontrado — campos auto-preenchidos
                                    </span>
                                )}
                                {!isSearchingSaram && directSaram.length >= 4 && !foundUser && (
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                                        ＋ Novo cadastro será criado
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400 uppercase">SARAM <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={directSaram}
                                        onChange={(e) => setDirectSaram(e.target.value)}
                                        placeholder="SARAM (obrigatório)"
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold outline-none transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} ${!directSaram ? 'border-red-400/50' : ''}`}
                                    />
                                    {isSearchingSaram && <p className="text-[10px] font-bold text-emerald-500 mt-1 animate-pulse">Buscando...</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400 uppercase">Posto/Grad.</label>
                                    <select
                                        value={extRank}
                                        onChange={(e) => setExtRank(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-sm outline-none transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                                    >
                                        {['Selecione', 'TB', 'MB', 'BR', 'CEL', 'TEN CEL', 'MAJ', 'CAP', '1T', '2T', 'ASP', 'SO', '1S', '2S', '3S', 'CB', 'S1', 'S2'].map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400 uppercase">Nome de Guerra <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={extWarName}
                                        onChange={(e) => setExtWarName(e.target.value)}
                                        placeholder="Nome de Guerra (obrigatório)"
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold outline-none uppercase transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} ${!extWarName ? 'border-red-400/50' : ''}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400 uppercase">OM de Origem</label>
                                    <input
                                        type="text"
                                        value={extUnit}
                                        onChange={(e) => setExtUnit(e.target.value)}
                                        placeholder="Ex: PAME-RJ"
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold outline-none uppercase transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'}`}
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400 uppercase">Tel. de Contato <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={extContact}
                                        onChange={(e) => setExtContact(e.target.value)}
                                        placeholder="Telefone de contato (obrigatório)"
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold outline-none transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} ${!extContact ? 'border-red-400/50' : ''}`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Linha separadora e campos de material compartilhados */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                        <div className="md:col-span-2 space-y-1 relative" ref={materialDropdownRef}>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Buscar Material</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={materialSearch}
                                    onChange={(e) => { setMaterialSearch(e.target.value); setIsMaterialDropdownOpen(true); }}
                                    onFocus={() => setIsMaterialDropdownOpen(true)}
                                    placeholder="Digite o nome do material..."
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none pr-10 transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`}
                                />
                                <button onClick={(e) => { e.preventDefault(); setIsMaterialDropdownOpen(!isMaterialDropdownOpen); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                                    {isMaterialDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>
                            {isMaterialDropdownOpen && (
                                <div className={`absolute z-50 w-full mt-1 border rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    {(() => {
                                        let itemsForSearch: any[] = [];
                                        if (showDirectRelease) {
                                            itemsForSearch = inventory.map(item => ({
                                                id: item.id,
                                                material: item.material,
                                                label: `${item.qtdisponivel} disponíveis`,
                                                endereco: item.endereco
                                            }));
                                        }

                                        const filtered = materialSearch
                                            ? itemsForSearch.filter(i => i.material.toLowerCase().includes(materialSearch.toLowerCase()))
                                            : itemsForSearch;

                                        if (filtered.length === 0) {
                                            return <div className="px-4 py-3 text-slate-500 text-xs font-bold text-center">Nenhum material encontrado</div>;
                                        }

                                        return filtered.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => { setDirectMaterialId(item.id); setMaterialSearch(item.material); setIsMaterialDropdownOpen(false); }}
                                                className={`w-full px-4 py-3 text-left transition-colors border-b last:border-0 flex justify-between items-center ${isDarkMode ? 'hover:bg-slate-700/50 border-slate-700' : 'hover:bg-blue-50 border-slate-100'}`}
                                            >
                                                <div className="min-w-0 pr-4">
                                                    <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{item.material}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className={`text-[10px] font-medium whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</p>
                                                        {item.endereco && (
                                                            <p className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5 truncate">
                                                                <MapPin className="w-2.5 h-2.5 shrink-0" /> {item.endereco}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {directMaterialId === item.id && <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />}
                                            </button>
                                        ));
                                    })()}
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
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 font-black outline-none text-center transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-white focus:bg-slate-900 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`}
                            />
                        </div>
                        <div className="md:col-span-4 flex flex-col md:flex-row gap-4 items-end mt-2">
                            <button
                                onClick={addItem}
                                disabled={!directMaterialId || (!isExternalMilitar && !foundUser) || (isExternalMilitar && (!extWarName || !directSaram || !extContact))}
                                className={`px-6 h-[50px] rounded-xl font-black transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600' : 'bg-slate-800 text-white hover:bg-slate-900 shadow-md'}`}
                            >
                                <Plus className="w-5 h-5" /> Adicionar
                            </button>
                            <div className="flex-1"></div>
                            <button
                                onClick={handleDirectRelease}
                                disabled={actionLoading === 'direct' || (!selectedItems.length && !directMaterialId) || (isExternalMilitar && (!extWarName || !directSaram || !extContact))}
                                className={`min-w-[200px] h-[50px] text-white rounded-xl font-black transition-all shadow-lg text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 shadow-blue-500/20`}
                            >
                                {actionLoading === 'direct' ? 'Processando...' : 'Confirmar Cautela'}
                            </button>
                        </div>
                        {selectedItems.length > 0 && (
                            <div className={`md:col-span-4 mt-4 space-y-2 border-t pt-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens Selecionados</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border group transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}>
                                            <div className="flex items-center gap-3 w-full min-w-0 pr-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm font-bold text-xs shrink-0 ${isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-white text-blue-600'}`}>
                                                    {item.quantidade}x
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <span className={`font-bold text-sm truncate block ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{item.material}</span>
                                                    {item.endereco && (
                                                        <p className="text-[9px] text-amber-500 font-medium flex items-center gap-0.5 mt-0.5 truncate">
                                                            <MapPin className="w-2.5 h-2.5 shrink-0" /> {item.endereco}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={() => removeItem(idx)} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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

            {/* Tabs Premium — Cards com métricas */}
            <div className="grid grid-cols-3 gap-3">
                {(['Solicitações', 'Em Uso', 'Histórico'] as const).map(tab => {
                    const count = requests.filter(req => {
                        if (tab === 'Solicitações') return ['Pendente', 'Aprovado'].includes(req.status);
                        if (tab === 'Em Uso') return req.status === 'Em Uso';
                        if (tab === 'Histórico') return ['Concluído', 'Rejeitado'].includes(req.status);
                        return false;
                    }).length;
                    const isActive = activeTab === tab;
                    const colors = {
                        'Solicitações': { active: 'from-amber-500 to-orange-500', icon: '📋', dot: 'bg-amber-400' },
                        'Em Uso': { active: 'from-blue-600 to-blue-500', icon: '📦', dot: 'bg-blue-400' },
                        'Histórico': { active: 'from-slate-600 to-slate-500', icon: '🗂️', dot: 'bg-slate-400' },
                    }[tab];
                    return (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSelectedBatchIds([]);
                                if (tab !== 'Histórico') {
                                    setHistoryFilterDay('');
                                    setHistoryFilterMonth('');
                                    setHistoryFilterYear('');
                                }
                            }}
                            className={`relative flex flex-col items-start p-4 rounded-2xl border transition-all duration-200 overflow-hidden text-left ${isActive
                                    ? `bg-gradient-to-br ${colors.active} text-white border-transparent shadow-lg`
                                    : isDarkMode
                                        ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 shadow-sm hover:shadow-md'
                                }`}
                        >
                            {isActive && <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white,_transparent)]" />}
                            <div className="flex items-center justify-between w-full mb-2">
                                <span className="text-lg">{colors.icon}</span>
                                {count > 0 && !isActive && <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />}
                            </div>
                            <p className={`text-2xl font-black tracking-tight leading-none mb-1 ${isActive ? 'text-white' : (isDarkMode ? 'text-white' : 'text-slate-800')}`}>
                                {count}
                            </p>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white/80' : ''}`}>{tab}</p>
                        </button>
                    );
                })}
            </div>

            {/* Search and Batch Actions */}
            {
                (activeTab === 'Em Uso' || activeTab === 'Histórico' || activeTab === 'Solicitações') && (
                    <div className={`flex flex-col md:flex-row gap-6 items-center justify-between p-6 rounded-[2rem] border animate-scale-in mb-6 ${isDarkMode ? 'bg-slate-800/40 border-slate-700 shadow-none' : 'bg-blue-50/50 border-blue-100 shadow-sm shadow-blue-100/20'}`}>
                        <div className="flex-1 w-full flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative w-full md:w-96 flex-1">
                                <input
                                    type="text"
                                    placeholder="Buscar por SARAM, Nome do Militar ou Item..."
                                    value={inUseSearch}
                                    onChange={(e) => setInUseSearch(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3 border rounded-xl outline-none text-sm font-bold transition-all focus:ring-2 focus:ring-blue-500 shadow-inner ${isDarkMode ? 'bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900'}`}
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            </div>

                        </div>

                        {(activeTab === 'Em Uso' || activeTab === 'Solicitações') && (
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <label className={`flex items-center gap-2 cursor-pointer group px-4 py-2 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                                        checked={(() => {
                                            const selectableRequests = filteredRequests.filter(r => (activeTab === 'Em Uso' || activeTab === 'Solicitações'));
                                            if (selectableRequests.length === 0) return false;

                                            // Se já tem seleção, o "Selecionar Tudo" deve se referir apenas ao usuário já selecionado
                                            if (selectedBatchIds.length > 0) {
                                                const firstId = selectedBatchIds[0];
                                                const firstReq = requests.find(r => r.id === firstId);
                                                const userItems = selectableRequests.filter(r => r.id_usuario === firstReq?.id_usuario);
                                                return selectedBatchIds.length === userItems.length;
                                            }

                                            return false;
                                        })()}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const selectable = filteredRequests.filter(r => (activeTab === 'Em Uso' || activeTab === 'Solicitações'));
                                                if (selectable.length > 0) {
                                                    // Se não tem nada selecionado, seleciona todos do primeiro usuário da lista
                                                    // Se já tem seleção, seleciona todos do usuário já selecionado
                                                    const targetUserId = selectedBatchIds.length > 0
                                                        ? requests.find(r => r.id === selectedBatchIds[0])?.id_usuario
                                                        : selectable[0].id_usuario;

                                                    const idsToSelect = selectable
                                                        .filter(r => r.id_usuario === targetUserId)
                                                        .map(r => r.id);
                                                    setSelectedBatchIds(idsToSelect);
                                                }
                                            }
                                            else setSelectedBatchIds([]);
                                        }}
                                    />
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 whitespace-nowrap">
                                        {selectedBatchIds.length > 0 ? (
                                            `Selecionar todos de ${requests.find(r => r.id === selectedBatchIds[0])?.solicitante?.war_name || '... '}`
                                        ) : "Selecionar Tudo (por usuário)"}
                                    </span>
                                </label>

                                {selectedBatchIds.length > 0 && (
                                    <button
                                        onClick={() => {
                                            const firstId = selectedBatchIds[0];
                                            const firstReq = requests.find(r => r.id === firstId);
                                            if (firstReq) {
                                                const action = activeTab === 'Solicitações' ? 'update_release' : 'update_return';
                                                startSignatureFlow(selectedBatchIds, firstReq.id_usuario, action, firstReq.id_usuario_externo);
                                            }
                                        }}
                                        className={`px-4 py-2 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'Solicitações' ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                    >
                                        {activeTab === 'Solicitações' ? <Package className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                        {activeTab === 'Solicitações' ? 'Entregar Selecionados' : 'Receber Selecionados'} ({selectedBatchIds.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {/* Filtros Analíticos (Histórico e Em Uso) */}
            {(activeTab === 'Histórico' || activeTab === 'Em Uso') && (
                <div className="flex flex-col gap-6 -mt-2 mb-8 animate-fade-in">
                    {/* Status e Tempo */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Período:</span>
                            <div className={`flex items-center p-1 rounded-full border ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                                {(['all', 'today', '7days', '30days'] as const).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => activeTab === 'Histórico' ? setHistoryTimeRange(range) : setInUseTimeRange(range)}
                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all whitespace-nowrap ${(activeTab === 'Histórico' ? historyTimeRange : inUseTimeRange) === range
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : `text-slate-500 hover:text-blue-500`
                                            }`}
                                    >
                                        {range === 'all' ? 'Tudo' : range === 'today' ? 'Hoje' : range === '7days' ? '7 Dias' : '30 Dias'}
                                    </button>
                                ))}
                            </div>

                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />

                            <div className="flex items-center gap-1">
                                <select
                                    value={activeTab === 'Histórico' ? historyFilterDay : inUseFilterDay}
                                    onChange={(e) => activeTab === 'Histórico' ? setHistoryFilterDay(e.target.value) : setInUseFilterDay(e.target.value)}
                                    className={`pl-2 pr-1 py-1 bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border rounded-lg transition-all ${isDarkMode ? 'text-slate-400 border-slate-700 hover:border-slate-500' : 'text-slate-600 border-slate-200 hover:border-blue-200'}`}
                                >
                                    <option value="">Dia</option>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d.toString()}>{d.toString().padStart(2, '0')}</option>
                                    ))}
                                </select>
                                <select
                                    value={activeTab === 'Histórico' ? historyFilterMonth : inUseFilterMonth}
                                    onChange={(e) => activeTab === 'Histórico' ? setHistoryFilterMonth(e.target.value) : setInUseFilterMonth(e.target.value)}
                                    className={`pl-2 pr-1 py-1 bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border rounded-lg transition-all ${isDarkMode ? 'text-slate-400 border-slate-700 hover:border-slate-500' : 'text-slate-600 border-slate-200 hover:border-blue-200'}`}
                                >
                                    <option value="">Mês</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m.toString()}>{m.toString().padStart(2, '0')}</option>
                                    ))}
                                </select>
                                <select
                                    value={activeTab === 'Histórico' ? historyFilterYear : inUseFilterYear}
                                    onChange={(e) => activeTab === 'Histórico' ? setHistoryFilterYear(e.target.value) : setInUseFilterYear(e.target.value)}
                                    className={`pl-2 pr-1 py-1 bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border rounded-lg transition-all ${isDarkMode ? 'text-slate-400 border-slate-700 hover:border-slate-500' : 'text-slate-600 border-slate-200 hover:border-blue-200'}`}
                                >
                                    <option value="">Ano</option>
                                    {availableYears.map(y => (
                                        <option key={y} value={y.toString()}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {activeTab === 'Histórico' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Status:</span>
                                {(['ALL', 'Concluído', 'Rejeitado'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setHistoryFilterStatus(status)}
                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all ${historyFilterStatus === status
                                            ? (status === 'Rejeitado' ? 'bg-red-500 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md')
                                            : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200')
                                            }`}
                                    >
                                        {status === 'ALL' ? 'Todos' : status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Categorias */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <LayoutGrid className="w-3 h-3" /> Categorias de Material
                            </span>
                            {(historyFilterCategory || historyFilterDay || historyFilterMonth || historyFilterYear || inUseSearch || historyTimeRange !== 'all' ||
                                inUseFilterCategory || inUseFilterDay || inUseFilterMonth || inUseFilterYear || inUseTimeRange !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setHistoryFilterCategory(null);
                                            setHistoryFilterDay('');
                                            setHistoryFilterMonth('');
                                            setHistoryFilterYear('');
                                            setInUseFilterCategory(null);
                                            setInUseFilterDay('');
                                            setInUseFilterMonth('');
                                            setInUseFilterYear('');
                                            setInUseSearch('');
                                            setHistoryTimeRange('all');
                                            setInUseTimeRange('all');
                                            setHistoryFilterStatus('ALL');
                                        }}
                                        className="text-[9px] font-black text-blue-500 uppercase hover:text-blue-600 transition-colors underline underline-offset-4"
                                    >
                                        Limpar Filtros
                                    </button>
                                )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(requests.filter(r => r.material?.tipo_de_material).map(r => r.material?.tipo_de_material))).sort().map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => activeTab === 'Histórico' ? setHistoryFilterCategory(historyFilterCategory === cat ? null : cat) : setInUseFilterCategory(inUseFilterCategory === cat ? null : cat)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${(activeTab === 'Histórico' ? historyFilterCategory : inUseFilterCategory) === cat
                                        ? (isDarkMode ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg' : 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200')
                                        : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600 shadow-sm')
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* History Dashboard */}
            {
                activeTab === 'Histórico' && historyStats && historyStats.totalItems > 0 && (
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
                            <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col justify-center ${isDarkMode ? 'bg-slate-800/40 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                        <History className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Cautelas</p>
                                        <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{filteredRequests.length}</h3>
                                    </div>
                                </div>
                                <div className="h-[120px] mb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={historyStats.chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={50}
                                                paddingAngle={5}
                                                dataKey="value"
                                                onClick={(data) => setHistoryFilterCategory(data.name === historyFilterCategory ? null : data.name)}
                                                className="cursor-pointer outline-none"
                                            >
                                                {historyStats.chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={historyStats.COLORS[index % historyStats.COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#f8fafc' : '#0f172a', borderRadius: '12px', border: isDarkMode ? '1px solid #334155' : 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                                itemStyle={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className={`flex items-center gap-4 mt-auto pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                                    <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-600/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Materiais Retirados</p>
                                        <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{historyStats.totalItems}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className={`md:col-span-2 p-6 rounded-[2rem] border shadow-sm min-h-[200px] ${isDarkMode ? 'bg-slate-800/40 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
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
                                                cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }}
                                                contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', color: isDarkMode ? '#f8fafc' : '#0f172a', borderRadius: '12px', border: isDarkMode ? '1px solid #334155' : 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                                itemStyle={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}
                                            />
                                            <Bar
                                                dataKey="value"
                                                radius={[0, 8, 8, 0]}
                                                barSize={20}
                                                onClick={(data) => setHistoryFilterCategory(data.name === historyFilterCategory ? null : data.name)}
                                                className="cursor-pointer"
                                            >
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
                )
            }

            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <div className={`text-center p-16 rounded-[2rem] border-dashed border-2 flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
                        <div className={`p-6 rounded-full ${isDarkMode ? 'bg-slate-800 shadow-inner' : 'bg-slate-50'}`}>
                            <AlertCircle className={`w-12 h-12 ${isDarkMode ? 'text-slate-600' : 'text-slate-200'}`} />
                        </div>
                        <p className="font-black uppercase tracking-widest text-[10px]">Nenhum registro encontrado em "{activeTab}"</p>
                    </div>
                ) : (
                    filteredRequests.map(req => (
                        <div key={req.id} className={`rounded-2xl border transition-all duration-300 ${expandedRequestId === req.id ? (isDarkMode ? 'border-blue-500 bg-slate-800 shadow-2xl shadow-blue-500/10' : 'border-blue-300 ring-4 ring-blue-50 bg-white shadow-xl') : (isDarkMode ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 shadow-sm hover:border-blue-100')}`}>
                            <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center cursor-pointer" onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}>
                                {(activeTab === 'Em Uso' || (activeTab === 'Solicitações' && (req.status === 'Pendente' || req.status === 'Aprovado'))) && (
                                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 disabled:opacity-20 disabled:cursor-not-allowed"
                                            checked={selectedBatchIds.includes(req.id)}
                                            disabled={(() => {
                                                if (selectedBatchIds.length === 0) return false;
                                                const firstId = selectedBatchIds[0];
                                                const firstReq = requests.find(r => r.id === firstId);
                                                return firstReq?.id_usuario !== req.id_usuario;
                                            })()}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedBatchIds([...selectedBatchIds, req.id]);
                                                else setSelectedBatchIds(selectedBatchIds.filter(id => id !== req.id));
                                            }}
                                        />
                                    </div>
                                )}
                                <div className={`flex-1 flex flex-col md:flex-row gap-6 items-start md:items-center ${selectedBatchIds.length > 0 && requests.find(r => r.id === selectedBatchIds[0])?.id_usuario !== req.id_usuario ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                    <div className={`p-4 rounded-2xl shrink-0 transition-transform ${expandedRequestId === req.id ? 'scale-110' : ''} ${req.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500' : req.status === 'Aprovado' ? 'bg-blue-500/10 text-blue-500' : req.status === 'Pendente Devolução' ? 'bg-purple-500/10 text-purple-500' : req.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-3 mb-1">
                                            <h3 className={`font-black text-base md:text-lg uppercase tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {req.quantidade && req.quantidade > 1 && <span className="text-blue-500 mr-2">{req.quantidade}x</span>}
                                                {req.material?.material || 'Material'}
                                            </h3>
                                            <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${req.status === 'Em Uso' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : (isDarkMode ? 'bg-slate-700 text-slate-400 border border-slate-600' : 'bg-slate-100 text-slate-500 border border-slate-200')}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Solicitante: <span className={`font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{req.solicitante ? `${req.solicitante.rank} ${req.solicitante.war_name}` : `ID: ${req.id_usuario}`}</span>
                                            {req.solicitante?.isExternal && (
                                                <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 font-black uppercase tracking-widest border border-emerald-500/20">EXT</span>
                                            )}
                                        </p>
                                        {req.solicitante?.isExternal && (
                                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                                {req.solicitante.saram && (
                                                    <span className={`text-[10px] font-black flex items-center gap-1 px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                                        🪪 SARAM: {req.solicitante.saram}
                                                    </span>
                                                )}
                                                {req.solicitante.contact && (
                                                    <span className={`text-[10px] font-black flex items-center gap-1 px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                                        📞 {req.solicitante.contact}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {req.material?.endereco && (
                                            <p className="text-[10px] text-amber-500 font-black flex items-center gap-1.5 mt-1.5 uppercase tracking-wide">
                                                <MapPin className="w-3 h-3" /> {req.material.endereco}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedRequestId === req.id ? 'rotate-180' : ''}`} />
                                        <div className="flex flex-col gap-2 min-w-[160px]" onClick={e => e.stopPropagation()}>
                                            {req.status === 'Pendente' && (
                                                <button onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_release')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">Entregar Material</button>
                                            )}
                                            {req.status === 'Pendente Devolução' && (
                                                <button onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_return', req.id_usuario_externo)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm">Receber Material</button>
                                            )}
                                            {req.status === 'Em Uso' && (
                                                <button onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_return', req.id_usuario_externo)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm">Receber Material</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {expandedRequestId === req.id && (
                                <div className={`px-5 py-4 border-t animate-fade-in ${isDarkMode ? 'border-slate-700/60' : 'border-slate-100'}`}>
                                    {/* Cadeia de responsabilidade em linha */}
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {req.autorizado_por && (
                                            <span className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${isDarkMode ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                <ShieldCheck className="w-3 h-3" /> {req.autorizado_por}
                                            </span>
                                        )}
                                        {req.autorizado_por && req.entregue_por && <span className="text-slate-400 text-xs">→</span>}
                                        {req.entregue_por && (
                                            <span className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${isDarkMode ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                                <Truck className="w-3 h-3" /> {req.entregue_por}
                                            </span>
                                        )}
                                        {req.entregue_por && req.recebido_por && <span className="text-slate-400 text-xs">→</span>}
                                        {req.recebido_por && (
                                            <span className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                <CheckCircle className="w-3 h-3" /> {req.recebido_por}
                                            </span>
                                        )}
                                        {!req.autorizado_por && !req.entregue_por && !req.recebido_por && (
                                            <span className="text-[10px] text-slate-400 italic">Sem movimentação registrada</span>
                                        )}
                                    </div>

                                    {/* Observação compacta */}
                                    {req.observacao && (
                                        <p className={`text-[10px] italic leading-snug mb-3 px-3 py-2 rounded-xl truncate ${isDarkMode ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`} title={req.observacao}>
                                            "{req.observacao}"
                                        </p>
                                    )}

                                    {/* Botões ação inline */}
                                    <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                                        {req.status === 'Pendente' && (
                                            <>
                                                <button onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_release')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wide transition-all">
                                                    Entregar
                                                </button>
                                                <button onClick={() => handleDeleteRequest(req.id)} className="px-3 py-1.5 border border-red-400 text-red-500 hover:bg-red-50 rounded-lg font-black text-[10px] uppercase tracking-wide transition-all">
                                                    Cancelar
                                                </button>
                                            </>
                                        )}
                                        {req.status === 'Pendente Devolução' && (
                                            <button onClick={() => handleRejectReturn(req)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wide transition-all">
                                                Rejeitar
                                            </button>
                                        )}
                                        {(req.status === 'Em Uso' || req.status === 'Pendente Devolução') && (
                                            <button onClick={() => startSignatureFlow(req.id, req.id_usuario, 'update_return', req.id_usuario_externo)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wide transition-all">
                                                Receber
                                            </button>
                                        )}
                                        <button onClick={() => setSelectedRequest(req)} className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wide transition-all border ${isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>
                                            Cupom
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Modal Cupom Compacto */}
            {
                selectedRequest && (
                    <div
                        className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
                        onClick={() => setSelectedRequest(null)}
                    >
                        <div
                            className={`rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header compacto */}
                            <div className={`px-6 py-5 flex items-center gap-4 relative ${selectedRequest.status === 'Concluído' ? 'bg-emerald-600 shadow-lg shadow-emerald-500/20' :
                                selectedRequest.status === 'Em Uso' ? 'bg-blue-600 shadow-lg shadow-blue-500/20' :
                                    selectedRequest.status === 'Rejeitado' ? 'bg-red-600 shadow-lg shadow-red-500/20' :
                                        'bg-amber-500 shadow-lg shadow-amber-500/20'
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
                                <div className={`text-center pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                    <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{selectedRequest.material?.material || '—'}</p>
                                    <p className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>{selectedRequest.material?.tipo_de_material || 'Sem categoria'}</p>
                                    {selectedRequest.material?.endereco && (
                                        <p className="text-[10px] text-amber-500 font-bold flex items-center justify-center gap-1 mt-1">
                                            <MapPin className="w-3 h-3" /> {selectedRequest.material.endereco}
                                        </p>
                                    )}
                                </div>

                                {/* Grid compacto: Qtd + Data + Solicitante */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Qtd</p>
                                        <p className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{selectedRequest.quantidade || 1}</p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Data</p>
                                        <p className={`font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{new Date(selectedRequest.created_at).toLocaleDateString('pt-BR')}</p>
                                        <p className="text-[9px] text-slate-500">{new Date(selectedRequest.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    {selectedRequest.solicitante && (
                                        <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                            <p className="text-[9px] font-bold text-blue-400 uppercase">Solic.</p>
                                            <p className={`font-black text-xs ${isDarkMode ? 'text-blue-200' : 'text-slate-800'}`}>{selectedRequest.solicitante.rank} {selectedRequest.solicitante.war_name}</p>
                                        </div>
                                    )}
                                </div>

                                <div className={`border-t border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}></div>

                                {/* Cadeia de Responsabilidade — compacta em linhas */}
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Responsabilidade</p>
                                    {selectedRequest.autorizado_por && (
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                            <p className="text-[10px] font-bold text-amber-600 uppercase w-20 shrink-0">Autorizado</p>
                                            <p className={`font-bold text-xs truncate flex-1 ${isDarkMode ? 'text-amber-200' : 'text-slate-700'}`}>{selectedRequest.autorizado_por}</p>
                                        </div>
                                    )}
                                    {selectedRequest.entregue_por && (
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                                            <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                            <p className="text-[10px] font-bold text-blue-600 uppercase w-20 shrink-0">Entregue</p>
                                            <p className={`font-bold text-xs truncate flex-1 ${isDarkMode ? 'text-blue-200' : 'text-slate-700'}`}>{selectedRequest.entregue_por}</p>
                                        </div>
                                    )}
                                    {selectedRequest.recebido_por && (
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase w-20 shrink-0">Recebido</p>
                                            <p className={`font-bold text-xs truncate flex-1 ${isDarkMode ? 'text-emerald-200' : 'text-slate-700'}`}>{selectedRequest.recebido_por}</p>
                                        </div>
                                    )}
                                    {!selectedRequest.autorizado_por && !selectedRequest.entregue_por && !selectedRequest.recebido_por && (
                                        <p className="text-[10px] text-slate-500 italic">Sem movimentação.</p>
                                    )}
                                </div>

                                {/* Observações compactas */}
                                {selectedRequest.observacao && (
                                    <>
                                        <div className={`border-t border-dashed ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}></div>
                                        <div className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Obs</p>
                                            <p className={`text-[10px] italic leading-snug ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>"{selectedRequest.observacao}"</p>
                                        </div>
                                    </>
                                )}

                                {/* Footer ID */}
                                <div className={`border-t border-dashed pt-2 flex justify-between text-[9px] font-mono ${isDarkMode ? 'border-slate-700 text-slate-600' : 'border-slate-100 text-slate-300'}`}>
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
                )
            }

            {/* Signature Modal */}
            {
                showSignatureModal && foundUser && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-fade-in p-4"
                        onClick={() => {
                            setShowSignatureModal(false);
                            setSignaturePassword('');
                        }}
                    >
                        <div
                            className={`p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-8 animate-scale-in relative border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => {
                                    setShowSignatureModal(false);
                                    setSignaturePassword('');
                                    setIsExternalSignature(false);
                                    setExternalUserSaram('');
                                }}
                                className={`absolute top-6 right-6 p-2 rounded-full transition-all ${isDarkMode ? 'bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-300 hover:text-slate-500'}`}
                            >
                                <XCircle className="w-6 h-6" />
                            </button>

                            <div className="text-center space-y-4">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl transform -rotate-3 ${isExternalSignature ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-600 text-white') : (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white')}`}>
                                    <ShieldCheck className="w-10 h-10" />
                                </div>
                                <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {isExternalSignature ? 'Confirmação de Devolução' : 'Assinatura Digital'}
                                </h2>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                    {isExternalSignature ? 'Militar Externo — usar SARAM como confirmação' : 'Validação de Identidade Criptográfica'}
                                </p>
                            </div>

                            <div className={`p-6 rounded-2xl border flex items-center gap-5 transition-all ${isExternalSignature ? (isDarkMode ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-50 border-emerald-100') : (isDarkMode ? 'bg-slate-900/50 border-slate-700 shadow-inner' : 'bg-slate-50 border-slate-100 shadow-sm')}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-lg border-2 border-white/20 text-xs ${isExternalSignature ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                    {foundUser.rank}
                                </div>
                                <div>
                                    <p className={`font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{foundUser.war_name || foundUser.name}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isExternalSignature ? 'text-emerald-500' : 'text-blue-500'}`}>
                                        {isExternalSignature ? `Militar Externo — ${foundUser.unit || ''}` : 'Militar Responsável'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-1 tracking-widest pl-1">
                                    <Lock className={`w-3 h-3 ${isExternalSignature ? 'text-emerald-500' : 'text-blue-500'}`} />
                                    {isExternalSignature ? 'SARAM do Militar (confirma a devolução)' : 'Senha do Sistema'}
                                </label>
                                {isExternalSignature && (
                                    <p className={`text-[10px] font-bold px-3 py-2 rounded-xl mb-2 ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                        O militar externo deve digitar seu SARAM para confirmar a entrega do material.
                                    </p>
                                )}
                                <input
                                    autoFocus
                                    type={isExternalSignature ? 'text' : 'password'}
                                    value={signaturePassword}
                                    onChange={(e) => setSignaturePassword(e.target.value)}
                                    placeholder={isExternalSignature ? 'Digite o SARAM...' : ''}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') confirmSignature();
                                        if (e.key === 'Escape') {
                                            setShowSignatureModal(false);
                                            setSignaturePassword('');
                                            setIsExternalSignature(false);
                                            setExternalUserSaram('');
                                        }
                                    }}
                                    className={`w-full px-6 py-5 border rounded-2xl font-black outline-none text-center ${isExternalSignature ? 'tracking-widest text-lg' : 'tracking-[1em] text-xl'} transition-all ${isExternalSignature ? (isDarkMode ? 'bg-slate-900 border-emerald-700/50 text-white focus:ring-emerald-500/50 focus:ring-4' : 'bg-slate-50 border-emerald-200 text-slate-900 focus:ring-emerald-500/20 focus:ring-4') : (isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500/50 focus:ring-4' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/20 focus:ring-4')}`}
                                />
                            </div>

                            {!isExternalSignature && localStorage.getItem('gsdsp_biometric_id') && (
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
                                className={`w-full h-[50px] text-white rounded-xl font-black transition-all shadow-lg uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed ${isExternalSignature ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                            >
                                {actionLoading === 'signature' ? 'Confirmando...' : (isExternalSignature ? 'Confirmar Devolução' : 'Confirmar Assinatura')}
                            </button>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default SAP03Panel;
