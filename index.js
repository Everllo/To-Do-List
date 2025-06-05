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

async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>
                <input 
                    type="text" 
                    value="${item.text.replace(/"/g, '&quot;')}" 
                    onchange="editItem(${item.id}, this.value)"
                >
            </td>
            <td><button onclick="alert('Удаление отключено в этой ветке')">×</button></td>
        </tr>
    `).join('');
}

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

    // === Обработка редактирования ===
    else if (req.method === 'POST' && req.url === '/edit') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id, text } = JSON.parse(body);
                if (!id || typeof text !== 'string') {
                    res.writeHead(400);
                    return res.end('Неверные данные');
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('UPDATE items SET text = ? WHERE id = ?', [text, id]);
                await connection.end();

                res.writeHead(200);
                res.end('Обновлено');
            } catch (err) {
                console.error('Ошибка при редактировании:', err);
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
