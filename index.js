const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');
const querystring = require('querystring');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
};

async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items ORDER BY id';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

async function updateItem(id, newText) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'UPDATE items SET text = ? WHERE id = ?';
        await connection.execute(query, [newText, id]);
        await connection.end();
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();

    return todoItems.map(item => `
        <tr data-id="${item.id}">
            <td>${item.id}</td>
            <td class="item-text">${item.text}</td>
            <td>
                <button class="edit-btn" onclick="startEdit(${item.id})">Edit</button>
                <button class="delete-btn" onclick="removeItem(${item.id})">Remove</button>
            </td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    if (pathname === '/') {
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
            res.end('Error loading index.html');
        }
    } else if (pathname === '/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            const { id, text } = querystring.parse(body);
            try {
                await updateItem(id, text);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Database error' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));