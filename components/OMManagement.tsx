import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { MilitaryOrganization, AccessGate, User } from '../types';
import { Building2, Map, ShieldAlert, Users, DoorOpen, Plus, Save, ImagePlus, Loader2, Trash2, ShieldCheck, MapPin, TrendingUp, BarChart2, PieChart as PieIcon, Activity, Pencil, ChevronLeft, X, Search } from 'lucide-react';
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
        host_unit: '',
        url: '',
        commander_id: '',
        founded_at: '',
        category: 'NIL'
    });
    const [omUsers, setOmUsers] = useState<User[]>([]);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [hostLogoFile, setHostLogoFile] = useState<File | null>(null);
    const [hostLogoPreview, setHostLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hostFileInputRef = useRef<HTMLInputElement>(null);

    // Stats
    const [stats, setStats] = useState<{
        [omId: string]: { personnelCount: number, occurrencesCount: number }
    }>({});
    const [globalPersonnel, setGlobalPersonnel] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const categoryData = useMemo(() => {
        const counts: any = { 'Tipo 1': 0, 'Tipo 2': 0, 'Tipo 3': 0, 'Tipo 4': 0, 'NIL': 0 };
        oms.forEach(om => {
            const cat = om.category || 'NIL';
            if (counts[cat] !== undefined) counts[cat]++;
            else counts['NIL']++;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value: value as number }))
            .filter(item => item.value > 0);
    }, [oms]);

    const COLORS = {
        'Tipo 1': '#00d2ff', // Cyan Neon
        'Tipo 2': '#00ff87', // Spring Green Neon
        'Tipo 3': '#9d50bb', // Purple Neon
        'Tipo 4': '#ff007a', // Pink Neon
        'NIL': '#3a4750'    // Dark Steel
    };

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

    const handleSelectOm = async (om: MilitaryOrganization) => {
        setSelectedOm(om);
        fetchGates(om.id);
        setIsCreatingOm(false);
        setIsEditing(false);
        
        // Fetch users for commander selection
        const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('om_id', om.id)
            .order('rank');
        if (users) setOmUsers(users as any);
    };

    const startEditing = () => {
        if (!selectedOm) return;
        setOmForm({
            name: selectedOm.name,
            acronym: selectedOm.acronym,
            address: selectedOm.address || '',
            zip_code: selectedOm.zip_code || '',
            host_unit: selectedOm.host_unit || '',
            url: selectedOm.url || '',
            commander_id: selectedOm.commander_id || '',
            founded_at: selectedOm.founded_at || '',
            category: selectedOm.category || 'NIL'
        });
        setLogoPreview(selectedOm.logo_url || null);
        setHostLogoPreview(selectedOm.host_logo_url || null);
        setIsEditing(true);
    };

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'om' | 'host') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas imagens.');
            return;
        }
        
        if (type === 'om') {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setHostLogoFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setHostLogoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async (omId: string, type: 'om' | 'host'): Promise<string | null> => {
        const file = type === 'om' ? logoFile : hostLogoFile;
        if (!file) return null;
        try {
            const ext = file.name.split('.').pop();
            const prefix = type === 'om' ? 'logo' : 'host_logo';
            const filePath = `${omId}/${prefix}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('om_logos').upload(filePath, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('om_logos').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (err: any) {
            console.error(`Error uploading ${type} logo:`, err);
            const detail = err?.message || err?.error || String(err);
            throw new Error(`Falha no upload do arquivo (${type}): ${detail}`);
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
            let finalLogoUrl = selectedOm?.logo_url || null;
            let finalHostLogoUrl = selectedOm?.host_logo_url || null;
            
            // Auto-Geocode before saving
            const coords = await geocodeAddress(omForm.address, omForm.zip_code);

            if (isEditing && selectedOm) {
                if (logoFile) {
                    finalLogoUrl = await uploadLogo(selectedOm.id, 'om') || finalLogoUrl;
                }
                if (hostLogoFile) {
                    finalHostLogoUrl = await uploadLogo(selectedOm.id, 'host') || finalHostLogoUrl;
                }

                const { data: updatedOm, error } = await supabase.from('military_organizations').update({
                    name: omForm.name,
                    acronym: omForm.acronym,
                    address: omForm.address,
                    zip_code: omForm.zip_code,
                    host_unit: omForm.host_unit,
                    url: omForm.url,
                    commander_id: omForm.commander_id || null,
                    founded_at: omForm.founded_at || null,
                    latitude: coords?.lat || null,
                    longitude: coords?.lon || null,
                    logo_url: finalLogoUrl,
                    host_logo_url: finalHostLogoUrl,
                    category: omForm.category
                }).eq('id', selectedOm.id).select().single();

                if (error) throw error;
                if (updatedOm) setSelectedOm(updatedOm);
                await fetchOms(); // Refresh the list
                alert('OM atualizada com sucesso!');
                setIsEditing(false);
                setViewMode('dashboard');
            } else {
                // Create logic
                const { data: newOm, error } = await supabase.from('military_organizations').insert([{
                    name: omForm.name,
                    acronym: omForm.acronym,
                    address: omForm.address,
                    zip_code: omForm.zip_code,
                    host_unit: omForm.host_unit,
                    url: omForm.url,
                    commander_id: omForm.commander_id || null,
                    founded_at: omForm.founded_at || null,
                    category: omForm.category,
                    is_active: true
                }]).select().single();

                if (error) throw error;

                if ((logoFile || hostLogoFile) && newOm) {
                    const updates: any = {};
                    if (logoFile) updates.logo_url = await uploadLogo(newOm.id, 'om');
                    if (hostLogoFile) updates.host_logo_url = await uploadLogo(newOm.id, 'host');
                    
                    if (Object.keys(updates).length > 0) {
                        await supabase.from('military_organizations').update(updates).eq('id', newOm.id);
                    }
                }
                alert('OM cadastrada com sucesso!');
                setIsCreatingOm(false);
                setViewMode('dashboard');
            }

            setOmForm({ name: '', acronym: '', address: '', zip_code: '', host_unit: '', url: '', commander_id: '', founded_at: '', category: 'NIL' });
            setLogoFile(null);
            setLogoPreview(null);
            setHostLogoFile(null);
            setHostLogoPreview(null);
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

        // Fix for Leaflet default icon issues in some environments
        const DefaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
        });

        // Add markers for each OM
        oms.forEach(om => {
            if (om.latitude && om.longitude) {
                const lat = Number(om.latitude);
                const lon = Number(om.longitude);
                
                if (isNaN(lat) || isNaN(lon)) return;

                L.marker([lat, lon], { icon: DefaultIcon })
                    .addTo(mapRef.current)
                    .bindTooltip(`
                        <div style="padding: 2px 4px; text-align: center;">
                            <b style="color: #1e293b; font-size: 12px;">${om.acronym}</b><br/>
                            <span style="color: #64748b; font-size: 10px;">${om.host_unit || om.name}</span>
                            <div style="margin-top: 4px; color: #2563eb; font-weight: 900; font-size: 8px; text-transform: uppercase;">Clique para Ações Rápidas</div>
                        </div>
                    `, { 
                        permanent: false, 
                        direction: 'top',
                        opacity: 0.9,
                        className: 'om-tooltip'
                    })
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
                        {viewMode === 'form' ? (
                            <button 
                                onClick={() => setViewMode('dashboard')}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 transition-all hover:scale-105 active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4" /> Voltar ao Mapa
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setIsCreatingOm(true); setViewMode('form'); }}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:scale-105 active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> Ativar Nova OM
                            </button>
                        )}
                    </div>
                </div>

                {viewMode === 'dashboard' ? (
                    <div className="grid grid-cols-12 gap-6 lg:gap-8">
                        {/* LEFT SIDEBAR: OM LIST (Collapsible on Desktop, Bottom Sheet on Mobile) */}
                        <div className={`col-span-12 lg:col-span-3 space-y-6 transition-all duration-500 ${!isSidebarOpen ? 'lg:opacity-0 lg:pointer-events-none lg:w-0' : ''}`}>
                            <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200'} backdrop-blur-xl shadow-2xl h-[calc(100vh-12rem)] flex flex-col`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Unidades Ativas</h3>
                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-black rounded-lg">{oms.length}</span>
                                </div>

                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input 
                                        type="text"
                                        placeholder="BUSCAR UNIDADE..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none border transition-all ${
                                            isDarkMode 
                                            ? 'bg-slate-800/50 border-slate-700 text-white focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                        }`}
                                    />
                                </div>
                                
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {oms.filter(om => 
                                        om.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        om.acronym.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map(om => (
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
                                                <div className="flex -space-x-2">
                                                    {selectedOm.logo_url && <img src={selectedOm.logo_url} className="w-10 h-10 object-contain bg-white rounded-lg p-1 border border-white/20 relative z-10" />}
                                                    {selectedOm.host_logo_url && <img src={selectedOm.host_logo_url} className="w-10 h-10 object-contain bg-white rounded-lg p-1 border border-white/20" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-lg font-black text-white uppercase tracking-tighter">{selectedOm.acronym}</h4>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); startEditing(); setViewMode('form'); }}
                                                            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 group"
                                                            title="Editar OM"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 group-hover:text-blue-400" />
                                                        </button>
                                                    </div>
                                                    <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">
                                                        {selectedOm.zip_code} {selectedOm.founded_at && `• Criada em ${new Date(selectedOm.founded_at + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                                                    </p>
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
                                        <div className="flex flex-col gap-2">
                                            <button 
                                                onClick={() => {
                                                    window.location.search = `?om=${selectedOm.acronym}`;
                                                }}
                                                className="w-full py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Activity className="w-3.5 h-3.5" /> Visualização Tática
                                            </button>
                                            
                                            {selectedOm.url ? (
                                                <a 
                                                    href={`https://${selectedOm.url.replace(/^https?:\/\//, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-3 bg-slate-800 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 no-underline"
                                                >
                                                    <DoorOpen className="w-3.5 h-3.5" /> Acessar Link de Produção
                                                </a>
                                            ) : (
                                                <div className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest italic">
                                                    URL de Produção não configurada
                                                </div>
                                            )}
                                        </div>
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
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Distribuição por Categoria (GSD)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <defs>
                                                    {Object.entries(COLORS).map(([key, color]) => (
                                                        <linearGradient key={`grad-${key.replace(/\s+/g, '-')}`} id={`grad-${key.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="1" y2="1">
                                                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                                                            <stop offset="100%" stopColor={color} stopOpacity={0.85} />
                                                        </linearGradient>
                                                    ))}
                                                </defs>
                                                <Pie
                                                    data={categoryData}
                                                    innerRadius={65}
                                                    outerRadius={85}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    stroke={isDarkMode ? '#0f172a' : '#fff'}
                                                    strokeWidth={3}
                                                    animationBegin={0}
                                                    animationDuration={1500}
                                                >
                                                    {categoryData.map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={`url(#grad-${entry.name.replace(/\s+/g, '-')})`}
                                                            style={{ 
                                                                filter: `drop-shadow(0 0 12px ${(COLORS as any)[entry.name]}66)` 
                                                            }}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                                                        backdropFilter: 'blur(16px)',
                                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)', 
                                                        borderRadius: '1.5rem',
                                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                                        padding: '12px 20px',
                                                        fontSize: '10px',
                                                        fontWeight: '900',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.1em'
                                                    }}
                                                    itemStyle={{ color: '#fff', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                                                    cursor={{ fill: 'transparent' }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={40} 
                                                    formatter={(value) => (
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-2" style={{ color: (COLORS as any)[value] }}>
                                                            {value}
                                                        </span>
                                                    )}
                                                    iconType="diamond"
                                                    iconSize={10}
                                                />
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
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setViewMode('dashboard')}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">{isEditing ? 'Ajustar Comando' : 'Ativar Unidade'}</h3>
                                </div>
                                <button onClick={() => { setViewMode('dashboard'); setIsEditing(false); setIsCreatingOm(false); }} className="text-slate-500 hover:text-red-500 transition-colors">
                                    <X className="w-6 h-6 rotate-45" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveOm} className="space-y-6">
                                <div className="grid grid-cols-2 gap-8 mb-6">
                                    <div className="flex flex-col items-center">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleLogoSelect(e, 'om')} />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative w-28 h-28 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all group"
                                        >
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500">
                                                    <ImagePlus className="w-6 h-6 mb-1" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Logo OM</span>
                                                </div>
                                            )}
                                        </button>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-2">Símbolo da Unidade</p>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <input type="file" ref={hostFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleLogoSelect(e, 'host')} />
                                        <button
                                            type="button"
                                            onClick={() => hostFileInputRef.current?.click()}
                                            className="relative w-28 h-28 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden hover:border-blue-500 transition-all group"
                                        >
                                            {hostLogoPreview ? (
                                                <img src={hostLogoPreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500">
                                                    <ImagePlus className="w-6 h-6 mb-1" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Logo Sede</span>
                                                </div>
                                            )}
                                        </button>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-2">Símbolo Sediadora</p>
                                    </div>
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Link de Produção (URL)</label>
                                        <input type="text" placeholder="gsd-sp.fab.mil.br" className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.url} onChange={e => setOmForm({...omForm, url: e.target.value})} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Data de Criação (Fundação)</label>
                                            <input type="date" className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={omForm.founded_at} onChange={e => setOmForm({...omForm, founded_at: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Comandante da Unidade (CMT)</label>
                                            <select 
                                                className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                                                value={omForm.commander_id}
                                                onChange={e => setOmForm({...omForm, commander_id: e.target.value})}
                                            >
                                                <option value="">Selecione o Comandante</option>
                                                {omUsers.map(u => (
                                                    <option key={u.id} value={u.id}>{u.rank} {u.warName || u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoria da Unidade (GSD)</label>
                                        <select 
                                            className={`w-full p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                                            value={omForm.category}
                                            onChange={e => setOmForm({...omForm, category: e.target.value})}
                                        >
                                            <option value="Tipo 1">Tipo 1</option>
                                            <option value="Tipo 2">Tipo 2</option>
                                            <option value="Tipo 3">Tipo 3</option>
                                            <option value="Tipo 4">Tipo 4</option>
                                            <option value="NIL">NIL</option>
                                        </select>
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
