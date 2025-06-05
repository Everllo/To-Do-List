const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');
const qs = require('querystring');

const PORT = 3000;

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'todolist'
};

async function queryDB(sql, params) {
  const connection = await mysql.createConnection(dbConfig);
  const [results] = await connection.execute(sql, params);
  await connection.end();
  return results;
}

async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);

  // Главная страница
  if (req.method === 'GET' && parsedUrl.pathname === '/') {
    try {
      let html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
      const items = await queryDB('SELECT id, text FROM items', []);
      
      const rows = items.map(item => `
        <tr>
          <td>${item.id}</td>
          <td>${item.text}</td>
          <td><button class="delete-btn" data-id="${item.id}">×</button></td>
        </tr>
      `).join('');
      
      html = html.replace('{{rows}}', rows);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (err) {
      console.error(err);
      res.writeHead(500).end('Server Error');
    }
  }
  
  // Удаление задачи
  else if (req.method === 'POST' && parsedUrl.pathname === '/delete') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const { id } = qs.parse(body);
      if (id) {
        await queryDB('DELETE FROM items WHERE id = ?', [id]);
        res.writeHead(200).end();
      } else {
        res.writeHead(400).end('Bad Request');
      }
    });
  }
  
  else {
    res.writeHead(404).end('Not Found');
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
