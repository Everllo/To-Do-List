const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
};

// Получение всех задач из БД
async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id, text FROM items');
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Ошибка при получении задач:', error);
        throw error;
    }
}

// Генерация строк таблицы в HTML
async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button onclick="alert('Удаление недоступно в этой ветке')">×</button></td>
        </tr>
    `).join('');
}

// Обработчик запросов
async function handleRequest(req, res) {
    if (req.method === 'GET' && req.url === '/') {
        try {
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Ошибка загрузки HTML');
        }
    }

    // === [Добавление новой задачи] ===
    else if (req.method === 'POST' && req.url === '/add') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { text } = JSON.parse(body);
                if (!text || text.trim() === '') {
                    res.writeHead(400);
                    return res.end('Text is required');
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('INSERT INTO items (text) VALUES (?)', [text]);
                await connection.end();

                res.writeHead(200);
                res.end('OK');
            } catch (err) {
                console.error('Ошибка при добавлении:', err);
                res.writeHead(500);
                res.end('Ошибка сервера');
            }
        });
    }

    // === [Неизвестный путь] ===
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

// Запуск сервера
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
