const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist'
};

// Добавляем CORS middleware
const allowCors = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items ORDER BY id');
    await connection.end();
    return rows;
}

async function addListItem(text) {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('INSERT INTO items (text) VALUES (?)', [text]);
    await connection.end();
}

async function handleRequest(req, res) {
    allowCors(res); // Применяем CORS заголовки

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/' && req.method === 'GET') {
        try {
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const rows = (await retrieveListItems()).map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.text}</td>
                    <td><button onclick="removeItem(${item.id})">×</button></td>
                </tr>
            `).join('');
            
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(html.replace('{{rows}}', rows));
        } catch (error) {
            console.error(error);
            res.writeHead(500).end('Server Error');
        }
    } 
    else if (req.url === '/add' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const {text} = JSON.parse(body);
                await addListItem(text);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({success: true}));
            } catch (error) {
                console.error(error);
                res.writeHead(500).end(JSON.stringify({
                    success: false,
                    error: 'Failed to add item'
                }));
            }
        });
    } 
    else {
        res.writeHead(404).end('Not Found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
