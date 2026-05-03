-- Migration: add_host_unit_and_seed_oms
-- Description: Adds host_unit column to military_organizations and seeds 28 GSD units.

ALTER TABLE military_organizations ADD COLUMN IF NOT EXISTS host_unit TEXT;
ALTER TABLE military_organizations ADD CONSTRAINT IF NOT EXISTS military_organizations_acronym_key UNIQUE (acronym);

INSERT INTO military_organizations (acronym, name, host_unit, address, is_active)
VALUES 
('GSD-AF', 'GSD-AF', 'Base Aérea dos Afonsos', 'Praça Marechal Ângelo Sampaio, s/nº - Sulacap, Rio de Janeiro - RJ, CEP: 21740-340', true),
('GSD-AK', 'GSD-AK', 'Centro Espacial de Alcântara', 'Rodovia MA-206, Km 35, Alcântara - MA, CEP: 65250-000', true),
('GSD-AN', 'GSD-AN', 'Base Aérea de Anápolis', 'Rodovia BR-414, Km 04, Anápolis - GO, CEP: 75144-000', true),
('GSD-BE', 'GSD-BE', 'Base Aérea de Belém', 'Av. Júlio César, s/nº - Souza, Belém - PA, CEP: 66610-310', true),
('GSD-BQ', 'GSD-BQ', 'Escola Preparatória de Cadetes do Ar (EPCAR)', 'Rua Senador Paula Ramos, s/nº - Boa Vista, Barbacena - MG, CEP: 36201-008', true),
('GSD-BR', 'GSD-BR', 'Base Aérea de Brasília', 'Setor Militar Urbano (SMU), Brasília - DF, CEP: 70630-901', true),
('GSD-BV', 'GSD-BV', 'Base Aérea de Boa Vista', 'Av. Brigadeiro V. Eduardo Gomes, s/nº - Aeroporto, Boa Vista - RR, CEP: 69310-970', true),
('GSD-CC', 'GSD-CC', 'Campo de Provas Brigadeiro Velloso', 'Rodovia BR-163, Km 796, Novo Progresso - PA, CEP: 68193-000', true),
('GSD-CG', 'GSD-CG', 'Base Aérea de Campo Grande', 'Av. Centenário, s/nº - Conjunto Residencial União, Campo Grande - MS, CEP: 79103-240', true),
('GSD-CO', 'GSD-CO', 'Base Aérea de Canoas', 'Av. Guilherme Schell, 3950 - Fátima, Canoas - RS, CEP: 92200-550', true),
('GSD-FL', 'GSD-FL', 'Base Aérea de Florianópolis', 'Av. Deputado Diomício Freitas, 3393 - Carianos, Florianópolis - SC, CEP: 88047-900', true),
('GSD-FZ', 'GSD-FZ', 'Base Aérea de Fortaleza', 'Av. dos Expedicionários, s/nº - Aeroporto, Fortaleza - CE, CEP: 60410-970', true),
('GSD-GL', 'GSD-GL', 'Base Aérea do Galeão', 'Estrada do Galeão, s/nº - Ilha do Governador, Rio de Janeiro - RJ, CEP: 21941-900', true),
('GSD-GW', 'GSD-GW', 'Escola de Especialistas de Aeronáutica (EEAR)', 'Av. Brig. Faria Lima, s/nº - Jardim do Vale, Guaratinguetá - SP, CEP: 12510-030', true),
('GSD-LS', 'GSD-LS', 'Parque de Material Aeronáutico de Lagoa Santa', 'Av. Dr. Ari Schiavo, s/nº - Jardim Imperial, Lagoa Santa - MG, CEP: 33230-220', true),
('GSD-MN', 'GSD-MN', 'Base Aérea de Manaus', 'Av. Rodrigo Otávio, 3700 - Crespo, Manaus - AM, CEP: 69073-177', true),
('GSD-MT', 'GSD-MT', 'Parque de Material Aeronáutico de São Paulo (Campo de Marte)', 'Av. Santos Dumont, 2241 - Santana, São Paulo - SP, CEP: 02012-010', true),
('GSD-NT', 'GSD-NT', 'Base Aérea de Natal', 'Estrada de Pium, s/nº - Parnamirim, Natal - RN, CEP: 59145-000', true),
('GSD-PV', 'GSD-PV', 'Base Aérea de Porto Velho', 'Av. Lauro Sodré, s/nº - Aeroporto, Porto Velho - RO, CEP: 76804-001', true),
('GSD-RF', 'GSD-RF', 'Base Aérea de Recife', 'Av. Marechal Mascarenhas de Morais, s/nº - Ibura, Recife - PE, CEP: 51210-001', true),
('GSD-RJ', 'GSD-RJ', 'Guarnição de Aeronáutica do Rio de Janeiro / III COMAR', 'Rua General Canabarro, 332 - Maracanã, Rio de Janeiro - RJ, CEP: 20271-900', true),
('GSD-SC', 'GSD-SC', 'Base Aérea de Santa Cruz', 'Estrada de Santa Cruz, s/nº - Santa Cruz, Rio de Janeiro - RJ, CEP: 23555-000', true),
('GSD-SJ', 'GSD-SJ', 'Departamento de Ciência e Tecnologia Aeroespacial (DCTA)', 'Praça Marechal Eduardo Gomes, 50 - Vila das Acácias, São José dos Campos - SP, CEP: 12228-901', true),
('GSD-SM', 'GSD-SM', 'Base Aérea de Santa Maria', 'Rodovia RSC-287, Km 244 - Camobi, Santa Maria - RS, CEP: 97105-010', true),
('GSD-SP', 'GSD-SP', 'Base Aérea de São Paulo', 'Rodovia Hélio Smidt, s/nº - Cumbica, Guarulhos - SP, CEP: 07241-901', true),
('GSD-ST', 'GSD-ST', 'Base Aérea de Santos', 'Av. Presidente Castelo Branco, s/nº - Jardim Conceiçãozinha, Guarujá - SP, CEP: 11440-500', true),
('GSD-SV', 'GSD-SV', 'Base Aérea de Salvador', 'Praça Gago Coutinho, s/nº - São Cristóvão, Salvador - BA, CEP: 41510-900', true),
('GSD-YS', 'GSD-YS', 'Academia da Força Aérea (AFA)', 'Estrada de Pirassununga, Km 39 - s/nº, Pirassununga - SP, CEP: 13630-970', true)
ON CONFLICT (acronym) DO UPDATE SET host_unit = EXCLUDED.host_unit, address = EXCLUDED.address;
