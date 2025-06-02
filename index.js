const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const querystring = require('querystring');
const { URL } = require('url');

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
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
  } catch (error) {
    console.error('Error retrieving list items:', error);
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
        <td>${item.text}</td>
        <td>
          <!-- Ссылка редактирования -->
          <a href="/edit?id=${item.id}">Edit</a>
        </td>
      </tr>
    `
    )
    .join('');
}

async function handleRequest(req, res) {
  // 1) GET /
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
    return;
  }

  // 2) GET /edit?id=…
  if (req.url.startsWith('/edit') && req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const idToEdit = urlObj.searchParams.get('id');
    if (!idToEdit) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request: id is missing');
      return;
    }
    try {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT text FROM items WHERE id = ?', [idToEdit]);
      await connection.end();
      if (rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Item not found');
        return;
      }
      const existingText = rows[0].text;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Edit Item</title>
        </head>
        <body style="font-family: Arial, sans-serif; width: 70%; margin: 40px auto;">
          <h2>Edit To-Do Item</h2>
          <form action="/update" method="POST">
            <input type="hidden" name="id" value="${idToEdit}" />
            <div style="margin-bottom: 16px;">
              <label for="text">New Text:</label><br/>
              <input 
                type="text" 
                id="text" 
                name="text" 
                value="${existingText.replace(/"/g, '&quot;')}" 
                required 
                style="width: 100%; padding: 8px;"
              />
            </div>
            <button type="submit" style="padding: 8px 16px;">Save</button>
            <a href="/" style="margin-left: 16px;">Cancel</a>
          </form>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('Error fetching item for edit:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    }
    return;
  }

  // 3) POST /update
  if (req.url === '/update' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const parsed = querystring.parse(body);
      const idToUpdate = parsed.id;
      const newText = parsed.text && parsed.text.trim();
      if (idToUpdate && newText) {
        try {
          const connection = await mysql.createConnection(dbConfig);
          await connection.execute('UPDATE items SET text = ? WHERE id = ?', [newText, idToUpdate]);
          await connection.end();
        } catch (err) {
          console.error('Error updating item:', err);
        }
      }
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // Всё остальное — 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route not found');
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
