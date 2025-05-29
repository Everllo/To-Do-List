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

const pool = mysql.createPool(dbConfig);

async function serveHtmlWithItems(res) {
    try {
        // Get items from database
        const [items] = await pool.query('SELECT id, text FROM items ORDER BY id');
        
        // Generate HTML rows
        const rows = items.map(item => `
            <tr data-id="${item.id}">
                <td>${item.id}</td>
                <td>${item.text}</td>
                <td>
                    <button onclick="enableEdit(${item.id}, '${item.text.replace(/'/g, "\\'")}')" class="edit-btn">Edit</button>
                    <button onclick="deleteItem(${item.id})" class="delete-btn">Delete</button>
                </td>
            </tr>
        `).join('');

        // Read HTML template
        let html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
        
        // Replace placeholder with dynamic content
        html = html.replace('{{rows}}', rows);
        
        // Send response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

async function handleRequest(req, res) {
    try {
        // Handle API routes
        if (req.method === 'GET' && req.url === '/') {
            await serveHtmlWithItems(res);
        }
        else if (req.method === 'POST' && req.url === '/items') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { text } = JSON.parse(body);
                    await pool.query('INSERT INTO items (text) VALUES (?)', [text]);
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: error.message }));
                }
            });
        }
        else if (req.method === 'PUT' && req.url.startsWith('/items/')) {
            const id = req.url.split('/')[2];
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const { text } = JSON.parse(body);
                    const [result] = await pool.query('UPDATE items SET text = ? WHERE id = ?', [text, id]);
                    
                    if (result.affectedRows === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Item not found' }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: error.message }));
                }
            });
        }
        else if (req.method === 'DELETE' && req.url.startsWith('/items/')) {
            const id = req.url.split('/')[2];
            try {
                const [result] = await pool.query('DELETE FROM items WHERE id = ?', [id]);
                
                if (result.affectedRows === 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Item not found' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        }
        else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press Ctrl+C to stop');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nClosing database connections...');
    await pool.end();
    process.exit();
});
