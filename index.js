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
          <!-- Форма удаления -->
          <form action="/delete" method="POST" style="display: inline;">
            <input type="hidden" name="id" value="${item.id}" />
            <button type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `
    )
    .join('');
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
    return;
  }

  // Здесь добавляем новый роут «POST /delete»
  if (req.url === '/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const parsed = querystring.parse(body);
      const idToDelete = parsed.id;
      if (idToDelete) {
        try {
          const connection = await mysql.createConnection(dbConfig);
          await connection.execute('DELETE FROM items WHERE id = ?', [idToDelete]);
          await connection.end();
        } catch (err) {
          console.error('Error deleting item:', err);
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
