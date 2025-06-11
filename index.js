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

// Удаление элемента из базы данных
async function deleteListItem(id) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'DELETE FROM items WHERE id = ?';
        await connection.execute(query, [id]);
        await connection.end();
    } catch (error) {
        console.error('Ошибка при удалении элемента:', error);
        throw error;
    }
}

// Генерация HTML строк для таблицы с формой удаления
async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td>
                <form action="/delete" method="POST">
                    <input type="hidden" name="id" value="${item.id}">
                    <button type="submit" class="delete-btn">×</button>
                </form>
            </td>
        </tr>
    `).join('');
}

// Обработка запросов
async function handleRequest(req, res) {
    if (req.method === 'POST' && req.url === '/add') {
        const body = await new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', reject);
        });
        const parsedBody = querystring.parse(body);
        const newItemText = parsedBody.newItem;
        try {
            await addListItem(newItemText);
            res.writeHead(302, { 'Location': '/' });
            res.end();
        } catch (error) {
            console.error('Ошибка при добавлении элемента:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Ошибка при добавлении элемента');
        }
    } else if (req.method === 'POST' && req.url === '/delete') {
        const body = await new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', reject);
        });
        const parsedBody = querystring.parse(body);
        const id = parsedBody.id;
        try {
            await deleteListItem(id);
            res.writeHead(302, { 'Location': '/' });
            res.end();
        } catch (error) {
            console.error('Ошибка при удалении элемента:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Ошибка при удалении элемента');
        }
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
