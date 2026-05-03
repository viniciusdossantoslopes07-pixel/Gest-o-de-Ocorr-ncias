import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { MilitaryOrganization, AccessGate, User } from '../types';
import { Building2, Map, ShieldAlert, Users, DoorOpen, Plus, Save, ImagePlus, Loader2, Trash2, ShieldCheck, MapPin, TrendingUp, BarChart2, PieChart as PieIcon, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface OMManagementProps {
    currentUser: User | null;
    isDarkMode: boolean;
}

export default function OMManagement({ currentUser, isDarkMode }: OMManagementProps) {
    const [oms, setOms] = useState<MilitaryOrganization[]>([]);
    const [selectedOm, setSelectedOm] = useState<MilitaryOrganization | null>(null);
    const [gates, setGates] = useState<AccessGate[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'dashboard' | 'form'>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Form states for new OM
    const [isCreatingOm, setIsCreatingOm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [omForm, setOmForm] = useState({
        name: '',
        acronym: '',
        address: '',
        zip_code: '',
        host_unit: ''
    });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stats
    const [stats, setStats] = useState<{
        [omId: string]: { personnelCount: number, occurrencesCount: number }
    }>({});
    const [globalPersonnel, setGlobalPersonnel] = useState(0);

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
        // Fetch total global personnel (active users)
        const { count: globalCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('active', true);
        
        setGlobalPersonnel(globalCount || 0);

        const GSD_SP_SECTORS = ['SOP', 'SAP', 'EPA-TROPA', 'CANIL', 'EFSD', 'ESI-SEÇÃO', 'ESI-TROPA'];

        const newStats: any = {};
        for (const om of omList) {
            let query = supabase.from('users').select('*', { count: 'exact', head: true }).eq('active', true);
            
            // Intelligent logic: Check by ID OR by Sector if it's GSD-SP or BASP
            if (om.acronym.toUpperCase() === 'GSD-SP') {
                query = query.or(`om_id.eq.${om.id},sector.in.("${GSD_SP_SECTORS.join('","')}")`);
            } else if (om.acronym.toUpperCase() === 'BASP') {
                // BASP uses sectors NOT in GSD_SP list
                query = query.or(`om_id.eq.${om.id},and(sector.not.in.("${GSD_SP_SECTORS.join('","')}"),sector.neq.'',sector.is.not.null)`);
            } else {
                query = query.eq('om_id', om.id);
            }

            const { count: usersCount } = await query;
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
            // Try 1: Full Address + ZIP
            let query = encodeURIComponent(`${address} ${zip} Brasil`);
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
            let data = await response.json();
            
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }

            // Try 2: Only ZIP (Fallback)
            if (zip) {
                query = encodeURIComponent(`${zip} Brasil`);
                response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
                data = await response.json();
                if (data && data.length > 0) {
                    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
                }
            }

            // Try 3: Simple Address (Fallback)
            query = encodeURIComponent(`${address.split(',')[0]} Brasil`);
            response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
            data = await response.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
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
                    .bindTooltip(`
                        <div style="padding: 2px 4px;">
                            <b style="color: #1e293b; font-size: 12px;">${om.acronym}</b><br/>
                            <span style="color: #64748b; font-size: 10px;">${om.host_unit || om.name}</span>
                        </div>
                    `, { 
                        permanent: false, 
                        direction: 'top',
                        opacity: 0.9,
                        className: 'om-tooltip'
                    })
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
        if (viewMode === 'dashboard') {
            const timer = setTimeout(() => {
                initMap();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [viewMode, oms]);

    useEffect(() => {
        if (selectedOm && mapRef.current && (window as any).L && viewMode === 'dashboard') {
            if (selectedOm.latitude && selectedOm.longitude) {
                mapRef.current.flyTo([selectedOm.latitude, selectedOm.longitude], 13);
            }
        }
    }, [selectedOm, viewMode]);

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-900'} font-sans selection:bg-blue-500/30 overflow-x-hidden`}>
            {/* Main Command Header */}
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">Centro de Comando Estratégico</h1>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Sistema Integrado de Gestão de Organizações Militares</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => { setIsCreatingOm(true); setViewMode('form'); }}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:scale-105 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Ativar Nova OM
                        </button>
                    </div>
                </div>

                {viewMode === 'dashboard' ? (
                    <div className="grid grid-cols-12 gap-6 lg:gap-8">
                        {/* LEFT SIDEBAR: OM LIST (Collapsible on Desktop, Bottom Sheet on Mobile) */}
                        <div className={`col-span-12 lg:col-span-3 space-y-6 transition-all duration-500 ${!isSidebarOpen ? 'lg:opacity-0 lg:pointer-events-none lg:w-0' : ''}`}>
                            <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200'} backdrop-blur-xl shadow-2xl h-[calc(100vh-12rem)] flex flex-col`}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Unidades Ativas</h3>
                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-black rounded-lg">{oms.length}</span>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {oms.map(om => (
                                        <button
                                            key={om.id}
                                            onClick={() => handleSelectOm(om)}
                                            className={`w-full text-left p-4 rounded-2xl transition-all border group ${selectedOm?.id === om.id 
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                                                : isDarkMode ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedOm?.id === om.id ? 'bg-white/20' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    {om.acronym.substring(0, 3)}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="font-black uppercase tracking-tighter truncate">{om.acronym}</p>
                                                    <p className={`text-[9px] uppercase tracking-widest font-bold truncate ${selectedOm?.id === om.id ? 'text-white/70' : 'text-slate-500'}`}>{om.host_unit || om.name}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CENTER AREA: MAP + KPIs */}
                        <div className={`col-span-12 lg:col-span-9 space-y-6 transition-all duration-500`}>
                            {/* KPI Ribbon */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Efetivo Global', val: globalPersonnel, icon: Users, color: 'blue' },
                                    { label: 'Alertas Ativos', val: Object.values(stats).reduce((acc, curr) => acc + curr.occurrencesCount, 0), icon: ShieldAlert, color: 'amber' },
                                    { label: 'Unidades', val: oms.length, icon: Building2, color: 'emerald' },
                                    { label: 'Monitoramento', val: '100%', icon: Map, color: 'purple' }
                                ].map((kpi, i) => (
                                    <div key={i} className={`p-4 rounded-[2rem] border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200'} backdrop-blur-xl shadow-lg flex items-center gap-4`}>
                                        <div className={`p-2 rounded-xl bg-${kpi.color}-500/10`}>
                                            <kpi.icon className={`w-5 h-5 text-${kpi.color}-500`} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{kpi.label}</p>
                                            <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{kpi.val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Integrated Interactive Map */}
                            <div className={`relative w-full max-w-4xl mx-auto h-[500px] lg:h-[580px] rounded-[3.5rem] overflow-hidden border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <div id="main-map" className="w-full h-full z-0"></div>
                                
                                {/* Floating Selection Info */}
                                {selectedOm && (
                                    <div className="absolute top-6 left-6 right-6 md:left-auto md:w-80 p-6 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] z-10 shadow-2xl animate-in zoom-in-95">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {selectedOm.logo_url && <img src={selectedOm.logo_url} className="w-10 h-10 object-contain bg-white rounded-lg p-1" />}
                                                <div>
                                                    <h4 className="text-lg font-black text-white uppercase tracking-tighter">{selectedOm.acronym}</h4>
                                                    <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{selectedOm.zip_code}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedOm(null); }}
                                                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400"
                                            >
                                                <Plus className="w-4 h-4 rotate-45 scale-125" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-300 mb-4 line-clamp-2">{selectedOm.address}</p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Efetivo</p>
                                                <p className="text-sm font-black text-white">{stats[selectedOm.id]?.personnelCount || 0}</p>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Ocorrências</p>
                                                <p className="text-sm font-black text-amber-500">{stats[selectedOm.id]?.occurrencesCount || 0}</p>
                                            </div>
                                        </div>
                                        <button className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">
                                            Visualização Tática
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Analytical Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                <div className={`p-8 rounded-[3rem] border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200'} backdrop-blur-xl shadow-xl`}>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Desdobramento por Unidade</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={oms.map(om => ({ name: om.acronym, val: stats[om.id]?.personnelCount || 0 }))}>
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={8} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '1rem' }} />
                                                <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className={`p-8 rounded-[3rem] border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200'} backdrop-blur-xl shadow-xl`}>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Saúde Operacional (Global)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Estável', value: 75 },
                                                        { name: 'Alerta', value: 20 },
                                                        { name: 'Crítico', value: 5 }
                                                    ]}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={10}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#10b981" />
                                                    <Cell fill="#f59e0b" />
                                                    <Cell fill="#ef4444" />
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* FORM VIEW */
                    <div className="max-w-2xl mx-auto py-12">
                        <div className={`p-8 rounded-[3rem] border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tighter">{isEditing ? 'Ajustar Comando' : 'Ativar Unidade'}</h3>
                                <button onClick={() => { setViewMode('dashboard'); setIsEditing(false); setIsCreatingOm(false); }} className="text-slate-500 hover:text-red-500">
                                    <Plus className="w-6 h-6 rotate-45" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveOm} className="space-y-6">
                                <div className="flex flex-col items-center justify-center mb-6">
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoSelect} />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-32 h-32 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all group"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500">
                                                <ImagePlus className="w-8 h-8 mb-1" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Logo OM</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome Oficial da Unidade</label>
                                        <input required type="text" className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.name} onChange={e => setOmForm({...omForm, name: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sigla (Designativo)</label>
                                            <input required type="text" className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.acronym} onChange={e => setOmForm({...omForm, acronym: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">CEP Operacional</label>
                                            <input required type="text" className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.zip_code} onChange={e => setOmForm({...omForm, zip_code: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Endereço Completo</label>
                                        <input required type="text" className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.address} onChange={e => setOmForm({...omForm, address: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidade Sediada / Comando</label>
                                        <input type="text" className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.host_unit} onChange={e => setOmForm({...omForm, host_unit: e.target.value})} />
                                    </div>
                                </div>

                                <button disabled={loading} type="submit" className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50 transition-all">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isEditing ? 'Atualizar Diretrizes' : 'Consolidar Ativação'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
