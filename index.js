const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
};

// Получение всех задач из БД
async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
}

// Генерация HTML-строк
async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button onclick="deleteItem(${item.id})">×</button></td>
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
            console.error('Ошибка при загрузке HTML:', err);
            res.writeHead(500);
            res.end('Ошибка сервера');
        }
    }

    // Удаление задачи
    else if (req.method === 'POST' && req.url === '/delete') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body);
                if (!id) {
                    res.writeHead(400);
                    return res.end('ID is required');
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('DELETE FROM items WHERE id = ?', [id]);
                await connection.end();

                res.writeHead(200);
                res.end('Deleted');
            } catch (err) {
                console.error('Ошибка при удалении:', err);
                res.writeHead(500);
                res.end('Ошибка сервера');
            }
        });
    }

    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
