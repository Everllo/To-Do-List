const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '1234',
  database: 'todolist',
  port: 3306
};

// Функция добавления элемента
async function addItem(text) {
  const connection = await mysql.createConnection(dbConfig);
  const [result] = await connection.execute(
    'INSERT INTO items (text) VALUES (?)',
    [text]
  );
  await connection.end();
  return result.insertId;
}

async function handleRequest(req, res) {
  if (req.url === '/' && req.method === 'GET') {
    // ... (рендеринг страницы)
  }
  else if (req.url === '/api/items' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body);
        const id = await addItem(text);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, text }));
      } catch (error) {
        console.error(error);
        res.writeHead(500);
        res.end('Error adding item');
      }
    });
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
