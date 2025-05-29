const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
};

// Database connection pool
const pool = mysql.createPool(dbConfig);

async function retrieveListItems() {
    try {
        const [rows] = await pool.execute('SELECT id, text FROM items');
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

async function addListItem(text) {
    try {
        const [result] = await pool.execute('INSERT INTO items (text) VALUES (?)', [text]);
        return result.insertId;
    } catch (error) {
        console.error('Error adding list item:', error);
        throw error;
    }
}

async function deleteListItem(id) {
    try {
        const [result] = await pool.execute('DELETE FROM items WHERE id = ?', [id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error deleting list item:', error);
        throw error;
    }
}

async function updateListItem(id, text) {
    try {
        const [result] = await pool.execute('UPDATE items SET text = ? WHERE id = ?', [text, id]);
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error updating list item:', error);
        throw error;
    }
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td>
                <button class="edit-btn" data-id="${item.id}" data-text="${item.text}">Edit</button>
                <button class="delete-btn" data-id="${item.id}">×</button>
            </td>
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
    } else if (req.url === '/items' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { text } = JSON.parse(body);
                if (!text) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Text is required');
                    return;
                }
                await addListItem(text);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Item added');
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error adding item');
            }
        });
    } else if (req.url.match(/^\/items\/\d+$/) && req.method === 'DELETE') {
        const id = req.url.split('/')[2];
        try {
            const success = await deleteListItem(id);
            if (success) {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Item deleted');
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Item not found');
            }
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error deleting item');
        }
    } else if (req.url.match(/^\/items\/\d+$/) && req.method === 'PUT') {
        const id = req.url.split('/')[2];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { text } = JSON.parse(body);
                if (!text) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Text is required');
                    return;
                }
                const success = await updateListItem(id, text);
                if (success) {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Item updated');
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Item not found');
                }
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error updating item');
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    await pool.end();
    server.close(() => {
        console.log('Server shut down');
        process.exit(0);
    });
});
