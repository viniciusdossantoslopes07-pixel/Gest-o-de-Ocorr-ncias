import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { MilitaryOrganization, AccessGate, User } from '../types';
import { Building2, Map, ShieldAlert, Users, DoorOpen, Plus, Save, ImagePlus, Loader2, Trash2, ShieldCheck, MapPin } from 'lucide-react';

interface OMManagementProps {
    currentUser: User | null;
    isDarkMode: boolean;
}

export default function OMManagement({ currentUser, isDarkMode }: OMManagementProps) {
    const [oms, setOms] = useState<MilitaryOrganization[]>([]);
    const [selectedOm, setSelectedOm] = useState<MilitaryOrganization | null>(null);
    const [gates, setGates] = useState<AccessGate[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'map' | 'compare'>('list');

    // Form states for new OM
    const [isCreatingOm, setIsCreatingOm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [omForm, setOmForm] = useState({
        name: '',
        acronym: '',
        address: '',
        zip_code: '',
        host_unit: '',
        zip_code: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stats
    const [stats, setStats] = useState<{
        [omId: string]: { personnelCount: number, occurrencesCount: number }
    }>({});

    useEffect(() => {
        fetchOms();
    }, []);

    const fetchOms = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('military_organizations').select('*').order('created_at', { ascending: true });
        if (data) {
            setOms(data as MilitaryOrganization[]);
            fetchStats(data as MilitaryOrganization[]);
        }
        setLoading(false);
    };

    const fetchStats = async (omList: MilitaryOrganization[]) => {
        const newStats: any = {};
        for (const om of omList) {
            const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('om_id', om.id);
            const { count: occCount } = await supabase.from('occurrences').select('*', { count: 'exact', head: true }).eq('om_id', om.id);
            newStats[om.id] = {
                personnelCount: usersCount || 0,
                occurrencesCount: occCount || 0
            };
        }
        setStats(newStats);
    };

    const fetchGates = async (omId: string) => {
        const { data } = await supabase.from('access_gates').select('*').eq('om_id', omId).order('name', { ascending: true });
        if (data) {
            setGates(data as AccessGate[]);
        }
    };

    const handleSelectOm = (om: MilitaryOrganization) => {
        setSelectedOm(om);
        fetchGates(om.id);
        setIsCreatingOm(false);
        setIsEditing(false);
    };

    const startEditing = () => {
        if (!selectedOm) return;
        setOmForm({
            name: selectedOm.name,
            acronym: selectedOm.acronym,
            address: selectedOm.address || '',
            zip_code: selectedOm.zip_code || '',
            host_unit: selectedOm.host_unit || ''
        });
        setLogoPreview(selectedOm.logo_url || null);
        setIsEditing(true);
    };

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas imagens.');
            return;
        }
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const uploadLogo = async (omId: string): Promise<string | null> => {
        if (!logoFile) return null;
        try {
            const ext = logoFile.name.split('.').pop();
            const filePath = `${omId}/logo_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('om_logos').upload(filePath, logoFile, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('om_logos').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (err) {
            console.error('Error uploading logo:', err);
            return null;
        }
    };

    const geocodeAddress = async (address: string, zip: string): Promise<{lat: number, lon: number} | null> => {
        try {
            const query = encodeURIComponent(`${address} ${zip} Brasil`);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (err) {
            console.error('Geocoding error:', err);
            return null;
        }
    };

    const handleSaveOm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalLogoUrl = logoPreview;
            
            // Auto-Geocode before saving
            const coords = await geocodeAddress(omForm.address, omForm.zip_code);

            if (isEditing && selectedOm) {
                if (logoFile) {
                    finalLogoUrl = await uploadLogo(selectedOm.id);
                }

                const { error } = await supabase.from('military_organizations').update({
                    name: omForm.name,
                    acronym: omForm.acronym,
                    address: omForm.address,
                    zip_code: omForm.zip_code,
                    host_unit: omForm.host_unit,
                    latitude: coords?.lat || null,
                    longitude: coords?.lon || null,
                    logo_url: finalLogoUrl
                }).eq('id', selectedOm.id);

                if (error) throw error;
                alert('OM atualizada com sucesso!');
                setIsEditing(false);
            } else {
                // Create logic
                const { data: newOm, error } = await supabase.from('military_organizations').insert([{
                    name: omForm.name,
                    acronym: omForm.acronym,
                    address: omForm.address,
                    zip_code: omForm.zip_code,
                    host_unit: omForm.host_unit,
                    latitude: coords?.lat || null,
                    longitude: coords?.lon || null,
                    is_active: true
                }]).select().single();

                if (error) throw error;

                if (logoFile && newOm) {
                    const url = await uploadLogo(newOm.id);
                    if (url) {
                        await supabase.from('military_organizations').update({ logo_url: url }).eq('id', newOm.id);
                    }
                }
                alert('OM cadastrada com sucesso!');
                setIsCreatingOm(false);
            }

            setOmForm({ name: '', acronym: '', address: '', zip_code: '', host_unit: '' });
            setLogoFile(null);
            setLogoPreview(null);
            fetchOms();
        } catch (err: any) {
            console.error('Error saving OM:', err);
            alert(`Erro ao salvar OM: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddGate = async () => {
        if (!selectedOm) return;
        const gateName = prompt('Nome do Portão (Ex: PORTÃO G4):');
        if (!gateName) return;

        const { error } = await supabase.from('access_gates').insert([{
            om_id: selectedOm.id,
            name: gateName.toUpperCase()
        }]);

        if (error) {
            alert('Erro ao adicionar portão.');
        } else {
            fetchGates(selectedOm.id);
        }
    };

    const handleToggleGate = async (gate: AccessGate) => {
        const { error } = await supabase.from('access_gates').update({ is_active: !gate.is_active }).eq('id', gate.id);
        if (!error) {
            fetchGates(gate.om_id);
        }
    };

    useEffect(() => {
        // Load Leaflet CSS and JS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            initMap();
        };
        document.body.appendChild(script);

        return () => {
            document.head.removeChild(link);
            document.body.removeChild(script);
        };
    }, []);

    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    const initMap = () => {
        const L = (window as any).L;
        if (!L || !document.getElementById('main-map')) return;

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        mapRef.current = L.map('main-map', {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([-15.7801, -47.9292], 4);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapRef.current);

        // Add markers for each OM
        oms.forEach(om => {
            if (om.latitude && om.longitude) {
                L.marker([om.latitude, om.longitude])
                    .addTo(mapRef.current)
                    .bindPopup(`<b>${om.acronym}</b><br>${om.host_unit || om.name}`)
                    .on('click', () => handleSelectOm(om));
            }
        });

        // Trigger resize to fix layout
        setTimeout(() => {
            mapRef.current?.invalidateSize();
        }, 200);
    };

    useEffect(() => {
        if (viewMode === 'map') {
            const timer = setTimeout(() => {
                initMap();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewMode, oms]);

    useEffect(() => {
        if (selectedOm && mapRef.current && (window as any).L && viewMode === 'map') {
            if (selectedOm.latitude && selectedOm.longitude) {
                mapRef.current.flyTo([selectedOm.latitude, selectedOm.longitude], 13);
            }
        }
    }, [selectedOm, viewMode]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-4 md:p-8">
            
            <div className={`p-6 md:p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-900 rounded-3xl shadow-xl shadow-slate-900/20 text-white transform -rotate-3 hover:rotate-0 transition-all duration-500">
                        <Map className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className={`text-2xl md:text-3xl font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Alto Comando</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Gestão de Organizações Militares
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                        <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Lista</button>
                        <button onClick={() => setViewMode('map')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Mapa</button>
                        <button onClick={() => setViewMode('compare')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'compare' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Comparativo</button>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedOm(null);
                            setIsCreatingOm(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/30"
                    >
                        <Plus className="w-4 h-4" /> Ativar Nova OM
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* List and Map Column */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {viewMode === 'list' && (
                        /* Visual Map Overview (Simplified Dashboard Representation) */
                        <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            {/* Decorative Background grid */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
                            
                            <h3 className={`text-lg font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Organizações Ativas</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {oms.map(om => (
                                    <button
                                        key={om.id}
                                        onClick={() => handleSelectOm(om)}
                                        className={`relative p-6 rounded-2xl border text-left transition-all ${selectedOm?.id === om.id 
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20 scale-[1.02]' 
                                            : isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                {om.logo_url ? (
                                                    <div className="w-12 h-12 rounded-xl bg-white p-1 overflow-hidden shrink-0">
                                                        <img src={om.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedOm?.id === om.id ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                        <Building2 className={`w-6 h-6 ${selectedOm?.id === om.id ? 'text-white' : 'text-slate-400'}`} />
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className={`font-black uppercase tracking-wider ${selectedOm?.id === om.id ? 'text-white' : isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{om.acronym}</h4>
                                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedOm?.id === om.id ? 'text-blue-200' : 'text-slate-500'}`}>{om.host_unit || om.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 mt-6">
                                            <div className={`p-3 rounded-xl ${selectedOm?.id === om.id ? 'bg-blue-700/50' : isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                                <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${selectedOm?.id === om.id ? 'text-blue-200' : 'text-slate-500'}`}><Users className="w-3 h-3" /> Efetivo</p>
                                                <p className={`text-xl font-black mt-1 ${selectedOm?.id === om.id ? 'text-white' : isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats[om.id]?.personnelCount || 0}</p>
                                            </div>
                                            <div className={`p-3 rounded-xl ${selectedOm?.id === om.id ? 'bg-blue-700/50' : isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                                <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${selectedOm?.id === om.id ? 'text-blue-200' : 'text-slate-500'}`}><ShieldAlert className="w-3 h-3" /> Ocorrências</p>
                                                <p className={`text-xl font-black mt-1 ${selectedOm?.id === om.id ? 'text-white' : isDarkMode ? 'text-white' : 'text-slate-800'}`}>{stats[om.id]?.occurrencesCount || 0}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {viewMode === 'map' && (
                        <div className={`p-8 rounded-[2rem] border relative overflow-hidden flex flex-col items-center ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-lg font-black uppercase tracking-widest mb-10 w-full ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Desdobramento Territorial (Brasil)</h3>
                            <div className="relative w-full h-[600px] bg-slate-800 rounded-[2rem] overflow-hidden border border-slate-700 shadow-inner">
                                <div id="main-map" className="w-full h-full" style={{ zIndex: 1 }}></div>
                                
                                {!selectedOm && (
                                    <div className="absolute bottom-6 left-6 right-6 p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl z-10 pointer-events-none">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest text-center">
                                            Selecione uma Organização na lista lateral ou no mapa para visualizar detalhes
                                        </p>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-8 font-bold uppercase tracking-[0.2em] animate-pulse italic">
                                * Posições aproximadas baseadas em coordenadas geográficas
                            </p>
                        </div>
                    )}

                    {viewMode === 'compare' && (
                        <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-lg font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Comparativo de Desempenho</h3>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Unidade</th>
                                            <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                            <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Efetivo</th>
                                            <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Ocorrências</th>
                                            <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Relação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/30">
                                        {oms.map(om => {
                                            const personnel = stats[om.id]?.personnelCount || 0;
                                            const occurrences = stats[om.id]?.occurrencesCount || 0;
                                            const ratio = personnel > 0 ? (occurrences / personnel).toFixed(2) : '0.00';
                                            
                                            return (
                                                <tr key={om.id} className="hover:bg-slate-800/20 transition-colors group">
                                                    <td className="py-4 px-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-[10px] text-blue-400">
                                                                {om.acronym.slice(0, 2)}
                                                            </div>
                                                            <span className="text-sm font-black text-slate-200">{om.host_unit || om.name} ({om.acronym})</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Ativa</span>
                                                    </td>
                                                    <td className="py-4 px-2 text-center text-sm font-black text-white">{personnel}</td>
                                                    <td className="py-4 px-2 text-center text-sm font-black text-white">{occurrences}</td>
                                                    <td className="py-4 px-2 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-[10px] font-black ${parseFloat(ratio) > 0.5 ? 'text-red-400' : 'text-blue-400'}`}>{ratio}</span>
                                                            <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                                <div className={`h-full ${parseFloat(ratio) > 0.5 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(parseFloat(ratio) * 100, 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {/* Details Column */}
                <div className="space-y-6">
                    {(isCreatingOm || isEditing) && (
                        <div className={`p-6 rounded-[2rem] border shadow-sm animate-in fade-in slide-in-from-right-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <h3 className={`text-lg font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{isEditing ? 'Editar OM' : 'Nova OM'}</h3>
                            <form onSubmit={handleSaveOm} className="space-y-4">
                                {/* Logo Upload */}
                                <div className="flex flex-col items-center justify-center mb-6">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoSelect} />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden hover:border-blue-500 transition-colors group"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500">
                                                <ImagePlus className="w-8 h-8 mb-1" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Logo</span>
                                            </div>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</label>
                                    <input required type="text" className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Ex: Base Aérea do Galeão" value={omForm.name} onChange={e => setOmForm({...omForm, name: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sigla</label>
                                    <input required type="text" className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Ex: BAGL" value={omForm.acronym} onChange={e => setOmForm({...omForm, acronym: e.target.value.toUpperCase()})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço</label>
                                    <input type="text" className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.address} onChange={e => setOmForm({...omForm, address: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CEP</label>
                                    <input type="text" className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Ex: 07241-901" value={omForm.zip_code} onChange={e => setOmForm({...omForm, zip_code: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidade Sediada</label>
                                    <input type="text" className={`w-full p-3 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} placeholder="Ex: Base Aérea de São Paulo" value={omForm.host_unit} onChange={e => setOmForm({...omForm, host_unit: e.target.value})} />
                                </div>
                                <button disabled={loading} type="submit" className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg mt-4 disabled:opacity-50">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isEditing ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={() => setIsEditing(false)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">Cancelar</button>
                                )}
                            </form>
                        </div>
                    )}

                    {selectedOm && !isCreatingOm && !isEditing && (
                        <div className={`p-6 rounded-[2rem] border shadow-sm animate-in fade-in slide-in-from-right-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        {selectedOm.logo_url && (
                                            <img src={selectedOm.logo_url} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg" />
                                        )}
                                        <div>
                                            <h3 className={`text-xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedOm.acronym}</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedOm.host_unit || selectedOm.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={startEditing} className={`p-2 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}>
                                        <Plus className="w-4 h-4 transform rotate-45 scale-125" /> 
                                    </button>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                    {selectedOm.address && (
                                        <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> {selectedOm.address}</p>
                                    )}
                                    {selectedOm.zip_code && (
                                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest ml-1">CEP: {selectedOm.zip_code}</p>
                                    )}
                                </div>
                                    <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-6 bg-slate-100 dark:bg-slate-900">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            loading="lazy"
                                            allowFullScreen
                                            referrerPolicy="no-referrer-when-downgrade"
                                            src={`https://www.google.com/maps?q=${encodeURIComponent(selectedOm.address + ' ' + selectedOm.name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        ></iframe>
                                    </div>


                            <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Portões de Acesso</h4>
                                    <button onClick={handleAddGate} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {gates.map(gate => (
                                        <div key={gate.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <DoorOpen className={`w-4 h-4 ${gate.is_active ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                <span className={`text-sm font-bold ${!gate.is_active && 'line-through text-slate-500'} ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{gate.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleToggleGate(gate)}
                                                className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${gate.is_active ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}
                                            >
                                                {gate.is_active ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </div>
                                    ))}
                                    {gates.length === 0 && (
                                        <p className="text-xs text-slate-500 italic text-center py-4">Nenhum portão configurado para esta OM.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
