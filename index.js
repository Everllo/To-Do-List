const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const querystring = require('querystring');

const PORT = 3000;

// Настройки подключения к базе данных
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'passpls',
    database: 'todolist',
};

// Получение элементов из базы данных
async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Ошибка при получении элементов:', error);
        throw error;
    }
}

// Добавление нового элемента в базу данных
async function addListItem(text) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO items (text) VALUES (?)';
        await connection.execute(query, [text]);
        await connection.end();
    } catch (error) {
        console.error('Ошибка при добавлении элемента:', error);
        throw error;
    }
}

// Генерация HTML строк для таблицы
async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn">×</button></td>
        </tr>
    `).join('');
}

// Обработка запросов
async function handleRequest(req, res) {
    if (req.method === 'POST' && req.url === '/add') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            const parsedBody = querystring.parse(body);
            const newItemText = parsedBody.newItem;
            if (newItemText) {
                try {
                    await addListItem(newItemText);
                    res.writeHead(302, { 'Location': '/' });
                    res.end();
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Ошибка при добавлении элемента');
                }
            } else {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Текст элемента не указан');
            }
        });
    } else if (req.url === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Ошибка загрузки index.html');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Маршрут не найден');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));