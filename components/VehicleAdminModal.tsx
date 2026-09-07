import React, { useState, useMemo } from 'react';
import { Vehicle, VehicleLoan } from '../types';
import { supabase } from '../services/supabase';
import { generateVehicleChecklistPdf } from '../services/vehiclePdfService';
import { VehicleChecklistPrintModal } from './VehicleChecklistPrintModal';
import {
  Car,
  X,
  CheckCircle2,
  Wrench,
  Ban,
  Clock,
  FileText,
  Download,
  Eye,
  Gauge,
  Fuel,
  Calendar,
  Shield,
  UserCheck,
  AlertTriangle,
  History,
  BarChart2,
  Save,
  Tag
} from 'lucide-react';

export const FAB_CATEGORIES = [
  { value: 'P1', label: 'P1 - VEÍCULO ESPECIAL' },
  { value: 'P2', label: 'P2 - VEÍCULO MÉDIO DE PASSAGEIROS' },
  { value: 'P3', label: 'P3 - UTILITÁRIO (CAMINHONETE)' },
  { value: 'P4', label: 'P4 - SUV / CROSSOVER' },
  { value: 'P5', label: 'P5 - PICK-UP / CAMINHONETE 4X2 E 4X4' },
  { value: 'P6', label: 'P6 - FURGÃO / TRANSPORTE DE CARGA' },
  { value: 'P7', label: 'P7 - CAMINHÃO MILITAR' },
  { value: 'P8', label: 'P8 - MICRO-ÔNIBUS' },
  { value: 'P9', label: 'P9 - ÔNIBUS RODOVIÁRIO / URBANO' },
  { value: 'P10', label: 'P10 - MOTOCICLETA TRAIL' },
  { value: 'P11', label: 'P11 - CAMINHÃO PESADO / CAVALO MECÂNICO' },
  { value: 'P12', label: 'P12 - VIATURA OPERACIONAL ESPECIAL / BLINDADO' },
  { value: 'P13', label: 'P13 - CARRO DE PRESOS' },
  { value: 'P14', label: 'P14 - VAN' },
  { value: 'P15', label: 'P15 - CARRO PATRULHA' },
  { value: 'P16', label: 'P16 - AMBULÂNCIA / RESGATE' },
  { value: 'P17', label: 'P17 - BOMBEIRO / CONTRA-INCÊNDIO' },
  { value: 'P18', label: 'P18 - TRATOR / EQUIPAMENTO DE ENGENHARIA' },
  { value: 'P19', label: 'P19 - CAMINHONETE MILITAR' },
  { value: 'P20', label: 'P20 - OUTRAS VIATURAS ESPECIAIS' }
];

const FUEL_LEVELS = ['1/8', '2/8', '3/8', '4/8', '5/8', '6/8', '7/8', '8/8'];

interface VehicleAdminModalProps {
  vehicle: Vehicle;
  loans: VehicleLoan[];
  onClose: () => void;
  onVehicleUpdated: () => void;
  isDarkMode: boolean;
}

export const VehicleAdminModal: React.FC<VehicleAdminModalProps> = ({
  vehicle,
  loans,
  onClose,
  onVehicleUpdated,
  isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'stats'>('info');
  const [loading, setLoading] = useState(false);
  const [printLoanData, setPrintLoanData] = useState<{
    loan: VehicleLoan;
    type: 'departure' | 'return';
  } | null>(null);

  // Estados editáveis da VTR
  const [status, setStatus] = useState<Vehicle['status']>(vehicle.status);
  const [category, setCategory] = useState<string>(vehicle.category || 'P1');
  const [brand, setBrand] = useState(vehicle.brand);
  const [model, setModel] = useState(vehicle.model);
  const [plate, setPlate] = useState(vehicle.plate);
  const [year, setYear] = useState(vehicle.year || new Date().getFullYear());
  const [color, setColor] = useState(vehicle.color || 'Branca');
  const [fuelType, setFuelType] = useState(vehicle.fuel_type || 'Flex');
  const [currentOdometer, setCurrentOdometer] = useState<number>(vehicle.current_odometer || 0);
  const [currentFuelLevel, setCurrentFuelLevel] = useState<string>(vehicle.current_fuel_level || '8/8');
  const [notes, setNotes] = useState(vehicle.notes || '');

  // Histórico de Cautelas / Missões desta viatura específica
  const vehicleLoans = useMemo(() => {
    return loans
      .filter((l) => l.vehicle_id === vehicle.id || l.vehicle?.reg_fab === vehicle.reg_fab)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [loans, vehicle]);

  // Estatísticas calculadas desta VTR
  const stats = useMemo(() => {
    const totalMissions = vehicleLoans.length;
    const completedMissions = vehicleLoans.filter((l) => l.status === 'Devolvido');
    const totalKm = completedMissions.reduce((acc, l) => {
      const dist =
        l.distance_traveled ||
        (l.return_odometer && l.departure_odometer
          ? Math.max(0, l.return_odometer - l.departure_odometer)
          : 0);
      return acc + dist;
    }, 0);

    const driversCount = new Set(vehicleLoans.map((l) => l.driver_saram || l.driver_name)).size;
    const totalDamages = completedMissions.reduce((acc, l) => {
      return acc + (l.return_damages?.length || 0);
    }, 0);

    return {
      totalMissions,
      completedMissions: completedMissions.length,
      totalKm,
      driversCount,
      totalDamages,
      avgKm: completedMissions.length > 0 ? Math.round(totalKm / completedMissions.length) : 0
    };
  }, [vehicleLoans]);

  // Salvar alterações
  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('vehicles')
        .update({
          status,
          category,
          brand: brand.trim(),
          model: model.trim(),
          plate: plate.trim().toUpperCase(),
          year: Number(year) || null,
          color: color.trim(),
          fuel_type: fuelType.trim(),
          current_odometer: Number(currentOdometer) || 0,
          current_fuel_level: currentFuelLevel,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      alert(`✅ Dados da viatura ${vehicle.reg_fab} atualizados com sucesso!`);
      onVehicleUpdated();
      onClose();
    } catch (err: any) {
      console.error('Erro ao atualizar viatura:', err);
      alert('Erro ao atualizar viatura: ' + (err.message || 'Verifique os dados'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Painel da VTR */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600/30 border border-blue-500/40 rounded-2xl text-blue-400">
              <Car className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-black px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  RegFab: {vehicle.reg_fab}
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Categoria FAB: {category}
                </span>
                {vehicle.description && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded bg-blue-400/20 text-blue-200 border border-blue-300/30">
                    {vehicle.description}
                  </span>
                )}
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded ${
                    status === 'Disponível'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : status === 'Cautelada'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      : status === 'Em Manutenção' || status === 'Manutenção'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                  }`}
                >
                  {status}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {brand} {model}
              </h2>
              <p className="text-xs text-slate-300">
                Placa: <strong className="text-white">{vehicle.plate}</strong> • Odômetro Atual:{' '}
                <strong className="text-white">{vehicle.current_odometer} km</strong> • Nível Combustível:{' '}
                <strong className="text-emerald-400">{vehicle.current_fuel_level || '8/8'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Box Placa Mercosul Estilizada */}
            <div className="border border-slate-700 rounded-md overflow-hidden bg-white text-center shadow-xs shrink-0 w-24">
              <div className="bg-blue-900 text-[8px] font-black text-white px-1 py-0.5">
                BRASIL
              </div>
              <div className="text-xs font-black text-slate-900 py-1 tracking-wider">
                {vehicle.plate}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-2"
              title="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas Internas da Administração da VTR */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            Dados & Estado Operacional
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico de Cautelas & Missões ({vehicleLoans.length})
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Indicadores Desta Viatura
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {/* ========================================================================= */}
          {/* ABA 1: DADOS & ESTADO OPERACIONAL                                         */}
          {/* ========================================================================= */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Seleção de Status Operacional */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                  Estado Operacional da Viatura *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStatus('Disponível')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      status === 'Disponível'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Disponível</div>
                      <div className="text-[10px] opacity-80">Pronta para missão</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('Em Manutenção')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      status === 'Em Manutenção' || status === 'Manutenção'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Wrench className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Em Manutenção</div>
                      <div className="text-[10px] opacity-80">Oficina / Reparo</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('Alienação')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      status === 'Alienação'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Ban className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Alienação</div>
                      <div className="text-[10px] opacity-80">Processo de desativação</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('Baixada')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      status === 'Baixada'
                        ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Ban className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Baixada</div>
                      <div className="text-[10px] opacity-80">Inoperante definitiva</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Campo Categoria FAB (P1 até P15) */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    Classificação FAB (Categoria P1 até P15) *
                  </label>
                  <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    Selecionado: {category}
                  </span>
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm font-semibold p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {FAB_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  A categoria é utilizada no padrão FAB para rateio de cotas de combustível, manutenção e indicadores gerenciais da frota.
                </p>
              </div>

              {/* Grid com Dados do Veículo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Marca (Ex: MITSUBISHI)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    placeholder="Ex: MITSUBISHI, Honda, Mercedes-Benz"
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Modelo (Somente o modelo, ex: L200)
                  </label>
                  <input
                    type="text"
                    value={model}
                    placeholder="Ex: L200, XRE 190, Atego, Marruá"
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Placa
                  </label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Cor
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Combustível
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Flex">Flex (Gasolina / Etanol)</option>
                    <option value="Etanol">Etanol</option>
                    <option value="Elétrico / Híbrido">Elétrico / Híbrido</option>
                  </select>
                </div>
              </div>

              {/* Odômetro Atual e Nível de Combustível */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Odômetro Atual (KM)
                  </label>
                  <input
                    type="number"
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Nível de Combustível no Tanque
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {FUEL_LEVELS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setCurrentFuelLevel(f)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currentFuelLevel === f
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Observações / Histórico de Manutenção */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Observações Gerais / Motivo de Manutenção ou Alienação
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhes mecânicos, histórico de revisão, oficina credenciada ou notas de alienação..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: HISTÓRICO DE MISSÕES / CAUTELAS DESTA VIATURA                      */}
          {/* ========================================================================= */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {vehicleLoans.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nenhuma cautela ou missão registrada para esta viatura
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    As saídas e devoluções realizadas por este veículo ficarão listadas aqui com acesso aos relatórios em PDF.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicleLoans.map((loan) => {
                    const dist =
                      loan.distance_traveled ||
                      (loan.return_odometer && loan.departure_odometer
                        ? Math.max(0, loan.return_odometer - loan.departure_odometer)
                        : 0);

                    return (
                      <div
                        key={loan.id}
                        className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                              {loan.loan_number}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                loan.status === 'Devolvido'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {loan.status === 'Devolvido' ? 'Missão Concluída' : 'Em Missão'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPrintLoanData({ loan, type: 'departure' })}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Visualizar / Imprimir Checklist de Saída"
                            >
                              <Eye className="w-3 h-3 text-blue-500" /> PDF Saída
                            </button>

                            {loan.status === 'Devolvido' && (
                              <button
                                type="button"
                                onClick={() => setPrintLoanData({ loan, type: 'return' })}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                                title="Visualizar / Imprimir Checklist de Devolução"
                              >
                                <Eye className="w-3 h-3" /> PDF Devolução
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 border-y border-slate-200 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Militar Condutor
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {loan.driver_rank} {loan.driver_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">SARAM: {loan.driver_saram}</span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Período da Missão
                            </span>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 block">
                              S:{' '}
                              {loan.departure_date
                                ? new Date(loan.departure_date).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '-'}
                            </span>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 block">
                              R:{' '}
                              {loan.return_date
                                ? new Date(loan.return_date).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Em andamento'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Quilometragem
                            </span>
                            <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                              {dist} km
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {loan.departure_odometer} km → {loan.return_odometer || '...'} km
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Avarias Apontadas
                            </span>
                            {loan.return_damages && loan.return_damages.length > 0 ? (
                              <span className="font-bold text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {loan.return_damages.length} avaria(s)
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Nenhuma avaria
                              </span>
                            )}
                          </div>
                        </div>

                        {(loan.destination || loan.mission_reason) && (
                          <div className="text-[11px] text-slate-500">
                            {loan.destination && <strong>Destino: {loan.destination} • </strong>}
                            {loan.mission_reason && <span>Motivo: {loan.mission_reason}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: ESTATÍSTICAS E INDICADORES DESTA VIATURA                           */}
          {/* ========================================================================= */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Missões Concluídas
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.completedMissions}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Total KM Rodados
                  </span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {stats.totalKm.toLocaleString('pt-BR')} km
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Média KM / Missão
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.avgKm} km
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Avarias Históricas
                  </span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {stats.totalDamages}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Resumo de Utilização Operacional
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A viatura <strong>{vehicle.reg_fab}</strong> ({vehicle.brand} {vehicle.model}) já foi operada por{' '}
                  <strong>{stats.driversCount} militar(es)</strong> diferente(s). Sua categoria oficial na FAB é{' '}
                  <span className="font-bold text-blue-600">{category}</span>. O odômetro atual marca{' '}
                  <strong>{currentOdometer} km</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Painel */}
        <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400 hidden sm:inline">
            RegFab: {vehicle.reg_fab} • {vehicle.plate}
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>

            {activeTab === 'info' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {loading ? 'Salvando...' : 'Salvar Alterações da VTR'}
              </button>
            )}
          </div>
        </div>
      </div>

      {printLoanData && (
        <VehicleChecklistPrintModal
          loan={printLoanData.loan}
          type={printLoanData.type}
          onClose={() => setPrintLoanData(null)}
        />
      )}
    </div>
  );
};
