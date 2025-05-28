const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
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
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td class="text-cell">${item.text}</td>
            <td>
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">×</button>
            </td>
        </tr>
    `).join('');
}

// Modified request handler with template replacement
async function handleRequest(req, res) {
    if (req.url === '/' && req.method === 'GET') {
        // Существующий код
    } else if (req.url === '/update-item' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            const parsedBody = querystring.parse(body);
            const id = parsedBody.id;
            const text = parsedBody.text;
            if (id && text) {
                try {
                    const connection = await mysql.createConnection(dbConfig);
                    await connection.execute('UPDATE items SET text = ? WHERE id = ?', [text, id]);
                    await connection.end();
                    res.writeHead(200);
                    res.end();
                } catch (error) {
                    console.error(error);
                    res.writeHead(500);
                    res.end('Error updating item');
                }
            } else {
                res.writeHead(400);
                res.end('Bad request');
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
