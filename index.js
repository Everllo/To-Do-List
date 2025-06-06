const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');

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
            <td>${item.text}</td>
            <td><button class="delete-btn" data-id="${item.id}">×</button></td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);

    if (req.url === '/' && req.method === 'GET') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'),
                'utf8'
            );
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            res.writeHead(500);
            res.end('Error loading HTML');
        }
    } else if (parsedUrl.pathname === '/delete' && req.method === 'DELETE') {
        const id = parsedUrl.query.id;
        try {
            const connection = await mysql.createConnection(dbConfig);
            await connection.execute('DELETE FROM items WHERE id = ?', [id]);
            await connection.end();
            res.writeHead(200);
            res.end('Deleted');
        } catch (err) {
            res.writeHead(500);
            res.end('Delete error');
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
}

http.createServer(handleRequest).listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
