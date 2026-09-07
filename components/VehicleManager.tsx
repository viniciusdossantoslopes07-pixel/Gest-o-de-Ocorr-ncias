import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Vehicle, VehicleLoan, VehicleChecklistItems, VehicleDamagePoint } from '../types';
import { VehicleDamageDiagram } from './VehicleDamageDiagram';
import { VehicleBIStats } from './VehicleBIStats';
import { VehicleAdminModal, FAB_CATEGORIES } from './VehicleAdminModal';
import { VehicleChecklistPrintModal } from './VehicleChecklistPrintModal';
import { generateVehicleChecklistPdf } from '../services/vehiclePdfService';
import { useSectors } from '../contexts/SectorsContext';
import { OFFICIAL_FAB_VEHICLES } from '../constants/fabVehiclesData';
import {
  Car,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  RotateCcw,
  Check,
  X,
  UserCheck,
  Fuel,
  Gauge,
  Calendar,
  Navigation,
  Key,
  Shield,
  Filter,
  Eye,
  PenTool,
  Sparkles,
  BarChart3,
  Wrench,
  Ban,
  Settings2,
  Edit2,
  Layers,
  ArrowRight,
  ChevronDown,
  Building2,
  MapPin,
  Trash2,
  Camera
} from 'lucide-react';

interface VehicleManagerProps {
  user: any;
  isDarkMode: boolean;
}

const DEFAULT_CHECKLIST: VehicleChecklistItems = {
  parabrisa: 'OK',
  limpadores: 'OK',
  agua_reservatorio: 'OK',
  agua_radiador: 'OK',
  oleo_motor: 'OK',
  farol_sinalizadores: 'OK',
  antena: 'OK',
  documento: 'OK',
  difusores_ar: 'OK',
  luzes_painel: 'OK',
  revisao_km: 'OK',
  buzina: 'OK',
  tapetes: 'OK',
  sem_odores: 'OK',
  multimidia: 'OK',
  porta_luvas: 'OK',
  pneu_diant_esq: 'OK',
  pneu_diant_dir: 'OK',
  pneu_tras_esq: 'OK',
  pneu_tras_dir: 'OK',
  estepe: 'OK',
  triangulo_chave_macaco: 'OK'
};

const FUEL_LEVELS = ['1/8', '2/8', '3/8', '4/8', '5/8', '6/8', '7/8', '8/8'];

const VEHICLE_STATUSES: Array<{
  status: Vehicle['status'];
  label: string;
  color: string;
  bg: string;
  border: string;
}> = [
  {
    status: 'Disponível',
    label: 'Disponível',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  {
    status: 'Cautelada',
    label: 'Cautelada (Na Rua)',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200 dark:border-blue-800'
  },
  {
    status: 'Em Manutenção',
    label: 'Em Manutenção',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800'
  },
  {
    status: 'Alienação',
    label: 'Alienação (Desativação)',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    border: 'border-purple-200 dark:border-purple-800'
  },
  {
    status: 'Baixada',
    label: 'Baixada (Inoperante)',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-950/50',
    border: 'border-red-200 dark:border-red-800'
  }
];

export const VehicleManager: React.FC<VehicleManagerProps> = ({ user, isDarkMode }) => {
  const { omId: activeOmId, oms } = useSectors();
  const currentOmId = activeOmId || user?.om_id;
  const currentOm = useMemo(() => {
    return oms?.find((o) => o.id === currentOmId);
  }, [oms, currentOmId]);

  // Três abas principais conforme solicitado pelo usuário:
  // 1. 'cautelas' (Cautelas Ativas, Devolução e Histórico)
  // 2. 'gerir_frota' (Onde fica o botão Cadastrar Viatura, listagem de todas as VTRs e clique para mudar status Disponível/Manutenção/Alienação)
  // 3. 'bi_stats' (Painel completo de Gestão com tela de BI e gráficos de uso)
  const [activeTab, setActiveTab] = useState<'cautelas' | 'gerir_frota' | 'bi_stats'>('cautelas');

  // Sub-aba dentro de cautelas (Em Uso vs Histórico)
  const [cautelaSubTab, setCautelaSubTab] = useState<'em_uso' | 'historico'>('em_uso');

  // Dados
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loans, setLoans] = useState<VehicleLoan[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('ALL');

  // Modais
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<VehicleLoan | null>(null);
  const [printLoanData, setPrintLoanData] = useState<{
    loan: VehicleLoan;
    type: 'departure' | 'return';
  } | null>(null);

  // Estados do Formulário de Cautela (Saída)
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const vehicleSelectorRef = useRef<HTMLDivElement>(null);
  const vehicleSearchInputRef = useRef<HTMLInputElement>(null);
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [destinationType, setDestinationType] = useState<'interna' | 'externa'>('interna');
  const [destination, setDestination] = useState('BASP');
  const [missionReason, setMissionReason] = useState('');
  const [departureOdometer, setDepartureOdometer] = useState<number>(0);
  const [departureFuelLevel, setDepartureFuelLevel] = useState<string>('8/8');
  const [departureItems, setDepartureItems] = useState<VehicleChecklistItems>({ ...DEFAULT_CHECKLIST });
  const [departureDamages, setDepartureDamages] = useState<VehicleDamagePoint[]>([]);
  const [departureNotes, setDepartureNotes] = useState('');
  const [driverAuthPassword, setDriverAuthPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'password' | 'signature'>('signature');
  const [signatureCanvasData, setSignatureCanvasData] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [departurePhoto, setDeparturePhoto] = useState<string | null>(null);

  // Estados do Formulário de Devolução (Retorno)
  const [returnOdometer, setReturnOdometer] = useState<number>(0);
  const [returnFuelLevel, setReturnFuelLevel] = useState<string>('8/8');
  const [returnItems, setReturnItems] = useState<VehicleChecklistItems>({ ...DEFAULT_CHECKLIST });
  const [returnDamages, setReturnDamages] = useState<VehicleDamagePoint[]>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnPhoto, setReturnPhoto] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Estados do Formulário de Cadastro de Nova Viatura
  const [newRegFab, setNewRegFab] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCategory, setNewCategory] = useState<string>('P-1');
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newColor, setNewColor] = useState('Branca');
  const [newFuelType, setNewFuelType] = useState('Diesel');
  const [newOdometer, setNewOdometer] = useState<number>(0);
  const [newFuelLevel, setNewFuelLevel] = useState('8/8');
  const [newStatus, setNewStatus] = useState<Vehicle['status']>('Disponível');
  const [newNotes, setNewNotes] = useState('');

  // Estados de Edição da Viatura Selecionada (Modal Gerir Viatura)
  const [editStatus, setEditStatus] = useState<Vehicle['status']>('Disponível');
  const [editOdometer, setEditOdometer] = useState<number>(0);
  const [editFuelLevel, setEditFuelLevel] = useState<string>('8/8');
  const [editNotes, setEditNotes] = useState<string>('');

  // Carregar dados iniciais
  useEffect(() => {
    fetchVehicles();
    fetchLoans();
    fetchSystemUsers();
  }, [currentOmId]);

  // Fechar dropdown de viaturas ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        vehicleSelectorRef.current &&
        !vehicleSelectorRef.current.contains(event.target as Node)
      ) {
        setIsVehicleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVehicles = async (forceSync = false) => {
    try {
      let query = supabase.from('vehicles').select('*');
      if (currentOmId) {
        query = query.or(`om_id.eq.${currentOmId},om_id.is.null`);
      }
      const { data, error } = await query.order('reg_fab');
      if (error) throw error;

      let currentList: Vehicle[] = data || [];
      const existingRegFabs = new Set(currentList.map((v) => v.reg_fab.toUpperCase()));
      const missing = OFFICIAL_FAB_VEHICLES.filter((v) => !existingRegFabs.has(v.reg_fab.toUpperCase()));

      if (missing.length > 0 || forceSync) {
        const toInsert = missing.map((v) => ({
          om_id: currentOmId || null,
          reg_fab: v.reg_fab,
          category: v.category,
          brand: v.brand,
          model: v.model,
          plate: v.plate,
          current_odometer: v.current_odometer,
          current_fuel_level: '8/8',
          status: v.status,
          notes: v.notes,
          created_at: new Date().toISOString()
        }));

        if (toInsert.length > 0) {
          try {
            const { data: insertedData, error: insErr } = await supabase
              .from('vehicles')
              .insert(toInsert)
              .select('*');
            if (!insErr && insertedData) {
              currentList = [...currentList, ...insertedData];
            } else {
              const localFallback: Vehicle[] = missing.map((v) => ({
                id: `vtr-${v.reg_fab}`,
                om_id: currentOmId || null,
                reg_fab: v.reg_fab,
                category: v.category,
                brand: v.brand,
                model: v.model,
                plate: v.plate,
                current_odometer: v.current_odometer,
                current_fuel_level: '8/8',
                status: v.status,
                notes: v.notes,
                created_at: new Date().toISOString()
              }));
              currentList = [...currentList, ...localFallback];
            }
          } catch (insertError) {
            console.warn('Erro na inserção de viaturas no Supabase:', insertError);
            const localFallback: Vehicle[] = missing.map((v) => ({
              id: `vtr-${v.reg_fab}`,
              om_id: currentOmId || null,
              reg_fab: v.reg_fab,
              category: v.category,
              brand: v.brand,
              model: v.model,
              plate: v.plate,
              current_odometer: v.current_odometer,
              current_fuel_level: '8/8',
              status: v.status,
              notes: v.notes,
              created_at: new Date().toISOString()
            }));
            currentList = [...currentList, ...localFallback];
          }
        }
      }

      // Atualização e limpeza dos dados oficiais (Garante MARCA MITSUBISHI e MODELO L200, sem descrições no modelo)
      for (const official of OFFICIAL_FAB_VEHICLES) {
        const found = currentList.find((v) => v.reg_fab.toUpperCase() === official.reg_fab.toUpperCase());
        if (found) {
          found.description = official.description;
          const isOutdated =
            found.brand !== official.brand ||
            found.model !== official.model ||
            found.model.includes('(') ||
            found.model.includes('CARRO') ||
            found.model.includes('CAMINHÃO') ||
            found.model.toLowerCase().includes('duster') ||
            found.brand.toLowerCase().includes('renault') ||
            forceSync;

          if (isOutdated) {
            try {
              await supabase
                .from('vehicles')
                .update({
                  brand: official.brand,
                  model: official.model,
                  category: official.category,
                  status: official.status,
                  notes: official.notes
                })
                .eq('id', found.id);
            } catch (e) {
              console.warn('Erro ao atualizar marca/modelo no banco:', e);
            }
            found.brand = official.brand;
            found.model = official.model;
            found.category = official.category;
            found.status = official.status;
            found.notes = official.notes;
          }
        }
      }

      setVehicles(currentList);
    } catch (err) {
      console.error('Erro ao buscar viaturas:', err);
      const localFallback: Vehicle[] = OFFICIAL_FAB_VEHICLES.map((v) => ({
        id: `vtr-${v.reg_fab}`,
        om_id: currentOmId || null,
        reg_fab: v.reg_fab,
        category: v.category,
        description: v.description,
        brand: v.brand,
        model: v.model,
        plate: v.plate,
        current_odometer: v.current_odometer,
        current_fuel_level: '8/8',
        status: v.status,
        notes: v.notes,
        created_at: new Date().toISOString()
      }));
      setVehicles(localFallback);
    }
  };

  const fetchLoans = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('vehicle_loans')
        .select(`
          *,
          vehicle:vehicles(*)
        `);
      if (currentOmId) {
        query = query.or(`om_id.eq.${currentOmId},om_id.is.null`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setLoans(data || []);
    } catch (err) {
      console.error('Erro ao buscar cautelas de viaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, rank, saram, war_name, cpf, password, om_id')
        .order('rank');
      if (error) throw error;
      setSystemUsers(data || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta viatura permanentemente?')) {
      try {
        const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
        if (error) throw error;
        setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      } catch (err) {
        console.error('Erro ao excluir viatura:', err);
        alert('Erro ao excluir a viatura. Verifique sua conexão e tente novamente.');
      }
    }
  };

  // Viaturas disponíveis para cautela
  const availableVehicles = useMemo(() => {
    return vehicles.filter((v) => v.status === 'Disponível');
  }, [vehicles]);

  // Viatura atualmente selecionada para cautela
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Viaturas filtradas pela pesquisa inteligente (RegFab, Modelo, Placa, Categoria, Marca)
  const filteredAvailableVehicles = useMemo(() => {
    if (!vehicleSearchTerm.trim()) return availableVehicles;
    const rawTerm = vehicleSearchTerm.toLowerCase().trim();
    const cleanTerm = rawTerm.replace(/[-.\s]/g, '');

    return availableVehicles.filter((v) => {
      const regFab = (v.reg_fab || '').toLowerCase().replace(/[-.\s]/g, '');
      const plate = (v.plate || '').toLowerCase().replace(/[-.\s]/g, '');
      const brand = (v.brand || '').toLowerCase();
      const model = (v.model || '').toLowerCase();
      const category = (v.category || '').toLowerCase();
      const desc = (v.description || '').toLowerCase();
      const fullText = `${brand} ${model} ${category} ${desc}`.toLowerCase();

      return (
        regFab.includes(cleanTerm) ||
        plate.includes(cleanTerm) ||
        brand.includes(rawTerm) ||
        model.includes(rawTerm) ||
        category.includes(rawTerm) ||
        desc.includes(rawTerm) ||
        fullText.includes(rawTerm)
      );
    });
  }, [availableVehicles, vehicleSearchTerm]);

  // Checagem se o usuário pesquisou uma viatura que existe mas NÃO está disponível (Cautelada/Manutenção)
  const unavailableMatch = useMemo(() => {
    if (!vehicleSearchTerm.trim()) return null;
    const rawTerm = vehicleSearchTerm.toLowerCase().trim();
    const cleanTerm = rawTerm.replace(/[-.\s]/g, '');
    if (cleanTerm.length < 3) return null;

    return vehicles.find((v) => {
      if (v.status === 'Disponível') return false;
      const regFab = (v.reg_fab || '').toLowerCase().replace(/[-.\s]/g, '');
      const plate = (v.plate || '').toLowerCase().replace(/[-.\s]/g, '');
      return regFab.includes(cleanTerm) || plate.includes(cleanTerm);
    });
  }, [vehicles, vehicleSearchTerm]);

  // Cautelas ativas (Em Uso)
  const activeLoans = useMemo(() => {
    return loans.filter((l) => l.status === 'Em Uso');
  }, [loans]);

  // Cautelas devolvidas (Histórico)
  const historyLoans = useMemo(() => {
    return loans.filter((l) => l.status === 'Devolvido');
  }, [loans]);

  // Sugestões de condutor
  const driverSuggestions = useMemo(() => {
    if (!driverSearch || driverSearch.length < 1) return systemUsers.slice(0, 5);
    const term = driverSearch.toLowerCase();
    return systemUsers
      .filter((u) => {
        const saram = (u.saram || '').toLowerCase();
        const name = (u.name || '').toLowerCase();
        const warName = (u.war_name || '').toLowerCase();
        return saram.includes(term) || name.includes(term) || warName.includes(term);
      })
      .slice(0, 8);
  }, [driverSearch, systemUsers]);

  // Abrir Modal de Cautela
  const handleOpenLoanModal = (preselectedVehicle?: Vehicle) => {
    setVehicleSearchTerm('');
    setIsVehicleDropdownOpen(false);

    if (preselectedVehicle) {
      setSelectedVehicleId(preselectedVehicle.id);
      setDepartureOdometer(preselectedVehicle.current_odometer || 0);
      setDepartureFuelLevel(preselectedVehicle.current_fuel_level || '8/8');
    } else if (availableVehicles.length > 0) {
      setSelectedVehicleId(availableVehicles[0].id);
      setDepartureOdometer(availableVehicles[0].current_odometer || 0);
      setDepartureFuelLevel(availableVehicles[0].current_fuel_level || '8/8');
    } else {
      setSelectedVehicleId('');
      setDepartureOdometer(0);
      setDepartureFuelLevel('8/8');
    }

    // Pré-selecionar usuário logado como sugestão
    if (user) {
      const match = systemUsers.find(
        (u) => u.id === user.id || u.saram === user.saram || u.name === user.name
      );
      if (match) setSelectedDriver(match);
      else setSelectedDriver(null);
    } else {
      setSelectedDriver(null);
    }

    setDriverSearch('');
    setDestinationType('interna');
    setDestination('BASP');
    setMissionReason('');
    setDepartureItems({ ...DEFAULT_CHECKLIST });
    setDepartureDamages([]);
    setDepartureNotes('');
    setDeparturePhoto(null);
    setDriverAuthPassword('');
    setSignatureCanvasData('');
    setIsLoanModalOpen(true);
  };

  // Mudança de Viatura no Modal de Cautela
  const handleVehicleSelect = (vtrId: string) => {
    setSelectedVehicleId(vtrId);
    const vtr = vehicles.find((v) => v.id === vtrId);
    if (vtr) {
      setDepartureOdometer(vtr.current_odometer || 0);
      setDepartureFuelLevel(vtr.current_fuel_level || '8/8');
    }
  };

  // Marcar todos os itens como OK
  const handleMarkAllItemsOk = (isDeparture = true) => {
    if (isDeparture) {
      setDepartureItems({ ...DEFAULT_CHECKLIST });
    } else {
      setReturnItems({ ...DEFAULT_CHECKLIST });
    }
  };

  // Helper para obter estilo dinâmico do item do checklist
  const getChecklistItemStyle = (val: string) => {
    if (val === 'OK') {
      return {
        bg: 'bg-white dark:bg-slate-900',
        border: 'border-slate-200 dark:border-slate-800',
        text: 'text-slate-700 dark:text-slate-200',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        badgeText: 'text-emerald-700 dark:text-emerald-300'
      };
    }
    if (val === 'ACEITÁVEL') {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-300 dark:border-blue-900',
        text: 'text-blue-700 dark:text-blue-300',
        badgeBg: 'bg-blue-600',
        badgeText: 'text-white'
      };
    }
    // RUIM
    return {
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-300 dark:border-orange-900',
      text: 'text-orange-700 dark:text-orange-300',
      badgeBg: 'bg-orange-600',
      badgeText: 'text-white'
    };
  };

  // Alternar item específico do checklist
  const handleToggleChecklistItem = (key: string, isDeparture = true) => {
    const getNextState = (current: string) => {
      if (current === 'OK') return 'RUIM';
      if (current === 'RUIM') return 'ACEITÁVEL';
      return 'OK';
    };

    if (isDeparture) {
      setDepartureItems((prev) => ({
        ...prev,
        [key]: getNextState(prev[key])
      }));
    } else {
      setReturnItems((prev) => ({
        ...prev,
        [key]: getNextState(prev[key])
      }));
    }
  };

  // Canvas Handlers para Assinatura
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = isDarkMode ? '#60a5fa' : '#1e3a8a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureCanvasData(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureCanvasData('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'departure' | 'return') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        if (type === 'departure') setDeparturePhoto(dataUrl);
        else setReturnPhoto(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Submeter Cautela (Saída de VTR)
  const handleConfirmLoan = async () => {
    if (!selectedVehicleId) {
      alert('Selecione uma viatura.');
      return;
    }
    if (!selectedDriver) {
      alert('Selecione o militar condutor que está retirando a viatura.');
      return;
    }
    if (destinationType === 'externa' && (!destination || !destination.trim())) {
      alert('Por favor, informe o destino externo da missão.');
      return;
    }

    try {
      setActionLoading(true);

      const targetVtr = vehicles.find((v) => v.id === selectedVehicleId);
      if (!targetVtr) throw new Error('Viatura não encontrada');

      const year = new Date().getFullYear();
      const count = loans.length + 1;
      const loanNumber = `VTR-${year}-${String(count).padStart(4, '0')}`;

      const newLoanData = {
        loan_number: loanNumber,
        vehicle_id: selectedVehicleId,
        om_id: currentOmId || targetVtr.om_id || null,
        driver_id: selectedDriver.id || null,
        driver_name: selectedDriver.war_name || selectedDriver.name,
        driver_rank: selectedDriver.rank || 'Militar',
        driver_saram: selectedDriver.saram || 'N/I',
        driver_signature: true,
        driver_signature_data: signatureCanvasData || 'ASSINADO_ELETRONICAMENTE',
        dispatcher_id: user?.id || null,
        dispatcher_name: user?.warName || user?.name || 'Despachante',
        dispatcher_saram: user?.saram || 'N/I',
        departure_date: new Date().toISOString(),
        destination: destinationType === 'interna' ? 'BASP' : (destination.trim() || null),
        mission_reason: missionReason || null,
        status: 'Em Uso',
        departure_odometer: Number(departureOdometer),
        departure_fuel_level: departureFuelLevel,
        departure_items: departureItems,
        departure_damages: departureDamages,
        departure_notes: departureNotes.trim() || null,
        departure_photos: departurePhoto ? [departurePhoto] : null
      };

      const { data: createdLoan, error: loanErr } = await supabase
        .from('vehicle_loans')
        .insert([newLoanData])
        .select('*, vehicle:vehicles(*)')
        .single();

      if (loanErr) throw loanErr;

      const { error: vtrErr } = await supabase
        .from('vehicles')
        .update({
          status: 'Cautelada',
          current_odometer: departureOdometer,
          current_fuel_level: departureFuelLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedVehicleId);

      if (vtrErr) throw vtrErr;

      await fetchVehicles();
      await fetchLoans();

      setIsLoanModalOpen(false);

      if (createdLoan) {
        setPrintLoanData({ loan: createdLoan, type: 'departure' });
      }

      alert(`✅ Cautela ${loanNumber} realizada com sucesso! O termo de checklist foi aberto para visualização e impressão.`);
    } catch (err: any) {
      console.error('Erro ao realizar cautela:', err);
      alert('Erro ao realizar cautela: ' + (err.message || 'Verifique o console'));
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir Modal de Devolução
  const handleOpenReturnModal = (loan: VehicleLoan) => {
    setSelectedLoanForReturn(loan);
    setReturnOdometer(loan.departure_odometer || 0);
    setReturnFuelLevel(loan.departure_fuel_level || '8/8');
    setReturnItems(loan.departure_items ? { ...loan.departure_items } : { ...DEFAULT_CHECKLIST });
    setReturnDamages(loan.departure_damages ? [...loan.departure_damages] : []);
    setReturnNotes('');
    setReturnPhoto(null);
    setIsReturnModalOpen(true);
  };

  // Submeter Devolução de VTR
  const handleConfirmReturn = async () => {
    if (!selectedLoanForReturn) return;

    if (returnOdometer < selectedLoanForReturn.departure_odometer) {
      alert(
        `O odômetro de retorno (${returnOdometer} km) não pode ser inferior ao odômetro de saída (${selectedLoanForReturn.departure_odometer} km).`
      );
      return;
    }

    try {
      setActionLoading(true);

      const distance = returnOdometer - selectedLoanForReturn.departure_odometer;

      const { data: updatedLoan, error: loanErr } = await supabase
        .from('vehicle_loans')
        .update({
          status: 'Devolvido',
          return_date: new Date().toISOString(),
          return_dispatcher_id: user?.id || null,
          return_dispatcher_name: user?.warName || user?.name || 'Despachante',
          return_dispatcher_saram: user?.saram || 'N/I',
          return_odometer: returnOdometer,
          distance_traveled: distance,
          return_fuel_level: returnFuelLevel,
          return_items: returnItems,
          return_damages: returnDamages,
          return_notes: returnNotes.trim() || null,
          return_photos: returnPhoto ? [returnPhoto] : null,
          return_signature: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLoanForReturn.id)
        .select('*, vehicle:vehicles(*)')
        .single();

      if (loanErr) throw loanErr;

      const { error: vtrErr } = await supabase
        .from('vehicles')
        .update({
          status: 'Disponível',
          current_odometer: returnOdometer,
          current_fuel_level: returnFuelLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLoanForReturn.vehicle_id);

      if (vtrErr) throw vtrErr;

      await fetchVehicles();
      await fetchLoans();

      setIsReturnModalOpen(false);

      if (updatedLoan) {
        setPrintLoanData({ loan: updatedLoan, type: 'return' });
      }

      alert(
        `✅ Viatura devolvida com sucesso!\nDistância percorrida: ${distance} km.\nO termo de devolução foi aberto para visualização e impressão.`
      );
    } catch (err: any) {
      console.error('Erro ao registrar devolução:', err);
      alert('Erro ao registrar devolução: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir Modal de Edição de Viatura (Gerir VTR)
  const handleOpenEditVehicleModal = (vtr: Vehicle) => {
    setEditingVehicle(vtr);
    setEditStatus(vtr.status);
    setEditOdometer(vtr.current_odometer || 0);
    setEditFuelLevel(vtr.current_fuel_level || '8/8');
    setEditNotes(vtr.notes || '');
  };

  // Salvar Edição da Viatura (Status, Odômetro, Combustível, Notas)
  const handleSaveVehicleEdit = async () => {
    if (!editingVehicle) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('vehicles')
        .update({
          status: editStatus,
          current_odometer: Number(editOdometer) || 0,
          current_fuel_level: editFuelLevel,
          notes: editNotes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingVehicle.id);

      if (error) throw error;

      await fetchVehicles();
      setEditingVehicle(null);
      alert(`✅ Informações da viatura ${editingVehicle.reg_fab} atualizadas para "${editStatus}".`);
    } catch (err: any) {
      console.error('Erro ao atualizar viatura:', err);
      alert('Erro ao atualizar: ' + (err.message || 'Verifique o console'));
    } finally {
      setActionLoading(false);
    }
  };

  // Cadastrar Nova Viatura (dentro da aba 'Gerir Frota')
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegFab || !newPlate || !newBrand || !newModel) {
      alert('Preencha os campos obrigatórios: RegFab, Placa, Marca e Modelo.');
      return;
    }

    try {
      setActionLoading(true);

      const newVtr = {
        om_id: currentOmId || null,
        reg_fab: newRegFab.trim().toUpperCase(),
        plate: newPlate.trim().toUpperCase(),
        brand: newBrand.trim(),
        model: newModel.trim(),
        category: newCategory,
        year: newYear || null,
        color: newColor || 'Branca',
        fuel_type: newFuelType || 'Flex',
        current_odometer: Number(newOdometer) || 0,
        current_fuel_level: newFuelLevel,
        status: newStatus,
        notes: newNotes.trim() || null
      };

      const { error } = await supabase.from('vehicles').insert([newVtr]);
      if (error) throw error;

      await fetchVehicles();
      setIsNewVehicleModalOpen(false);

      // Limpar formulário
      setNewRegFab('');
      setNewPlate('');
      setNewBrand('');
      setNewModel('');
      setNewCategory('P-1');
      setNewFuelType('Diesel');
      setNewOdometer(0);
      setNewNotes('');

      alert(`✅ Viatura ${newVtr.reg_fab} (${newVtr.model}) cadastrada com sucesso na frota!`);
    } catch (err: any) {
      console.error('Erro ao cadastrar viatura:', err);
      alert('Erro ao cadastrar viatura: ' + (err.message || 'Verifique se o RegFab já existe'));
    } finally {
      setActionLoading(false);
    }
  };

  // Filtragem da frota na aba "Gerir Frota"
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.reg_fab.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = fleetStatusFilter === 'ALL' || v.status === fleetStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [vehicles, searchTerm, fleetStatusFilter]);

  // Filtragem de cautelas
  const filteredLoans = useMemo(() => {
    const list = cautelaSubTab === 'em_uso' ? activeLoans : historyLoans;
    return list.filter((l) => {
      const vPlate = l.vehicle?.plate || '';
      const vReg = l.vehicle?.reg_fab || '';
      const vModel = l.vehicle?.model || '';
      const driver = `${l.driver_rank} ${l.driver_name} ${l.driver_saram}`;
      const search = searchTerm.toLowerCase();

      return (
        l.loan_number.toLowerCase().includes(search) ||
        vPlate.toLowerCase().includes(search) ||
        vReg.toLowerCase().includes(search) ||
        vModel.toLowerCase().includes(search) ||
        driver.toLowerCase().includes(search)
      );
    });
  }, [cautelaSubTab, activeLoans, historyLoans, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Top Banner / Cabeçalho da Central de Viaturas (Limpo, apenas Cautelar VTR no topo) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Car className="w-3.5 h-3.5" /> Logística & Frota Operacional
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Central de Viaturas
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Despacho rápido de viaturas, checklist de saída, conferência de retorno com mapa de avarias, gestão completa de frota e painel de inteligência (BI).
            </p>
          </div>

          {/* Botão de Ação Primária do Despachante */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleOpenLoanModal()}
              disabled={availableVehicles.length === 0}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center gap-2.5 shadow-lg shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key className="w-4 h-4" />
              Cautelar VTR
            </button>
          </div>
        </div>

        {/* Resumo Rápido no Topo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Frota Total
            </span>
            <span className="text-xl sm:text-2xl font-black text-white">{vehicles.length}</span>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
              Disponíveis
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {availableVehicles.length}
            </span>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              Em Missão (Na Rua)
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              {activeLoans.length}
            </span>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-700/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block">
              Manutenção / Alienação
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-400">
              {vehicles.filter(
                (v) =>
                  v.status === 'Em Manutenção' ||
                  v.status === 'Manutenção' ||
                  v.status === 'Alienação' ||
                  v.status === 'Baixada'
              ).length}
            </span>
          </div>
        </div>
      </div>

      {/* Navegação entre Módulos: 1. Cautelas & Operação | 2. Gerir Frota | 3. Painel BI & Estatísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar w-full sm:w-auto flex-nowrap">
          <button
            onClick={() => setActiveTab('cautelas')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'cautelas'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Cautelas & Retorno
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'cautelas'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {activeLoans.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gerir_frota')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'gerir_frota'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Gerir Frota
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTab === 'gerir_frota'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {vehicles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bi_stats')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'bi_stats'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Painel BI & Estatísticas
          </button>
        </div>

        {/* Busca Rápida (para Cautelas ou Frota) */}
        {activeTab !== 'bi_stats' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'gerir_frota'
                  ? 'Buscar por placa, RegFab, modelo...'
                  : 'Buscar cautela, placa, militar...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: CAUTELAS & OPERAÇÃO (EM USO + HISTÓRICO + CHECK DE RETORNO)        */}
      {/* ========================================================================= */}
      {activeTab === 'cautelas' && (
        <div className="space-y-4">
          {/* Sub-abas: Em Uso vs Histórico */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setCautelaSubTab('em_uso')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                cautelaSubTab === 'em_uso'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Viaturas em Uso ({activeLoans.length})
            </button>
            <button
              onClick={() => setCautelaSubTab('historico')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                cautelaSubTab === 'historico'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Histórico de Missões Concluídas ({historyLoans.length})
            </button>
          </div>

          {/* Lista de Cautelas Em Uso */}
          {cautelaSubTab === 'em_uso' && (
            <div>
              {filteredLoans.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-4">
                    <Car className="w-8 h-8 opacity-80" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nenhuma viatura em missão no momento
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6">
                    Todas as viaturas operacionais estão disponíveis no pátio. Para liberar uma viatura, clique no botão abaixo.
                  </p>
                  <button
                    onClick={() => handleOpenLoanModal()}
                    disabled={availableVehicles.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" /> Cautelar VTR
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredLoans.map((loan) => {
                    const vtr = loan.vehicle;
                    return (
                      <div
                        key={loan.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                {loan.loan_number}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Em Missão
                              </span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                              {vtr?.brand} {vtr?.model}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Placa: {vtr?.plate}
                              </span>
                              <span>•</span>
                              <span>RegFab: {vtr?.reg_fab}</span>
                            </div>
                          </div>

                          <div className="border border-slate-800 dark:border-slate-600 rounded-md overflow-hidden bg-white text-center shadow-xs shrink-0 w-24">
                            <div className="bg-blue-900 text-[8px] font-black text-white px-1 py-0.5">
                              BRASIL
                            </div>
                            <div className="text-xs font-black text-slate-900 py-1 tracking-wider">
                              {vtr?.plate}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-800/80 my-3 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Militar Condutor
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {loan.driver_rank} {loan.driver_name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              SARAM: {loan.driver_saram}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Saída / Despachante
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {loan.departure_date
                                ? new Date(loan.departure_date).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit'
                                  })
                                : 'N/I'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Por: {loan.dispatcher_name}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Odômetro de Saída
                            </span>
                            <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Gauge className="w-3.5 h-3.5 text-blue-500" />
                              {loan.departure_odometer} km
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Combustível de Saída
                            </span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Fuel className="w-3.5 h-3.5" />
                              {loan.departure_fuel_level || '8/8'}
                            </span>
                          </div>
                        </div>

                        {(loan.destination || loan.mission_reason) && (
                          <div className="mb-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                            {loan.destination && (
                              <div className="flex items-center gap-1.5 font-medium">
                                <Navigation className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>Destino: </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {loan.destination}
                                </span>
                              </div>
                            )}
                            {loan.mission_reason && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Motivo: {loan.mission_reason}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPrintLoanData({ loan, type: 'departure' })}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Visualizar Checklist de Saída e Imprimir"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            PDF de Saída
                          </button>

                          <button
                            onClick={() => handleOpenReturnModal(loan)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95 transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Receber Devolução (Check Retorno)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Lista de Histórico de Cautelas */}
          {cautelaSubTab === 'historico' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5">Cautela</th>
                      <th className="px-4 py-3.5">Viatura</th>
                      <th className="px-4 py-3.5">Condutor</th>
                      <th className="px-4 py-3.5">Saída / Retorno</th>
                      <th className="px-4 py-3.5">Distância</th>
                      <th className="px-4 py-3.5">Avarias</th>
                      <th className="px-4 py-3.5 text-right">PDFs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {loan.loan_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {loan.vehicle?.brand} {loan.vehicle?.model}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {loan.vehicle?.plate} • {loan.vehicle?.reg_fab}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {loan.driver_rank} {loan.driver_name}
                          </div>
                          <div className="text-[11px] text-slate-400">SARAM: {loan.driver_saram}</div>
                        </td>
                        <td className="px-4 py-3 text-[11px]">
                          <div>
                            <span className="text-slate-400">S: </span>
                            {loan.departure_date
                              ? new Date(loan.departure_date).toLocaleDateString('pt-BR')
                              : '-'}
                          </div>
                          <div>
                            <span className="text-slate-400">R: </span>
                            {loan.return_date
                              ? new Date(loan.return_date).toLocaleDateString('pt-BR')
                              : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-black text-blue-600 dark:text-blue-400">
                            {loan.distance_traveled || 0} km
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {loan.return_damages && loan.return_damages.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold text-[10px]">
                              {loan.return_damages.length} avaria(s)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                              Sem Avarias
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPrintLoanData({ loan, type: 'departure' })}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                              title="Visualizar / Imprimir Checklist de Saída"
                            >
                              <Eye className="w-3.5 h-3.5" /> Saída
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintLoanData({ loan, type: 'return' })}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                              title="Visualizar / Imprimir Checklist de Devolução"
                            >
                              <Eye className="w-3.5 h-3.5" /> Devolução
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: GERIR FROTA (CADASTRO DE VTR, LISTAGEM COMPLETA E GESTÃO DE STATUS) */}
      {/* ========================================================================= */}
      {activeTab === 'gerir_frota' && (
        <div className="space-y-4">
          {/* Barra de Ações da Frota */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Filtros de Status */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar w-full sm:w-auto flex-nowrap">
              <button
                onClick={() => setFleetStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  fleetStatusFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Todas ({vehicles.length})
              </button>
              <button
                onClick={() => setFleetStatusFilter('Disponível')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  fleetStatusFilter === 'Disponível'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                Disponíveis ({availableVehicles.length})
              </button>
              <button
                onClick={() => setFleetStatusFilter('Cautelada')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  fleetStatusFilter === 'Cautelada'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                Cauteladas ({activeLoans.length})
              </button>
              <button
                onClick={() => setFleetStatusFilter('Em Manutenção')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  fleetStatusFilter === 'Em Manutenção'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                Manutenção
              </button>
              <button
                onClick={() => setFleetStatusFilter('Alienação')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  fleetStatusFilter === 'Alienação'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                }`}
              >
                Alienação
              </button>
            </div>

            {/* Botões de Ação na Frota */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchVehicles(true)}
                title="Sincronizar frota oficial da FAB"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Sincronizar</span>
              </button>

              <button
                onClick={() => setIsNewVehicleModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Cadastrar Viatura
              </button>
            </div>
          </div>

          {/* Cards das Viaturas da Frota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map((vtr) => {
              const statusConfig =
                VEHICLE_STATUSES.find((s) => s.status === vtr.status) || {
                  label: vtr.status,
                  color: 'text-slate-700 dark:text-slate-300',
                  bg: 'bg-slate-100 dark:bg-slate-800',
                  border: 'border-slate-200'
                };

              const formattedCat = vtr.category
                ? vtr.category.replace(/^P-/, 'P')
                : 'P1';

              const officialData = OFFICIAL_FAB_VEHICLES.find(
                (o) => o.reg_fab.toUpperCase() === vtr.reg_fab.toUpperCase()
              );
              const displayDescription = vtr.description || officialData?.description;

              return (
                <div
                  key={vtr.id}
                  onClick={() => handleOpenEditVehicleModal(vtr)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {vtr.reg_fab}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Cat. {formattedCat}
                          </span>
                          {displayDescription && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                              {displayDescription}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {vtr.brand} {vtr.model}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Ano: {vtr.year || 'N/I'} • Cor: {vtr.color || 'Branca'} • {vtr.fuel_type || 'Flex'}
                        </p>
                      </div>

                      {/* Placa Estilo Mercosul */}
                      <div className="border border-slate-800 dark:border-slate-600 rounded-md overflow-hidden bg-white text-center shadow-xs shrink-0 w-20">
                        <div className="bg-blue-900 text-[7px] font-black text-white px-1 py-0.5">
                          BRASIL
                        </div>
                        <div className="text-[11px] font-black text-slate-900 py-0.5 tracking-wider">
                          {vtr.plate}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-xs mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Odômetro Atual
                        </span>
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {vtr.current_odometer} km
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Combustível
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {vtr.current_fuel_level || '8/8'}
                        </span>
                      </div>
                    </div>

                    {vtr.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-2 line-clamp-1">
                        "{vtr.notes}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                      <Edit2 className="w-3 h-3" /> Clique para gerir / alterar status
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVehicle(vtr.id);
                        }}
                        className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Excluir Viatura"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: PAINEL DE INTELIGÊNCIA E ESTATÍSTICAS (BI DE VIATURAS)            */}
      {/* ========================================================================= */}
      {activeTab === 'bi_stats' && (
        <VehicleBIStats vehicles={vehicles} loans={loans} isDarkMode={isDarkMode} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CAUTELAR VTR (SAÍDA RÁPIDA PARA O DESPACHANTE)                   */}
      {/* ========================================================================= */}
      {isLoanModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsLoanModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">Cautelar Viatura (Saída)</h3>
                  <p className="text-xs text-blue-100">
                    Preencha os dados da missão, confira o checklist e obtenha a assinatura do militar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLoanModalOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
              {/* PASSO 1: SELEÇÃO INTELIGENTE DA VIATURA */}
              <div className="space-y-2.5" ref={vehicleSelectorRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Selecione a Viatura *
                  </label>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/60">
                    {availableVehicles.length} {availableVehicles.length === 1 ? 'viatura disponível' : 'viaturas disponíveis'}
                  </span>
                </div>

                {/* Campo de Pesquisa Inteligente com Combobox */}
                <div className="relative">
                  <Search className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={vehicleSearchInputRef}
                    type="text"
                    value={vehicleSearchTerm}
                    onChange={(e) => {
                      setVehicleSearchTerm(e.target.value);
                      setIsVehicleDropdownOpen(true);
                    }}
                    onFocus={() => setIsVehicleDropdownOpen(true)}
                    placeholder="Pesquise por RegFab (ex: 24DP210), modelo (L200), placa (FZF9A01)..."
                    className="w-full pl-10 pr-20 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {vehicleSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleSearchTerm('');
                          setIsVehicleDropdownOpen(true);
                          vehicleSearchInputRef.current?.focus();
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                        title="Limpar pesquisa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsVehicleDropdownOpen((prev) => !prev)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"
                      title="Ver todas as viaturas disponíveis"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isVehicleDropdownOpen ? 'rotate-180 text-blue-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dropdown de Resultados Inteligentes */}
                  {isVehicleDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto p-2 space-y-1.5 animate-in fade-in-50 zoom-in-95 duration-150">
                      {filteredAvailableVehicles.length > 0 ? (
                        filteredAvailableVehicles.map((v) => {
                          const isSelected = v.id === selectedVehicleId;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                handleVehicleSelect(v.id);
                                setIsVehicleDropdownOpen(false);
                                setVehicleSearchTerm('');
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 shadow-xs'
                                  : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/30'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`p-2 rounded-xl shrink-0 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 group-hover:text-blue-600'
                                  }`}
                                >
                                  <Car className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 tracking-wider">
                                      {v.reg_fab}
                                    </span>
                                    {v.category && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {v.category}
                                      </span>
                                    )}
                                    {v.description && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 truncate max-w-[160px]">
                                        {v.description}
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-black text-sm text-slate-900 dark:text-white mt-0.5 truncate">
                                    {v.brand} {v.model}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span>
                                      Placa: <strong className="text-slate-700 dark:text-slate-200">{v.plate}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      KM: <strong className="text-slate-700 dark:text-slate-200">{v.current_odometer}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Combustível: <strong className="text-slate-700 dark:text-slate-200">{v.fuel_type || 'Diesel'}</strong> ({v.current_fuel_level || '8/8'})
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 rounded-lg">
                                    <Check className="w-3.5 h-3.5" /> Selecionada
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Selecionar →
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center space-y-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Nenhuma viatura disponível encontrada para "{vehicleSearchTerm}".
                          </p>
                          {unavailableMatch && (
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300">
                              ⚠️ A viatura <strong>{unavailableMatch.reg_fab}</strong> ({unavailableMatch.brand} {unavailableMatch.model}) está com status <strong>{unavailableMatch.status}</strong> e não pode ser cautelada.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cartão Informativo da Viatura Selecionada */}
                {selectedVehicle ? (
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 rounded-2xl border border-blue-200/90 dark:border-blue-900/60 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
                        <Car className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs px-2 py-0.5 rounded-md bg-blue-600 text-white tracking-wider shadow-xs">
                            {selectedVehicle.reg_fab}
                          </span>
                          {selectedVehicle.category && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                              {selectedVehicle.category}
                            </span>
                          )}
                          {selectedVehicle.description && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                              {selectedVehicle.description}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Disponível
                          </span>
                        </div>
                        <div className="font-black text-sm text-slate-900 dark:text-white mt-1">
                          {selectedVehicle.brand} {selectedVehicle.model}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>
                            Placa: <strong className="text-slate-800 dark:text-slate-200">{selectedVehicle.plate}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Odômetro: <strong className="text-slate-800 dark:text-slate-200">{departureOdometer} km</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Combustível: <strong className="text-slate-800 dark:text-slate-200">{selectedVehicle.fuel_type || 'Diesel'}</strong> ({departureFuelLevel})
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsVehicleDropdownOpen(true);
                        vehicleSearchInputRef.current?.focus();
                      }}
                      className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Trocar
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Nenhuma viatura selecionada. Digite na caixa de pesquisa acima para encontrar e selecionar uma viatura.</span>
                  </div>
                )}
              </div>

              {/* PASSO 2: CONDUTOR (BUSCA RÁPIDA + BOTÃO MILITAR ATUAL) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Militar Condutor (Quem retira a viatura) *
                  </label>
                  {user && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriver({
                          id: user.id,
                          name: user.name,
                          rank: user.rank,
                          saram: user.saram,
                          war_name: user.warName || user.name
                        });
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Selecionar meu usuário ({user.warName || user.name})
                    </button>
                  )}
                </div>

                {selectedDriver ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                        {selectedDriver.rank?.[0] || 'M'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {selectedDriver.rank} {selectedDriver.war_name || selectedDriver.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          SARAM: {selectedDriver.saram} • {selectedDriver.name}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDriver(null)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Trocar Condutor
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Digite o SARAM ou Nome de Guerra do militar..."
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                      {driverSuggestions.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedDriver(m);
                            setDriverSearch('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <span className="font-bold text-blue-600 dark:text-blue-400">{m.rank}</span>
                          <span>{m.war_name || m.name}</span>
                          <span className="text-[10px] text-slate-400">({m.saram})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* PASSO 3: ODÔMETRO, COMBUSTÍVEL, DESTINO E MOTIVO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Odômetro de Saída (KM) *
                  </label>
                  <input
                    type="number"
                    value={departureOdometer}
                    onChange={(e) => setDepartureOdometer(Number(e.target.value))}
                    className="w-full text-sm font-bold p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Nível de Combustível *
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {FUEL_LEVELS.map((fuel) => (
                      <button
                        key={fuel}
                        type="button"
                        onClick={() => setDepartureFuelLevel(fuel)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          departureFuelLevel === fuel
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {fuel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DESTINO DA MISSÃO (INTERNA: BASP / EXTERNA: DIÁLOGO DE ENTRADA) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Destino da Missão *
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {destinationType === 'interna' ? 'Missão Interna' : 'Missão Externa'}
                    </span>
                  </div>

                  {/* Botões Seletores INTERNA vs EXTERNA */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationType('interna');
                        setDestination('BASP');
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                        destinationType === 'interna'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>INTERNA (BASP)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDestinationType('externa');
                        if (destination === 'BASP') {
                          setDestination('');
                        }
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                        destinationType === 'externa'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>EXTERNA</span>
                    </button>
                  </div>

                  {/* Exibição condicional conforme o tipo selecionado */}
                  {destinationType === 'interna' ? (
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs animate-in fade-in duration-150">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-black text-xs">BASP</div>
                          <div className="text-[10px] text-blue-700 dark:text-blue-400">
                            Base Aérea de São Paulo (Circulação Interna)
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        ✓ Definido
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          required
                          placeholder="Digite o destino externo (Ex: CINDACTA, HAAF, GAP-SP, etc.)..."
                          value={destination === 'BASP' ? '' : destination}
                          onChange={(e) => setDestination(e.target.value)}
                          className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">Sugestões rápidas:</span>
                        {['CINDACTA', 'HAAF', 'GAP-SP', 'COMGAP', 'HFASP'].map((quickDest) => (
                          <button
                            key={quickDest}
                            type="button"
                            onClick={() => setDestination(quickDest)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                          >
                            {quickDest}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Motivo / Ordem de Serviço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Escolta, transporte de efetivo, ronda"
                    value={missionReason}
                    onChange={(e) => setMissionReason(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* PASSO 4: CHECKLIST DE ITENS (ESTILO MOVIDA) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Itens Conferidos (Checklist de Saída)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleMarkAllItemsOk(true)}
                    className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Marcar Todos como OK
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {Object.entries(departureItems).map(([key, val]) => {
                    const styles = getChecklistItemStyle(val);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToggleChecklistItem(key, true)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${styles.bg} ${styles.border} ${styles.text}`}
                      >
                        <span className="text-[11px] font-medium capitalize truncate pr-1">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${styles.badgeBg} ${styles.badgeText}`}
                        >
                          {val}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PASSO 5: DIAGRAMA DE AVARIAS PRÉ-EXISTENTES (OPCIONAL) */}
              <div className="space-y-3">
                <VehicleDamageDiagram
                  damages={departureDamages}
                  onChange={setDepartureDamages}
                  readOnly={false}
                  headerActions={
                    <label className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                      <Camera className="w-3.5 h-3.5" /> Tirar Foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, 'departure')}
                      />
                    </label>
                  }
                />
                {departurePhoto && (
                  <div className="relative inline-block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <img src={departurePhoto} alt="Viatura" className="w-48 h-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => setDeparturePhoto(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                      title="Remover Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* O bloco extra de foto foi movido para junto da assinatura */}

              {/* PASSO 6: ASSINATURA DO MILITAR CONDUTOR */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    4. Assinatura do Condutor ({selectedDriver ? `${selectedDriver.rank} ${selectedDriver.war_name || selectedDriver.name}` : 'Militar'}) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('signature')}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                        authMethod === 'signature'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Rubrica Digital (Canvas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMethod('password')}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                        authMethod === 'password'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Senha do Militar
                    </button>
                  </div>
                </div>

                {authMethod === 'signature' ? (
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-[11px] text-slate-500">
                      O militar deve assinar no quadro abaixo com o mouse ou tela touch:
                    </p>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 overflow-hidden relative">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={140}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-32 cursor-crosshair touch-none"
                      />
                      {!signatureCanvasData && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                          Assine aqui com o dedo ou mouse
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-xs text-red-500 hover:underline font-bold"
                      >
                        Limpar Assinatura
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Digite a senha de login do militar ({selectedDriver?.name || 'Condutor'})
                    </label>
                    <input
                      type="password"
                      placeholder="Senha do condutor..."
                      value={driverAuthPassword}
                      onChange={(e) => setDriverAuthPassword(e.target.value)}
                      className="w-full p-3 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsLoanModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmLoan}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Processando e Gerando PDF...' : 'Concluir Cautela e Gerar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECEBER DEVOLUÇÃO (CHECKLIST RETORNO + MAPA DE AVARIAS MOVIDA)    */}
      {/* ========================================================================= */}
      {isReturnModalOpen && selectedLoanForReturn && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsReturnModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">
                    Receber Devolução de Viatura (Checklist de Retorno)
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Cautela: {selectedLoanForReturn.loan_number} • VTR: {selectedLoanForReturn.vehicle?.brand}{' '}
                    {selectedLoanForReturn.vehicle?.model} (Placa: {selectedLoanForReturn.vehicle?.plate})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Condutor
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedLoanForReturn.driver_rank} {selectedLoanForReturn.driver_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    KM de Saída
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedLoanForReturn.departure_odometer} km
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Combustível Saída
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedLoanForReturn.departure_fuel_level || '8/8'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Despachante Saída
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedLoanForReturn.dispatcher_name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                    Odômetro de Retorno (KM) *
                  </label>
                  <input
                    type="number"
                    value={returnOdometer}
                    onChange={(e) => setReturnOdometer(Number(e.target.value))}
                    min={selectedLoanForReturn.departure_odometer}
                    className="w-full text-base font-black p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Distância Percorrida:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {Math.max(0, returnOdometer - selectedLoanForReturn.departure_odometer)} km
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-1">
                    Combustível de Retorno *
                  </label>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {FUEL_LEVELS.map((fuel) => (
                      <button
                        key={fuel}
                        type="button"
                        onClick={() => setReturnFuelLevel(fuel)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          returnFuelLevel === fuel
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {fuel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Conferência de Itens no Retorno
                  </label>
                  <button
                    type="button"
                    onClick={() => handleMarkAllItemsOk(false)}
                    className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Marcar Todos como OK
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {Object.entries(returnItems).map(([key, val]) => {
                    const styles = getChecklistItemStyle(val);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToggleChecklistItem(key, false)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${styles.bg} ${styles.border} ${styles.text}`}
                      >
                        <span className="text-[11px] font-medium capitalize truncate pr-1">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${styles.badgeBg} ${styles.badgeText}`}
                        >
                          {val}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <VehicleDamageDiagram
                  damages={returnDamages}
                  onChange={setReturnDamages}
                  readOnly={false}
                  headerActions={
                    <label className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                      <Camera className="w-3.5 h-3.5" /> Tirar Foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, 'return')}
                      />
                    </label>
                  }
                />
                
                {returnPhoto && (
                  <div className="relative inline-block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <img src={returnPhoto} alt="Viatura Devolução" className="w-48 h-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => setReturnPhoto(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                      title="Remover Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* A foto da devolução também foi movida para perto das observações */}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Observações Gerais da Devolução
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Viatura entregue limpa, sem intercorrências..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Processando Devolução...' : 'Concluir Devolução e Gerar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CADASTRAR NOVA VIATURA (DENTRO DE GERIR FROTA)                    */}
      {/* ========================================================================= */}
      {isNewVehicleModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/80 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsNewVehicleModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 max-h-[96vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Cadastrar Viatura na Frota</h3>
                  <p className="text-xs text-slate-400">Adicione uma nova viatura com RegFab, placa e odômetro</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewVehicleModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    RegFab * (Ex: 07DP056)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 07DP056"
                    value={newRegFab}
                    onChange={(e) => setNewRegFab(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Placa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: FAB-056 ou TLA7B50"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Marca * (Ex: MITSUBISHI)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MITSUBISHI, Honda, Mercedes-Benz"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Modelo * (Somente o modelo, ex: L200)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: L200, XRE 190, Atego, Marruá"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Categoria FAB * (P-1 a P-20)
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {FAB_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Disponível">Disponível</option>
                    <option value="Em Manutenção">Em Manutenção</option>
                    <option value="Alienação">Alienação</option>
                    <option value="Baixada">Baixada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Odômetro Inicial (KM) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newOdometer}
                    onChange={(e) => setNewOdometer(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Tipo de Combustível *
                  </label>
                  <select
                    value={newFuelType}
                    onChange={(e) => setNewFuelType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Flex">Flex (Gasolina / Etanol)</option>
                    <option value="Etanol">Etanol</option>
                    <option value="Elétrico / Híbrido">Elétrico / Híbrido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Observações da Viatura
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais da viatura..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewVehicleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  {actionLoading ? 'Salvando...' : 'Salvar Viatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADMINISTRAÇÃO DA VTR & HISTÓRICO COMPLETO COM TODAS AS MISSÕES   */}
      {/* ========================================================================= */}
      {editingVehicle && (
        <VehicleAdminModal
          vehicle={editingVehicle}
          loans={loans}
          onClose={() => setEditingVehicle(null)}
          onVehicleUpdated={async () => {
            await fetchVehicles();
            await fetchLoans();
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: IMPRESSÃO / VISUALIZAÇÃO DO CHECKLIST DA VTR COM CABEÇALHO OFICIAL */}
      {/* ========================================================================= */}
      {printLoanData && (
        <VehicleChecklistPrintModal
          loan={printLoanData.loan}
          type={printLoanData.type}
          onClose={() => setPrintLoanData(null)}
          om={currentOm}
        />
      )}
    </div>
  );
};
