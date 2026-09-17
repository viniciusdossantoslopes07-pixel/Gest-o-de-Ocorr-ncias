
import { createClient } from '@supabase/supabase-js';

const VPS_SUPABASE_URL = 'http://2.25.229.18:8000';
const VPS_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5NjAwNDYxLCJleHAiOjIxMDQ5NjA0NjF9.OFcLnCPS3h5j_AySCPElhGxG0L7EbTO_I0fyJFUeJOI';

let envUrl = import.meta.env.VITE_SUPABASE_URL || VPS_SUPABASE_URL;
let envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || VPS_ANON_KEY;

// Se a URL ainda apontar para o projeto legado do Supabase Cloud, redireciona para a VPS
if (envUrl.includes('ipbzdgkbrozrjeohonbo')) {
    envUrl = VPS_SUPABASE_URL;
    envKey = VPS_ANON_KEY;
}

let supabaseUrl = envUrl;

// Se estiver rodando no navegador sob HTTPS em produção e a URL for HTTP pura,
// utiliza o proxy reverso (/supabase-api) configurado no vercel.json para evitar erro de Mixed Content
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && envUrl.startsWith('http://')) {
    supabaseUrl = `${window.location.origin}/supabase-api`;
}

export const supabase = createClient(supabaseUrl, envKey);

