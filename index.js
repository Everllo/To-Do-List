const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
  user: 'root',
  password: 'xxXX1234',
  database: 'todolist',
};

async function retrieveListItems() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'SELECT id, text FROM items ORDER BY id ASC';
    const [rows] = await connection.execute(query);
    await connection.end();
    return rows;
  } catch (error) {
    console.error('Error retrieving list items:', error);
    throw error;
  }
}


async function addItemToDb(text) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'INSERT INTO items (text) VALUES (?)';
    const [result] = await connection.execute(query, [text]);
    await connection.end();
    return result.insertId;
  } catch (error) {
    console.error('Error adding item:', error);
    throw error;
  }
 }

async function removeItemFromDb(id) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'DELETE FROM items WHERE id = ?';
    await connection.execute(query, [id]);
    await connection.end();
  } catch (error) {
    console.error('Error removing item:', error);
    throw error;
  }
}


    async function editItemInDb(id, text) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'UPDATE items SET text = ? WHERE id = ?';
    await connection.execute(query, [text, id]);
    await connection.end();
  } catch (error) {
    console.error('Error editing item:', error);
    throw error;
  }
}

async function getHtmlRows() {
  const todoItems = await retrieveListItems();
  return todoItems
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td id="text-${item.id}">${escapeHtml(item.text)}</td>
      <td><button id="edit-btn-${item.id}" onclick="startEdit(${item.id})">Edit</button></td>
      <td><button onclick="removeItem(${item.id})">Remove</button></td>
    </tr>`
    )
    .join('');
}

// Simple HTML escape to prevent XSS
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleRequest(req, res) {
    if (req.method === 'GET' && req.url === '/') {
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
 } else if (req.method === 'POST' && req.url === '/add') {
    // Add new item
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.text || !data.text.trim()) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid input');
          return;
        }
        await addItemToDb(data.text.trim());
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Item added');
      } catch (err) {
        console.error('Error in /add:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
    });
  } else if (req.method === 'POST' && req.url === '/remove') {
    // Remove item by id
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const id = parseInt(data.id, 10);
        if (isNaN(id)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid id');
          return;
        }
        await removeItemFromDb(id);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Item removed');
      } catch (err) {
        console.error('Error in /remove:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
    });
  } else if (req.method === 'POST' && req.url === '/edit') {
    // Edit item by id
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const id = parseInt(data.id, 10);
        const text = data.text && data.text.trim();
        if (isNaN(id) || !text) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid input');
          return;
        }
        await editItemInDb(id, text);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Item updated');
      } catch (err) {
        console.error('Error in /edit:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Route not found');
  }
}
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
