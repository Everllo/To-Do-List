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

async function retrieveListItems() {
    try {
        // Create a connection to the database
        const connection = await mysql.createConnection(dbConfig);
        
        // Query to select all items from the database
        const query = 'SELECT id, text FROM items';
        
        // Execute the query
        const [rows] = await connection.execute(query);
        
        // Close the connection
        await connection.end();
        
        // Return the retrieved items as a JSON array
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error; // Re-throw the error
    }
}

// Stub function for generating HTML rows
async function getHtmlRows() {
    const todoItems = await retrieveListItems();

    // Generate HTML for each item
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td>
                <form action="/edit" method="POST" class="edit-form">
                    <input type="hidden" name="id" value="${item.id}">
                    <input type="text" name="text" value="${item.text}" required>
                    <button type="submit" class="edit-btn">Save</button>
                </form>
            </td>
        </tr>
    `).join('');
}

// Modified request handler with template replacement
async function handleRequest(req, res) {
    if (req.url === '/' && req.method === 'GET') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            
            // Replace template placeholder with actual content
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else if (req.url === '/edit' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const params = new URLSearchParams(body);
                const id = params.get('id');
                const text = params.get('text');
                if (!id || isNaN(id)) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid task ID');
                    return;
                }
                if (!text || text.trim().length === 0) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Task text cannot be empty');
                    return;
                }
                const connection = await mysql.createConnection(dbConfig);
                const [result] = await connection.execute('UPDATE items SET text = ? WHERE id = ?', [text.trim(), id]);
                await connection.end();
                if (result.affectedRows === 0) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Task not found');
                    return;
                }
                res.writeHead(302, { 'Location': '/' });
                res.end();
            } catch (err) {
                console.error('Error updating item:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error updating item');
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
