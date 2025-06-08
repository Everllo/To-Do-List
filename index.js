const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'todolist',
};

async function retrieveListItems() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
  } catch (error) {
    console.error('Error retrieving list items:', error);
    throw error;
  }
}

async function deleteItemById(id) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM items WHERE id = ?', [id]);
    await connection.end();
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
      <td><button onclick="deleteItem(${item.id})">×</button></td>
    </tr>
  `).join('');
}

async function handleRequest(req, res) {
  if (req.url === '/' && req.method === 'GET') {
    try {
      const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
      const processedHtml = html.replace('{{rows}}', await getHtmlRows());
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(processedHtml);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading index.html');
    }

  } else if (req.url === '/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { id } = JSON.parse(body);
        await deleteItemById(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });

  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Route not found');
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
