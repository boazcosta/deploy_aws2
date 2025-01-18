const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { PrismaClient } = require('@prisma/client'); // Importa Prisma Client
const app = express();
const prisma = new PrismaClient(); // Instancia Prisma Client
const PORT = 3000;

// Caminhos para as bases de dados
const viaCosteiraPath = path.join(__dirname, 'data', 'demostrativo_acidentes_viacosteira.csv');
const viaMineiraPath = path.join(__dirname, 'data', 'demostrativo_acidentes_viamineira.csv');

// Variáveis para armazenar os dados das vias
let viaCosteira = [];
let viaMineira = [];

// Carregar dados da Via Costeira
fs.createReadStream(viaCosteiraPath)
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => viaCosteira.push(data))
    .on('end', () => console.log(`Via Costeira carregada: ${viaCosteira.length} registros.`))
    .on('error', (err) => console.error('Erro ao carregar Via Costeira:', err));

// Carregar dados da Via Mineira
fs.createReadStream(viaMineiraPath)
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => viaMineira.push(data))
    .on('end', () => console.log(`Via Mineira carregada: ${viaMineira.length} registros.`))
    .on('error', (err) => console.error('Erro ao carregar Via Mineira:', err));

// Endpoint para obter endereços únicos
app.get('/api/enderecos', (req, res) => {
    const enderecosCosteira = viaCosteira.map(row => row.trecho).filter(Boolean);
    const enderecosMineira = viaMineira.map(row => row.trecho).filter(Boolean);

    const enderecos = [...new Set([...enderecosCosteira, ...enderecosMineira])];

    if (enderecos.length === 0) {
        console.error('Nenhum endereço encontrado nas bases de dados.');
        return res.status(500).json({ error: 'Nenhum endereço encontrado nas bases de dados.' });
    }

    res.json({ enderecos });
});

// Endpoint para obter horários disponíveis
app.get('/api/horarios-disponiveis', (req, res) => {
    const horarios = [...new Set(viaCosteira.concat(viaMineira).map(row => row.horario).filter(Boolean))];
    horarios.sort(); // Ordenar os horários
    res.json({ horarios });
});

// Endpoint para obter horários com mais e menos acidentes
app.get('/api/horarios', (req, res) => {
    const calcularHorarios = (dados) => {
        const horarios = dados.reduce((acc, row) => {
            if (row.horario) {
                acc[row.horario] = (acc[row.horario] || 0) + 1;
            }
            return acc;
        }, {});

        const horariosOrdenados = Object.entries(horarios).sort((a, b) => b[1] - a[1]);
        const maisAcidentes = horariosOrdenados[0];
        const menosAcidentes = horariosOrdenados[horariosOrdenados.length - 1];

        return {
            maisAcidentes: maisAcidentes || ["-", 0],
            menosAcidentes: menosAcidentes || ["-", 0]
        };
    };

    const viaCosteiraHorarios = calcularHorarios(viaCosteira);
    const viaMineiraHorarios = calcularHorarios(viaMineira);

    res.json({
        viaCosteira: viaCosteiraHorarios,
        viaMineira: viaMineiraHorarios
    });
});

// Endpoint para cálculo de risco e armazenamento no banco
app.get('/api/risco', async (req, res) => {
    const { origin, destination, transport, horario } = req.query;

    if (!origin || !destination || !transport || !horario) {
        return res.status(400).json({ error: 'Origem, destino, tipo de transporte e horário são obrigatórios.' });
    }

    const totalAcidentesVias = viaCosteira.length + viaMineira.length;

    if (totalAcidentesVias === 0) {
        return res.status(500).json({ error: 'Nenhum dado de acidente encontrado para calcular risco.' });
    }

    // Filtrar acidentes por origem e destino
    const acidentesOrigem = viaCosteira.concat(viaMineira).filter(
        row => row.trecho === origin && row.horario === horario
    ).length;

    const acidentesDestino = viaCosteira.concat(viaMineira).filter(
        row => row.trecho === destination && row.horario === horario
    ).length;

    // Modificação de risco com base no tipo de transporte
    const transportModifiers = {
        carro: 1.0,
        moto: 1.5,
        caminhão: 1.2,
        bicicleta: 0.8,
        pedestre: 0.6
    };

    const modifier = transportModifiers[transport] || 1.0;

    // Calcular risco percentual ajustado
    const riscoOrigem = (acidentesOrigem / totalAcidentesVias) * 100 * modifier;
    const riscoDestino = (acidentesDestino / totalAcidentesVias) * 100 * modifier;
    const riscoTotal = (riscoOrigem + riscoDestino).toFixed(2);

    console.log(`Risco calculado: ${riscoTotal}% para origem ${origin}, destino ${destination}, transporte ${transport}, horário ${horario}`);

    try {
        // Salvar no banco de dados
        const novoRisco = await prisma.usuarioRisco.create({
            data: {
                origem: origin,
                destino: destination,
                transporte: transport,
                horario,
                risco: parseFloat(riscoTotal)
            }
        });

        console.log('Dados salvos no banco:', novoRisco);

        const trajeto = [
            [-19.9, -43.9], 
            [-27.6, -48.5]  
        ];

        res.json({ risco: riscoTotal, trajeto });
    } catch (error) {
        console.error('Erro ao salvar no banco de dados:', error);
        res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
    }
});


app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar o servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

