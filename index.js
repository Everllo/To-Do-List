const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');
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
        const query = 'SELECT id, text FROM items';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

async function deleteListItem(id) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'DELETE FROM items WHERE id = ?';
        await connection.execute(query, [id]);
        await connection.end();
    } catch (error) {
        console.error('Error deleting list item:', error);
        throw error;
    }
}

async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    
    if (req.method === 'GET' && parsedUrl.pathname === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            
            const rows = await getHtmlRows();
            const processedHtml = html.replace('{{rows}}', rows);
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } 
    else if (req.method === 'POST' && parsedUrl.pathname === '/delete') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body);
                await deleteListItem(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error(error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Failed to delete item' }));
            }
        });
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
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

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
