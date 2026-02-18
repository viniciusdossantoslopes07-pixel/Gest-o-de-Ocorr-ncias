
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

        // Date and Time handling
        // Col 1: "Carimbo de" -> "05/01/2026 00:00:00"
        // Col 2: "data/hora" -> "09:01:59"

        const dateRaw = getVal(['carimbo']);
        const timeRaw = getVal(['data/hora']);

        if (!dateRaw) continue;

        // Parse Date: "05/01/2026 00:00:00" -> "2026-01-05"
        let datePart = null;
        if (dateRaw.includes(' ')) {
            const d = dateRaw.split(' ')[0];
            if (d.includes('/')) {
                const [day, month, year] = d.split('/');
                datePart = `${year}-${month}-${day}`;
            }
        } else if (dateRaw.includes('/')) {
            const [day, month, year] = dateRaw.split('/');
            datePart = `${year}-${month}-${day}`;
        }

        // Parse Time: "09:01:59"
        let timePart = '00:00:00';

        const timeRegex = /\d{1,2}:\d{2}:\d{2}/;

        if (timeRaw && timeRegex.test(timeRaw)) {
            const match = timeRaw.match(timeRegex);
            timePart = match ? match[0] : '00:00:00';
        } else if (dateRaw && timeRegex.test(dateRaw)) {
            // Fallback: Check if dateRaw has time (e.g. "22/01/2026 14:14:58")
            const match = dateRaw.match(timeRegex);
            if (match) {
                timePart = match[0];
                // If we found time in dateRaw, we might want to ensure datePart didn't capture it (datePart logic effectively strips it by taking split[0] usually)
            }
        }

        if (!datePart) {
            console.warn('Skipping invalid date:', dateRaw, 'Values:', values);
            continue;
        }

        const timestamp = `${datePart}T${timePart}`;

        const record = {};
        record.timestamp = timestamp;
        record.date_only = datePart;
        record.time_only = timePart;

        record.guard_gate = getVal(['guarda', 'portao', 'gate']);
        if (!record.guard_gate) record.guard_gate = 'PORTÃO PRINCIPAL';

        record.name = getVal(['nome', 'visitante']);
        record.characteristic = getVal(['caracteristica', 'tipo de visitante']); // MILITAR, Civil, etc.
        record.identification = getVal(['identificacao', 'cpf', 'doc']); // Matches "Identificação" (col 5)

        record.access_mode = getVal(['forma', 'modo', 'ingresso']); // Pedestre, Veículo

        // Category/Type handling
        const categoryRaw = getVal(['categoria de acesso']);
        const typeRaw = getVal(['tipo de acesso']);

        let category = categoryRaw || typeRaw;

        if (category) {
            const cLower = normalize(category);
            if (cLower.includes('entrada')) record.access_category = 'Entrada';
            else if (cLower.includes('saida')) record.access_category = 'Saída';
            else record.access_category = category;
        } else {
            record.access_category = 'Entrada'; // Default?
        }

        record.vehicle_model = getVal(['modelo', 'veiculo']);
        record.vehicle_plate = getVal(['placa']);

        // New columns
        record.authorizer = getVal(['quem autoriza']);
        record.authorizer_id = getVal(['identificacao de quem autoriza']);
        record.destination = getVal(['destino']);

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
