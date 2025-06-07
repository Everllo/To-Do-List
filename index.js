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

const server = http.createServer(async (req, res) => {
    // Настройки CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/' && req.method === 'GET') {
        try {
            const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
            const connection = await mysql.createConnection(dbConfig);
            const [rows] = await connection.query('SELECT * FROM items ORDER BY id');
            connection.end();

            const itemsHtml = rows.map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.text}</td>
                    <td>
                        <button onclick="deleteItem(${item.id})">Delete</button>
                    </td>
                </tr>
            `).join('');

            const responseHtml = html.replace('{{rows}}', itemsHtml);
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(responseHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500).end('Server Error');
        }
    }
    else if (req.url === '/api/items' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const {text} = JSON.parse(body);
                if (!text || text.trim() === '') {
                    res.writeHead(400).end(JSON.stringify({error: 'Text is required'}));
                    return;
                }

                const connection = await mysql.createConnection(dbConfig);
                const [result] = await connection.execute(
                    'INSERT INTO items (text) VALUES (?)',
                    [text.trim()]
                );
                connection.end();

                res.writeHead(201, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    id: result.insertId,
                    text: text.trim()
                }));
            } catch (err) {
                console.error(err);
                res.writeHead(500).end(JSON.stringify({error: 'Database error'}));
            }
        });
    }
    else {
        res.writeHead(404).end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
