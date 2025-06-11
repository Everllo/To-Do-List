const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const querystring = require('querystring');
const url = require('url');

const PORT = 3000;

// Настройки подключения к базе данных
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'passpls',
    database: 'todolist',
};

// Экранирование HTML для предотвращения XSS
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Получение элементов из базы данных
async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT id, text FROM items');
        await connection.end();
        console.log('Retrieved items:', rows); // Отладка
        return rows;
    } catch (error) {
        console.error('Error retrieving items:', error);
        throw error;
    }
}

// Обновление элемента
async function updateListItem(id, newText) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE items SET text = ? WHERE id = ?', [newText, id]);
        await connection.end();
        console.log('Updated item id:', id, 'to:', newText); // Отладка
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
}

// Генерация HTML строк для таблицы
async function getHtmlRows() {
    try {
        const todoItems = await retrieveListItems();
        if (!todoItems.length) {
            return '<tr><td colspan="2">No items found</td></tr>';
        }
        return todoItems.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>
                    <form action="/update" method="POST">
                        <input type="hidden" name="id" value="${item.id}">
                        <input type="text" name="newText" value="${escapeHtml(item.text)}" required>
                        <button type="submit">Update</button>
                    </form>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error generating HTML rows:', error);
        return '<tr><td colspan="2">Error loading items</td></tr>';
    }
}

// Обработка запросов
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    console.log(`Request: ${req.method} ${req.url}`); // Отладка

    if (req.method === 'POST' && parsedUrl.pathname === '/update') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            const parsedBody = querystring.parse(body);
            const id = parsedBody.id;
            const newText = parsedBody.newText?.trim();
            if (id && newText) {
                try {
                    await updateListItem(id, newText);
                    res.writeHead(302, { 'Location': '/' });
                    res.end();
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error updating item');
                }
            } else {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Item ID and text are required');
            }
        });
    } else if (req.method === 'GET' && parsedUrl.pathname === '/') {
        try {
            const html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (error) {
            console.error('Error serving index.html:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading page');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
}

// Запуск сервера
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));