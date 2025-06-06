const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const querystring = require('querystring');

const PORT = 3000;

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

async function addNewItem(text) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO items (text) VALUES (?)';
        const [result] = await connection.execute(query, [text]);
        await connection.end();
        return result.insertId;
    } catch (error) {
        console.error('Error adding new item:', error);
        throw error;
    }
}

async function deleteItem(id) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'DELETE FROM items WHERE id = ?';
        await connection.execute(query, [id]);
        await connection.end();
        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
    }
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button onclick="removeItem(${item.id})">Remove</button></td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
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
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else if (req.url === '/add' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { text } = querystring.parse(body);
                if (text && text.trim() !== '') {
                    await addNewItem(text);
                    res.writeHead(302, { Location: '/' });
                    res.end();
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid input');
                }
            } catch (error) {
                console.error(error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            }
        });
    } else if (req.url.startsWith('/delete/') && req.method === 'GET') {
        try {
            const id = parseInt(req.url.split('/')[2]);
            if (isNaN(id)) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid ID');
                return;
            }
            await deleteItem(id);
            res.writeHead(302, { Location: '/' });
            res.end();
        } catch (error) {
            console.error(error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server error');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
