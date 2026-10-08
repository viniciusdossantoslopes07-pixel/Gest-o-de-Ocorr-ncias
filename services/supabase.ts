
import { createClient } from '@supabase/supabase-js';

const VPS_SUPABASE_URL = 'https://api.app-gsdsp.com';
const VPS_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5NjAwNDYxLCJleHAiOjIxMDQ5NjA0NjF9.OFcLnCPS3h5j_AySCPElhGxG0L7EbTO_I0fyJFUeJOI';

let envUrl = import.meta.env.VITE_SUPABASE_URL || VPS_SUPABASE_URL;
let envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || VPS_ANON_KEY;

// Se a URL ainda apontar para o projeto legado do Supabase Cloud, redireciona para a VPS
if (envUrl.includes('ipbzdgkbrozrjeohonbo')) {
    envUrl = VPS_SUPABASE_URL;
    envKey = VPS_ANON_KEY;
}

let supabaseUrl = envUrl;

// Detecção automática de ambiente Intranet ou Cloud
if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isIntranetOrLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') || host.startsWith('192.168.') || host.endsWith('.intraer') || host.endsWith('.mil.br');
    
    if (isIntranetOrLocal) {
        // Na intranet da FAB, conecta diretamente através da portaria interna /supabase-api do Nginx
        supabaseUrl = `${window.location.origin}/supabase-api`;
    } else if (window.location.protocol === 'https:' && envUrl.startsWith('http://')) {
        supabaseUrl = `${window.location.origin}/supabase-api`;
    }
}

export const supabase = createClient(supabaseUrl, envKey);

