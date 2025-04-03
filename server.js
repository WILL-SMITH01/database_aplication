const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createConnection } = require('./config');

const app = express();
const port = 3000;
const SECRET = 'sua-chave-secreta'; // Chave secreta para assinar o JWT (mude para algo mais seguro em produção)

// Middleware para permitir requisições do frontend
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir os arquivos estáticos da pasta 'frontend'
app.use(express.static(path.join(__dirname, 'frontend')));

// Rota padrão para a raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Middleware para verificar o token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }

    jwt.verify(token, SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token inválido' });
        }
        req.user = user; // Armazena os dados do usuário decodificados do token
        next();
    });
};

// Endpoint para cadastro
app.post('/cadastro', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: 'Usuário e senha são obrigatórios' });
    }

    try {
        const connection = await createConnection();
        const [existingUser] = await connection.execute(
            'SELECT id_user FROM usuarios WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            await connection.end();
            return res.json({ success: false, message: 'Usuário já existe' });
        }

        await connection.execute(
            'INSERT INTO usuarios (username, password) VALUES (?, ?)',
            [username, password]
        );

        await connection.end();
        res.json({ success: true, message: 'Cadastro realizado com sucesso' });
    } catch (error) {
        console.error('Erro ao realizar cadastro:', error);
        res.status(500).json({ success: false, message: 'Erro ao conectar ao servidor' });
    }
});

// Endpoint para login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const connection = await createConnection();
        const [rows] = await connection.execute(
            'SELECT id_user FROM usuarios WHERE username = ? AND password = ?',
            [username, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            const token = jwt.sign({ id_user: user.id_user }, SECRET, { expiresIn: '1h' });
            res.json({ success: true, token, message: 'Login bem-sucedido!' });
        } else {
            res.json({ success: false, message: 'Usuário ou senha incorretos' });
        }

        await connection.end();
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ success: false, message: 'Erro ao conectar ao servidor' });
    }
});

// Endpoint para buscar transações do usuário (protegido por JWT)
app.get('/transacoes', authenticateToken, async (req, res) => {
    const id_user = req.user.id_user;

    try {
        const connection = await createConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM transacoes WHERE id_user = ?',
            [id_user]
        );

        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({ success: false, message: 'Erro ao conectar ao servidor' });
    }
});

// Endpoint para obter o saldo (protegido por JWT)
app.get('/get_saldo', authenticateToken, async (req, res) => {
    const id_user = req.user.id_user;

    try {
        const connection = await createConnection();
        const [rows] = await connection.execute(
            'SELECT saldo, data FROM transacoes WHERE id_user = ? ORDER BY id_t DESC LIMIT 1',
            [id_user]
        );

        if (rows.length > 0) {
            const saldo = parseFloat(rows[0].saldo).toFixed(2).replace('.', ',');
            const ultimaTransacao = rows[0].data;
            res.json({ success: true, saldo, ultimaTransacao });
        } else {
            res.json({ success: false, message: 'Nenhuma transação encontrada', saldo: '0,00' });
        }

        await connection.end();
    } catch (error) {
        console.error('Erro ao buscar saldo:', error);
        res.status(500).json({ success: false, message: 'Erro ao conectar ao servidor' });
    }
});

// Endpoint para adicionar saldo (protegido por JWT)
app.post('/adicionar_saldo', authenticateToken, async (req, res) => {
    const id_user = req.user.id_user;
    const { valor } = req.body;

    if (!valor || valor <= 0) {
        return res.json({ success: false, message: 'Valor é obrigatório e deve ser maior que 0' });
    }

    try {
        const connection = await createConnection();

        // Busca o saldo atual (o mais recente)
        const [rows] = await connection.execute(
            'SELECT saldo FROM transacoes WHERE id_user = ? ORDER BY id_t DESC LIMIT 1',
            [id_user]
        );

        let novoSaldo = parseFloat(valor);
        if (rows.length > 0) {
            const saldoAtual = parseFloat(rows[0].saldo);
            novoSaldo = saldoAtual + parseFloat(valor);
        }

        // Insere a nova transação
        await connection.execute(
            'INSERT INTO transacoes (id_user, valor, data, saldo) VALUES (?, ?, NOW(), ?)',
            [id_user, parseFloat(valor), novoSaldo]
        );

        await connection.end();
        res.json({ success: true, message: 'Saldo adicionado com sucesso', novoSaldo: novoSaldo.toFixed(2).replace('.', ',') });
    } catch (error) {
        console.error('Erro ao adicionar saldo:', error);
        res.status(500).json({ success: false, message: 'Erro ao conectar ao servidor' });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});