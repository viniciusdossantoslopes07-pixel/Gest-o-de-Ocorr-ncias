import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { MilitaryOrganization, AccessGate, User } from '../types';
import { 
    Building2, Map, ShieldAlert, Users, DoorOpen, Plus, Save, ImagePlus, 
    Loader2, Trash2, ShieldCheck, MapPin, TrendingUp, BarChart2, 
    PieChart as PieIcon, Activity, Pencil, ChevronLeft, X, Search,
    Filter, Download, ArrowUpDown, ExternalLink, RefreshCw, Clock,
    Layers, Crosshair, ArrowRightLeft, CheckCircle2, AlertTriangle, 
    Eye, SlidersHorizontal, Radio, Globe2
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';
import { hasPermission, PERMISSIONS } from '../constants/permissions';

interface OMManagementProps {
    currentUser: User | null;
    isDarkMode: boolean;
}

// Mapeamento das Regiões do Brasil
const UF_REGION_MAP: Record<string, string> = {
    AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
    AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', 
    PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
    DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
    ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
    PR: 'Sul', RS: 'Sul', SC: 'Sul'
};

const CATEGORY_COLORS: Record<string, string> = {
    'Tipo 1': '#3b82f6', // Azul FAB
    'Tipo 2': '#10b981', // Verde Esmeralda
    'Tipo 3': '#f59e0b', // Âmbar Tático
    'Tipo 4': '#ef4444', // Vermelho Alerta
    'NIL': '#64748b'     // Slate Neutro
};

export default function OMManagement({ currentUser, isDarkMode }: OMManagementProps) {
    // Dados Principais
    const [oms, setOms] = useState<MilitaryOrganization[]>([]);
    const [selectedOm, setSelectedOm] = useState<MilitaryOrganization | null>(null);
    const [allGates, setAllGates] = useState<AccessGate[]>([]);
    const [commanders, setCommanders] = useState<Record<string, User>>({});
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Navegação em Abas do Alto Comando
    const [activeTab, setActiveTab] = useState<'tactical' | 'comparative' | 'inventory' | 'form'>('tactical');

    // Relógio Tático Operacional
    const [currentTime, setCurrentTime] = useState({ local: '', zulu: '' });

    // Comparador Direto de OMs (Head-to-Head)
    const [comparedOmIds, setComparedOmIds] = useState<string[]>([]);

    // Filtros e Busca
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [sortField, setSortField] = useState<'acronym' | 'personnel' | 'occurrences' | 'gates'>('personnel');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Modal de Gerenciamento Rápido de Portões
    const [gateModalOm, setGateModalOm] = useState<MilitaryOrganization | null>(null);
    const [newGateName, setNewGateName] = useState('');
    const [savingGate, setSavingGate] = useState(false);

    // Formulário de Criação / Edição de OM
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

    // Estatísticas Consolidadas
    const [stats, setStats] = useState<{
        [omId: string]: { personnelCount: number; occurrencesCount: number }
    }>({});
    const [globalPersonnel, setGlobalPersonnel] = useState(0);

    // Referências do Mapa Leaflet
    const mapRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const [mapTileStyle, setMapTileStyle] = useState<'dark' | 'standard'>('dark');

    // Atualização do Relógio Militar Tático (Hora Local + ZULU)
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const localStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const zuluHours = String(now.getUTCHours()).padStart(2, '0');
            const zuluMinutes = String(now.getUTCMinutes()).padStart(2, '0');
            const zuluSeconds = String(now.getUTCSeconds()).padStart(2, '0');
            setCurrentTime({
                local: `${localStr} BRT`,
                zulu: `${zuluHours}:${zuluMinutes}:${zuluSeconds}Z`
            });
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Carregamento Inicial
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchOmsAndStats(),
                fetchAllGates(),
                fetchAllCommanders()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados estratégicos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const fetchAllGates = async () => {
        const { data } = await supabase.from('access_gates').select('*').order('name', { ascending: true });
        if (data) {
            setAllGates(data as AccessGate[]);
        }
    };

    const fetchAllCommanders = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, name, rank, warName, photo_url, om_id')
            .eq('active', true);
        if (data) {
            const map: Record<string, User> = {};
            data.forEach((u: any) => {
                map[u.id] = u;
            });
            setCommanders(map);
        }
    };

    const fetchOmsAndStats = async () => {
        const { data: omList, error } = await supabase
            .from('military_organizations')
            .select('*')
            .order('created_at', { ascending: true });

        if (omList) {
            const list = omList as MilitaryOrganization[];
            setOms(list);

            // Fetch total global personnel (active users)
            const { count: globalCount } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('active', true);
            
            setGlobalPersonnel(globalCount || 0);

            const GSD_SP_SECTORS = ['SOP', 'SAP', 'EPA-TROPA', 'CANIL', 'EFSD', 'ESI-SEÇÃO', 'ESI-TROPA'];

            const newStats: any = {};
            for (const om of list) {
                let query = supabase.from('users').select('id', { count: 'exact', head: true }).eq('active', true);
                
                if (om.acronym.toUpperCase() === 'GSD-SP') {
                    query = query.or(`om_id.eq.${om.id},sector.in.("${GSD_SP_SECTORS.join('","')}")`);
                } else if (om.acronym.toUpperCase() === 'BASP') {
                    query = query.or(`om_id.eq.${om.id},and(sector.not.in.("${GSD_SP_SECTORS.join('","')}"),sector.neq.'',sector.is.not.null)`);
                } else {
                    query = query.eq('om_id', om.id);
                }

                const { count: usersCount } = await query;
                const { count: occCount } = await supabase
                    .from('occurrences')
                    .select('*', { count: 'exact', head: true })
                    .eq('om_id', om.id);
                
                newStats[om.id] = {
                    personnelCount: usersCount || 0,
                    occurrencesCount: occCount || 0
                };
            }
            setStats(newStats);

            // Inicializar comparação padrão com as 3 maiores unidades se vazio
            if (comparedOmIds.length === 0 && list.length > 0) {
                const topOms = [...list]
                    .sort((a, b) => (newStats[b.id]?.personnelCount || 0) - (newStats[a.id]?.personnelCount || 0))
                    .slice(0, 3)
                    .map(o => o.id);
                setComparedOmIds(topOms);
            }
        }
    };

    // Extração de UF e Região por OM
    const getOmRegion = (om: MilitaryOrganization): string => {
        const text = (om.address || '') + ' ' + (om.name || '');
        const match = text.match(/\b([A-Z]{2})\b/);
        if (match && UF_REGION_MAP[match[1]]) {
            return UF_REGION_MAP[match[1]];
        }
        // Fallbacks conhecidos por sigla
        if (om.acronym.includes('SP') || om.acronym.includes('BASP') || om.acronym.includes('GL') || om.acronym.includes('BQ') || om.acronym.includes('SJ') || om.acronym.includes('ST') || om.acronym.includes('GW')) return 'Sudeste';
        if (om.acronym.includes('BR') || om.acronym.includes('CG') || om.acronym.includes('AN')) return 'Centro-Oeste';
        if (om.acronym.includes('CO') || om.acronym.includes('SM') || om.acronym.includes('FL') || om.acronym.includes('CT')) return 'Sul';
        if (om.acronym.includes('RF') || om.acronym.includes('NT') || om.acronym.includes('SV') || om.acronym.includes('FZ') || om.acronym.includes('AK')) return 'Nordeste';
        if (om.acronym.includes('BE') || om.acronym.includes('MN') || om.acronym.includes('PV') || om.acronym.includes('BV') || om.acronym.includes('CC')) return 'Norte';
        return 'Outras';
    };

    const getOmUf = (om: MilitaryOrganization): string => {
        const text = om.address || '';
        const match = text.match(/\b([A-Z]{2})\b/);
        return match ? match[1] : '--';
    };

    // Filtros de OMs
    const filteredOms = useMemo(() => {
        return oms.filter(om => {
            const matchesSearch = 
                om.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                om.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (om.address && om.address.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesRegion = selectedRegion === 'ALL' || getOmRegion(om) === selectedRegion;
            const matchesCategory = selectedCategory === 'ALL' || (om.category || 'NIL') === selectedCategory;

            return matchesSearch && matchesRegion && matchesCategory;
        });
    }, [oms, searchTerm, selectedRegion, selectedCategory]);

    // OMs ordenadas para tabela e rankings
    const sortedOms = useMemo(() => {
        return [...filteredOms].sort((a, b) => {
            let valA = 0;
            let valB = 0;

            if (sortField === 'acronym') {
                return sortDirection === 'asc' 
                    ? a.acronym.localeCompare(b.acronym) 
                    : b.acronym.localeCompare(a.acronym);
            } else if (sortField === 'personnel') {
                valA = stats[a.id]?.personnelCount || 0;
                valB = stats[b.id]?.personnelCount || 0;
            } else if (sortField === 'occurrences') {
                valA = stats[a.id]?.occurrencesCount || 0;
                valB = stats[b.id]?.occurrencesCount || 0;
            } else if (sortField === 'gates') {
                valA = allGates.filter(g => g.om_id === a.id).length;
                valB = allGates.filter(g => g.om_id === b.id).length;
            }

            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }, [filteredOms, sortField, sortDirection, stats, allGates]);

    // Dados para Gráficos
    const categoryChartData = useMemo(() => {
        const counts: Record<string, number> = { 'Tipo 1': 0, 'Tipo 2': 0, 'Tipo 3': 0, 'Tipo 4': 0, 'NIL': 0 };
        oms.forEach(om => {
            const cat = om.category || 'NIL';
            if (counts[cat] !== undefined) counts[cat]++;
            else counts['NIL']++;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0);
    }, [oms]);

    const regionChartData = useMemo(() => {
        const regCounts: Record<string, { oms: number; personnel: number }> = {
            'Norte': { oms: 0, personnel: 0 },
            'Nordeste': { oms: 0, personnel: 0 },
            'Centro-Oeste': { oms: 0, personnel: 0 },
            'Sudeste': { oms: 0, personnel: 0 },
            'Sul': { oms: 0, personnel: 0 }
        };

        oms.forEach(om => {
            const reg = getOmRegion(om);
            if (regCounts[reg]) {
                regCounts[reg].oms += 1;
                regCounts[reg].personnel += (stats[om.id]?.personnelCount || 0);
            }
        });

        return Object.entries(regCounts).map(([region, data]) => ({
            region,
            unidades: data.oms,
            efetivo: data.personnel
        }));
    }, [oms, stats]);

    // Dados Comparativos Específicos das OMs Selecionadas (Head-to-Head)
    const comparedOms = useMemo(() => {
        return oms.filter(om => comparedOmIds.includes(om.id));
    }, [oms, comparedOmIds]);

    const comparativeChartData = useMemo(() => {
        return comparedOms.map(om => {
            const omGates = allGates.filter(g => g.om_id === om.id);
            return {
                name: om.acronym,
                efetivo: stats[om.id]?.personnelCount || 0,
                ocorrencias: stats[om.id]?.occurrencesCount || 0,
                portoes: omGates.length,
                portoesAtivos: omGates.filter(g => g.is_active).length
            };
        });
    }, [comparedOms, stats, allGates]);

    // Alternar OM no comparador (adicionar/remover)
    const toggleCompareOm = (omId: string) => {
        if (comparedOmIds.includes(omId)) {
            if (comparedOmIds.length > 1) {
                setComparedOmIds(comparedOmIds.filter(id => id !== omId));
            } else {
                alert('Mantenha pelo menos uma OM selecionada para análise.');
            }
        } else {
            if (comparedOmIds.length >= 6) {
                alert('Limite máximo de 6 unidades para comparação simultânea.');
                return;
            }
            setComparedOmIds([...comparedOmIds, omId]);
        }
    };

    // Carregar biblioteca Leaflet dinamicamente
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            if (activeTab === 'tactical') {
                initMap();
            }
        };
        document.body.appendChild(script);

        return () => {
            try {
                document.head.removeChild(link);
                document.body.removeChild(script);
            } catch (e) {}
        };
    }, []);

    // Inicialização do Mapa Leaflet com OpenStreetMap Padrão (Sem API Key)
    const initMap = () => {
        const L = (window as any).L;
        if (!L || !document.getElementById('c2-tactical-map')) return;

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const map = L.map('c2-tactical-map', {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([-14.235, -51.9253], 4); // Centro geográfico do Brasil

        mapRef.current = map;

        // Tile padrão e gratuito do OpenStreetMap (sem marcas d'água e sem restrição de API)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Grupo de marcadores
        markersLayerRef.current = L.layerGroup().addTo(map);
        renderMarkers();

        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    };

    const renderMarkers = () => {
        const L = (window as any).L;
        if (!L || !mapRef.current || !markersLayerRef.current) return;

        markersLayerRef.current.clearLayers();

        oms.forEach(om => {
            if (om.latitude && om.longitude) {
                const lat = Number(om.latitude);
                const lon = Number(om.longitude);
                if (isNaN(lat) || isNaN(lon)) return;

                const pCount = stats[om.id]?.personnelCount || 0;
                const occCount = stats[om.id]?.occurrencesCount || 0;
                const isSelected = selectedOm?.id === om.id;

                // Marcador Tático Customizado em HTML SVG
                const markerHtml = `
                    <div class="group relative flex items-center justify-center cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 ${
                            isSelected 
                                ? 'bg-blue-600 border-white ring-4 ring-blue-500/40' 
                                : occCount > 0 
                                    ? 'bg-amber-500 border-white' 
                                    : 'bg-slate-900 border-blue-400'
                        }">
                            <span class="text-[9px] font-black text-white tracking-tighter">${om.acronym.substring(0, 3)}</span>
                        </div>
                        ${occCount > 0 ? `
                            <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[8px] font-black flex items-center justify-center animate-pulse">
                                ${occCount}
                            </span>
                        ` : ''}
                    </div>
                `;

                const customIcon = L.divIcon({
                    html: markerHtml,
                    className: 'c2-marker-container',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                const marker = L.marker([lat, lon], { icon: customIcon })
                    .bindTooltip(`
                        <div style="padding: 6px 10px; font-family: ui-sans-serif, system-ui; text-align: left; min-width: 140px;">
                            <div style="font-weight: 900; font-size: 13px; color: #0284c7; letter-spacing: -0.02em;">${om.acronym}</div>
                            <div style="font-size: 10px; color: #475569; font-weight: 700; margin-bottom: 6px;">${om.host_unit || om.name}</div>
                            <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                                <span style="color: #64748b;">Efetivo: <b style="color: #0f172a;">${pCount}</b></span>
                                <span style="color: #64748b;">Alertas: <b style="color: ${occCount > 0 ? '#ef4444' : '#10b981'};">${occCount}</b></span>
                            </div>
                        </div>
                    `, {
                        direction: 'top',
                        opacity: 0.95,
                        offset: [0, -10]
                    })
                    .on('click', () => {
                        handleSelectOm(om);
                    });

                markersLayerRef.current.addLayer(marker);
            }
        });
    };

    useEffect(() => {
        if (activeTab === 'tactical') {
            const timer = setTimeout(() => {
                initMap();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [activeTab, isDarkMode, mapTileStyle]);

    useEffect(() => {
        renderMarkers();
    }, [oms, stats, selectedOm]);

    // Voar até a OM selecionada
    useEffect(() => {
        if (selectedOm && mapRef.current && activeTab === 'tactical') {
            if (selectedOm.latitude && selectedOm.longitude) {
                mapRef.current.flyTo([Number(selectedOm.latitude), Number(selectedOm.longitude)], 12, {
                    duration: 1.2
                });
            }
        }
    }, [selectedOm]);

    const handleSelectOm = async (om: MilitaryOrganization) => {
        setSelectedOm(om);
        // Carregar militares da OM para eventual seleção de comandante
        const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('om_id', om.id)
            .order('rank');
        if (users) setOmUsers(users as any);
    };

    // Gerenciamento de Portões da OM
    const handleToggleGate = async (gate: AccessGate) => {
        const { error } = await supabase
            .from('access_gates')
            .update({ is_active: !gate.is_active })
            .eq('id', gate.id);
        if (!error) {
            fetchAllGates();
        }
    };

    const handleCreateGate = async () => {
        if (!gateModalOm || !newGateName.trim()) return;
        setSavingGate(true);
        try {
            const { error } = await supabase.from('access_gates').insert([{
                om_id: gateModalOm.id,
                name: newGateName.trim().toUpperCase(),
                is_active: true
            }]);
            if (error) throw error;
            setNewGateName('');
            fetchAllGates();
        } catch (err: any) {
            alert(`Erro ao adicionar portão: ${err.message}`);
        } finally {
            setSavingGate(false);
        }
    };

    const handleDeleteGate = async (gateId: string) => {
        if (!confirm('Deseja realmente remover este portão de acesso?')) return;
        const { error } = await supabase.from('access_gates').delete().eq('id', gateId);
        if (!error) {
            fetchAllGates();
        }
    };

    // Edição e Criação de OM
    const startEditing = (omToEdit?: MilitaryOrganization) => {
        const target = omToEdit || selectedOm;
        if (!target) return;
        setSelectedOm(target);
        setOmForm({
            name: target.name,
            acronym: target.acronym,
            address: target.address || '',
            zip_code: target.zip_code || '',
            host_unit: target.host_unit || '',
            url: target.url || '',
            commander_id: target.commander_id || '',
            founded_at: target.founded_at || '',
            category: target.category || 'NIL'
        });
        setLogoPreview(target.logo_url || null);
        setHostLogoPreview(target.host_logo_url || null);
        setIsEditing(true);
        setActiveTab('form');
    };

    const startCreating = () => {
        setSelectedOm(null);
        setOmForm({
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
        setLogoFile(null);
        setLogoPreview(null);
        setHostLogoFile(null);
        setHostLogoPreview(null);
        setIsEditing(false);
        setActiveTab('form');
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
            return null;
        }
    };

    const geocodeAddress = async (address: string, zip: string): Promise<{ lat: number; lon: number } | null> => {
        try {
            let query = encodeURIComponent(`${address} ${zip} Brasil`);
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
            let data = await response.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            }
            if (zip) {
                query = encodeURIComponent(`${zip} Brasil`);
                response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
                data = await response.json();
                if (data && data.length > 0) {
                    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
                }
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

            const coords = await geocodeAddress(omForm.address, omForm.zip_code);

            if (isEditing && selectedOm) {
                if (logoFile) {
                    finalLogoUrl = (await uploadLogo(selectedOm.id, 'om')) || finalLogoUrl;
                }
                if (hostLogoFile) {
                    finalHostLogoUrl = (await uploadLogo(selectedOm.id, 'host')) || finalHostLogoUrl;
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
                    latitude: coords?.lat || selectedOm.latitude,
                    longitude: coords?.lon || selectedOm.longitude,
                    logo_url: finalLogoUrl,
                    host_logo_url: finalHostLogoUrl,
                    category: omForm.category
                }).eq('id', selectedOm.id).select().single();

                if (error) throw error;
                if (updatedOm) setSelectedOm(updatedOm);
                alert('Diretrizes da OM atualizadas com sucesso!');
            } else {
                const { data: newOm, error } = await supabase.from('military_organizations').insert([{
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
                alert('Nova Organização Militar ativada com sucesso!');
            }

            await fetchData();
            setActiveTab('tactical');
        } catch (err: any) {
            console.error('Error saving OM:', err);
            alert(`Erro ao salvar OM: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Exportação do Relatório de Estado-Maior (CSV)
    const exportStrategicReport = () => {
        const headers = ['Sigla', 'Nome Oficial', 'Regiao', 'UF', 'Categoria', 'Efetivo', 'Ocorrencias', 'Portoes_Ativos', 'Comandante', 'Endereco', 'CEP'];
        const rows = sortedOms.map(om => {
            const cmd = commanders[om.commander_id || ''];
            const cmdStr = cmd ? `${cmd.rank} ${cmd.warName || cmd.name}` : 'Nao designado';
            const omGates = allGates.filter(g => g.om_id === om.id && g.is_active).length;
            return [
                `"${om.acronym}"`,
                `"${om.name}"`,
                `"${getOmRegion(om)}"`,
                `"${getOmUf(om)}"`,
                `"${om.category || 'NIL'}"`,
                stats[om.id]?.personnelCount || 0,
                stats[om.id]?.occurrencesCount || 0,
                omGates,
                `"${cmdStr}"`,
                `"${(om.address || '').replace(/"/g, '""')}"`,
                `"${om.zip_code || ''}"`
            ].join(',');
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `relatorio_estrategico_oms_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Total de alertas globais
    const totalOccurrences = useMemo(() => {
        return Object.values(stats).reduce((acc, curr) => acc + curr.occurrencesCount, 0);
    }, [stats]);

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans selection:bg-blue-600 selection:text-white`}>
            
            {/* TOP COMMAND HEADER */}
            <div className={`border-b ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} backdrop-blur-xl sticky top-0 z-30 shadow-md`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Identidade do C2 */}
                        <div className="flex items-center gap-3.5">
                            <div className="relative p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center">
                                <ShieldCheck className="w-7 h-7 text-white" />
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight italic bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                                        Centro de Comando Estratégico
                                    </h1>
                                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        ALTO COMANDO
                                    </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Sistema de Monitoramento e Gestão de Organizações Militares
                                </p>
                            </div>
                        </div>

                        {/* Relógio Tático & Ações Executivas */}
                        <div className="flex items-center flex-wrap gap-2.5">
                            {/* Relógio Militar */}
                            <div className={`hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold ${
                                isDarkMode ? 'bg-slate-800/80 border-slate-700/60 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                <span>{currentTime.local}</span>
                                <span className="text-slate-500">|</span>
                                <span className="text-emerald-400">{currentTime.zulu}</span>
                            </div>

                            {/* Atualizar Dados */}
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className={`p-2.5 rounded-xl border transition-all ${
                                    isDarkMode 
                                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' 
                                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                                title="Atualizar Telemetria"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
                            </button>

                            {/* Exportar Relatório */}
                            <button
                                onClick={exportStrategicReport}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                                    isDarkMode 
                                        ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200' 
                                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
                                }`}
                            >
                                <Download className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Exportar Relatório</span>
                            </button>

                            {/* Ativar Nova OM */}
                            <button
                                onClick={startCreating}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Ativar Nova OM</span>
                            </button>
                        </div>
                    </div>

                    {/* BARRA DE NAVEGAÇÃO DE ABAS DO ALTO COMANDO */}
                    <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/40 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('tactical')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                activeTab === 'tactical'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Globe2 className="w-4 h-4" />
                            <span>1. Situação Tática (C2 Map)</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('comparative')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                activeTab === 'comparative'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                            <span>2. Matriz Comparativa & Analytics</span>
                            <span className="px-1.5 py-0.5 text-[9px] bg-indigo-500/20 text-indigo-300 rounded-md font-mono">
                                {comparedOmIds.length} OMs
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                activeTab === 'inventory'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        >
                            <Building2 className="w-4 h-4" />
                            <span>3. Quadro Geral das OMs</span>
                            <span className="px-1.5 py-0.5 text-[9px] bg-blue-500/20 text-blue-300 rounded-md font-mono">
                                {oms.length}
                            </span>
                        </button>

                        {activeTab === 'form' && (
                            <button
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 text-white shadow-md whitespace-nowrap"
                            >
                                <Pencil className="w-4 h-4" />
                                <span>{isEditing ? 'Editar Diretrizes' : 'Ativar Unidade'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* RIBBON DE INDICADORES ESTRATÉGICOS (KPIs GLOBAIS) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-2xl border transition-all ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
                    } backdrop-blur-xl flex items-center gap-4`}>
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Efetivo Global Ativo</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">{globalPersonnel.toLocaleString('pt-BR')}</span>
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Militares</span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-2xl border transition-all ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
                    } backdrop-blur-xl flex items-center gap-4`}>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alertas e Ocorrências</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-black ${totalOccurrences > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {totalOccurrences}
                                </span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">
                                    {totalOccurrences > 0 ? 'Requerem Atenção' : 'Situação Estável'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-2xl border transition-all ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
                    } backdrop-blur-xl flex items-center gap-4`}>
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organizações Militares</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">{oms.length}</span>
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Unidades C2</span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-2xl border transition-all ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800/80 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
                    } backdrop-blur-xl flex items-center gap-4`}>
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                            <DoorOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portões Monitorados</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black">{allGates.filter(g => g.is_active).length}</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">/ {allGates.length} Total</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ABA 1: SITUAÇÃO TÁTICA (MAPA C2) */}
                {activeTab === 'tactical' && (
                    <div className="grid grid-cols-12 gap-5">
                        {/* COLUNA ESQUERDA: LISTA FILTRÁVEL DE UNIDADES (MENU COMPACTO E PROPORCIONAL) */}
                        <div className="col-span-12 lg:col-span-3 xl:col-span-3">
                            <div className={`p-4 rounded-3xl border ${
                                isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                            } backdrop-blur-xl shadow-xl flex flex-col h-[580px]`}>
                                
                                <div className="flex items-center justify-between mb-2.5">
                                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Unidades Monitoradas</span>
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-blue-500/20 text-blue-400">
                                        {filteredOms.length} / {oms.length}
                                    </span>
                                </div>

                                {/* Busca Rápida Compacta */}
                                <div className="relative mb-2.5">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar sigla ou sede..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-[11px] font-semibold outline-none border transition-all ${
                                            isDarkMode 
                                                ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                        }`}
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Filtro por Região Compacto */}
                                <div className="mb-2.5">
                                    <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                                        {['ALL', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'].map(reg => (
                                            <button
                                                key={reg}
                                                onClick={() => setSelectedRegion(reg)}
                                                className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight transition-all whitespace-nowrap ${
                                                    selectedRegion === reg
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {reg === 'ALL' ? 'Todas' : reg.substring(0, 5)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Lista de OMs com Scroll Otimizado */}
                                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                    {filteredOms.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 text-[11px] italic">
                                            Nenhuma unidade militar encontrada.
                                        </div>
                                    ) : (
                                        filteredOms.map(om => {
                                            const isSelected = selectedOm?.id === om.id;
                                            const pCount = stats[om.id]?.personnelCount || 0;
                                            const occCount = stats[om.id]?.occurrencesCount || 0;
                                            const reg = getOmRegion(om);

                                            return (
                                                <div
                                                    key={om.id}
                                                    onClick={() => handleSelectOm(om)}
                                                    className={`w-full p-2 rounded-xl border text-left cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                                                            : isDarkMode 
                                                                ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70 text-slate-200' 
                                                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] flex-shrink-0 ${
                                                                isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400'
                                                            }`}>
                                                                {om.acronym.substring(0, 3)}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="font-black text-[11px] uppercase tracking-tight truncate leading-tight">{om.acronym}</p>
                                                                <p className={`text-[8px] uppercase truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                                                    {om.host_unit || om.name}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="text-right flex-shrink-0">
                                                            <span className={`inline-block px-1 py-0.2 rounded text-[7px] font-mono font-bold ${
                                                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/40 text-slate-400'
                                                            }`}>
                                                                {reg.substring(0, 4)}
                                                            </span>
                                                            <p className={`text-[9px] font-black mt-0.5 ${
                                                                isSelected ? 'text-white' : occCount > 0 ? 'text-amber-400' : 'text-blue-400'
                                                            }`}>
                                                                {pCount} mil.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA: MAPA TÁTICO & DOSSIÊ DA OM SELECIONADA */}
                        <div className="col-span-12 lg:col-span-9 xl:col-span-9">
                            <div className={`relative h-[580px] rounded-3xl overflow-hidden border shadow-xl ${
                                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                                {/* Badge Discreto de Situação Operacional */}
                                <div className="absolute top-3.5 left-3.5 z-10">
                                    <div className={`px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                                        isDarkMode ? 'bg-slate-900/90 border-slate-700 text-slate-200' : 'bg-white/90 border-slate-300 text-slate-800'
                                    }`}>
                                        📡 MAPA DE SITUAÇÃO OPERACIONAL
                                    </div>
                                </div>

                                {/* Container do Leaflet */}
                                <div id="c2-tactical-map" className="w-full h-full z-0"></div>

                                {/* DOSSIÊ LATERAL FLUTUANTE DA OM SELECIONADA (COMPACTO E ELEGANTE) */}
                                {selectedOm && (
                                    <div className="absolute top-3.5 right-3.5 bottom-3.5 w-80 max-w-[calc(100vw-2.5rem)] p-4 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl z-10 shadow-2xl text-white overflow-y-auto custom-scrollbar animate-in slide-in-from-right-3 duration-200 flex flex-col justify-between">
                                        <div>
                                            {/* Header do Dossiê */}
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex -space-x-1.5">
                                                        {selectedOm.logo_url ? (
                                                            <img src={selectedOm.logo_url} alt="Logo OM" className="w-10 h-10 object-contain bg-white rounded-lg p-0.5 border border-white/20 relative z-10" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs">
                                                                {selectedOm.acronym.substring(0, 3)}
                                                            </div>
                                                        )}
                                                        {selectedOm.host_logo_url && (
                                                            <img src={selectedOm.host_logo_url} alt="Logo Sede" className="w-10 h-10 object-contain bg-white rounded-lg p-0.5 border border-white/20" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <h3 className="text-base font-black uppercase tracking-tight text-white">{selectedOm.acronym}</h3>
                                                            <span className="px-1.5 py-0.2 rounded text-[7px] font-black uppercase bg-blue-500/30 text-blue-300 border border-blue-500/40">
                                                                {selectedOm.category || 'NIL'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider line-clamp-1">{selectedOm.host_unit || selectedOm.name}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedOm(null)}
                                                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Comandante */}
                                            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl mb-3">
                                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Comandante da Unidade</p>
                                                {selectedOm.commander_id && commanders[selectedOm.commander_id] ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-black text-[10px] text-white">
                                                            {commanders[selectedOm.commander_id].rank.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-white leading-tight">
                                                                {commanders[selectedOm.commander_id].rank} {commanders[selectedOm.commander_id].warName || commanders[selectedOm.commander_id].name}
                                                            </p>
                                                            <p className="text-[8px] text-slate-400">Designado oficialmente</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-amber-400 italic">Comandante não vinculado</p>
                                                )}
                                            </div>

                                            {/* Métricas da OM */}
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                                                    <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Efetivo Alocado</p>
                                                    <p className="text-base font-black text-blue-400">{stats[selectedOm.id]?.personnelCount || 0}</p>
                                                </div>
                                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                                                    <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Ocorrências</p>
                                                    <p className={`text-base font-black ${stats[selectedOm.id]?.occurrencesCount ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {stats[selectedOm.id]?.occurrencesCount || 0}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Portões de Acesso */}
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Portões de Acesso</p>
                                                    <button 
                                                        onClick={() => setGateModalOm(selectedOm)}
                                                        className="text-[8px] font-bold text-blue-400 hover:underline uppercase"
                                                    >
                                                        + Gerenciar
                                                    </button>
                                                </div>
                                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                                                    {allGates.filter(g => g.om_id === selectedOm.id).length === 0 ? (
                                                        <p className="text-[9px] text-slate-500 italic">Nenhum portão cadastrado</p>
                                                    ) : (
                                                        allGates.filter(g => g.om_id === selectedOm.id).map(gate => (
                                                            <div key={gate.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px]">
                                                                <span className="font-bold truncate max-w-[130px]">{gate.name}</span>
                                                                <button
                                                                    onClick={() => handleToggleGate(gate)}
                                                                    className={`px-1.5 py-0.5 rounded font-black uppercase text-[7px] transition-all ${
                                                                        gate.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                                    }`}
                                                                >
                                                                    {gate.is_active ? 'Ativo' : 'Inativo'}
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* Endereço */}
                                            <div className="p-2 bg-white/5 border border-white/10 rounded-xl mb-3 text-[9px] text-slate-300">
                                                <p className="flex items-start gap-1 line-clamp-2">
                                                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                                                    <span>{selectedOm.address || 'Endereço não cadastrado'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Botões de Ação Operacional */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                            {hasPermission(currentUser, PERMISSIONS.NAVIGATE_OMS) && (
                                                <button 
                                                    onClick={() => {
                                                        window.location.search = `?om=${selectedOm.acronym}`;
                                                    }}
                                                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all"
                                                >
                                                    <Activity className="w-3.5 h-3.5" />
                                                    <span>Visualização Tática OM</span>
                                                </button>
                                            )}

                                            <button 
                                                onClick={() => {
                                                    if (!comparedOmIds.includes(selectedOm.id)) {
                                                        setComparedOmIds([...comparedOmIds, selectedOm.id]);
                                                    }
                                                    setActiveTab('comparative');
                                                }}
                                                className="w-full py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                                                <span>Comparar com Outras OMs</span>
                                            </button>

                                            {selectedOm.url && (
                                                <a 
                                                    href={`https://${selectedOm.url.replace(/^https?:\/\//, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all no-underline"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    <span>Link de Produção</span>
                                                </a>
                                            )}

                                            <button 
                                                onClick={() => startEditing(selectedOm)}
                                                className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <Pencil className="w-3 h-3" />
                                                <span>Editar Diretrizes</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 2: MATRIZ COMPARATIVA & ANALYTICS AVANÇADO (ALTO COMANDO) */}
                {activeTab === 'comparative' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* SELETOR INTERATIVO DE UNIDADES PARA CONFRONTO DIRETO */}
                        <div className={`p-6 rounded-3xl border ${
                            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                        } backdrop-blur-xl shadow-xl space-y-4`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-blue-400">
                                        <ArrowRightLeft className="w-5 h-5" />
                                        <span>Confronto Direto entre Unidades Militares (Head-to-Head)</span>
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Selecione de 2 a 6 Organizações Militares para confrontar indicadores de efetivo, segurança e portões.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            // Selecionar top 4 por efetivo
                                            const top = [...oms]
                                                .sort((a, b) => (stats[b.id]?.personnelCount || 0) - (stats[a.id]?.personnelCount || 0))
                                                .slice(0, 4)
                                                .map(o => o.id);
                                            setComparedOmIds(top);
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        Top Maiores OMs
                                    </button>
                                </div>
                            </div>

                            {/* Tags de Seleção */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/40">
                                {oms.map(om => {
                                    const isSelected = comparedOmIds.includes(om.id);
                                    return (
                                        <button
                                            key={om.id}
                                            onClick={() => toggleCompareOm(om.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                                                    : isDarkMode 
                                                        ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' 
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            <span>{om.acronym}</span>
                                            {isSelected ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                            ) : (
                                                <Plus className="w-3.5 h-3.5 opacity-60" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* GRÁFICO COMPARATIVO DIRETO DAS OMS SELECIONADAS */}
                        <div className={`p-6 rounded-3xl border ${
                            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                        } backdrop-blur-xl shadow-xl space-y-6`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-300">
                                        Efetivo Alocado vs Ocorrências Registradas
                                    </h4>
                                    <p className="text-xs text-slate-500">Comparativo das {comparedOms.length} unidades selecionadas</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-md bg-blue-500"></span>
                                        <span className="text-slate-400">Efetivo</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-md bg-amber-500"></span>
                                        <span className="text-slate-400">Ocorrências</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                                        <span className="text-slate-400">Portões Ativos</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparativeChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.5} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                                        <YAxis stroke="#94a3b8" fontSize={11} />
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                                borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                                                borderRadius: '1rem',
                                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                        <Bar dataKey="efetivo" name="Efetivo Total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="ocorrencias" name="Ocorrências" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="portoesAtivos" name="Portões Ativos" fill="#10b981" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* CARDS COMPARATIVOS DETALHADOS LADO A LADO */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-4 border-t border-slate-800/40">
                                {comparedOms.map(om => {
                                    const pCount = stats[om.id]?.personnelCount || 0;
                                    const occCount = stats[om.id]?.occurrencesCount || 0;
                                    const omGates = allGates.filter(g => g.om_id === om.id);
                                    const activeGates = omGates.filter(g => g.is_active).length;
                                    const cmd = commanders[om.commander_id || ''];

                                    return (
                                        <div key={om.id} className={`p-4 rounded-2xl border transition-all ${
                                            isDarkMode ? 'bg-slate-800/50 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                                        } space-y-3`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                                                        {om.acronym.substring(0, 3)}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-black text-sm uppercase tracking-tight">{om.acronym}</h5>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{getOmRegion(om)}</span>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/20 text-blue-400">
                                                    {om.category || 'NIL'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/40">
                                                <div className="p-2 rounded-xl bg-white/5">
                                                    <p className="text-[8px] font-black uppercase text-slate-400">Efetivo</p>
                                                    <p className="text-base font-black text-blue-400">{pCount}</p>
                                                </div>
                                                <div className="p-2 rounded-xl bg-white/5">
                                                    <p className="text-[8px] font-black uppercase text-slate-400">Alertas</p>
                                                    <p className={`text-base font-black ${occCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {occCount}
                                                    </p>
                                                </div>
                                                <div className="p-2 rounded-xl bg-white/5">
                                                    <p className="text-[8px] font-black uppercase text-slate-400">Portões</p>
                                                    <p className="text-base font-black text-emerald-400">{activeGates}/{omGates.length}</p>
                                                </div>
                                            </div>

                                            <div className="text-[10px] text-slate-400">
                                                <p className="font-bold truncate">CMT: {cmd ? `${cmd.rank} ${cmd.warName || cmd.name}` : 'Não vinculado'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SEGUNDA LINHA ANALÍTICA: RANKING GLOBAL + DISTRIBUIÇÃO REGIONAL + CATEGORIAS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Ranking de Efetivo */}
                            <div className={`p-6 rounded-3xl border ${
                                isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                            } backdrop-blur-xl shadow-xl flex flex-col justify-between`}>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-blue-400" />
                                        <span>Ranking de Desdobramento de Tropa</span>
                                    </h4>
                                    <div className="space-y-3">
                                        {[...oms]
                                            .sort((a, b) => (stats[b.id]?.personnelCount || 0) - (stats[a.id]?.personnelCount || 0))
                                            .slice(0, 5)
                                            .map((om, idx) => {
                                                const pCount = stats[om.id]?.personnelCount || 0;
                                                const pct = globalPersonnel > 0 ? Math.round((pCount / globalPersonnel) * 100) : 0;
                                                return (
                                                    <div key={om.id} className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 font-mono font-black text-[10px] flex items-center justify-center">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="font-black uppercase">{om.acronym}</span>
                                                            </div>
                                                            <span className="font-mono font-bold text-slate-300">{pCount} ({pct}%)</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                                                                style={{ width: `${Math.min(pct * 2, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>

                            {/* Distribuição por Região Geográfica */}
                            <div className={`p-6 rounded-3xl border ${
                                isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                            } backdrop-blur-xl shadow-xl`}>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                    <Map className="w-4 h-4 text-emerald-400" />
                                    <span>Efetivo por Região do País</span>
                                </h4>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={regionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="region" stroke="#94a3b8" fontSize={9} />
                                            <YAxis stroke="#94a3b8" fontSize={9} />
                                            <Tooltip 
                                                contentStyle={{
                                                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                                    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                                                    borderRadius: '0.75rem',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                            <Bar dataKey="efetivo" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Categorização da Força (Tipo 1 a 4) */}
                            <div className={`p-6 rounded-3xl border ${
                                isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                            } backdrop-blur-xl shadow-xl flex flex-col justify-between`}>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                        <PieIcon className="w-4 h-4 text-purple-400" />
                                        <span>Classificação Operacional (GSD)</span>
                                    </h4>
                                    <div className="h-44">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryChartData}
                                                    innerRadius={42}
                                                    outerRadius={68}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {categoryChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#3b82f6'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{
                                                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                                        borderColor: '#334155',
                                                        borderRadius: '0.75rem',
                                                        fontSize: '10px',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/40">
                                    {categoryChartData.map(c => (
                                        <div key={c.name} className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c.name] }} />
                                                <span className="text-[9px] font-bold uppercase text-slate-400">{c.name}</span>
                                            </div>
                                            <span className="text-xs font-black">{c.value} OMs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 3: QUADRO GERAL DAS OMS (TABELA EXECUTIVA DO ALTO COMANDO) */}
                {activeTab === 'inventory' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* Filtros e Busca da Tabela */}
                        <div className={`p-5 rounded-3xl border ${
                            isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                        } backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                            <div className="flex items-center flex-wrap gap-3 flex-1">
                                <div className="relative flex-1 min-w-[240px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text"
                                        placeholder="Buscar por sigla, nome, sede, endereço ou comandante..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold outline-none border transition-all ${
                                            isDarkMode 
                                                ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500' 
                                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                        }`}
                                    />
                                </div>

                                <select
                                    value={selectedRegion}
                                    onChange={e => setSelectedRegion(e.target.value)}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border outline-none ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                >
                                    <option value="ALL">Todas as Regiões</option>
                                    <option value="Norte">Região Norte</option>
                                    <option value="Nordeste">Região Nordeste</option>
                                    <option value="Centro-Oeste">Região Centro-Oeste</option>
                                    <option value="Sudeste">Região Sudeste</option>
                                    <option value="Sul">Região Sul</option>
                                </select>

                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border outline-none ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                >
                                    <option value="ALL">Todas as Categorias</option>
                                    <option value="Tipo 1">Tipo 1</option>
                                    <option value="Tipo 2">Tipo 2</option>
                                    <option value="Tipo 3">Tipo 3</option>
                                    <option value="Tipo 4">Tipo 4</option>
                                    <option value="NIL">NIL</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">
                                    Exibindo {sortedOms.length} de {oms.length} OMs
                                </span>
                            </div>
                        </div>

                        {/* Tabela de Gestão Militar */}
                        <div className={`rounded-3xl border overflow-hidden shadow-2xl ${
                            isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                        } backdrop-blur-xl`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-800/40 text-slate-400' : 'border-slate-200 bg-slate-100/70 text-slate-600'} font-black uppercase text-[10px] tracking-wider`}>
                                            <th className="p-4 cursor-pointer" onClick={() => {
                                                if (sortField === 'acronym') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                                else { setSortField('acronym'); setSortDirection('asc'); }
                                            }}>
                                                <div className="flex items-center gap-1.5">
                                                    <span>Unidade / Sigla</span>
                                                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                                </div>
                                            </th>
                                            <th className="p-4">Região / UF</th>
                                            <th className="p-4">Comandante</th>
                                            <th className="p-4 cursor-pointer" onClick={() => {
                                                if (sortField === 'personnel') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                                else { setSortField('personnel'); setSortDirection('desc'); }
                                            }}>
                                                <div className="flex items-center gap-1.5">
                                                    <span>Efetivo Ativo</span>
                                                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                                </div>
                                            </th>
                                            <th className="p-4 cursor-pointer" onClick={() => {
                                                if (sortField === 'occurrences') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                                else { setSortField('occurrences'); setSortDirection('desc'); }
                                            }}>
                                                <div className="flex items-center gap-1.5">
                                                    <span>Alertas</span>
                                                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                                </div>
                                            </th>
                                            <th className="p-4 cursor-pointer" onClick={() => {
                                                if (sortField === 'gates') setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                                else { setSortField('gates'); setSortDirection('desc'); }
                                            }}>
                                                <div className="flex items-center gap-1.5">
                                                    <span>Portões</span>
                                                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                                </div>
                                            </th>
                                            <th className="p-4">Categoria</th>
                                            <th className="p-4 text-right">Ações Estratégicas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/40 font-medium">
                                        {sortedOms.map(om => {
                                            const pCount = stats[om.id]?.personnelCount || 0;
                                            const occCount = stats[om.id]?.occurrencesCount || 0;
                                            const omGates = allGates.filter(g => g.om_id === om.id);
                                            const activeGates = omGates.filter(g => g.is_active).length;
                                            const cmd = commanders[om.commander_id || ''];
                                            const isCompared = comparedOmIds.includes(om.id);

                                            return (
                                                <tr key={om.id} className={`transition-colors ${
                                                    isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                                                }`}>
                                                    {/* Sigla e Nome */}
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {om.logo_url ? (
                                                                <img src={om.logo_url} alt="" className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 border border-slate-300 dark:border-slate-700" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs">
                                                                    {om.acronym.substring(0, 3)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="font-black text-sm uppercase tracking-tight text-blue-400 block">
                                                                    {om.acronym}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 truncate block max-w-xs">
                                                                    {om.host_unit || om.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Região e UF */}
                                                    <td className="p-4">
                                                        <span className="font-bold text-xs block">{getOmRegion(om)}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{getOmUf(om)}</span>
                                                    </td>

                                                    {/* Comandante */}
                                                    <td className="p-4">
                                                        {cmd ? (
                                                            <div>
                                                                <span className="font-black text-xs block">
                                                                    {cmd.rank} {cmd.warName || cmd.name}
                                                                </span>
                                                                <span className="text-[9px] text-emerald-400 font-bold uppercase">Designado</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 italic">Não vinculado</span>
                                                        )}
                                                    </td>

                                                    {/* Efetivo */}
                                                    <td className="p-4">
                                                        <span className="font-mono font-black text-sm text-slate-100">{pCount}</span>
                                                        <span className="text-[9px] text-slate-400 block font-bold">militares</span>
                                                    </td>

                                                    {/* Ocorrências */}
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1 font-mono font-black text-sm ${
                                                            occCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                                                        }`}>
                                                            {occCount > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                            {occCount}
                                                        </span>
                                                    </td>

                                                    {/* Portões */}
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => setGateModalOm(om)}
                                                            className="hover:underline flex items-center gap-1 font-mono font-bold"
                                                        >
                                                            <span className="text-emerald-400">{activeGates}</span>
                                                            <span className="text-slate-500">/ {omGates.length}</span>
                                                        </button>
                                                    </td>

                                                    {/* Categoria */}
                                                    <td className="p-4">
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase" style={{
                                                            backgroundColor: `${CATEGORY_COLORS[om.category || 'NIL']}20`,
                                                            color: CATEGORY_COLORS[om.category || 'NIL'],
                                                            border: `1px solid ${CATEGORY_COLORS[om.category || 'NIL']}40`
                                                        }}>
                                                            {om.category || 'NIL'}
                                                        </span>
                                                    </td>

                                                    {/* Ações */}
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Ver no Mapa */}
                                                            <button
                                                                onClick={() => {
                                                                    handleSelectOm(om);
                                                                    setActiveTab('tactical');
                                                                }}
                                                                className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                                                                title="Localizar no Mapa C2"
                                                            >
                                                                <MapPin className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Adicionar ao comparador */}
                                                            <button
                                                                onClick={() => toggleCompareOm(om.id)}
                                                                className={`p-2 rounded-xl transition-colors ${
                                                                    isCompared 
                                                                        ? 'bg-indigo-600 text-white' 
                                                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                                }`}
                                                                title={isCompared ? 'Remover da Comparação' : 'Adicionar à Comparação'}
                                                            >
                                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Gerenciar Portões */}
                                                            <button
                                                                onClick={() => setGateModalOm(om)}
                                                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                                                title="Gerenciar Portões de Acesso"
                                                            >
                                                                <DoorOpen className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Editar */}
                                                            <button
                                                                onClick={() => startEditing(om)}
                                                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                                                title="Editar OM"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Acesso Tático */}
                                                            {hasPermission(currentUser, PERMISSIONS.NAVIGATE_OMS) && (
                                                                <button
                                                                    onClick={() => {
                                                                        window.location.search = `?om=${om.acronym}`;
                                                                    }}
                                                                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all"
                                                                    title="Navegar para a OM"
                                                                >
                                                                    <Activity className="w-3 h-3" />
                                                                    <span>Acessar</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 4: FORMULÁRIO DE CRIAÇÃO / EDIÇÃO */}
                {activeTab === 'form' && (
                    <div className="max-w-3xl mx-auto py-6 animate-in zoom-in-95 duration-200">
                        <div className={`p-8 rounded-3xl border shadow-2xl ${
                            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/60">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setActiveTab('tactical')}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">
                                            {isEditing ? `Ajustar Diretrizes: ${selectedOm?.acronym}` : 'Ativação de Nova Organização Militar'}
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Preencha as informações operacionais e parâmetros de comando.
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('tactical')}
                                    className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveOm} className="space-y-6">
                                {/* Upload de Brasões */}
                                <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex flex-col items-center">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleLogoSelect(e, 'om')} />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-600 hover:border-blue-500 flex items-center justify-center overflow-hidden transition-all group"
                                        >
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-400">
                                                    <ImagePlus className="w-6 h-6 mb-1" />
                                                    <span className="text-[8px] font-black uppercase">Logo OM</span>
                                                </div>
                                            )}
                                        </button>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Brasão da Unidade</p>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <input type="file" ref={hostFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleLogoSelect(e, 'host')} />
                                        <button
                                            type="button"
                                            onClick={() => hostFileInputRef.current?.click()}
                                            className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-600 hover:border-blue-500 flex items-center justify-center overflow-hidden transition-all group"
                                        >
                                            {hostLogoPreview ? (
                                                <img src={hostLogoPreview} alt="Preview" className="w-full h-full object-contain bg-white" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-400">
                                                    <ImagePlus className="w-6 h-6 mb-1" />
                                                    <span className="text-[8px] font-black uppercase">Logo Sede</span>
                                                </div>
                                            )}
                                        </button>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Brasão da Sediadora</p>
                                    </div>
                                </div>

                                {/* Campos de Cadastro */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Oficial da Unidade</label>
                                        <input 
                                            required 
                                            type="text" 
                                            className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`} 
                                            value={omForm.name} 
                                            onChange={e => setOmForm({...omForm, name: e.target.value})} 
                                            placeholder="Ex: GRUPO DE SEGURANÇA E DEFESA DE SÃO PAULO"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sigla Operacional</label>
                                            <input 
                                                required 
                                                type="text" 
                                                className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                                }`} 
                                                value={omForm.acronym} 
                                                onChange={e => setOmForm({...omForm, acronym: e.target.value})} 
                                                placeholder="Ex: GSD-SP"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CEP Operacional</label>
                                            <input 
                                                required 
                                                type="text" 
                                                className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                                }`} 
                                                value={omForm.zip_code} 
                                                onChange={e => setOmForm({...omForm, zip_code: e.target.value})} 
                                                placeholder="Ex: 07190-000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endereço Completo</label>
                                        <input 
                                            required 
                                            type="text" 
                                            className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`} 
                                            value={omForm.address} 
                                            onChange={e => setOmForm({...omForm, address: e.target.value})} 
                                            placeholder="Ex: Av. Monteiro Lobato, s/n - Cecap, Guarulhos - SP"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidade Sediadora (Hospedeira)</label>
                                            <input 
                                                type="text" 
                                                className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                                }`} 
                                                value={omForm.host_unit} 
                                                onChange={e => setOmForm({...omForm, host_unit: e.target.value})} 
                                                placeholder="Ex: BASE AÉREA DE SÃO PAULO"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link de Produção (URL)</label>
                                            <input 
                                                type="text" 
                                                className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                                }`} 
                                                value={omForm.url} 
                                                onChange={e => setOmForm({...omForm, url: e.target.value})} 
                                                placeholder="Ex: gsd-sp.fab.mil.br"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data de Fundação</label>
                                            <input 
                                                type="date" 
                                                className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                                }`} 
                                                value={omForm.founded_at} 
                                                onChange={e => setOmForm({...omForm, founded_at: e.target.value})} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria (GSD)</label>
                                            <select 
                                                className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                                }`}
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

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comandante da OM (CMT)</label>
                                        <select 
                                            className={`w-full p-3.5 rounded-xl border text-xs font-bold ${
                                                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                            }`}
                                            value={omForm.commander_id}
                                            onChange={e => setOmForm({...omForm, commander_id: e.target.value})}
                                        >
                                            <option value="">Selecione o Comandante</option>
                                            {omUsers.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.rank} {u.warName || u.name} ({u.saram || 'SARAM'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setActiveTab('tactical')}
                                        className="w-1/2 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase tracking-wider text-xs transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        disabled={loading} 
                                        type="submit" 
                                        className="w-1/2 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-xl disabled:opacity-50 transition-all"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>{isEditing ? 'Atualizar Diretrizes' : 'Consolidar Ativação'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE GESTÃO RÁPIDA DE PORTÕES DE ACESSO */}
            {gateModalOm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                    <DoorOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-black uppercase tracking-tight text-sm">
                                        Portões de Acesso: {gateModalOm.acronym}
                                    </h4>
                                    <p className="text-[10px] text-slate-400">Controle de postos de acesso e cancelas da OM</p>
                                </div>
                            </div>
                            <button onClick={() => setGateModalOm(null)} className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Adicionar Novo Portão */}
                        <div className="flex items-center gap-2 mb-4">
                            <input 
                                type="text"
                                placeholder="Nome do Portão (Ex: PORTÃO G4, CANCELA SUL)..."
                                value={newGateName}
                                onChange={e => setNewGateName(e.target.value)}
                                className={`flex-1 p-2.5 rounded-xl border text-xs font-bold uppercase ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                                }`}
                            />
                            <button
                                onClick={handleCreateGate}
                                disabled={savingGate || !newGateName.trim()}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                            >
                                {savingGate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                <span>Adicionar</span>
                            </button>
                        </div>

                        {/* Lista de Portões Existentes */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar mb-6">
                            {allGates.filter(g => g.om_id === gateModalOm.id).length === 0 ? (
                                <p className="text-center py-6 text-slate-500 text-xs italic">
                                    Nenhum portão de acesso cadastrado para esta Organização Militar.
                                </p>
                            ) : (
                                allGates.filter(g => g.om_id === gateModalOm.id).map(gate => (
                                    <div key={gate.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                        isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-2.5 h-2.5 rounded-full ${gate.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <span className="font-black text-xs uppercase">{gate.name}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleGate(gate)}
                                                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                                                    gate.is_active 
                                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                                                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                }`}
                                            >
                                                {gate.is_active ? 'Ativo' : 'Inativo'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGate(gate.id)}
                                                className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                                title="Remover Portão"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setGateModalOm(null)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
