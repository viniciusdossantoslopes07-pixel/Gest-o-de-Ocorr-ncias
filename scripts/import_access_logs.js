
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, '../.env');
const envConfig = {};

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envConfig[key.trim()] = value.trim();
        }
    });
} catch (error) {
    console.error('Error loading .env file:', error);
    process.exit(1);
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importLogs() {
    const dataPath = path.resolve(__dirname, '../data/raw_access_logs.txt');

    if (!fs.existsSync(dataPath)) {
        console.error('File not found:', dataPath);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
        console.error('File is empty.');
        process.exit(1);
    }

    // Headers processing
    // Normalize headers: lowercase, remove accents
    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const headers = lines[0].split('\t').map(h => normalize(h.trim()));
    const dataLines = lines.slice(1);

    console.log('Normalized Headers:', headers);

    const records = [];

    for (const line of dataLines) {
        const values = line.split('\t').map(v => v.trim());
        if (values.length < 2) continue; // skip empty or malformed lines

        // Helper to find value
        const getVal = (keywords) => {
            const index = headers.findIndex(h => keywords.some(k => h.includes(k)));
            return index !== -1 ? values[index] : null;
        };

        // Date and Time
        // Col 1: Carimbo de (Date + 00:00:00)
        // Col 2: data/hora (Time)

        let dateRaw = getVal(['carimbo']);
        let timeRaw = getVal(['data/hora', 'hora']);

        if (!dateRaw) continue;

        // Parse date: 05/01/2026 00:00:00 -> 2026-01-05
        let datePart = dateRaw.split(' ')[0];
        if (datePart.includes('/')) {
            const [day, month, year] = datePart.split('/');
            datePart = `${year}-${month}-${day}`;
        }

        // Parse time
        let timePart = '12:00:00'; // default
        if (timeRaw && timeRaw.includes(':')) {
            timePart = timeRaw;
        } else if (dateRaw.includes(' ')) {
            // Fallback to timestamp in column 1 if column 2 is missing valid time
            // But user said "ignore 00:00", implies column 1 has dummy time.
            // If col 2 is empty/invalid, we rely on default or check if col 1 has real time?
            // Assuming col 2 is the source of truth for time as per user diff.
        }

        const timestamp = `${datePart}T${timePart}`;

        const record = {};
        record.timestamp = timestamp;
        record.guard_gate = getVal(['portao', 'gate', 'local']);
        if (!record.guard_gate) record.guard_gate = 'PORTÃO PRINCIPAL'; // Default if missing

        record.name = getVal(['nome', 'name', 'visitante']);

        // 'Caracteristica' (no accent in file, but we normalized)
        record.characteristic = getVal(['caracteristica', 'tipo de visitante']);

        record.identification = getVal(['identificacao', 'identidade', 'cpf', 'doc']);

        // 'Forma de Ingresso' -> access_mode
        record.access_mode = getVal(['forma', 'modo', 'ingresso']);

        // 'Categoria de Acesso' OR 'Tipo de Acesso' -> access_category (Entrada/Saída)
        // Priority to explicit category, then type
        let cat = getVal(['categoria de acesso']);
        if (!cat) cat = getVal(['tipo de acesso']);

        // Normalize category
        if (cat) {
            const cLower = normalize(cat);
            if (cLower.includes('entrada')) record.access_category = 'Entrada';
            else if (cLower.includes('saida')) record.access_category = 'Saída';
            else record.access_category = cat; // keep original if unsure
        }

        record.vehicle_model = getVal(['modelo', 'veiculo']);
        record.vehicle_plate = getVal(['placa']);

        // Destino
        record.destination = getVal(['destino', 'setor']);

        // Clean undefined
        Object.keys(record).forEach(k => {
            if (!record[k]) delete record[k];
        });

        records.push(record);
    }

    console.log(`Parsed ${records.length} records.`);
    if (records.length > 0) {
        console.log('Sample record:', records[0]);
    }

    // Insert in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('access_control').insert(batch);
        if (error) {
            console.error(`Error inserting batch ${i}:`, error.message);
        } else {
            console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} records)`);
        }
    }
}

importLogs();
