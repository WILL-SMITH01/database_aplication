const mysql = require('mysql2/promise');

// Configuração da conexão com o MySQL
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Marloi.512',
    database: 'marlon'
};

// Função para criar a conexão com o banco
async function createConnection() {
    return await mysql.createConnection(dbConfig);
}

// Função de teste para verificar a conexão
async function testConnection() {
    try {
        const connection = await createConnection();
        console.log('Conexão com o banco de dados bem-sucedida!');
        await connection.end();
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error.message);
    }
}

// Executa o teste
testConnection();

module.exports = { createConnection };